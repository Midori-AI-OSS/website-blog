import unittest

from server import _clean_text, _text_chunks


class TtsServerTest(unittest.TestCase):
    def test_clean_text_removes_standard_disclaimer_and_headings(self):
        source = """
> **Disclaimer:** This file is fictional roleplay writing created for a
> tabletop RPG context. It may use real names or familiar details.

## Reduced Visibility

One week after the ER, I was dust.
""".strip()

        cleaned = _clean_text(source)

        self.assertNotIn("Disclaimer:", cleaned)
        self.assertNotIn("Reduced Visibility", cleaned)
        self.assertEqual(cleaned, "One week after the ER, I was dust.")

    def test_clean_text_keeps_inline_emphasis_but_drops_hrules(self):
        source = """
Paragraph with **emphasis** and __signal__.

---

Another line.
""".strip()

        cleaned = _clean_text(source)

        self.assertEqual(cleaned, "Paragraph with emphasis and signal.\n\nAnother line.")

    def test_text_chunks_emit_one_statement_per_chunk_without_spoken_headings(self):
        source = """
## Transit

Her predictive pattern had been reliable before. I took it seriously.

## Arrival

About one hour into the drive, near the 212 intersection, I registered a roadside anomaly.
""".strip()

        chunks = _text_chunks(_clean_text(source))

        self.assertEqual(
            chunks,
            [
                "Her predictive pattern had been reliable before.",
                "I took it seriously.",
                "About one hour into the drive, near the 212 intersection, I registered a roadside anomaly.",
            ],
        )

    def test_text_chunks_split_long_statements_by_word_boundary(self):
        paragraph = " ".join(["Sentence" for _ in range(200)]) + "."

        chunks = _text_chunks(_clean_text(paragraph))

        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 960 for chunk in chunks))
        self.assertTrue(all("\n\n" not in chunk for chunk in chunks))


if __name__ == "__main__":
    unittest.main()
