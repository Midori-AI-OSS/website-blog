import unittest
from pathlib import Path

import config


class TtsConfigTest(unittest.TestCase):
    def test_service_defaults_are_centralized(self):
        self.assertEqual(config.VOICE, "af_heart,af_bella")
        self.assertEqual(config.SAMPLE_RATE, 24000)
        self.assertEqual(config.TTS_DIR, Path("/tmp/tts"))
        self.assertEqual(config.CACHE_VERSION, "1-6")
        self.assertEqual(config.CACHE_DIRNAME, "cache-v1-6")
        self.assertEqual(config.PARAGRAPH_GAP_MS, 500)
        self.assertEqual(config.MAX_WORKERS, 1)
        self.assertEqual(config.MODEL_DEVICE, "cpu")
        self.assertEqual(config.KOKORO_LANGUAGE_CODE, "a")
        self.assertEqual(config.KOKORO_REPO_ID, "hexgrad/Kokoro-82M")
        self.assertEqual(config.KOKORO_LEXICON_OVERRIDES, {"kokoro": "kˈOkəɹO"})
        self.assertEqual(config.SYNTHESIS_SPEED, 0.85)
        self.assertEqual(config.MODEL_SYNTHESIS_SPEED, 1)

    def test_language_profiles_include_the_current_bell_contours(self):
        self.assertEqual(
            set(config.CELESTIAL_CONTOURS),
            {"statement", "question", "emphatic"},
        )
        self.assertEqual(config.CELESTIAL_PITCHES_HZ["C5"], 523.25)
        self.assertEqual(config.ABYSSAL_FORMANT_LIFT, 1.065)


if __name__ == "__main__":
    unittest.main()
