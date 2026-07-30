/*
 * ============================================================================
 * KAPTURA · Capability Detection  (frugal · single-responsibility)
 * ============================================================================
 * Probes the runtime ONCE so every engine picks the fastest available path and
 * falls back honestly. Nothing here lies: if a codec/GPU is absent, the report
 * says so and the UI reflects it.
 * ----------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  function detectWebGL() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return { available: false };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
      const version = (root.WebGL2RenderingContext && gl instanceof root.WebGL2RenderingContext) ? 2 : 1;
      return { available: true, version, renderer };
    } catch { return { available: false }; }
  }

  function supportedRecorderTypes() {
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=av1',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const ok = {};
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      for (const t of candidates) ok[t] = MediaRecorder.isTypeSupported(t);
    }
    return ok;
  }

  function detect() {
    const webgl = typeof document !== 'undefined' ? detectWebGL() : { available: false };
    const recorder = supportedRecorderTypes();
    const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const webcodecs = typeof root.VideoEncoder !== 'undefined';
    const workers = typeof Worker !== 'undefined';
    return {
      gpu: { webgl: webgl.available, webglVersion: webgl.version || 0, renderer: webgl.renderer || 'n/a', webgpu },
      recorder,
      canMp4: !!(recorder['video/mp4;codecs=avc1'] || recorder['video/mp4']),
      canWebmVp9: !!recorder['video/webm;codecs=vp9'],
      canWebmAv1: !!recorder['video/webm;codecs=av1'],
      webcodecs,
      workers,
    };
  }

  /** Choose a concrete recorder mimeType for a requested container, honestly. */
  function pickMimeType(caps, container) {
    if (container === 'mp4') {
      if (caps.recorder['video/mp4;codecs=avc1']) return { mime: 'video/mp4;codecs=avc1', real: 'mp4' };
      if (caps.recorder['video/mp4']) return { mime: 'video/mp4', real: 'mp4' };
      if (caps.recorder['video/webm;codecs=vp9']) return { mime: 'video/webm;codecs=vp9', real: 'webm', fellBack: true };
      return { mime: 'video/webm', real: 'webm', fellBack: true };
    }
    if (container === 'av1' && caps.recorder['video/webm;codecs=av1']) return { mime: 'video/webm;codecs=av1', real: 'webm' };
    if (caps.recorder['video/webm;codecs=vp9']) return { mime: 'video/webm;codecs=vp9', real: 'webm' };
    return { mime: 'video/webm', real: 'webm' };
  }

  const api = { detect, pickMimeType };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KapturaCaps = api;
})(typeof self !== 'undefined' ? self : this);
