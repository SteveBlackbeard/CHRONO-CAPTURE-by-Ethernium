import sys
import os
import glob
import subprocess
import imageio_ffmpeg

def convert_webm(input_path):
    if not os.path.exists(input_path):
        print(f"Error: File not found -> {input_path}")
        return
    
    base, _ = os.path.splitext(input_path)
    output_path = base + ".mp4"
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print(f"Converting: {input_path} -> {output_path}...")
    
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode == 0:
        print(f"✅ SUCCESS! MP4 Video Created: {output_path}")
    else:
        print(f"❌ Conversion failed:\n{result.stderr}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            convert_webm(arg)
    else:
        # Search for any .webm files in downloads or current directory
        webm_files = glob.glob("*.webm") + glob.glob(os.path.expanduser("~/Downloads/*.webm"))
        if webm_files:
            latest_file = max(webm_files, key=os.path.getmtime)
            print(f"Found latest WebM video: {latest_file}")
            convert_webm(latest_file)
        else:
            print("Usage: python convert_webm_to_mp4.py <your_video.webm>")
