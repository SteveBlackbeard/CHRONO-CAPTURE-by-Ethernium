@echo off
title CHRONO-CAPTURE — WebM to MP4 Converter (Ultra HD 4K / 60FPS)
echo ========================================================
echo   ETHERNIUM CONVERTER — WEBM TO UNIVERSAL MP4 (H.264)
echo ========================================================
echo.

if "%~1"=="" (
    python "%~dp0convert_webm_to_mp4.py"
) else (
    python "%~dp0convert_webm_to_mp4.py" %*
)

echo.
echo Press any key to exit...
pause >nul
