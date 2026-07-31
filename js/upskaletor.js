/*
 * ============================================================================
 * KAPTURA · UPSKALETOR bridge  (honest · real where possible)
 * ============================================================================
 * Two truthful modes, never a fake one:
 *
 *   'processed' : REAL in-browser upscale (Lanczos-3 GPU/CPU + re-encode) for
 *                 the mathematical profiles (1080p/4K Lanczos, social broadcast).
 *
 *   'handoff'   : Real-ESRGAN neural AI genuinely needs the external UPSKALETOR
 *                 engine, so we DON'T pretend. We hand the untouched master to
 *                 the operator with the exact signed-CLI command. No progress
 *                 theater, no "_4K_AI" suffix on an unmodified file.
 * ----------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const Transcoder = root.KapturaTranscoder;

  // Each profile declares an honest intent.
  const PROFILES = {
    '4k_ai':          { label: '4K UHD · Real-ESRGAN Neural', ai: true,  w: 3840, h: 2160 },
    '1080p_lanczos':  { label: '1080p · Lanczos',             ai: false, w: 1920, h: 1080, bitrate: 16 },
    '4k_lanczos':     { label: '4K UHD · Lanczos',            ai: false, w: 3840, h: 2160, bitrate: 40 },
    'twitter_4k':     { label: 'Twitter/X · 4K',              ai: false, w: 3840, h: 2160, bitrate: 25 },
    'twitter_1080p':  { label: 'Twitter/X · 1080p',           ai: false, w: 1920, h: 1080, bitrate: 15 },
    'youtube_4k':     { label: 'YouTube · 4K Master',         ai: false, w: 3840, h: 2160, bitrate: 45 },
    '720p':           { label: '720p HD Compact',             ai: false, w: 1280, h: 720,  bitrate: 8 },
  };

  function command(fileName, profile, engine) {
    return `.\\upskaletor.ps1 -InputFile ".\\${fileName}" -Profile "${profile}" -Engine "${engine}" -Out ".\\${baseName(fileName)}_UPSKALED.mp4"`;
  }
  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.substring(0, i) : name;
  }

  /**
   * @returns {Promise<object>} one of:
   *   { mode:'processed', blob, ext, width, height, scaleMode, fellBack }
   *   { mode:'handoff', reason, command, fileName }
   */
  async function run(file, profileKey, engine, opts) {
    opts = opts || {};
    const profile = PROFILES[profileKey] || PROFILES['1080p_lanczos'];
    const fileName = (file && file.name) || 'kaptura_master.mp4';

    if (profile.ai) {
      // Honest: the browser cannot run Real-ESRGAN. Hand off, don't fake.
      return {
        mode: 'handoff',
        reason: 'El escalado neuronal Real-ESRGAN se ejecuta en el motor independiente UPSKALETOR (GPU local). KAPTURA entrega el master sin alterarlo.',
        command: command(fileName, profileKey, engine || 'ai'),
        fileName,
      };
    }

    // Real mathematical upscale, right here, with maximum-quality Lanczos.
    const result = await Transcoder.transcode(file, {
      width: profile.w,
      height: profile.h,
      container: 'mp4',
      bitrateMbps: profile.bitrate || 16,
      fps: opts.fps || 30,
      quality: 'max',           // force Lanczos path (GPU if available, else CPU)
      caps: opts.caps,
      onProgress: opts.onProgress,
    });
    return {
      mode: 'processed',
      blob: result.blob,
      ext: result.ext,
      width: result.width,
      height: result.height,
      scaleMode: result.scaleMode,
      fellBack: result.fellBack,
    };
  }

  const api = { run, PROFILES, command };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KapturaUpskaletor = api;
})(typeof self !== 'undefined' ? self : this);
