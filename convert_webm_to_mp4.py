import sys
import os
import re
import glob
import subprocess
import imageio_ffmpeg

def sanitize_filename(filename):
    # Remove spaces, parentheses, and special characters for VideoProc/Windows NLE compatibility
    clean = re.sub(r'[\s\(\)]+', '_', filename)
    clean = re.sub(r'_+', '_', clean)
    return clean

def convert_webm_ultra_fluid(input_path, fps=60):
    if not os.path.exists(input_path):
        print(f"Error: File not found -> {input_path}")
        return
    
    dir_name, full_filename = os.path.split(input_path)
    base, _ = os.path.splitext(full_filename)
    
    clean_base = sanitize_filename(base)
    output_filename = f"{clean_base}-CHRONO-CONVERTER-BY-ETHERNIUM.mp4"
    output_path = os.path.join(dir_name, output_filename)
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print(f"=== Processing VideoProc & NLE Ultra-Compatible Conversion ({fps} FPS CFR) ===")
    print(f"   Input:  {input_path}")
    print(f"   Output: {output_path}\n")
    
    # VideoProc & Legacy NLE Master Pipeline:
    # 1. -profile:v main -level 4.0 -> Forces H.264 Main Profile (100% VideoProc hardware decoder compatibility)
    # 2. -pix_fmt yuv420p -> Universal 8-bit YUV format accepted by VideoProc/Premiere
    # 3. -ac 2 -ar 48000 -> Stereo 48kHz AAC (eliminates audio stream import rejection)
    # 4. -fps_mode cfr -> 60 FPS constant frame rate (eliminates VFR stuttering)
    # 5. Clean filename without spaces or parentheses (prevents VideoProc C++ path parser error)
    
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", input_path,
        "-vf", f"fps={fps},format=yuv420p",
        "-fps_mode", "cfr",
        "-c:v", "libx264",
        "-profile:v", "main",
        "-level", "4.0",
        "-preset", "medium",
        "-crf", "17",
        "-g", str(fps),
        "-bf", "2",
        "-c:a", "aac",
        "-ar", "48000",
        "-ac", "2",
        "-movflags", "+faststart",
        output_path
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode == 0:
        print(f"[SUCCESS] VideoProc Compatible Master Created: {output_path}")
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
