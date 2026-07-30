/*
 * ============================================================================
 * KAPTURA · Capture Engine  (canvas scenes + screen capture + recording)
 * ============================================================================
 * Honest telemetry: FPS is MEASURED, not asserted. The recorder reports the
 * codec the browser actually used. Source-selection errors surface to the UI
 * instead of dying in the console.
 * ----------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const Caps = root.KapturaCaps;

  function create(cfg) {
    const canvas = cfg.canvas;
    const video = cfg.video;
    const ctx = canvas.getContext('2d', { alpha: false });
    const cb = cfg.callbacks || {};
    const emit = (name, v) => { if (typeof cb[name] === 'function') cb[name](v); };

    let sceneMode = 'dna';
    let mediaStream = null;
    let recorder = null;
    let chunks = [];
    let recStart = 0;
    let recTimer = null;
    let frameCount = 0;

    // --- real FPS meter (frames counted over a sliding 1s window) ---
    let fpsWindow = [];
    let measuredFps = 0;

    // scene state
    let helixAngle = 0;
    const matrixCols = 80;
    const matrixDrops = new Array(matrixCols).fill(0);

    function drawScene(now) {
      // fps measurement
      fpsWindow.push(now);
      while (fpsWindow.length && now - fpsWindow[0] > 1000) fpsWindow.shift();
      measuredFps = fpsWindow.length;

      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;

      if (sceneMode === 'dna') {
        ctx.fillStyle = 'rgba(2, 3, 5, 0.25)'; ctx.fillRect(0, 0, W, H);
        helixAngle += 0.025;
        const numPairs = 45, radius = H * 0.21, length = W * 0.62;
        for (let i = 0; i < numPairs; i++) {
          const offset = (i / numPairs) * Math.PI * 6 + helixAngle;
          const x = cx - length / 2 + (i / numPairs) * length;
          const y1 = cy + Math.sin(offset) * radius;
          const y2 = cy + Math.sin(offset + Math.PI) * radius;
          const z1 = Math.cos(offset), z2 = Math.cos(offset + Math.PI);
          ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2);
          ctx.lineWidth = 4 + z1 * 2;
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + z1 * 0.3})`;
          ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 15; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y1, 14 + z1 * 6, 0, Math.PI * 2);
          ctx.fillStyle = '#00FF9D'; ctx.shadowColor = '#00FF9D'; ctx.shadowBlur = 20; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y2, 14 + z2 * 6, 0, Math.PI * 2);
          ctx.fillStyle = '#8B5CF6'; ctx.shadowColor = '#8B5CF6'; ctx.shadowBlur = 20; ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else if (sceneMode === 'binary') {
        ctx.fillStyle = 'rgba(1, 2, 4, 0.15)'; ctx.fillRect(0, 0, W, H);
        ctx.font = '28px "Fira Code", monospace';
        for (let i = 0; i < matrixCols; i++) {
          const char = String.fromCharCode(0x30 + Math.floor(Math.random() * 2));
          const x = i * (W / matrixCols), y = matrixDrops[i] * 36;
          ctx.fillStyle = '#00FF9D'; ctx.shadowColor = '#00FF9D'; ctx.shadowBlur = 10;
          ctx.fillText(char, x, y);
          if (y > H && Math.random() > 0.975) matrixDrops[i] = 0;
          matrixDrops[i]++;
        }
        ctx.shadowBlur = 0;
      } else if (sceneMode === 'fibonacci') {
        const a = 12, b = 0.18, t = frameCount / 60;
        ctx.lineWidth = 3;
        for (let i = 0; i < 400; i++) {
          const theta = i * 0.1 + t * 0.5;
          const r = a * Math.exp(b * (i * 0.1));
          const x = cx + r * Math.cos(theta), y = cy + r * Math.sin(theta);
          ctx.beginPath(); ctx.arc(x, y, 6 + (i * 0.05), 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${(i * 4 + t * 50) % 360}, 100%, 65%)`;
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15; ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // HONEST overlay: real measured fps, real resolution
      ctx.font = '700 32px "Orbitron", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`ETHERNIUM // ${W}x${H} @ ${measuredFps} FPS (measured)`, 60, 80);

      frameCount++;
      emit('onFps', measuredFps);
      if (sceneMode !== 'screen') requestAnimationFrame(drawScene);
    }

    function setMode(mode) {
      const wasScene = sceneMode !== 'screen';
      sceneMode = mode;
      if (mode === 'screen') {
        canvas.style.display = 'none'; video.style.display = 'block';
        emit('onSourceMode', 'EXTERNAL SCREEN / TAB CAPTURE');
      } else {
        canvas.style.display = 'block'; video.style.display = 'none';
        emit('onSourceMode', 'CANVAS ENGINE: ' + mode.toUpperCase());
        if (wasScene) return; // loop already running for scene modes
        requestAnimationFrame(drawScene);
      }
    }

    async function selectSource(fps) {
      try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 3840, max: 3840 }, height: { ideal: 2160, max: 2160 }, frameRate: { ideal: fps, max: fps } },
          audio: { echoCancellation: false, noiseSuppression: false },
        });
        video.srcObject = mediaStream;
        setMode('screen');
        mediaStream.getVideoTracks()[0].onended = () => { mediaStream = null; setMode('dna'); };
        emit('onSourceReady', true);
      } catch (err) {
        const msg = err && err.name === 'NotAllowedError'
          ? 'Captura de pantalla cancelada o denegada por el navegador.'
          : 'No se pudo iniciar la captura de pantalla: ' + (err && err.message || err);
        emit('onError', msg);
      }
    }

    function startRecording(opts) {
      opts = opts || {};
      const caps = opts.caps || Caps.detect();
      const fps = opts.fps || 60;
      const bitrate = (opts.bitrateMbps || 50) * 1e6;
      const pick = Caps.pickMimeType(caps, opts.container || 'mp4');

      const streamToRecord = (sceneMode === 'screen' && mediaStream)
        ? mediaStream
        : canvas.captureStream(fps);

      try {
        recorder = new MediaRecorder(streamToRecord, { mimeType: pick.mime, videoBitsPerSecond: bitrate });
      } catch (e) {
        emit('onError', 'El navegador no soporta la grabación en el formato pedido: ' + pick.mime);
        return false;
      }

      chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) {
          chunks.push(e.data);
          const total = chunks.reduce((a, c) => a + c.size, 0);
          emit('onSize', (total / (1024 * 1024)).toFixed(1));
        }
      };
      recorder.onstop = () => finishRecording(pick);
      recorder.start(500);

      recStart = Date.now();
      const startFrame = frameCount;
      recTimer = setInterval(() => {
        const s = Math.floor((Date.now() - recStart) / 1000);
        emit('onTimer', {
          text: `REC ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`,
          frames: frameCount - startFrame,
        });
      }, 100);

      emit('onRecordingState', true);
      if (pick.fellBack) emit('onNotice', 'MP4 no está disponible en este navegador; grabando en WebM (VP9) real.');
      return true;
    }

    function stopRecording() {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    }

    function finishRecording(pick) {
      clearInterval(recTimer);
      const mime = recorder.mimeType || pick.mime;
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const duration = Math.floor((Date.now() - recStart) / 1000);
      const blob = new Blob(chunks, { type: mime });
      emit('onRecordingState', false);
      emit('onStop', { blob, mime, ext, duration });
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    // boot the scene loop
    requestAnimationFrame(drawScene);

    return {
      setMode, selectSource, startRecording, stopRecording,
      get mode() { return sceneMode; },
      get fps() { return measuredFps; },
      hasStream: () => !!mediaStream,
    };
  }

  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KapturaCapture = api;
})(typeof self !== 'undefined' ? self : this);
