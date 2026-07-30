from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

import convert_webm_to_mp4


class ConverterContractTests(unittest.TestCase):
    def test_conversion_preserves_timeline_and_uses_new_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "KAPTURA source.webm"
            source.write_bytes(b"test")
            with (
                patch.object(convert_webm_to_mp4.imageio_ffmpeg, "get_ffmpeg_exe", return_value="ffmpeg"),
                patch.object(
                    convert_webm_to_mp4.subprocess,
                    "run",
                    return_value=SimpleNamespace(returncode=0, stderr=""),
                ) as run,
            ):
                output = convert_webm_to_mp4.convert_to_mp4(source)

        command = run.call_args.args[0]
        self.assertIn("fps=60,format=yuv420p", command)
        self.assertFalse(any("setpts=" in argument for argument in command))
        self.assertIn("-n", command)
        self.assertNotEqual(source, output)
        self.assertTrue(output.name.endswith("-KAPTURA-CONVERTER.mp4"))

    def test_existing_output_is_not_overwritten_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "master.webm"
            source.write_bytes(b"source")
            output = Path(temporary) / "master-KAPTURA-CONVERTER.mp4"
            output.write_bytes(b"existing")

            with self.assertRaises(FileExistsError):
                convert_webm_to_mp4.convert_to_mp4(source)


if __name__ == "__main__":
    unittest.main()
