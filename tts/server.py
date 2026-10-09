import hashlib
import json
import math
import os
import random
import re
import shutil
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from kokoro import KModel, KPipeline
from pydantic import BaseModel
from starlette.datastructures import MutableHeaders

VOICE = "af_heart,af_bella"
SAMPLE_RATE = 24000
TTS_DIR = Path("/tmp/tts")
CACHE_VERSION = "1-5"
CACHE_DIRNAME = f"cache-v{CACHE_VERSION}"
LOCK_TIMEOUT = 300
MIN_PLAYABLE_CHUNKS = 3
TARGET_CHUNK_CHARS = 640
MAX_CHUNK_CHARS = 960
PARAGRAPH_GAP_MS = 500
PARAGRAPH_GAP_SAMPLES = SAMPLE_RATE * PARAGRAPH_GAP_MS // 1000
VALID_TYPES = {"blog", "lore"}
CONTENT_HASH_RE = re.compile(r"^[a-f0-9]{64}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$", flags=re.IGNORECASE)
VERSION_DIR_RE = re.compile(r"^cache-v\d+(?:-\d+)*$")
# The public TTS protocol uses JavaScript String/DOM offsets, not Python str
# indices. UTF-16 code units preserve the frontend's DOM Range mapping.
OFFSET_UNIT = "utf16_code_units"

active_locks: dict[str, tuple[str, float]] = {}
generation_status: dict[str, dict[str, Any]] = {}
state_lock = threading.Lock()
model: KModel | None = None
pipeline: KPipeline | None = None
voice_pack = None
executor = ThreadPoolExecutor(max_workers=1)


class SpeechParagraph(BaseModel):
    start: int
    end: int
    kind: Literal["prose", "layerone"]


class SpeechLanguageSpan(BaseModel):
    start: int
    end: int
    language: Literal["celestial", "abyssal"]
    understood: bool


class SpeechDocument(BaseModel):
    text: str
    offset_unit: Literal["utf16_code_units"]
    paragraphs: list[SpeechParagraph]
    language_spans: list[SpeechLanguageSpan]


class GenerateRequest(BaseModel):
    document: SpeechDocument
    slug: str
    type: str
    content_hash: str
    cache_version: str


class RangeFileResponse(FileResponse):
    async def __call__(self, scope, receive, send):
        async def send_with_range_headers(message):
            if message["type"] == "http.response.start" and message["status"] == 416:
                message = dict(message)
                headers = MutableHeaders(raw=list(message["headers"]))
                headers["accept-ranges"] = "bytes"
                message["headers"] = headers.raw
            await send(message)

        await super().__call__(scope, receive, send_with_range_headers)


def _validate_type_and_slug(type_: str, slug: str) -> None:
    if type_ not in VALID_TYPES:
        raise HTTPException(
            status_code=400, detail='Invalid type, expected "blog" or "lore"'
        )
    if not SLUG_RE.fullmatch(slug):
        raise HTTPException(status_code=400, detail="Invalid slug")


def _validate_identity(content_hash: str, cache_version: str) -> None:
    if cache_version != CACHE_VERSION:
        raise HTTPException(
            status_code=409,
            detail=f"Unsupported TTS cache version; expected {CACHE_VERSION}",
        )
    if not CONTENT_HASH_RE.fullmatch(content_hash):
        raise HTTPException(status_code=400, detail="Invalid content hash")


def _document_hash_input(document: SpeechDocument) -> str:
    paragraph_identity = "\n".join(
        f"{paragraph.start}:{paragraph.end}:{paragraph.kind}"
        for paragraph in document.paragraphs
    )
    language_identity = "\n".join(
        f"{span.start}:{span.end}:{span.language}:{'understood' if span.understood else 'unknown'}"
        for span in document.language_spans
    )
    return f"tts-document-v2\n{document.text}\n{paragraph_identity}\n{language_identity}"


def _calculate_document_hash(document: SpeechDocument) -> str:
    return hashlib.sha256(_document_hash_input(document).encode("utf-8")).hexdigest()


class Utf16OffsetMap:
    """Translate validated protocol offsets to Python code-point indices."""

    def __init__(self, text: str):
        self.codepoint_to_utf16 = [0]
        utf16_offset = 0
        for character in text:
            utf16_offset += 2 if ord(character) > 0xFFFF else 1
            self.codepoint_to_utf16.append(utf16_offset)
        self.utf16_to_codepoint = {
            offset: index for index, offset in enumerate(self.codepoint_to_utf16)
        }

    @property
    def utf16_length(self) -> int:
        return self.codepoint_to_utf16[-1]

    def to_codepoint(self, utf16_offset: int) -> int | None:
        return self.utf16_to_codepoint.get(utf16_offset)

    def to_utf16(self, codepoint_offset: int) -> int:
        return self.codepoint_to_utf16[codepoint_offset]


def _validate_document(document: SpeechDocument, content_hash: str) -> None:
    text = document.text
    if not text or text != text.strip() or re.search(r"\s", text.replace(" ", "")):
        raise HTTPException(status_code=400, detail="Speech text is not canonical")
    if "  " in text:
        raise HTTPException(
            status_code=400, detail="Speech text contains repeated spaces"
        )
    if not document.paragraphs:
        raise HTTPException(status_code=400, detail="No readable text to synthesize")

    offsets = Utf16OffsetMap(text)
    expected_start = 0
    for index, paragraph in enumerate(document.paragraphs):
        if paragraph.start != expected_start or paragraph.end <= paragraph.start:
            raise HTTPException(status_code=400, detail="Invalid paragraph offsets")
        start = offsets.to_codepoint(paragraph.start)
        end = offsets.to_codepoint(paragraph.end)
        if start is None or end is None:
            raise HTTPException(
                status_code=400,
                detail="Paragraph offsets must align to UTF-16 code-point boundaries",
            )
        if index > 0 and text[start - 1] != " ":
            raise HTTPException(
                status_code=400, detail="Paragraphs must be separated by one space"
            )
        if paragraph.end > offsets.utf16_length:
            raise HTTPException(
                status_code=400, detail="Paragraph offset exceeds text length"
            )
        paragraph_text = text[start:end]
        if paragraph_text != paragraph_text.strip():
            raise HTTPException(
                status_code=400, detail="Paragraph text is not canonical"
            )
        expected_start = paragraph.end + (
            1 if index < len(document.paragraphs) - 1 else 0
        )

    if document.paragraphs[-1].end != offsets.utf16_length:
        raise HTTPException(
            status_code=400, detail="Paragraph offsets do not cover speech text"
        )
    previous_language_end = 0
    for span in document.language_spans:
        if span.start < previous_language_end or span.end <= span.start:
            raise HTTPException(status_code=400, detail="Invalid language span offsets")
        start = offsets.to_codepoint(span.start)
        end = offsets.to_codepoint(span.end)
        if start is None or end is None:
            raise HTTPException(
                status_code=400,
                detail="Language span offsets must align to UTF-16 code-point boundaries",
            )
        if not any(paragraph.start <= span.start and span.end <= paragraph.end for paragraph in document.paragraphs):
            raise HTTPException(
                status_code=400, detail="Language spans must be contained in one paragraph"
            )
        previous_language_end = span.end
    if _calculate_document_hash(document) != content_hash:
        raise HTTPException(
            status_code=409, detail="Content hash does not match speech document"
        )


def _version_root() -> Path:
    return _confined_cache_path(TTS_DIR / CACHE_DIRNAME)


def _cache_base() -> Path:
    """Return the canonical cache root used for containment checks."""
    return Path(os.path.realpath(os.fspath(TTS_DIR)))


def _confined_cache_path(path: Path) -> Path:
    """Normalize a cache path and reject traversal or symlink escapes."""
    cache_base = os.path.realpath(os.fspath(TTS_DIR))
    cache_prefix = f"{cache_base}{os.sep}"
    candidate = os.path.realpath(os.fspath(path))
    if not candidate.startswith(cache_prefix):
        raise ValueError("TTS cache path escapes the cache root")
    return Path(candidate)


def _confined_cache_entry(path: Path) -> Path:
    """Validate a cache entry path without following its final symlink."""
    cache_base = os.path.realpath(os.fspath(TTS_DIR))
    cache_prefix = f"{cache_base}{os.sep}"
    candidate = os.path.abspath(os.fspath(path))
    if not candidate.startswith(cache_prefix):
        raise ValueError("TTS cache path escapes the cache root")

    actual_parent = os.path.realpath(os.path.dirname(candidate))
    if actual_parent != cache_base and not actual_parent.startswith(cache_prefix):
        raise ValueError("TTS cache parent escapes the cache root")
    return Path(candidate)


def _validate_cache_components(type_: str, slug: str, content_hash: str) -> None:
    if type_ not in VALID_TYPES:
        raise ValueError("Invalid TTS cache type")
    if not SLUG_RE.fullmatch(slug):
        raise ValueError("Invalid TTS cache slug")
    if not CONTENT_HASH_RE.fullmatch(content_hash):
        raise ValueError("Invalid TTS cache content hash")


def _slug_root(type_: str, slug: str) -> Path:
    if type_ not in VALID_TYPES:
        raise ValueError("Invalid TTS cache type")
    if not SLUG_RE.fullmatch(slug):
        raise ValueError("Invalid TTS cache slug")
    return _confined_cache_path(_version_root() / type_ / slug)


def _cache_root(type_: str, slug: str, content_hash: str) -> Path:
    _validate_cache_components(type_, slug, content_hash)
    return _confined_cache_path(_slug_root(type_, slug) / content_hash)


def _cache_path(type_: str, slug: str, content_hash: str) -> Path:
    return _confined_cache_path(
        _cache_root(type_, slug, content_hash) / "audio.wav"
    )


def _chunks_dir(type_: str, slug: str, content_hash: str) -> Path:
    return _confined_cache_path(_cache_root(type_, slug, content_hash) / "chunks")


def _chunk_path(type_: str, slug: str, content_hash: str, index: int) -> Path:
    if not isinstance(index, int) or isinstance(index, bool) or index < 0:
        raise ValueError("Invalid TTS chunk index")
    return _confined_cache_path(
        _chunks_dir(type_, slug, content_hash) / f"{index:04d}.wav"
    )


def _status_path(type_: str, slug: str, content_hash: str) -> Path:
    return _confined_cache_path(
        _cache_root(type_, slug, content_hash) / "status.json"
    )


def _manifest_path(type_: str, slug: str, content_hash: str) -> Path:
    return _confined_cache_path(
        _cache_root(type_, slug, content_hash) / "manifest.json"
    )


def _slug_lock_key(type_: str, slug: str) -> str:
    return f"{type_}:{slug}"


def _status_key(type_: str, slug: str, content_hash: str) -> str:
    return f"{type_}:{slug}:{content_hash}"


def _is_locked(type_: str, slug: str, content_hash: str) -> bool:
    key = _slug_lock_key(type_, slug)
    now = time.time()
    with state_lock:
        active = active_locks.get(key)
        if active is None:
            return False
        active_hash, locked_at = active
        if now - locked_at > LOCK_TIMEOUT:
            active_locks.pop(key, None)
            return False
        return active_hash == content_hash


def _acquire_lock(type_: str, slug: str, content_hash: str) -> bool:
    key = _slug_lock_key(type_, slug)
    now = time.time()
    with state_lock:
        active = active_locks.get(key)
        if active is not None and now - active[1] <= LOCK_TIMEOUT:
            return False
        active_locks[key] = (content_hash, now)
        return True


def _release_lock(type_: str, slug: str, content_hash: str) -> None:
    key = _slug_lock_key(type_, slug)
    with state_lock:
        active = active_locks.get(key)
        if active is not None and active[0] == content_hash:
            active_locks.pop(key, None)


def _safe_remove(path: Path, expected_parent: Path) -> None:
    cache_base = _cache_base()
    confined_parent = (
        cache_base
        if expected_parent == cache_base
        else _confined_cache_path(expected_parent)
    )
    lexical_path = _confined_cache_entry(path)
    actual_parent = Path(os.path.realpath(os.fspath(lexical_path.parent)))
    if actual_parent != confined_parent:
        return
    if lexical_path.is_symlink():
        lexical_path.unlink(missing_ok=True)
        return
    confined_path = _confined_cache_path(lexical_path)
    if not confined_path.exists():
        return
    if confined_path.is_file():
        confined_path.unlink(missing_ok=True)
        return
    if confined_path.is_dir():
        shutil.rmtree(confined_path)


def _cleanup_cache_versions() -> None:
    cache_base = _cache_base()
    cache_base.mkdir(parents=True, exist_ok=True)
    for child in cache_base.iterdir():
        if child.name in VALID_TYPES or (
            VERSION_DIR_RE.fullmatch(child.name) and child.name != CACHE_DIRNAME
        ):
            _safe_remove(child, cache_base)


def _delete_stale_hashes(type_: str, slug: str, content_hash: str) -> None:
    slug_root = _slug_root(type_, slug)
    if not slug_root.is_dir():
        return
    for child in slug_root.iterdir():
        if child.name != content_hash and CONTENT_HASH_RE.fullmatch(child.name):
            _safe_remove(child, slug_root)


def _reset_outputs(type_: str, slug: str, content_hash: str) -> None:
    cache_root = _cache_root(type_, slug, content_hash)
    if cache_root.exists():
        _safe_remove(cache_root, cache_root.parent)
    with state_lock:
        generation_status.pop(_status_key(type_, slug, content_hash), None)


def _atomic_json_write(path: Path, payload: dict[str, Any]) -> None:
    confined_path = _confined_cache_path(path)
    confined_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = _confined_cache_path(
        confined_path.with_suffix(f"{confined_path.suffix}.tmp")
    )
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary.replace(confined_path)


def _read_json(path: Path) -> dict[str, Any] | None:
    confined_path = _confined_cache_path(path)
    if not confined_path.exists():
        return None
    try:
        payload = json.loads(confined_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return payload if isinstance(payload, dict) else None


def _default_status(content_hash: str) -> dict[str, Any]:
    return {
        "status": "not_generated",
        "generated_chunks": 0,
        "total_chunks": 0,
        "playable": False,
        "cache_version": CACHE_VERSION,
        "content_hash": content_hash,
    }


def _normalize_status(payload: dict[str, Any], content_hash: str) -> dict[str, Any]:
    status = payload.get("status", "not_generated")
    if status not in {"not_generated", "generating", "ready"}:
        status = "not_generated"

    total_chunks = max(0, int(payload.get("total_chunks", 0) or 0))
    generated_chunks = max(0, int(payload.get("generated_chunks", 0) or 0))
    generated_chunks = min(generated_chunks, total_chunks) if total_chunks else 0
    playable = bool(payload.get("playable", False))
    if status == "ready":
        generated_chunks = total_chunks
        playable = True

    normalized: dict[str, Any] = {
        "status": status,
        "generated_chunks": generated_chunks,
        "total_chunks": total_chunks,
        "playable": playable,
        "cache_version": CACHE_VERSION,
        "content_hash": content_hash,
    }
    error = payload.get("error")
    if isinstance(error, str) and error:
        normalized["error"] = error
    return normalized


def _write_status(
    type_: str, slug: str, content_hash: str, payload: dict[str, Any]
) -> dict[str, Any]:
    normalized = _normalize_status(payload, content_hash)
    _atomic_json_write(_status_path(type_, slug, content_hash), normalized)
    with state_lock:
        generation_status[_status_key(type_, slug, content_hash)] = normalized
    return normalized


def _read_status(type_: str, slug: str, content_hash: str) -> dict[str, Any] | None:
    key = _status_key(type_, slug, content_hash)
    with state_lock:
        cached = generation_status.get(key)
    if cached is not None:
        return dict(cached)

    payload = _read_json(_status_path(type_, slug, content_hash))
    if payload is None:
        return None
    normalized = _normalize_status(payload, content_hash)
    with state_lock:
        generation_status[key] = normalized
    return normalized


def _with_manifest(
    type_: str, slug: str, content_hash: str, status: dict[str, Any]
) -> dict[str, Any]:
    result = dict(status)
    manifest = _read_json(_manifest_path(type_, slug, content_hash))
    if manifest is not None:
        result["manifest"] = manifest
    return result


def _chunk_file_count(type_: str, slug: str, content_hash: str) -> int:
    chunk_dir = _chunks_dir(type_, slug, content_hash)
    if not chunk_dir.exists():
        return 0
    return sum(1 for _ in chunk_dir.glob("*.wav"))


def _current_status(type_: str, slug: str, content_hash: str) -> dict[str, Any]:
    status = _read_status(type_, slug, content_hash)
    cache_exists = _cache_path(type_, slug, content_hash).exists()
    locked = _is_locked(type_, slug, content_hash)

    if status is None:
        if cache_exists:
            total = _chunk_file_count(type_, slug, content_hash)
            status = _write_status(
                type_,
                slug,
                content_hash,
                {
                    "status": "ready",
                    "generated_chunks": total,
                    "total_chunks": total,
                    "playable": True,
                },
            )
            return _with_manifest(type_, slug, content_hash, status)
        if locked:
            return _with_manifest(
                type_,
                slug,
                content_hash,
                {
                    **_default_status(content_hash),
                    "status": "generating",
                },
            )
        return _default_status(content_hash)

    if cache_exists and status["status"] != "ready":
        total = int(
            status.get("total_chunks", 0)
            or _chunk_file_count(type_, slug, content_hash)
        )
        status = _write_status(
            type_,
            slug,
            content_hash,
            {
                **status,
                "status": "ready",
                "generated_chunks": total,
                "total_chunks": total,
                "playable": True,
            },
        )
    elif locked:
        generated = int(status.get("generated_chunks", 0) or 0)
        status = _normalize_status(
            {
                **status,
                "status": "generating",
                "playable": generated >= MIN_PLAYABLE_CHUNKS,
            },
            content_hash,
        )
    elif status["status"] == "ready" and not cache_exists:
        status = _default_status(content_hash)

    return _with_manifest(type_, slug, content_hash, status)


def _split_long_range(text: str, start: int, end: int) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    cursor = start
    while cursor < end:
        proposed_end = min(cursor + MAX_CHUNK_CHARS, end)
        if proposed_end < end:
            boundary = text.rfind(" ", cursor, proposed_end + 1)
            if boundary > cursor:
                proposed_end = boundary
        while cursor < proposed_end and text[cursor] == " ":
            cursor += 1
        while proposed_end > cursor and text[proposed_end - 1] == " ":
            proposed_end -= 1
        if proposed_end <= cursor:
            proposed_end = min(cursor + MAX_CHUNK_CHARS, end)
        ranges.append((cursor, proposed_end))
        cursor = proposed_end
        while cursor < end and text[cursor] == " ":
            cursor += 1
    return ranges


def _statement_ranges(document: SpeechDocument) -> list[dict[str, Any]]:
    statements: list[dict[str, Any]] = []
    offsets = Utf16OffsetMap(document.text)
    for paragraph_index, paragraph in enumerate(document.paragraphs):
        paragraph_start = offsets.to_codepoint(paragraph.start)
        paragraph_end = offsets.to_codepoint(paragraph.end)
        if paragraph_start is None or paragraph_end is None:
            raise ValueError("Validated document offsets must align to code-point boundaries")
        paragraph_text = document.text[paragraph_start:paragraph_end]
        relative_start = 0
        boundaries = list(re.finditer(r"[.!?](?:[\"')\]]*)\s+", paragraph_text))
        relative_ranges: list[tuple[int, int]] = []
        for boundary in boundaries:
            sentence_end = len(boundary.group(0).rstrip()) + boundary.start()
            relative_ranges.append((relative_start, sentence_end))
            relative_start = boundary.end()
        relative_ranges.append((relative_start, len(paragraph_text)))

        for relative_range in relative_ranges:
            start = paragraph_start + relative_range[0]
            end = paragraph_start + relative_range[1]
            while start < end and document.text[start] == " ":
                start += 1
            while end > start and document.text[end - 1] == " ":
                end -= 1
            if start >= end:
                continue
            sentence_text = document.text[start:end]
            if "!" in sentence_text:
                contour = "emphatic"
            elif "?" in sentence_text:
                contour = "question"
            else:
                contour = "statement"
            utf16_start = offsets.to_utf16(start)
            utf16_end = offsets.to_utf16(end)
            cuts = {start, end}
            relevant_spans: list[tuple[int, int, SpeechLanguageSpan]] = []
            for span in document.language_spans:
                if span.start >= utf16_end or span.end <= utf16_start:
                    continue
                span_start = offsets.to_codepoint(span.start)
                span_end = offsets.to_codepoint(span.end)
                if span_start is None or span_end is None:
                    raise ValueError("Validated language span offsets must align to code-point boundaries")
                span_start = max(start, span_start)
                span_end = min(end, span_end)
                if span_start < span_end:
                    cuts.update((span_start, span_end))
                    relevant_spans.append((span_start, span_end, span))

            ordered_cuts = sorted(cuts)
            for segment_start, segment_end in zip(ordered_cuts, ordered_cuts[1:]):
                while segment_start < segment_end and document.text[segment_start] == " ":
                    segment_start += 1
                while segment_end > segment_start and document.text[segment_end - 1] == " ":
                    segment_end -= 1
                if segment_start >= segment_end:
                    continue
                active_span = next(
                    (
                        span
                        for span_start, span_end, span in relevant_spans
                        if span_start <= segment_start and segment_end <= span_end
                    ),
                    None,
                )
                segment_text = document.text[segment_start:segment_end]
                if not re.search(r"\w", segment_text, flags=re.UNICODE):
                    continue
                bounded_ranges = _split_long_range(
                    document.text, segment_start, segment_end
                )
                active_span_end = (
                    offsets.to_codepoint(active_span.end) if active_span else None
                )
                for bounded_start, bounded_end in bounded_ranges:
                    speech_text = document.text[bounded_start:bounded_end]
                    if (
                        active_span_end == bounded_end
                        and bounded_end < end
                        and bounded_end == segment_end
                    ):
                        suffix = document.text[bounded_end:end]
                        if re.fullmatch(r"[.!?]+[\"')\]]*", suffix):
                            speech_text += suffix
                    statements.append(
                        {
                            "start": bounded_start,
                            "end": bounded_end,
                            "speech_text": speech_text,
                            "paragraph": paragraph_index,
                            "kind": paragraph.kind,
                            "language": active_span.language if active_span else None,
                            "understood": active_span.understood if active_span else False,
                            "contour": contour,
                        }
                    )
    return statements


def _chunk_plans(statements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    plans: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []

    def flush() -> None:
        if not current:
            return
        plans.append(
            {
                "index": len(plans),
                "start": current[0]["start"],
                "end": current[-1]["end"],
                "statements": list(current),
            }
        )
        current.clear()

    for statement in statements:
        if current and statement["end"] - current[0]["start"] > MAX_CHUNK_CHARS:
            flush()
        current.append(statement)
        if current[-1]["end"] - current[0]["start"] >= TARGET_CHUNK_CHARS:
            flush()
    flush()
    return plans


def _initial_manifest(
    document: SpeechDocument, content_hash: str, plans: list[dict[str, Any]]
) -> dict[str, Any]:
    offsets = Utf16OffsetMap(document.text)
    return {
        "cache_version": CACHE_VERSION,
        "content_hash": content_hash,
        "offset_unit": OFFSET_UNIT,
        "text_length": offsets.utf16_length,
        "paragraphs": [paragraph.model_dump() for paragraph in document.paragraphs],
        "paragraph_gap_ms": PARAGRAPH_GAP_MS,
        "duration_ms": 0,
        "chunks": [
            {
                "index": plan["index"],
                "start": offsets.to_utf16(plan["start"]),
                "end": offsets.to_utf16(plan["end"]),
                "generated": False,
            }
            for plan in plans
        ],
        "statements": [],
    }


def _synthesize_statement(text: str) -> np.ndarray:
    if model is None or pipeline is None or voice_pack is None:
        raise RuntimeError("TTS model is not initialized")

    parts: list[np.ndarray] = []
    for _, ps, _ in pipeline(text, voice=VOICE, speed=0.85, split_pattern=r"\n+"):
        ref_s = voice_pack[len(ps) - 1]
        audio = model(ps, ref_s, 1)
        parts.append(audio.numpy().astype(np.float32, copy=False))
    if not parts:
        return np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
    return np.concatenate(parts)


def _peak_normalize(audio: np.ndarray, peak: float = 0.46) -> np.ndarray:
    source = np.asarray(audio, dtype=np.float32)
    maximum = float(np.max(np.abs(source))) if source.size else 0.0
    if maximum < 1e-9:
        return source
    return (source * (peak / maximum)).astype(np.float32)


def _center_stereo(mono: np.ndarray) -> np.ndarray:
    side = np.asarray(mono, dtype=np.float32) / math.sqrt(2.0)
    return np.column_stack((side, side)).astype(np.float32)


def _stable_seed(content_hash: str, start: int, end: int) -> int:
    seed = hashlib.sha256(f"{content_hash}:{start}:{end}".encode("utf-8")).digest()
    return int.from_bytes(seed[:4], byteorder="big")


def _pan_drifting(mono: np.ndarray, seed: int, gain: float) -> np.ndarray:
    source = np.asarray(mono, dtype=np.float32)
    if source.size == 0:
        return np.zeros((0, 2), dtype=np.float32)
    rng = random.Random(seed)
    hop = round(SAMPLE_RATE * 0.38)
    knot_count = source.size // hop + 2
    knots = np.asarray([rng.uniform(-0.42, 0.42) for _ in range(knot_count)])
    sample_positions = np.arange(source.size, dtype=np.float32)
    knot_positions = sample_positions / hop
    lower = np.floor(knot_positions).astype(np.int32)
    fraction = knot_positions - lower
    fraction = fraction * fraction * (3.0 - 2.0 * fraction)
    pan = knots[lower] * (1.0 - fraction) + knots[lower + 1] * fraction
    angle = (pan + 1.0) * (math.pi / 4.0)
    scaled = source * gain
    return np.column_stack((scaled * np.cos(angle), scaled * np.sin(angle))).astype(
        np.float32
    )


def _whisperize(mono: np.ndarray, seed: int, formant_lift: float = 1.065) -> np.ndarray:
    """Remove periodic voicing while preserving the source syllable timing."""
    source = np.asarray(mono, dtype=np.float32)
    if source.size < 2:
        return source.copy()
    source = source / max(float(np.max(np.abs(source))), 1e-9)

    fft_size = 2048
    hop = 256
    half = fft_size // 2
    window = np.hanning(fft_size).astype(np.float32)
    padded = np.pad(source, (half, half + hop), mode="constant")
    output = np.zeros_like(padded, dtype=np.float64)
    weight = np.zeros_like(padded, dtype=np.float64)
    bins = np.arange(fft_size // 2 + 1, dtype=np.float64)
    rng = np.random.default_rng(seed)

    for start in range(0, len(padded) - fft_size + 1, hop):
        frame = padded[start : start + fft_size] * window
        spectrum = np.fft.rfft(frame)
        magnitude = np.abs(spectrum)
        lifted = np.interp(
            bins / formant_lift, bins, magnitude, left=0.0, right=0.0
        )
        phases = rng.uniform(-math.pi, math.pi, size=lifted.size)
        phases[0] = 0.0
        phases[-1] = 0.0
        noise_spectrum = lifted * np.exp(1j * phases)
        noise_frame = np.fft.irfft(noise_spectrum, n=fft_size)
        output[start : start + fft_size] += noise_frame * window
        weight[start : start + fft_size] += window * window

    valid = weight > 1e-8
    output[valid] /= weight[valid]
    whisper = output[half : half + len(source)].astype(np.float32)
    return _peak_normalize(whisper, 1.0)


def _add_stereo_layer(base: np.ndarray, layer: np.ndarray, offset: int = 0) -> None:
    end = min(len(base), offset + len(layer))
    if end > offset:
        base[offset:end] += layer[: end - offset]


def _whisper_mix(speech: np.ndarray, understood: bool, seed: int) -> np.ndarray:
    whisper = _whisperize(speech, seed)
    if understood:
        main = _center_stereo(_peak_normalize(speech, 0.46))
        layer = _pan_drifting(whisper, seed + 101, 0.026)
        result = np.pad(main, ((0, max(0, len(layer) - len(main))), (0, 0)))
        _add_stereo_layer(result, layer)
        return result.astype(np.float32, copy=False)

    forward = _pan_drifting(whisper, seed + 101, 0.065)
    reverse = _pan_drifting(whisper[::-1].copy(), seed + 211, 0.060)
    offset = round(SAMPLE_RATE * 0.12)
    length = max(len(forward), offset + len(reverse))
    result = np.zeros((length, 2), dtype=np.float32)
    _add_stereo_layer(result, forward)
    _add_stereo_layer(result, reverse, offset)
    return result


def _celestial_bells(contour: str, seed: int, length_seconds: float = 4.0) -> np.ndarray:
    """Generate a fixed bell-only Celestial phrase, blended from handbells and a church-bell body."""
    contours: dict[str, list[tuple[float, str, float]]] = {
        "statement": [
            (0.00, "C5", 0.42), (0.42, "E5", 0.38), (0.84, "G5", 0.38),
            (1.31, "E5", 0.34), (1.68, "C5", 0.42),
        ],
        "question": [
            (0.00, "C5", 0.35), (0.31, "D5", 0.34), (0.62, "E5", 0.35),
            (0.93, "G5", 0.37), (1.24, "A5", 0.40), (1.58, "C6", 0.43),
        ],
        "emphatic": [
            (0.00, "C5", 0.42), (0.00, "E5", 0.37), (0.00, "G5", 0.40),
            (0.39, "C6", 0.48), (0.86, "G5", 0.40), (1.10, "E6", 0.43),
        ],
    }
    pitches = {
        "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99,
        "A5": 880.00, "C6": 1046.50, "E6": 1318.51,
    }
    events = contours.get(contour, contours["statement"])
    rng = random.Random(seed)
    count = round(SAMPLE_RATE * length_seconds)
    times = np.arange(count, dtype=np.float64) / SAMPLE_RATE
    output = np.zeros(count, dtype=np.float64)
    bell_ratios = (1.0, 2.01, 2.76, 4.08, 5.43, 6.82)
    bell_weights = (1.0, 0.52, 0.31, 0.20, 0.13, 0.08)
    gong_ratios = (0.50, 0.99, 1.49, 2.03, 2.71)
    gong_weights = (0.20, 0.62, 0.34, 0.22, 0.12)

    for event_start, note_name, velocity in events:
        relative = times - event_start
        active = relative >= 0
        t = np.maximum(relative, 0.0)
        bell_envelope = (1.0 - np.exp(-t / 0.010)) * np.exp(-t / 1.15)
        gong_envelope = (1.0 - np.exp(-t / 0.085)) * np.exp(-t / 1.52)
        shimmer = 0.93 + 0.07 * np.sin(2.0 * math.pi * 5.1 * t)
        fundamental = pitches[note_name]
        bell = np.zeros(count, dtype=np.float64)
        gong = np.zeros(count, dtype=np.float64)
        for ratio, weight in zip(bell_ratios, bell_weights):
            bell += weight * np.sin(
                2.0 * math.pi * fundamental * ratio * t + rng.uniform(0, 2.0 * math.pi)
            )
        for ratio, weight in zip(gong_ratios, gong_weights):
            gong += weight * np.sin(
                2.0 * math.pi * fundamental * ratio * t + rng.uniform(0, 2.0 * math.pi)
            )
        output += active * velocity * shimmer * (
            0.77 * bell_envelope * bell + 0.23 * gong_envelope * gong
        )

    return _center_stereo(_peak_normalize(output.astype(np.float32), 0.66))


def _fade_audio_fragment(fragment: np.ndarray, fade_ms: int = 4) -> np.ndarray:
    faded = fragment.astype(np.float32, copy=True)
    fade_samples = min(
        int(SAMPLE_RATE * fade_ms / 1000),
        faded.size // 3,
    )
    if fade_samples > 0:
        ramp = np.linspace(0.0, 1.0, fade_samples, dtype=np.float32)
        faded[:fade_samples] *= ramp
        faded[-fade_samples:] *= ramp[::-1]
    return faded


def _insert_audio_fragment(
    source: np.ndarray, position: int, fragment: np.ndarray
) -> np.ndarray:
    if fragment.size == 0:
        return source
    return np.concatenate(
        (source[:position], _fade_audio_fragment(fragment), source[position:])
    )


def _active_audio_bounds(source: np.ndarray) -> tuple[int, int]:
    if source.size == 0:
        return 0, 0
    window_size = min(source.size, max(1, int(SAMPLE_RATE * 0.012)))
    kernel = np.ones(window_size, dtype=np.float32) / window_size
    energy = np.convolve(np.abs(source), kernel, mode="same")
    threshold = max(0.012, float(energy.max()) * 0.08)
    active = np.flatnonzero(energy > threshold)
    if active.size == 0:
        return 0, source.size
    padding = int(SAMPLE_RATE * 0.025)
    return (
        max(0, int(active[0]) - padding),
        min(source.size, int(active[-1]) + padding),
    )


def _apply_layerone_effect(audio: np.ndarray) -> np.ndarray:
    if audio.size == 0:
        return audio.astype(np.float32, copy=True)

    source = audio.astype(np.float32, copy=False)
    held = np.repeat(source[::5], 5)[: source.size]
    crushed = np.round(held * 16.0) / 16.0
    sample_positions = np.arange(source.size, dtype=np.float32) / SAMPLE_RATE
    chopped = source * (
        0.68
        + 0.32
        * (np.sin(2.0 * np.pi * 43.0 * sample_positions) >= 0.0)
    )
    ringed = source * np.sin(2.0 * np.pi * 71.0 * sample_positions)

    echo = np.zeros_like(source)
    delay_a = int(SAMPLE_RATE * 0.009)
    delay_b = int(SAMPLE_RATE * 0.021)
    if source.size > delay_a:
        echo[delay_a:] += 0.65 * source[:-delay_a]
    if source.size > delay_b:
        echo[delay_b:] += 0.35 * source[:-delay_b]

    effected = (
        0.34 * source
        + 0.28 * crushed
        + 0.18 * chopped
        + 0.12 * echo
        + 0.08 * ringed
    )

    active_start, active_end = _active_audio_bounds(effected)
    active_span = max(1, active_end - active_start)
    first_position = active_start + int(active_span * 0.34)
    first_size = min(
        int(SAMPLE_RATE * 0.055),
        max(int(SAMPLE_RATE * 0.032), active_span // 7),
    )
    first_start = max(active_start, first_position - first_size)
    effected = _insert_audio_fragment(
        effected,
        first_position,
        effected[first_start:first_position],
    )

    active_start, active_end = _active_audio_bounds(effected)
    active_span = max(1, active_end - active_start)
    second_position = active_start + int(active_span * 0.67)
    second_size = min(
        int(SAMPLE_RATE * 0.038),
        max(int(SAMPLE_RATE * 0.022), active_span // 11),
    )
    second_start = max(active_start, second_position - second_size)
    reversed_fragment = effected[second_start:second_position][::-1]
    effected = _insert_audio_fragment(effected, second_position, reversed_fragment)

    active_start, active_end = _active_audio_bounds(effected)
    active_span = max(1, active_end - active_start)
    envelope = np.ones(effected.size, dtype=np.float32)
    for fraction, duration_ms, floor in (
        (0.23, 16, 0.06),
        (0.51, 22, 0.10),
        (0.79, 14, 0.04),
    ):
        center = active_start + int(active_span * fraction)
        dip_size = min(
            active_span,
            max(1, int(SAMPLE_RATE * duration_ms / 1000)),
        )
        dip_start = max(
            active_start,
            min(active_end - dip_size, center - dip_size // 2),
        )
        dip_end = dip_start + dip_size
        edge = min(int(SAMPLE_RATE * 0.003), dip_size // 2)
        envelope[dip_start:dip_end] = floor
        if edge > 0:
            envelope[dip_start : dip_start + edge] = np.linspace(
                1.0, floor, edge, dtype=np.float32
            )
            envelope[dip_end - edge : dip_end] = np.linspace(
                floor, 1.0, edge, dtype=np.float32
            )
    effected *= envelope

    peak = float(np.max(np.abs(effected)))
    if peak > 0.98:
        effected *= 0.98 / peak
    return effected.astype(np.float32, copy=False)


def _generate_chunks_worker(
    type_: str,
    slug: str,
    content_hash: str,
    document: SpeechDocument,
    plans: list[dict[str, Any]],
) -> None:
    status_key = _status_key(type_, slug, content_hash)
    offsets = Utf16OffsetMap(document.text)
    try:
        manifest = _initial_manifest(document, content_hash, plans)
        _atomic_json_write(_manifest_path(type_, slug, content_hash), manifest)
        _write_status(
            type_,
            slug,
            content_hash,
            {
                "status": "generating",
                "generated_chunks": 0,
                "total_chunks": len(plans),
                "playable": False,
            },
        )

        collected_chunks: list[np.ndarray] = []
        global_sample = 0
        previous_paragraph: int | None = None

        for plan in plans:
            chunk_parts: list[np.ndarray] = []
            chunk_start_sample = global_sample
            generated_statements: list[dict[str, Any]] = []

            for statement in plan["statements"]:
                paragraph_index = int(statement["paragraph"])
                if (
                    previous_paragraph is not None
                    and paragraph_index != previous_paragraph
                ):
                    gap = np.zeros((PARAGRAPH_GAP_SAMPLES, 2), dtype=np.float32)
                    chunk_parts.append(gap)
                    global_sample += len(gap)
                    preceding = (
                        generated_statements[-1]
                        if generated_statements
                        else manifest["statements"][-1]
                    )
                    preceding["end_ms"] = round(
                        global_sample * 1000 / SAMPLE_RATE, 3
                    )

                statement_text = statement.get("speech_text") or document.text[
                    statement["start"] : statement["end"]
                ]
                if statement["kind"] == "layerone":
                    statement_audio = _center_stereo(
                        _apply_layerone_effect(_synthesize_statement(statement_text))
                    )
                elif statement.get("language") == "celestial" and not statement.get(
                    "understood", False
                ):
                    statement_audio = _celestial_bells(
                        statement.get("contour", "statement"),
                        _stable_seed(content_hash, statement["start"], statement["end"]),
                    )
                elif statement.get("language") == "abyssal":
                    speech = _synthesize_statement(statement_text)
                    statement_audio = _whisper_mix(
                        speech,
                        bool(statement.get("understood", False)),
                        _stable_seed(content_hash, statement["start"], statement["end"]),
                    )
                else:
                    statement_audio = _center_stereo(
                        _peak_normalize(_synthesize_statement(statement_text), 0.46)
                    )

                start_sample = global_sample
                chunk_parts.append(statement_audio)
                global_sample += len(statement_audio)
                generated_statements.append(
                    {
                        "start": offsets.to_utf16(statement["start"]),
                        "end": offsets.to_utf16(statement["end"]),
                        "paragraph": paragraph_index,
                        "chunk": plan["index"],
                        "start_ms": round(start_sample * 1000 / SAMPLE_RATE, 3),
                        "end_ms": round(global_sample * 1000 / SAMPLE_RATE, 3),
                        **(
                            {
                                "language": statement["language"],
                                "understood": statement["understood"],
                            }
                            if statement.get("language")
                            else {}
                        ),
                    }
                )
                previous_paragraph = paragraph_index

            chunk_audio = (
                np.concatenate(chunk_parts)
                if chunk_parts
                else np.zeros((int(SAMPLE_RATE * 0.08), 2), dtype=np.float32)
            )
            chunk_path = _chunk_path(type_, slug, content_hash, plan["index"])
            chunk_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(chunk_path), chunk_audio, SAMPLE_RATE)
            collected_chunks.append(chunk_audio)

            chunk_manifest = manifest["chunks"][plan["index"]]
            chunk_manifest.update(
                {
                    "generated": True,
                    "start_ms": round(chunk_start_sample * 1000 / SAMPLE_RATE, 3),
                    "end_ms": round(global_sample * 1000 / SAMPLE_RATE, 3),
                }
            )
            manifest["statements"].extend(generated_statements)
            manifest["duration_ms"] = round(global_sample * 1000 / SAMPLE_RATE, 3)
            _atomic_json_write(_manifest_path(type_, slug, content_hash), manifest)

            generated = plan["index"] + 1
            _write_status(
                type_,
                slug,
                content_hash,
                {
                    "status": "generating",
                    "generated_chunks": generated,
                    "total_chunks": len(plans),
                    "playable": generated >= MIN_PLAYABLE_CHUNKS,
                },
            )

        full_audio = (
            np.concatenate(collected_chunks)
            if collected_chunks
            else np.zeros((int(SAMPLE_RATE * 0.08), 2), dtype=np.float32)
        )
        cache = _cache_path(type_, slug, content_hash)
        cache.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(cache), full_audio, SAMPLE_RATE)
        _write_status(
            type_,
            slug,
            content_hash,
            {
                "status": "ready",
                "generated_chunks": len(plans),
                "total_chunks": len(plans),
                "playable": True,
            },
        )
    except Exception as error:
        _reset_outputs(type_, slug, content_hash)
        _write_status(
            type_,
            slug,
            content_hash,
            {
                "status": "not_generated",
                "generated_chunks": 0,
                "total_chunks": 0,
                "playable": False,
                "error": str(error),
            },
        )
    finally:
        _release_lock(type_, slug, content_hash)
        with state_lock:
            generation_status.pop(status_key, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, pipeline, voice_pack

    _cleanup_cache_versions()
    (_version_root() / "blog").mkdir(parents=True, exist_ok=True)
    (_version_root() / "lore").mkdir(parents=True, exist_ok=True)

    model = KModel().to("cpu").eval()
    pipeline = KPipeline(
        lang_code="a", model=False, trf=False, repo_id="hexgrad/Kokoro-82M"
    )
    pipeline.g2p.lexicon.golds["kokoro"] = "kˈOkəɹO"
    voice_pack = pipeline.load_voice(VOICE)

    yield
    executor.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)


@app.post("/generate")
async def generate(req: GenerateRequest):
    _validate_type_and_slug(req.type, req.slug)
    _validate_identity(req.content_hash, req.cache_version)
    _validate_document(req.document, req.content_hash)

    cache = _cache_path(req.type, req.slug, req.content_hash)
    if cache.exists():
        return JSONResponse(
            content=_current_status(req.type, req.slug, req.content_hash),
            status_code=200,
        )

    if not _acquire_lock(req.type, req.slug, req.content_hash):
        return JSONResponse(
            content=_current_status(req.type, req.slug, req.content_hash),
            status_code=409,
        )

    statements = _statement_ranges(req.document)
    plans = _chunk_plans(statements)
    if not plans:
        _release_lock(req.type, req.slug, req.content_hash)
        raise HTTPException(
            status_code=400, detail="No valid text chunks to synthesize"
        )

    _delete_stale_hashes(req.type, req.slug, req.content_hash)
    _reset_outputs(req.type, req.slug, req.content_hash)
    manifest = _initial_manifest(req.document, req.content_hash, plans)
    _atomic_json_write(_manifest_path(req.type, req.slug, req.content_hash), manifest)
    _write_status(
        req.type,
        req.slug,
        req.content_hash,
        {
            "status": "generating",
            "generated_chunks": 0,
            "total_chunks": len(plans),
            "playable": False,
        },
    )
    executor.submit(
        _generate_chunks_worker,
        req.type,
        req.slug,
        req.content_hash,
        req.document,
        plans,
    )
    return JSONResponse(
        content=_current_status(req.type, req.slug, req.content_hash), status_code=202
    )


@app.get("/status")
async def status(slug: str, type: str, content_hash: str, cache_version: str):
    _validate_type_and_slug(type, slug)
    _validate_identity(content_hash, cache_version)
    return _current_status(type, slug, content_hash)


@app.get("/chunk/{type_}/{slug}/{index}")
async def chunk(
    type_: str,
    slug: str,
    index: int,
    content_hash: str,
    cache_version: str,
):
    _validate_type_and_slug(type_, slug)
    _validate_identity(content_hash, cache_version)
    if index < 0:
        raise HTTPException(status_code=400, detail="Chunk index must be >= 0")

    chunk_file = _chunk_path(type_, slug, content_hash, index)
    if chunk_file.exists():
        return FileResponse(
            chunk_file,
            media_type="audio/wav",
            filename=f"{slug}-{content_hash[:12]}-{index:04d}.wav",
            content_disposition_type="inline",
        )

    current = _current_status(type_, slug, content_hash)
    if current["status"] == "generating":
        raise HTTPException(status_code=425, detail="Chunk not ready yet")
    raise HTTPException(status_code=404, detail="Chunk not found")


@app.get("/audio/{type_}/{slug}")
async def audio(
    type_: str,
    slug: str,
    content_hash: str,
    cache_version: str,
):
    _validate_type_and_slug(type_, slug)
    _validate_identity(content_hash, cache_version)
    cache = _cache_path(type_, slug, content_hash)
    if not cache.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return RangeFileResponse(
        cache,
        media_type="audio/wav",
        filename=f"{slug}-{content_hash[:12]}.wav",
        content_disposition_type="inline",
    )
