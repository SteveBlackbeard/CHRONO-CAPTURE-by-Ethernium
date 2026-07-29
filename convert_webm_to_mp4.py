import sys
import os
import glob
import subprocess
import imageio_ffmpeg

def convert_webm_ultra_fluid(input_path, fps=60):
    if not os.path.exists(input_path):
        print(f"Error: File not found -> {input_path}")
        return
    
    base, _ = os.path.splitext(input_path)
    output_path = base + "-CHRONO-CONVERTER-BY-ETHERNIUM.mp4"
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print(f"=== Processing Ultra-Fluid NLE-Broadcast Master Conversion ({fps} FPS CFR) ===")
    print(f"   Input:  {input_path}")
    print(f"   Output: {output_path}\n")
    
    # Broadcast & Video Editor NLE Master Pipeline (Premiere, DaVinci, Final Cut, CapCut):
    # 1. -vf "fps=fps,format=yuv420p" -> Constant Frame Rate & YUV420p color space for 100% NLE GPU hardware decoding
    # 2. -fps_mode cfr -> Eliminates all VFR audio-video sync drift & micro-stutters
    # 3. -crf 16 -> Visually lossless master quality
    # 4. -ar 48000 -> Broadcast standard 48kHz audio sampling (eliminates Premiere audio sample rate mismatch)
    # 5. -c:a aac -b:a 320k -> Clean high-bitrate AAC audio
    # 6. -movflags +faststart -> Places moov atom header at the front of file for instantaneous NLE import
    
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", input_path,
        "-vf", f"fps={fps},format=yuv420p",
        "-fps_mode", "cfr",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "16",
        "-g", str(fps),
        "-bf", "2",
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-movflags", "+faststart",
        output_path
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode == 0:
        print(f"[SUCCESS] Broadcast Master Created: {output_path}")
    else:
        print(f"[ERROR] Conversion error:\n{result.stderr}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            convert_webm_ultra_fluid(arg)
    else:
        # Search for any .webm or .mp4 files in downloads or current dir
        webm_files = glob.glob(os.path.expanduser("~/Downloads/*.webm")) + glob.glob("*.webm")
        if webm_files:
            latest_file = max(webm_files, key=os.path.getmtime)
            print(f"Found latest video file: {latest_file}")
            convert_webm_ultra_fluid(latest_file)
        else:
            print("Usage: python convert_webm_to_mp4.py <your_video.webm>")
