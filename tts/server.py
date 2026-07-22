import hashlib
import json
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

VOICE = "af_heart,af_bella"
SAMPLE_RATE = 24000
TTS_DIR = Path("/tmp/tts")
CACHE_VERSION = "2"
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
VERSION_DIR_RE = re.compile(r"^cache-v\d+$")

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


class SpeechDocument(BaseModel):
    text: str
    paragraphs: list[SpeechParagraph]


class GenerateRequest(BaseModel):
    document: SpeechDocument
    slug: str
    type: str
    content_hash: str
    cache_version: str


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
    return f"tts-document-v1\n{document.text}\n{paragraph_identity}"


def _calculate_document_hash(document: SpeechDocument) -> str:
    return hashlib.sha256(_document_hash_input(document).encode("utf-8")).hexdigest()


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

    expected_start = 0
    for index, paragraph in enumerate(document.paragraphs):
        if paragraph.start != expected_start or paragraph.end <= paragraph.start:
            raise HTTPException(status_code=400, detail="Invalid paragraph offsets")
        if index > 0 and text[paragraph.start - 1] != " ":
            raise HTTPException(
                status_code=400, detail="Paragraphs must be separated by one space"
            )
        if paragraph.end > len(text):
            raise HTTPException(
                status_code=400, detail="Paragraph offset exceeds text length"
            )
        paragraph_text = text[paragraph.start : paragraph.end]
        if paragraph_text != paragraph_text.strip():
            raise HTTPException(
                status_code=400, detail="Paragraph text is not canonical"
            )
        expected_start = paragraph.end + (
            1 if index < len(document.paragraphs) - 1 else 0
        )

    if document.paragraphs[-1].end != len(text):
        raise HTTPException(
            status_code=400, detail="Paragraph offsets do not cover speech text"
        )
    if _calculate_document_hash(document) != content_hash:
        raise HTTPException(
            status_code=409, detail="Content hash does not match speech document"
        )


def _version_root() -> Path:
    return TTS_DIR / CACHE_DIRNAME


def _slug_root(type_: str, slug: str) -> Path:
    return _version_root() / type_ / slug


def _cache_root(type_: str, slug: str, content_hash: str) -> Path:
    return _slug_root(type_, slug) / content_hash


def _cache_path(type_: str, slug: str, content_hash: str) -> Path:
    return _cache_root(type_, slug, content_hash) / "audio.wav"


def _chunks_dir(type_: str, slug: str, content_hash: str) -> Path:
    return _cache_root(type_, slug, content_hash) / "chunks"


def _chunk_path(type_: str, slug: str, content_hash: str, index: int) -> Path:
    return _chunks_dir(type_, slug, content_hash) / f"{index:04d}.wav"


def _status_path(type_: str, slug: str, content_hash: str) -> Path:
    return _cache_root(type_, slug, content_hash) / "status.json"


def _manifest_path(type_: str, slug: str, content_hash: str) -> Path:
    return _cache_root(type_, slug, content_hash) / "manifest.json"


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
    if path.parent != expected_parent or (not path.exists() and not path.is_symlink()):
        return
    if path.is_symlink() or path.is_file():
        path.unlink(missing_ok=True)
        return
    if path.is_dir():
        shutil.rmtree(path)


def _cleanup_cache_versions() -> None:
    TTS_DIR.mkdir(parents=True, exist_ok=True)
    for child in TTS_DIR.iterdir():
        if child.name in VALID_TYPES or (
            VERSION_DIR_RE.fullmatch(child.name) and child.name != CACHE_DIRNAME
        ):
            _safe_remove(child, TTS_DIR)


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
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary.replace(path)


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
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
    for paragraph_index, paragraph in enumerate(document.paragraphs):
        paragraph_text = document.text[paragraph.start : paragraph.end]
        relative_start = 0
        boundaries = list(re.finditer(r"[.!?](?:[\"')\]]*)\s+", paragraph_text))
        relative_ranges: list[tuple[int, int]] = []
        for boundary in boundaries:
            sentence_end = len(boundary.group(0).rstrip()) + boundary.start()
            relative_ranges.append((relative_start, sentence_end))
            relative_start = boundary.end()
        relative_ranges.append((relative_start, len(paragraph_text)))

        for relative_range in relative_ranges:
            start = paragraph.start + relative_range[0]
            end = paragraph.start + relative_range[1]
            while start < end and document.text[start] == " ":
                start += 1
            while end > start and document.text[end - 1] == " ":
                end -= 1
            if start >= end:
                continue
            for bounded_start, bounded_end in _split_long_range(
                document.text, start, end
            ):
                statements.append(
                    {
                        "start": bounded_start,
                        "end": bounded_end,
                        "paragraph": paragraph_index,
                        "kind": paragraph.kind,
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
    return {
        "cache_version": CACHE_VERSION,
        "content_hash": content_hash,
        "text_length": len(document.text),
        "paragraphs": [paragraph.model_dump() for paragraph in document.paragraphs],
        "paragraph_gap_ms": PARAGRAPH_GAP_MS,
        "duration_ms": 0,
        "chunks": [
            {
                "index": plan["index"],
                "start": plan["start"],
                "end": plan["end"],
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


def _apply_layerone_effect(audio: np.ndarray) -> np.ndarray:
    if audio.size == 0:
        return audio.astype(np.float32, copy=True)
    source = audio.astype(np.float32, copy=False)
    quantized = np.round(source * 96.0) / 96.0
    sample_positions = np.arange(source.size, dtype=np.float32)
    modulation = 1.0 + 0.025 * np.sin(
        2.0 * np.pi * 31.0 * sample_positions / SAMPLE_RATE
    )
    delayed = np.zeros_like(source)
    delay_samples = max(1, int(SAMPLE_RATE * 0.006))
    delayed[delay_samples:] = quantized[:-delay_samples]
    effected = 0.88 * source + 0.09 * quantized * modulation + 0.03 * delayed
    return np.clip(effected, -1.0, 1.0).astype(np.float32, copy=False)


def _generate_chunks_worker(
    type_: str,
    slug: str,
    content_hash: str,
    document: SpeechDocument,
    plans: list[dict[str, Any]],
) -> None:
    status_key = _status_key(type_, slug, content_hash)
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
                    gap = np.zeros(PARAGRAPH_GAP_SAMPLES, dtype=np.float32)
                    chunk_parts.append(gap)
                    global_sample += gap.size

                statement_text = document.text[statement["start"] : statement["end"]]
                statement_audio = _synthesize_statement(statement_text)
                if statement["kind"] == "layerone":
                    statement_audio = _apply_layerone_effect(statement_audio)

                start_sample = global_sample
                chunk_parts.append(statement_audio)
                global_sample += statement_audio.size
                generated_statements.append(
                    {
                        "start": statement["start"],
                        "end": statement["end"],
                        "paragraph": paragraph_index,
                        "chunk": plan["index"],
                        "start_ms": round(start_sample * 1000 / SAMPLE_RATE, 3),
                        "end_ms": round(global_sample * 1000 / SAMPLE_RATE, 3),
                    }
                )
                previous_paragraph = paragraph_index

            chunk_audio = (
                np.concatenate(chunk_parts)
                if chunk_parts
                else np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
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
            else np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
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
    return FileResponse(
        cache,
        media_type="audio/wav",
        filename=f"{slug}-{content_hash[:12]}.wav",
        content_disposition_type="inline",
    )
