import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf
from fastapi import HTTPException

import server
from server import (
    CACHE_DIRNAME,
    CACHE_VERSION,
    MAX_CHUNK_CHARS,
    PARAGRAPH_GAP_MS,
    SAMPLE_RATE,
    SpeechDocument,
    SpeechParagraph,
    _apply_layerone_effect,
    _calculate_document_hash,
    _chunk_plans,
    _cleanup_cache_versions,
    _delete_stale_hashes,
    _generate_chunks_worker,
    _manifest_path,
    _statement_ranges,
    _validate_document,
)


def make_document(text: str, paragraphs: list[tuple[int, int, str]]) -> SpeechDocument:
    return SpeechDocument(
        text=text,
        paragraphs=[
            SpeechParagraph(start=start, end=end, kind=kind)
            for start, end, kind in paragraphs
        ],
    )


class TtsServerTest(unittest.TestCase):
    def test_document_hash_and_offset_validation(self):
        document = make_document(
            "First paragraph. DIGITAL SIGNAL",
            [(0, 16, "prose"), (17, 31, "layerone")],
        )
        content_hash = _calculate_document_hash(document)

        _validate_document(document, content_hash)
        self.assertRegex(content_hash, r"^[a-f0-9]{64}$")

        with self.assertRaises(HTTPException) as mismatch:
            _validate_document(document, "0" * 64)
        self.assertEqual(mismatch.exception.status_code, 409)

        invalid = make_document("First paragraph.", [(1, 16, "prose")])
        with self.assertRaises(HTTPException) as offsets:
            _validate_document(invalid, _calculate_document_hash(invalid))
        self.assertEqual(offsets.exception.status_code, 400)

    def test_statement_and_chunk_ranges_are_bounded_and_cover_long_prose(self):
        text = " ".join(f"word{index}" for index in range(500)) + "."
        document = make_document(text, [(0, len(text), "prose")])

        statements = _statement_ranges(document)
        plans = _chunk_plans(statements)

        self.assertGreater(len(statements), 1)
        self.assertGreater(len(plans), 1)
        self.assertTrue(
            all(
                statement["end"] - statement["start"] <= MAX_CHUNK_CHARS
                for statement in statements
            )
        )
        self.assertTrue(
            all(plan["end"] - plan["start"] <= MAX_CHUNK_CHARS for plan in plans)
        )
        self.assertEqual(statements[0]["start"], 0)
        self.assertEqual(statements[-1]["end"], len(text))

    def test_statement_ranges_keep_closing_dialogue_quotes(self):
        text = 'She said "Hello." Then she left.'
        document = make_document(text, [(0, len(text), "prose")])

        statements = _statement_ranges(document)

        self.assertEqual(
            [text[statement["start"] : statement["end"]] for statement in statements],
            ['She said "Hello."', "Then she left."],
        )

    def test_worker_writes_incremental_exact_timings_and_500ms_paragraph_gap(self):
        document = make_document(
            "First. Second paragraph.",
            [(0, 6, "prose"), (7, 24, "layerone")],
        )
        content_hash = _calculate_document_hash(document)
        plans = _chunk_plans(_statement_ranges(document))

        with tempfile.TemporaryDirectory() as temporary:
            with (
                patch.object(server, "TTS_DIR", Path(temporary)),
                patch.object(
                    server,
                    "_synthesize_statement",
                    return_value=np.full(SAMPLE_RATE // 10, 0.25, dtype=np.float32),
                ),
            ):
                _generate_chunks_worker(
                    "blog", "test-post", content_hash, document, plans
                )

                manifest = json.loads(
                    _manifest_path("blog", "test-post", content_hash).read_text(
                        encoding="utf-8"
                    )
                )
                audio, rate = sf.read(
                    server._cache_path("blog", "test-post", content_hash),
                    dtype="float32",
                )

        self.assertEqual(rate, SAMPLE_RATE)
        self.assertEqual(manifest["paragraph_gap_ms"], PARAGRAPH_GAP_MS)
        self.assertEqual(manifest["statements"][0]["start_ms"], 0)
        self.assertEqual(manifest["statements"][0]["end_ms"], 100)
        self.assertEqual(manifest["statements"][1]["start_ms"], 600)
        self.assertEqual(manifest["statements"][1]["end_ms"], 700)
        self.assertEqual(manifest["duration_ms"], 700)
        self.assertEqual(len(audio), int(SAMPLE_RATE * 0.7))
        gap = audio[SAMPLE_RATE // 10 : SAMPLE_RATE // 10 + SAMPLE_RATE // 2]
        self.assertTrue(np.allclose(gap, 0.0))

    def test_layerone_effect_is_deterministic_subtle_and_non_identity(self):
        source = np.linspace(-0.8, 0.8, SAMPLE_RATE // 4, dtype=np.float32)

        first = _apply_layerone_effect(source)
        second = _apply_layerone_effect(source)

        self.assertTrue(np.array_equal(first, second))
        self.assertFalse(np.array_equal(first, source))
        self.assertLess(float(np.mean(np.abs(first - source))), 0.03)
        self.assertLessEqual(float(np.max(np.abs(first))), 1.0)

    def test_startup_removes_only_legacy_and_old_version_directories(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in (
                "blog",
                "lore",
                "cache-v1",
                "cache-v9",
                CACHE_DIRNAME,
                "keep-me",
            ):
                (root / name).mkdir()

            with patch.object(server, "TTS_DIR", root):
                _cleanup_cache_versions()

            self.assertFalse((root / "blog").exists())
            self.assertFalse((root / "lore").exists())
            self.assertFalse((root / "cache-v1").exists())
            self.assertFalse((root / "cache-v9").exists())
            self.assertTrue((root / CACHE_DIRNAME).exists())
            self.assertTrue((root / "keep-me").exists())

    def test_new_generation_deletes_stale_hashes_for_the_same_slug_only(self):
        current_hash = "a" * 64
        stale_hash = "b" * 64
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with patch.object(server, "TTS_DIR", root):
                current = server._cache_root("lore", "story", current_hash)
                stale = server._cache_root("lore", "story", stale_hash)
                other_slug = server._cache_root("lore", "other-story", stale_hash)
                current.mkdir(parents=True)
                stale.mkdir(parents=True)
                other_slug.mkdir(parents=True)

                _delete_stale_hashes("lore", "story", current_hash)

                self.assertTrue(current.exists())
                self.assertFalse(stale.exists())
                self.assertTrue(other_slug.exists())

    def test_cache_version_is_explicit(self):
        self.assertEqual(CACHE_VERSION, "2")
        self.assertEqual(CACHE_DIRNAME, "cache-v2")


if __name__ == "__main__":
    unittest.main()
