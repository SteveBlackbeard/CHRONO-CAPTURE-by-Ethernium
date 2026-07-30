from __future__ import annotations

import argparse
from pathlib import Path
import re
import subprocess

import imageio_ffmpeg


def sanitize_filename(value: str) -> str:
    clean = re.sub(r"[\s()]+", "_", value)
    return re.sub(r"_+", "_", clean).strip("_") or "KAPTURA_Master"


def convert_to_mp4(
    input_path: Path,
    *,
    fps: int = 60,
    output_dir: Path | None = None,
    overwrite: bool = False,
) -> Path:
    source = input_path.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Source file not found: {source}")

    destination_dir = (output_dir or source.parent).expanduser().resolve()
    destination_dir.mkdir(parents=True, exist_ok=True)
    output = destination_dir / f"{sanitize_filename(source.stem)}-KAPTURA-CONVERTER.mp4"
    if output == source:
        raise ValueError("Output must not overwrite the input file.")
    if output.exists() and not overwrite:
        raise FileExistsError(f"Output already exists: {output}. Use --overwrite to replace it.")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg,
        "-y" if overwrite else "-n",
        "-i",
        str(source),
        "-vf",
        f"fps={fps},format=yuv420p",
        "-fps_mode",
        "cfr",
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-preset",
        "medium",
        "-crf",
        "16",
        "-g",
        str(fps),
        "-bf",
        "2",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        str(output),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"FFmpeg failed with exit code {result.returncode}:\n{result.stderr}")

    print(f"Created: {output}")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create CFR H.264/AAC copies while preserving source timing."
    )
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--fps", type=int, choices=(24, 25, 30, 50, 60), default=60)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    for source in args.inputs:
        convert_to_mp4(
            source,
            fps=args.fps,
            output_dir=args.output_dir,
            overwrite=args.overwrite,
        )


if __name__ == "__main__":
    main()
