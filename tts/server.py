import json
import re
import shutil
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from kokoro import KModel, KPipeline
from pydantic import BaseModel

VOICE = "af_heart"
SAMPLE_RATE = 24000
TTS_DIR = Path("/tmp/tts")
LOCK_TIMEOUT = 300
MIN_PLAYABLE_CHUNKS = 3
TARGET_CHUNK_CHARS = 480
MAX_CHUNK_CHARS = 760
VALID_TYPES = {"blog", "lore"}

active_locks: dict[str, float] = {}
generation_status: dict[str, dict[str, Any]] = {}
state_lock = threading.Lock()
model: KModel | None = None
pipeline: KPipeline | None = None
voice_pack = None
executor = ThreadPoolExecutor(max_workers=1)


def _safe_segment(value: str) -> str:
    return value.replace("/", "_").replace("..", "_").strip() or "unknown"


def _cache_path(type_: str, slug: str) -> Path:
    return TTS_DIR / _safe_segment(type_) / f"{_safe_segment(slug)}.wav"


def _chunks_dir(type_: str, slug: str) -> Path:
    return TTS_DIR / _safe_segment(type_) / "_chunks" / _safe_segment(slug)


def _chunk_path(type_: str, slug: str, index: int) -> Path:
    return _chunks_dir(type_, slug) / f"{index:04d}.wav"


def _status_path(type_: str, slug: str) -> Path:
    return _chunks_dir(type_, slug) / "status.json"


def _lock_key(type_: str, slug: str) -> str:
    return f"{type_}:{slug}"


def _is_locked(type_: str, slug: str) -> bool:
    key = _lock_key(type_, slug)
    now = time.time()
    with state_lock:
        locked_at = active_locks.get(key)
        if locked_at is None:
            return False
        if now - locked_at > LOCK_TIMEOUT:
            active_locks.pop(key, None)
            return False
        return True


def _acquire_lock(type_: str, slug: str) -> bool:
    key = _lock_key(type_, slug)
    now = time.time()
    with state_lock:
        locked_at = active_locks.get(key)
        if locked_at is not None and now - locked_at <= LOCK_TIMEOUT:
            return False
        active_locks[key] = now
        return True


def _release_lock(type_: str, slug: str):
    with state_lock:
        active_locks.pop(_lock_key(type_, slug), None)


def _clean_text(text: str) -> str:
    text = re.sub(r"\{\{image:[^}]*\}\}", "", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"^---+$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_long_sentence(sentence: str, limit: int) -> list[str]:
    words = sentence.split()
    if not words:
        return []

    parts: list[str] = []
    current: list[str] = []
    current_len = 0

    for word in words:
        word_len = len(word)
        if not current:
            if word_len <= limit:
                current = [word]
                current_len = word_len
            else:
                for i in range(0, word_len, limit):
                    parts.append(word[i : i + limit])
            continue

        projected_len = current_len + 1 + word_len
        if projected_len <= limit:
            current.append(word)
            current_len = projected_len
            continue

        parts.append(" ".join(current))
        if word_len <= limit:
            current = [word]
            current_len = word_len
        else:
            current = []
            current_len = 0
            for i in range(0, word_len, limit):
                parts.append(word[i : i + limit])

    if current:
        parts.append(" ".join(current))
    return parts


def _text_chunks(cleaned: str) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", cleaned) if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def flush_current():
        nonlocal current_len
        if current:
            chunks.append(" ".join(current).strip())
            current.clear()
            current_len = 0

    for paragraph in paragraphs:
        sentence_candidates = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", paragraph) if s.strip()
        ]
        if not sentence_candidates:
            sentence_candidates = [paragraph]

        normalized_sentences: list[str] = []
        for sentence in sentence_candidates:
            if len(sentence) > MAX_CHUNK_CHARS:
                normalized_sentences.extend(
                    _split_long_sentence(sentence, MAX_CHUNK_CHARS)
                )
            else:
                normalized_sentences.append(sentence)

        for sentence in normalized_sentences:
            sentence_len = len(sentence)
            if not current:
                current = [sentence]
                current_len = sentence_len
                continue

            projected_len = current_len + 1 + sentence_len
            if projected_len > MAX_CHUNK_CHARS:
                flush_current()
                current = [sentence]
                current_len = sentence_len
                continue

            if current_len >= TARGET_CHUNK_CHARS:
                flush_current()
                current = [sentence]
                current_len = sentence_len
                continue

            current.append(sentence)
            current_len = projected_len

    flush_current()
    return [chunk for chunk in chunks if chunk]


def _default_status() -> dict[str, Any]:
    return {
        "status": "not_generated",
        "generated_chunks": 0,
        "total_chunks": 0,
        "playable": False,
    }


def _normalize_status(payload: dict[str, Any]) -> dict[str, Any]:
    status = payload.get("status", "not_generated")
    if status not in {"not_generated", "generating", "ready"}:
        status = "not_generated"

    total_chunks = max(0, int(payload.get("total_chunks", 0) or 0))
    generated_chunks = max(0, int(payload.get("generated_chunks", 0) or 0))
    if total_chunks > 0:
        generated_chunks = min(generated_chunks, total_chunks)
    else:
        generated_chunks = 0

    playable = bool(payload.get("playable", False))
    if status == "ready":
        playable = True
        if total_chunks > 0:
            generated_chunks = total_chunks

    normalized: dict[str, Any] = {
        "status": status,
        "generated_chunks": generated_chunks,
        "total_chunks": total_chunks,
        "playable": playable,
    }

    error = payload.get("error")
    if isinstance(error, str) and error:
        normalized["error"] = error

    return normalized


def _write_status(type_: str, slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_status(payload)
    key = _lock_key(type_, slug)
    path = _status_path(type_, slug)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(normalized), encoding="utf-8")
    tmp_path.replace(path)
    with state_lock:
        generation_status[key] = normalized
    return normalized


def _read_status(type_: str, slug: str) -> dict[str, Any] | None:
    key = _lock_key(type_, slug)
    with state_lock:
        cached = generation_status.get(key)
    if cached is not None:
        return dict(cached)

    path = _status_path(type_, slug)
    if not path.exists():
        return None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None
    normalized = _normalize_status(payload)
    with state_lock:
        generation_status[key] = normalized
    return dict(normalized)


def _chunk_file_count(type_: str, slug: str) -> int:
    chunk_dir = _chunks_dir(type_, slug)
    if not chunk_dir.exists():
        return 0
    return sum(1 for _ in chunk_dir.glob("*.wav"))


def _current_status(type_: str, slug: str) -> dict[str, Any]:
    status = _read_status(type_, slug)
    cache_exists = _cache_path(type_, slug).exists()
    locked = _is_locked(type_, slug)

    if status is None:
        if cache_exists:
            total = _chunk_file_count(type_, slug)
            return _write_status(
                type_,
                slug,
                {
                    "status": "ready",
                    "generated_chunks": total,
                    "total_chunks": total,
                    "playable": True,
                },
            )
        if locked:
            return {
                "status": "generating",
                "generated_chunks": 0,
                "total_chunks": 0,
                "playable": False,
            }
        return _default_status()

    if cache_exists:
        total = status.get("total_chunks", 0) or _chunk_file_count(type_, slug)
        return _write_status(
            type_,
            slug,
            {
                **status,
                "status": "ready",
                "generated_chunks": total,
                "total_chunks": total,
                "playable": True,
            },
        )

    if locked:
        generated = int(status.get("generated_chunks", 0) or 0)
        return _normalize_status(
            {
                **status,
                "status": "generating",
                "playable": generated >= MIN_PLAYABLE_CHUNKS,
            }
        )

    if status.get("status") == "ready" and not cache_exists:
        return _default_status()

    return status


def _reset_outputs(type_: str, slug: str):
    cache = _cache_path(type_, slug)
    chunks = _chunks_dir(type_, slug)
    if chunks.exists():
        shutil.rmtree(chunks, ignore_errors=True)
    cache.unlink(missing_ok=True)


def _synthesize_chunk(text: str) -> np.ndarray:
    if model is None or pipeline is None or voice_pack is None:
        raise RuntimeError("TTS model is not initialized")

    parts: list[np.ndarray] = []
    for _, ps, _ in pipeline(text, voice=VOICE, speed=0.95, split_pattern=r"\n+"):
        ref_s = voice_pack[len(ps) - 1]
        audio = model(ps, ref_s, 1)
        parts.append(audio.numpy())

    if not parts:
        return np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
    return np.concatenate(parts)


def _generate_chunks_worker(type_: str, slug: str, chunks: list[str]):
    key = _lock_key(type_, slug)
    try:
        collected: list[np.ndarray] = []
        total = len(chunks)
        _write_status(
            type_,
            slug,
            {
                "status": "generating",
                "generated_chunks": 0,
                "total_chunks": total,
                "playable": False,
            },
        )

        for index, chunk_text in enumerate(chunks):
            audio_chunk = _synthesize_chunk(chunk_text)
            chunk_path = _chunk_path(type_, slug, index)
            chunk_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(chunk_path), audio_chunk, SAMPLE_RATE)
            collected.append(audio_chunk)

            generated = index + 1
            _write_status(
                type_,
                slug,
                {
                    "status": "generating",
                    "generated_chunks": generated,
                    "total_chunks": total,
                    "playable": generated >= MIN_PLAYABLE_CHUNKS,
                },
            )

        full_audio = (
            np.concatenate(collected)
            if collected
            else np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
        )
        cache = _cache_path(type_, slug)
        cache.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(cache), full_audio, SAMPLE_RATE)

        _write_status(
            type_,
            slug,
            {
                "status": "ready",
                "generated_chunks": total,
                "total_chunks": total,
                "playable": True,
            },
        )
    except Exception as error:
        _reset_outputs(type_, slug)
        _write_status(
            type_,
            slug,
            {
                "status": "not_generated",
                "generated_chunks": 0,
                "total_chunks": 0,
                "playable": False,
                "error": str(error),
            },
        )
    finally:
        _release_lock(type_, slug)
        with state_lock:
            generation_status.pop(key, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, pipeline, voice_pack

    model = KModel().to("cpu").eval()
    pipeline = KPipeline(
        lang_code="a", model=False, trf=False, repo_id="hexgrad/Kokoro-82M"
    )
    pipeline.g2p.lexicon.golds["kokoro"] = "kˈOkəɹO"
    voice_pack = pipeline.load_voice(VOICE)

    TTS_DIR.mkdir(parents=True, exist_ok=True)
    (TTS_DIR / "blog").mkdir(parents=True, exist_ok=True)
    (TTS_DIR / "lore").mkdir(parents=True, exist_ok=True)
    (TTS_DIR / "blog" / "_chunks").mkdir(parents=True, exist_ok=True)
    (TTS_DIR / "lore" / "_chunks").mkdir(parents=True, exist_ok=True)

    yield
    executor.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)


class GenerateRequest(BaseModel):
    text: str
    slug: str
    type: str


@app.post("/generate")
async def generate(req: GenerateRequest):
    if req.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail='Invalid type, expected "blog" or "lore"')

    cleaned = _clean_text(req.text)
    if not cleaned:
        raise HTTPException(status_code=400, detail="No readable text to synthesize")

    cache = _cache_path(req.type, req.slug)
    if cache.exists():
        return JSONResponse(content=_current_status(req.type, req.slug), status_code=200)

    if not _acquire_lock(req.type, req.slug):
        return JSONResponse(content=_current_status(req.type, req.slug), status_code=409)

    chunks = _text_chunks(cleaned)
    if not chunks:
        _release_lock(req.type, req.slug)
        raise HTTPException(status_code=400, detail="No valid text chunks to synthesize")

    _reset_outputs(req.type, req.slug)
    _write_status(
        req.type,
        req.slug,
        {
            "status": "generating",
            "generated_chunks": 0,
            "total_chunks": len(chunks),
            "playable": False,
        },
    )
    executor.submit(_generate_chunks_worker, req.type, req.slug, chunks)

    return JSONResponse(content=_current_status(req.type, req.slug), status_code=202)


@app.get("/status")
async def status(slug: str, type: str):
    if type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail='Invalid type, expected "blog" or "lore"')
    return _current_status(type, slug)


@app.get("/chunk/{type_}/{slug}/{index}")
async def chunk(type_: str, slug: str, index: int):
    if type_ not in VALID_TYPES:
        raise HTTPException(status_code=400, detail='Invalid type, expected "blog" or "lore"')
    if index < 0:
        raise HTTPException(status_code=400, detail="Chunk index must be >= 0")

    chunk_file = _chunk_path(type_, slug, index)
    if chunk_file.exists():
        return FileResponse(
            chunk_file,
            media_type="audio/wav",
            filename=f"{slug}-{index:04d}.wav",
        )

    current = _current_status(type_, slug)
    if current["status"] == "generating":
        raise HTTPException(status_code=425, detail="Chunk not ready yet")

    raise HTTPException(status_code=404, detail="Chunk not found")


@app.get("/audio/{type_}/{slug}")
async def audio(type_: str, slug: str):
    if type_ not in VALID_TYPES:
        raise HTTPException(status_code=400, detail='Invalid type, expected "blog" or "lore"')
    cache = _cache_path(type_, slug)
    if not cache.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(
        cache,
        media_type="audio/wav",
        filename=f"{slug}.wav",
    )
