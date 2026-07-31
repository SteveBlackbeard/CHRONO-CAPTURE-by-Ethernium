/*
 * ============================================================================
 * KAPTURA · SVG Vector Studio  (real animated-SVG exporter · self-contained)
 * ============================================================================
 * Exports a REAL animated SVG (SMIL flip-book) from any source (canvas scene
 * or recorded master). Frames are captured, optionally Lanczos-scaled, embedded
 * as <image> nodes and sequenced with a single SMIL <animate> on opacity — so
 * the result plays live in any browser with zero JavaScript.
 *
 * Honesty note surfaced to the UI: GitHub's markdown pipeline sanitizes SMIL on
 * <img>-embedded SVG, so for GitHub embeds the Cinema GIF is the reliable path;
 * the animated SVG plays in browsers and standalone. No false "120 FPS on
 * GitHub" claim.
 * ----------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const Scaler = root.KapturaScaler;

  const tick = () => new Promise((r) => (root.requestAnimationFrame ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));
  function seek(video, t) {
    return new Promise((resolve) => {
      const on = () => { video.removeEventListener('seeked', on); resolve(); };
      video.addEventListener('seeked', on);
      video.currentTime = Math.min(t, Math.max(0, (video.duration || 0) - 1e-3));
    });
  }
  function even(n) { return n & ~1; }

  function loadVideo(file) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = () => resolve(v);
      v.onerror = () => reject(new Error('No se pudo leer el vídeo para exportar SVG.'));
    });
  }

  /** Assemble the SMIL flip-book SVG from an array of PNG data URIs. */
  function buildSVG(dataUris, w, h, fps) {
    const n = dataUris.length;
    const dur = (n / fps).toFixed(3);
    // keyTimes across the whole loop; each frame is opaque only in its slot.
    const keyTimes = [];
    for (let i = 0; i <= n; i++) keyTimes.push((i / n).toFixed(4));
    const layers = dataUris.map((uri, i) => {
      // opacity: 0 everywhere except 1 during slot i (step hold)
      const vals = [];
      for (let k = 0; k <= n; k++) vals.push(k === i ? '1' : (k === i + 1 ? '1' : '0'));
      // simpler robust hold: 1 at frame i and until i+1, else 0
      const values = keyTimes.map((_, k) => (k === i ? '1' : '0')).join(';');
      return `  <image x="0" y="0" width="${w}" height="${h}" opacity="${i === 0 ? 1 : 0}" href="${uri}" preserveAspectRatio="xMidYMid slice">
    <animate attributeName="opacity" values="${values}" keyTimes="${keyTimes.join(';')}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>
  </image>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <title>KAPTURA · animated SVG (${n} frames @ ${fps}fps)</title>
  <rect width="100%" height="100%" fill="#010204"/>
${layers}
</svg>`;
  }

  /** Export a live canvas element (the scene engine) as animated SVG. */
  async function fromCanvas(canvas, opts) {
    opts = opts || {};
    const fps = Math.min(opts.fps || 12, 30);
    const seconds = Math.min(opts.seconds || 3, 12);
    const total = Math.max(2, Math.round(fps * seconds));
    const dw = even(opts.width || Math.min(720, canvas.width));
    const dh = even(opts.height || Math.round((dw * canvas.height) / canvas.width));
    const scaler = Scaler.create({ quality: opts.quality || 'fast', caps: opts.caps });
    const grab = document.createElement('canvas'); grab.width = dw; grab.height = dh;
    const gctx = grab.getContext('2d');
    const uris = [];
    for (let i = 0; i < total; i++) {
      const scaled = scaler.toCanvas(canvas, canvas.width, canvas.height, dw, dh);
      gctx.drawImage(scaled, 0, 0, dw, dh);
      uris.push(grab.toDataURL('image/png'));
      if (opts.onProgress) opts.onProgress((i + 1) / total);
      // wait roughly one frame interval so the live scene advances between grabs
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    scaler.dispose();
    const svg = buildSVG(uris, dw, dh, fps);
    return { blob: new Blob([svg], { type: 'image/svg+xml' }), frames: total, width: dw, height: dh };
  }

  /** Export a recorded/loaded video file as animated SVG. */
  async function fromVideo(file, opts) {
    opts = opts || {};
    const fps = Math.min(opts.fps || 10, 24);
    const video = await loadVideo(file);
    const sw = video.videoWidth, sh = video.videoHeight;
    const dw = even(opts.width || Math.min(640, sw));
    const dh = even(opts.height || Math.round((dw * sh) / sw));
    const dur = video.duration || 0;
    const total = Math.max(2, Math.min(Math.floor(dur * fps), opts.maxFrames || 120));
    const step = dur / total;
    const scaler = Scaler.create({ quality: opts.quality || 'max', caps: opts.caps });
    const grab = document.createElement('canvas'); grab.width = dw; grab.height = dh;
    const gctx = grab.getContext('2d');
    const uris = [];
    for (let i = 0; i < total; i++) {
      await seek(video, i * step);
      const scaled = scaler.toCanvas(video, sw, sh, dw, dh);
      gctx.drawImage(scaled, 0, 0, dw, dh);
      uris.push(grab.toDataURL('image/png'));
      if (opts.onProgress) opts.onProgress((i + 1) / total);
      await tick();
    }
    scaler.dispose();
    URL.revokeObjectURL(video.src);
    const svg = buildSVG(uris, dw, dh, fps);
    return { blob: new Blob([svg], { type: 'image/svg+xml' }), frames: total, width: dw, height: dh };
  }

  const api = { fromCanvas, fromVideo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KapturaSVGVector = api;
})(typeof self !== 'undefined' ? self : this);
