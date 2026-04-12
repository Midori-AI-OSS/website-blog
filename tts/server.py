import asyncio
import re
import struct
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from kokoro import KModel, KPipeline
from pydantic import BaseModel

VOICE = "af_heart"
SAMPLE_RATE = 24000
TTS_DIR = Path("/tmp/tts")
LOCK_TIMEOUT = 300

active_locks: dict[str, float] = {}
model: KModel | None = None
pipeline: KPipeline | None = None
voice_pack = None
executor = ThreadPoolExecutor(max_workers=1)


def _safe_segment(value: str) -> str:
    return value.replace("/", "_").replace("..", "_").strip() or "unknown"


def _cache_path(type_: str, slug: str) -> Path:
    return TTS_DIR / _safe_segment(type_) / f"{_safe_segment(slug)}.wav"


def _lock_key(type_: str, slug: str) -> str:
    return f"{type_}:{slug}"


def _is_locked(type_: str, slug: str) -> bool:
    key = _lock_key(type_, slug)
    if key not in active_locks:
        return False
    if time.time() - active_locks[key] > LOCK_TIMEOUT:
        del active_locks[key]
        return False
    return True


def _acquire_lock(type_: str, slug: str) -> bool:
    if _is_locked(type_, slug):
        return False
    active_locks[_lock_key(type_, slug)] = time.time()
    return True


def _release_lock(type_: str, slug: str):
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


STREAMING_DATA_SIZE = 0xFFFFFFFF


def _wav_header(sample_rate: int, channels: int, bps: int, data_size: int) -> bytes:
    byte_rate = sample_rate * channels * bps // 8
    block_align = channels * bps // 8
    chunk_size = min(36 + data_size, STREAMING_DATA_SIZE)
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bps,
        b"data",
        min(data_size, STREAMING_DATA_SIZE),
    )


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

    yield
    executor.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)


class GenerateRequest(BaseModel):
    text: str
    slug: str
    type: str


@app.post("/generate")
async def generate(req: GenerateRequest):
    cache = _cache_path(req.type, req.slug)

    if cache.exists():
        return FileResponse(
            cache,
            media_type="audio/wav",
            filename=f"{req.slug}.wav",
        )

    if not _acquire_lock(req.type, req.slug):
        raise HTTPException(
            status_code=409,
            detail="Audio is already being generated for this post",
        )

    async def _stream():
        queue: asyncio.Queue = asyncio.Queue()
        cleaned = _clean_text(req.text)

        def _worker():
            chunks = []
            try:
                queue.put_nowait(_wav_header(SAMPLE_RATE, 1, 16, STREAMING_DATA_SIZE))
                for _, ps, _ in pipeline(
                    cleaned, voice=VOICE, speed=1, split_pattern=r"\n+"
                ):
                    ref_s = voice_pack[len(ps) - 1]
                    audio = model(ps, ref_s, 1)
                    np_audio = audio.numpy()
                    chunks.append(np_audio)
                    pcm = (np_audio * 32767).astype(np.int16).tobytes()
                    queue.put_nowait(pcm)
                if chunks:
                    full = np.concatenate(chunks)
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    sf.write(str(cache), full, SAMPLE_RATE)
            except Exception as e:
                queue.put_nowait(e)
            finally:
                _release_lock(req.type, req.slug)
                queue.put_nowait(None)

        asyncio.get_running_loop().run_in_executor(executor, _worker)

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise HTTPException(status_code=500, detail=str(item))
            yield item

    return StreamingResponse(_stream(), media_type="audio/wav")


@app.get("/status")
async def status(slug: str, type: str):
    if _is_locked(type, slug):
        return {"status": "generating"}
    if _cache_path(type, slug).exists():
        return {"status": "ready"}
    return {"status": "not_generated"}


@app.get("/audio/{type_}/{slug}")
async def audio(type_: str, slug: str):
    cache = _cache_path(type_, slug)
    if not cache.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(
        cache,
        media_type="audio/wav",
        filename=f"{slug}.wav",
    )
