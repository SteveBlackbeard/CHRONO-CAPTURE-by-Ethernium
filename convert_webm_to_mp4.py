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
    output_path = base + "_ULTRA_FLUID_60FPS.mp4"
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print(f"=== Processing Ultra-Fluid Conversion ({fps} FPS Constant Frame Rate) ===")
    print(f"   Input:  {input_path}")
    print(f"   Output: {output_path}\n")
    
    # FFmpeg Ultra-Fluid Pipeline:
    # 1. -vf "fps=fps,format=yuv420p" -> Normalizes variable frame rate into butter-smooth constant 60 FPS
    # 2. -fps_mode cfr -> Enforces strict constant frame rate (eliminates all micro-stutters)
    # 3. -crf 16 -> Visually lossless 4K master quality
    # 4. -preset slow -> High motion compensation precision
    # 5. -movflags +faststart -> Instant smooth playback in all editors & web players
    
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
        "-movflags", "+faststart",
        output_path
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode == 0:
        print(f"[SUCCESS] Buttery-Smooth MP4 Master Created: {output_path}")
    else:
        print(f"[ERROR] Conversion error:\n{result.stderr}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            convert_webm_ultra_fluid(arg)
    else:
        # Search for any .webm or .mp4 files in downloads
        webm_files = glob.glob(os.path.expanduser("~/Downloads/*.webm")) + glob.glob("*.webm")
        if webm_files:
            latest_file = max(webm_files, key=os.path.getmtime)
            print(f"Found latest video file: {latest_file}")
            convert_webm_ultra_fluid(latest_file)
        else:
            print("Usage: python convert_webm_to_mp4.py <your_video.webm>")
