import argparse
import os
import subprocess
import imageio_ffmpeg


def sync_video_and_audio(video_path, audio_path, output_path):
    for source in (video_path, audio_path):
        if not os.path.isfile(source):
            raise FileNotFoundError(f"Source file not found: {source}")

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    print("=== SYNCHRONIZING VIDEO & AUDIO (NEON PULSE MASTER) ===")
    print(f"   Video Source: {video_path}")
    print(f"   Audio Source: {audio_path}")
    print(f"   Output File:  {output_path}\n")

    cmd = [
        ffmpeg_exe,
        "-y",
        "-stream_loop", "-1",
        "-i", video_path,
        "-i", audio_path,
        "-vf", "fps=60,format=yuv420p",
        "-fps_mode", "cfr",
        "-c:v", "libx264",
        "-profile:v", "main",
        "-level", "4.0",
        "-preset", "medium",
        "-crf", "16",
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-ac", "2",
        "-shortest",
        "-movflags", "+faststart",
        output_path
    ]

    run_res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if run_res.returncode != 0:
        raise RuntimeError(f"Sync failed:\n{run_res.stderr}")

    print(f"[SUCCESS] Synchronized Master MP4 Created: {output_path}")
    print(f"File Size: {os.path.getsize(output_path)/(1024*1024):.2f} MB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronize a KAPTURA video with an audio track.")
    parser.add_argument("video")
    parser.add_argument("audio")
    parser.add_argument("output")
    args = parser.parse_args()
    sync_video_and_audio(args.video, args.audio, args.output)
