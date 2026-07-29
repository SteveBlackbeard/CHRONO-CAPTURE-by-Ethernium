import os
import sys
import subprocess
import imageio_ffmpeg

def sync_video_and_audio(video_path, audio_path, output_path):
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print("=== SYNCHRONIZING VIDEO & AUDIO (NEON PULSE MASTER) ===")
    print(f"   Video Source: {video_path}")
    print(f"   Audio Source: {audio_path}")
    print(f"   Output File:  {output_path}\n")
    
    # 1. Get exact audio duration using FFmpeg
    duration_cmd = [
        ffmpeg_exe, "-i", audio_path
    ]
    res = subprocess.run(duration_cmd, stderr=subprocess.PIPE, text=True)
    
    # FFmpeg loop video to match audio length + 60 FPS CFR + 48kHz Stereo AAC
    cmd = [
        ffmpeg_exe,
        "-y",
        "-stream_loop", "-1",
        "-i", video_path,
        "-i", audio_path,
        "-vf", "setpts=N/(60*TB),fps=60,format=yuv420p",
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
    if run_res.returncode == 0:
        print(f"[SUCCESS] Synchronized Master MP4 Created: {output_path}")
        print(f"File Size: {os.path.getsize(output_path)/(1024*1024):.2f} MB")
    else:
        print(f"[ERROR] Sync failed:\n{run_res.stderr}")

if __name__ == "__main__":
    audio_file = r"C:\Users\esenc\Downloads\Neon Pulse.mp3"
    video_file = r"C:\Users\esenc\Downloads\Ethernium_Master_Capture_2026-07-29T16-59-01-394Z-CHRONO-CONVERTER-BY-ETHERNIUM.mp4"
    out_file = r"C:\Users\esenc\Downloads\Ethernium-Master-Neon-Pulse-WITH-AUDIO-CHRONO-CONVERTER-BY-ETHERNIUM.mp4"
    
    sync_video_and_audio(video_file, audio_file, out_file)
