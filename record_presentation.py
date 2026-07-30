import time
import cv2
import numpy as np
from PIL import ImageGrab
import os

print("=== ETHERNIUM AUTOMATED 4K SCREEN RECORDER ===")
print("Starting recording in 3 seconds... Switch to your browser (http://localhost:8888/video.html)!")
time.sleep(3)

# Screen resolution (1920x1080)
width, height = 1920, 1080
fps = 30.0
duration_seconds = 90

output_filename = os.path.join(os.path.expanduser("~"), "Videos", "ethernium_sovereign_suite_presentation.mp4")

# FourCC codec for MP4
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_filename, fourcc, fps, (width, height))

total_frames = int(fps * duration_seconds)
print(f"[RECORDING] Capturing {total_frames} frames ({duration_seconds}s) to {output_filename}...")

start_time = time.time()
for i in range(total_frames):
    img = ImageGrab.grab(bbox=(0, 0, width, height))
    frame = np.array(img)
    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    out.write(frame)
    
    if (i + 1) % 30 == 0:
        elapsed = time.time() - start_time
        print(f"[REC] {int(elapsed)}s / {duration_seconds}s recorded...")

out.release()
print(f"✅ RECORDING COMPLETE! Video saved to: {output_filename}")
