import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf
from fastapi import HTTPException
from fastapi.testclient import TestClient

import server
from server import (
    CACHE_DIRNAME,
    CACHE_VERSION,
    MAX_CHUNK_CHARS,
    OFFSET_UNIT,
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
        offset_unit=OFFSET_UNIT,
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
        synthesized = np.full(SAMPLE_RATE // 10, 0.25, dtype=np.float32)
        expected_layerone = _apply_layerone_effect(synthesized)
        expected_end_ms = round(
            600 + expected_layerone.size * 1000 / SAMPLE_RATE,
            3,
        )

        with tempfile.TemporaryDirectory() as temporary:
            with (
                patch.object(server, "TTS_DIR", Path(temporary)),
                patch.object(
                    server,
                    "_synthesize_statement",
                    return_value=synthesized,
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
        self.assertEqual(manifest["statements"][0]["end_ms"], 600)
        self.assertEqual(manifest["statements"][1]["start_ms"], 600)
        self.assertEqual(manifest["statements"][1]["end_ms"], expected_end_ms)
        self.assertEqual(manifest["duration_ms"], expected_end_ms)
        self.assertEqual(
            len(audio),
            SAMPLE_RATE // 10 + SAMPLE_RATE // 2 + expected_layerone.size,
        )
        gap = audio[SAMPLE_RATE // 10 : SAMPLE_RATE // 10 + SAMPLE_RATE // 2]
        self.assertTrue(np.allclose(gap, 0.0))

    def test_paragraph_gap_attributed_across_chunk_boundaries(self):
        document = make_document(
            "Para zero. Para one. Para two.",
            [
                (0, 10, "prose"),
                (11, 20, "layerone"),
                (21, 30, "prose"),
            ],
        )
        content_hash = _calculate_document_hash(document)

        with patch.object(server, "TARGET_CHUNK_CHARS", 1):
            statements = _statement_ranges(document)
            plans = _chunk_plans(statements)

        self.assertGreaterEqual(
            len(plans),
            2,
            "Expected at least two chunks to exercise cross-chunk gaps",
        )

        synthesized = np.full(SAMPLE_RATE // 10, 0.25, dtype=np.float32)

        with tempfile.TemporaryDirectory() as temporary:
            with (
                patch.object(server, "TTS_DIR", Path(temporary)),
                patch.object(
                    server,
                    "_synthesize_statement",
                    return_value=synthesized,
                ),
            ):
                _generate_chunks_worker(
                    "blog", "cross-chunk-post", content_hash, document, plans
                )
                manifest = json.loads(
                    _manifest_path(
                        "blog", "cross-chunk-post", content_hash
                    ).read_text(encoding="utf-8")
                )

        stmts = manifest["statements"]
        self.assertEqual(len(stmts), 3)
        self.assertEqual(stmts[0]["start_ms"], 0)
        # Statement 0 is the only prose statement in paragraph 0 (100 ms audio).
        # Gap before paragraph 1 extends statement 0 to 600 ms.
        self.assertEqual(stmts[0]["end_ms"], 600)
        # Statement 1 (layerone, paragraph 1) starts after the gap.
        self.assertEqual(stmts[1]["start_ms"], 600)
        # Gap before paragraph 2 extends statement 1's end_ms.
        # Layer‑one audio is longer than raw 100 ms due to the glitch effect.
        gap_before_p2_ms = stmts[2]["start_ms"] - stmts[1]["start_ms"]
        self.assertGreater(gap_before_p2_ms, 0)
        self.assertEqual(stmts[1]["end_ms"], stmts[2]["start_ms"])
        # Statement 2 starts at the end of the extended layer‑one block.
        self.assertEqual(stmts[2]["start_ms"], manifest["duration_ms"] - 100)

    def test_astral_utf16_offsets_validate_and_round_trip_through_manifest(self):
        document = make_document(
            "Launch 🚀 now. Second 🧡 paragraph.",
            [(0, 14, "prose"), (15, 35, "layerone")],
        )
        content_hash = _calculate_document_hash(document)
        _validate_document(document, content_hash)
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
                    "blog", "astral-post", content_hash, document, plans
                )
                manifest = json.loads(
                    _manifest_path("blog", "astral-post", content_hash).read_text(
                        encoding="utf-8"
                    )
                )

        self.assertEqual(manifest["offset_unit"], OFFSET_UNIT)
        self.assertEqual(manifest["text_length"], 35)
        self.assertEqual(manifest["paragraphs"], [
            {"start": 0, "end": 14, "kind": "prose"},
            {"start": 15, "end": 35, "kind": "layerone"},
        ])
        self.assertEqual(
            [(statement["start"], statement["end"]) for statement in manifest["statements"]],
            [(0, 14), (15, 35)],
        )

        split_surrogate_pair = make_document("🚀 text", [(0, 1, "prose")])
        with self.assertRaises(HTTPException) as invalid_offsets:
            _validate_document(
                split_surrogate_pair, _calculate_document_hash(split_surrogate_pair)
            )
        self.assertEqual(invalid_offsets.exception.status_code, 400)

    def test_layerone_effect_is_deterministic_glitchy_and_peak_limited(self):
        sample_positions = np.arange(SAMPLE_RATE, dtype=np.float32) / SAMPLE_RATE
        envelope = np.zeros(SAMPLE_RATE, dtype=np.float32)
        envelope[SAMPLE_RATE // 10 : -SAMPLE_RATE // 10] = np.hanning(
            SAMPLE_RATE - SAMPLE_RATE // 5
        )
        source = (
            0.65 * np.sin(2.0 * np.pi * 220.0 * sample_positions) * envelope
        ).astype(np.float32)
        original = source.copy()

        first = _apply_layerone_effect(source)
        second = _apply_layerone_effect(source)

        self.assertTrue(np.array_equal(first, second))
        self.assertTrue(np.array_equal(source, original))
        self.assertGreater(first.size, source.size)
        self.assertFalse(np.allclose(first[: source.size], source))
        self.assertEqual(first.dtype, np.float32)
        self.assertTrue(np.all(np.isfinite(first)))
        self.assertLessEqual(float(np.max(np.abs(first))), 0.9801)

    def test_layerone_effect_handles_empty_silent_and_tiny_audio(self):
        for source in (
            np.array([], dtype=np.float32),
            np.zeros(1, dtype=np.float32),
            np.zeros(80, dtype=np.float32),
            np.full(200, 0.2, dtype=np.float32),
        ):
            effected = _apply_layerone_effect(source)

            self.assertEqual(effected.dtype, np.float32)
            self.assertTrue(np.all(np.isfinite(effected)))
            if effected.size:
                self.assertLessEqual(float(np.max(np.abs(effected))), 0.9801)

    def test_startup_removes_only_legacy_and_old_version_directories(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in (
                "blog",
                "lore",
                "cache-v3",
                "cache-v1-3",
                "cache-v9",
                CACHE_DIRNAME,
                "keep-me",
            ):
                (root / name).mkdir()

            with patch.object(server, "TTS_DIR", root):
                _cleanup_cache_versions()

            self.assertFalse((root / "blog").exists())
            self.assertFalse((root / "lore").exists())
            self.assertFalse((root / "cache-v3").exists())
            self.assertFalse((root / "cache-v1-3").exists())
            self.assertFalse((root / "cache-v9").exists())
            self.assertTrue((root / CACHE_DIRNAME).exists())
            self.assertTrue((root / "keep-me").exists())

    def test_startup_unlinks_legacy_symlinks_without_touching_their_targets(self):
        with (
            tempfile.TemporaryDirectory() as temporary,
            tempfile.TemporaryDirectory() as external,
        ):
            root = Path(temporary)
            external_root = Path(external)
            protected = external_root / "protected.txt"
            protected.write_text("keep", encoding="utf-8")
            (root / "cache-v1-3").symlink_to(external_root, target_is_directory=True)

            with patch.object(server, "TTS_DIR", root):
                _cleanup_cache_versions()

            self.assertFalse((root / "cache-v1-3").exists())
            self.assertEqual(protected.read_text(encoding="utf-8"), "keep")

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

    def test_stale_hash_cleanup_unlinks_symlinks_without_removing_targets(self):
        current_hash = "a" * 64
        stale_hash = "b" * 64
        with (
            tempfile.TemporaryDirectory() as temporary,
            tempfile.TemporaryDirectory() as external,
        ):
            root = Path(temporary)
            external_root = Path(external)
            protected = external_root / "protected.txt"
            protected.write_text("keep", encoding="utf-8")

            with patch.object(server, "TTS_DIR", root):
                slug_root = server._slug_root("lore", "story")
                slug_root.mkdir(parents=True)
                (slug_root / stale_hash).symlink_to(
                    external_root, target_is_directory=True
                )

                _delete_stale_hashes("lore", "story", current_hash)

                self.assertFalse((slug_root / stale_hash).exists())
                self.assertEqual(protected.read_text(encoding="utf-8"), "keep")

    def test_cache_paths_reject_untrusted_components_and_parent_traversal(self):
        valid_hash = "a" * 64
        with (
            tempfile.TemporaryDirectory() as temporary,
            tempfile.TemporaryDirectory() as external,
        ):
            root = Path(temporary) / "tts"
            root.mkdir()
            outside = Path(external) / "outside.json"
            outside.write_text("protected", encoding="utf-8")
            prefix_sibling = Path(temporary) / "tts-escape" / "outside.json"
            prefix_sibling.parent.mkdir()
            prefix_sibling.write_text("protected", encoding="utf-8")
            with patch.object(server, "TTS_DIR", root):
                for invalid_path in (
                    lambda: server._cache_path("../../tmp", "post", valid_hash),
                    lambda: server._cache_path("blog", "../post", valid_hash),
                    lambda: server._cache_path("blog", "post", "../escape"),
                    lambda: server._chunk_path("blog", "post", valid_hash, -1),
                ):
                    with self.assertRaises(ValueError):
                        invalid_path()

                with self.assertRaises(ValueError):
                    server._atomic_json_write(outside, {"changed": True})
                with self.assertRaises(ValueError):
                    server._read_json(outside)
                with self.assertRaises(ValueError):
                    server._atomic_json_write(prefix_sibling, {"changed": True})
                self.assertEqual(outside.read_text(encoding="utf-8"), "protected")
                self.assertEqual(
                    prefix_sibling.read_text(encoding="utf-8"), "protected"
                )

    def test_cache_paths_reject_symlink_escapes_for_reads_and_writes(self):
        content_hash = "a" * 64
        with (
            tempfile.TemporaryDirectory() as temporary,
            tempfile.TemporaryDirectory() as external,
        ):
            root = Path(temporary)
            external_root = Path(external)
            protected = external_root / "status.json"
            protected.write_text('{"protected":true}', encoding="utf-8")
            type_root = root / CACHE_DIRNAME / "blog"
            type_root.mkdir(parents=True)
            (type_root / "escape").symlink_to(
                external_root, target_is_directory=True
            )

            with patch.object(server, "TTS_DIR", root):
                with self.assertRaises(ValueError):
                    server._status_path("blog", "escape", content_hash)

                cache_root = server._cache_root("blog", "safe-post", content_hash)
                cache_root.mkdir(parents=True)
                status_link = cache_root / "status.json"
                status_link.symlink_to(protected)
                with self.assertRaises(ValueError):
                    server._atomic_json_write(status_link, {"changed": True})
                with self.assertRaises(ValueError):
                    server._read_json(status_link)

            self.assertEqual(
                protected.read_text(encoding="utf-8"), '{"protected":true}'
            )

    def test_cache_version_is_explicit(self):
        self.assertEqual(CACHE_VERSION, "1-4")
        self.assertEqual(CACHE_DIRNAME, "cache-v1-4")

    def test_audio_range_responses_include_range_contract_headers(self):
        content_hash = "a" * 64

        with tempfile.TemporaryDirectory() as temporary:
            with patch.object(server, "TTS_DIR", Path(temporary)):
                audio_path = server._cache_path("blog", "range-post", content_hash)
                audio_path.parent.mkdir(parents=True)
                audio_path.write_bytes(b"0123456789")

                client = TestClient(server.app)
                request_params = {
                    "content_hash": content_hash,
                    "cache_version": CACHE_VERSION,
                }

                partial = client.get(
                    "/audio/blog/range-post",
                    params=request_params,
                    headers={"Range": "bytes=0-2"},
                )
                unsatisfiable = client.get(
                    "/audio/blog/range-post",
                    params=request_params,
                    headers={"Range": "bytes=10-"},
                )

        self.assertEqual(partial.status_code, 206)
        self.assertEqual(partial.headers["accept-ranges"], "bytes")
        self.assertEqual(partial.headers["content-range"], "bytes 0-2/10")
        self.assertEqual(partial.content, b"012")
        self.assertEqual(unsatisfiable.status_code, 416)
        self.assertEqual(unsatisfiable.headers["accept-ranges"], "bytes")
        self.assertEqual(unsatisfiable.headers["content-range"], "bytes */10")


if __name__ == "__main__":
    unittest.main()
