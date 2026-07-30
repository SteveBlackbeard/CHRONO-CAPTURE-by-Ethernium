/*
 * ============================================================================
 * KAPTURA · App orchestrator  (UI wiring only — no engine logic lives here)
 * ============================================================================
 * Ties the independent modules together, owns the DOM, and guarantees the
 * honesty rules: real progress, real filenames, revoked object URLs, escaped
 * user text, and visible (non-blocking) error/notice toasts.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const caps = window.KapturaCaps.detect();

  /* ---- toast notifications --------------------------------------------- */
  const toastStack = $('toastStack');
  function toast(message, kind = 'notice', ttl = 5000) {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ttl);
  }

  /* ---- helpers ---------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
  }
  function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  function setProgress(bgId, fillId, ratio) {
    const bg = $(bgId), fill = $(fillId);
    if (bg) bg.style.display = 'block';
    if (fill) fill.style.width = Math.round(ratio * 100) + '%';
  }

  /* ---- capability chips ------------------------------------------------- */
  (function renderCaps() {
    const row = $('capsRow');
    const chip = (label, on) => `<span class="cap-chip ${on ? 'on' : 'off'}">${on ? '● ' : '○ '}${label}</span>`;
    row.innerHTML =
      chip('WebGL Lanczos', caps.gpu.webgl) +
      chip('MP4 encode', caps.canMp4) +
      chip('WebM/VP9', caps.canWebmVp9) +
      chip('AV1', caps.canWebmAv1) +
      chip('Workers', caps.workers) +
      chip('WebCodecs', caps.webcodecs);
  })();

  /* ---- Vault (data layer in js/vault.js; URLs owned here) ---------------- */
  const Vault = window.KapturaVault;
  let vaultUrls = [];
  function releaseVaultUrls() { vaultUrls.forEach(URL.revokeObjectURL); vaultUrls = []; }

  async function refreshVault() {
    let items = [];
    try { items = await Vault.getAll(); }
    catch (e) { toast(e.message, 'error'); }
    $('vault-count').textContent = items.length;
    const grid = $('vaultGrid');
    releaseVaultUrls();
    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--dim); font-family:'Fira Code', monospace">
        No recordings saved in vault yet. Record a video to store it automatically!</div>`;
      return;
    }
    grid.innerHTML = items.map((item) => {
      const url = URL.createObjectURL(item.blob);
      vaultUrls.push(url);
      return `
        <div class="vault-card">
          <video class="vault-thumb" src="${url}" controls preload="metadata"></video>
          <div class="vault-title">${escapeHtml(item.name)}</div>
          <div class="vault-info">📅 ${escapeHtml(item.timestamp)} · 💾 ${escapeHtml(item.size)} · ⏱️ ${escapeHtml(item.duration)}</div>
          <div class="vault-actions">
            <a class="vault-btn" href="${url}" download="${escapeHtml(item.name)}">💾 DOWNLOAD</a>
            <button class="vault-btn del" data-del="${item.id}">🗑️ DELETE</button>
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', async () => {
        try { await Vault.remove(Number(b.dataset.del)); await refreshVault(); }
        catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  async function saveToVault(blob, name, mime, durationSec) {
    try {
      await Vault.add({
        timestamp: new Date().toLocaleString(),
        name, type: mime,
        size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
        duration: durationSec + 's',
        blob,
      });
      await refreshVault();
    } catch (e) { toast(e.message, 'error'); }
  }

  $('btnClearVault').addEventListener('click', async () => {
    if (!confirm('Clear all recorded videos from the local vault?')) return;
    try { await Vault.clear(); await refreshVault(); toast('Vault cleared.', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  });

  /* ---- Capture engine --------------------------------------------------- */
  const canvas = $('renderCanvas');
  const previewVideo = $('previewVideo');
  let lastMaster = null;   // { blob, ext, mime, name }

  const capture = window.KapturaCapture.create({
    canvas, video: previewVideo,
    callbacks: {
      onFps: (fps) => { $('fpsDisplay').textContent = fps + ' FPS'; },
      onTimer: ({ text, frames }) => { $('recTimer').textContent = text; $('statFrames').textContent = frames; },
      onSize: (mb) => { $('statSize').textContent = mb + ' MB'; },
      onSourceMode: (t) => { $('statSourceMode').textContent = t; },
      onError: (msg) => toast(msg, 'error'),
      onNotice: (msg) => toast(msg, 'notice'),
      onRecordingState: (active) => {
        $('recIndicator').classList.toggle('active', active);
        $('btnStartRec').disabled = active;
        $('btnStopRec').disabled = !active;
      },
      onStop: async ({ blob, mime, ext, duration }) => {
        const name = `Ethernium_Master_${stamp()}.${ext}`;
        lastMaster = { blob, ext, mime, name };
        downloadBlob(blob, name);
        await saveToVault(blob, name, mime, duration);
        toast('Master guardado en la Bóveda.', 'success');
      },
    },
  });

  // resolution selector resizes the canvas engine
  $('resSelect').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split('x').map(Number);
    canvas.width = w; canvas.height = h;
  });

  $('modeSelect').addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'screen') { if (!capture.hasStream()) capture.selectSource(parseInt($('fpsSelect').value, 10)); else capture.setMode('screen'); }
    else capture.setMode(mode);
  });
  $('btnSelectSource').addEventListener('click', () => capture.selectSource(parseInt($('fpsSelect').value, 10)));

  function containerFromCodec(v) { return v === 'mp4' ? 'mp4' : v === 'av1' ? 'av1' : 'webm'; }

  $('btnStartRec').addEventListener('click', () => {
    capture.startRecording({
      caps,
      fps: parseInt($('fpsSelect').value, 10),
      bitrateMbps: parseInt($('bitrateSelect').value, 10),
      container: containerFromCodec($('codecSelect').value),
    });
  });
  $('btnStopRec').addEventListener('click', () => capture.stopRecording());

  /* ---- Export menu (real re-encode / real GIF) -------------------------- */
  $('btnExportMenu').addEventListener('click', () => $('exportMenu').classList.toggle('show'));
  $('exportMenu').querySelectorAll('[data-fmt]').forEach((item) => {
    item.addEventListener('click', () => { $('exportMenu').classList.remove('show'); exportAs(item.dataset.fmt); });
  });

  async function exportAs(fmt) {
    if (!lastMaster) { toast('No hay grabación en memoria. Graba un vídeo primero.', 'error'); return; }
    const readout = $('recorderReadout');
    try {
      if (fmt === 'gif') {
        readout.textContent = 'Exportando GIF real (codificador nativo)…';
        const r = await window.KapturaTranscoder.toGIF(lastMaster.blob, {
          caps, fps: 12, quality: caps.gpu.webgl ? 'max' : 'fast',
          onProgress: (p) => { readout.textContent = `GIF: ${Math.round(p * 100)}% (${r0(p)})`; },
        });
        downloadBlob(r.blob, `Ethernium_${stamp()}.gif`);
        toast(`GIF real: ${r.width}×${r.height}, ${r.frames} frames.`, 'success');
      } else {
        readout.textContent = `Re-encode real a ${fmt.toUpperCase()}…`;
        const r = await window.KapturaTranscoder.transcode(lastMaster.blob, {
          caps, container: fmt, quality: 'fast',
          onProgress: (p) => { readout.textContent = `${fmt.toUpperCase()}: ${Math.round(p * 100)}%`; },
        });
        if (r.fellBack) toast('MP4 no disponible; exportado en WebM real.', 'notice');
        downloadBlob(r.blob, `Ethernium_${stamp()}.${r.ext}`);
        toast(`Exportado ${r.ext.toUpperCase()} real (${r.scaleMode}).`, 'success');
      }
    } catch (e) { toast(e.message || String(e), 'error'); }
    finally { readout.textContent = ''; }
  }
  function r0(p) { return p < 0.6 ? 'extracción' : 'codificación'; }

  /* ---- V-Converter (real transcode) ------------------------------------- */
  let convFile = null;
  wireDropzone('dropzone', 'fileInput', (f) => {
    convFile = f;
    $('dropzone').querySelector('.dz-title').textContent = `SELECTED: ${f.name}`;
    $('dropzone').querySelector('.dz-sub').textContent = `${(f.size / (1024 * 1024)).toFixed(2)} MB · ${f.type || 'video'}`;
  });

  $('btnConvertNow').addEventListener('click', async () => {
    if (!convFile) { toast('Selecciona o arrastra un vídeo primero.', 'error'); return; }
    const fmt = $('convFormat').value;
    const res = $('convRes').value;
    const quality = $('convQuality').value;
    const status = $('converterStatus');
    const dims = res === 'source' ? {} : { width: Number(res.split('x')[0]), height: Number(res.split('x')[1]) };
    $('btnConvertNow').disabled = true;
    try {
      if (fmt === 'gif') {
        status.textContent = 'Codificando GIF real…';
        const r = await window.KapturaTranscoder.toGIF(convFile, {
          caps, quality, ...dims,
          onProgress: (p) => { setProgress('progressBarBg', 'progressBarFill', p); status.textContent = `GIF ${Math.round(p * 100)}%`; },
        });
        downloadBlob(r.blob, `${baseName(convFile.name)}_${r.width}x${r.height}.gif`);
        status.textContent = `✅ GIF real listo (${r.frames} frames).`;
      } else {
        status.textContent = `Transcodificando a ${fmt.toUpperCase()} (real)…`;
        const r = await window.KapturaTranscoder.transcode(convFile, {
          caps, container: fmt, quality, ...dims,
          onProgress: (p) => { setProgress('progressBarBg', 'progressBarFill', p); status.textContent = `${fmt.toUpperCase()} ${Math.round(p * 100)}%`; },
        });
        if (r.fellBack) toast('MP4 no soportado aquí; exportado WebM real.', 'notice');
        downloadBlob(r.blob, `${baseName(convFile.name)}_${r.width}x${r.height}.${r.ext}`);
        status.textContent = `✅ ${r.ext.toUpperCase()} real listo (${r.scaleMode}).`;
      }
      toast('Conversión real completada.', 'success');
    } catch (e) { status.textContent = ''; toast(e.message || String(e), 'error'); }
    finally { $('btnConvertNow').disabled = false; setTimeout(() => setProgress('progressBarBg', 'progressBarFill', 0), 800); }
  });

  /* ---- UPSKALETOR (real Lanczos or honest AI handoff) ------------------- */
  let upFile = null;
  wireDropzone('upskaletorDropzone', 'upskaletorFileInput', (f) => {
    upFile = f;
    $('upskaletorDzTitle').textContent = `SELECTED: ${f.name}`;
    $('upskaletorDzSub').textContent = `${(f.size / (1024 * 1024)).toFixed(2)} MB · ${f.type || 'video'}`;
  });

  $('btnUpscaleNow').addEventListener('click', async () => {
    const file = upFile || (lastMaster && new File([lastMaster.blob], lastMaster.name, { type: lastMaster.mime }));
    if (!file) { toast('Arrastra un vídeo o graba uno primero.', 'error'); return; }
    const profile = $('upskaletorProfileSelect').value;
    const engine = $('upskaletorEngineSelect').value;
    const status = $('upskaletorStatus');
    $('btnUpscaleNow').disabled = true;
    try {
      const result = await window.KapturaUpskaletor.run(file, profile, engine, {
        caps,
        onProgress: (p) => { setProgress('upskaletorProgressBarBg', 'upskaletorProgressBarFill', p); status.textContent = `Procesando ${Math.round(p * 100)}%…`; },
      });
      if (result.mode === 'handoff') {
        // Honest: do NOT fake AI. Hand off the untouched master + real command.
        try { await navigator.clipboard.writeText(result.command); } catch { /* clipboard optional */ }
        downloadBlob(file, file.name); // the ORIGINAL, correctly named — no fake "_4K_AI"
        status.textContent = '↗ Handoff a UPSKALETOR: master entregado + comando copiado.';
        toast(result.reason, 'notice', 9000);
      } else {
        const name = `${baseName(file.name)}_UPSKALED_${result.width}x${result.height}.${result.ext}`;
        downloadBlob(result.blob, name);
        await saveToVault(result.blob, name, 'video/' + result.ext, 'N/A');
        if (result.fellBack) toast('MP4 no disponible; guardado WebM real.', 'notice');
        status.textContent = `✅ Escalado real ${result.width}×${result.height} (${result.scaleMode}).`;
        toast('Upscale real completado y guardado en la Bóveda.', 'success');
      }
    } catch (e) { status.textContent = ''; toast(e.message || String(e), 'error'); }
    finally { $('btnUpscaleNow').disabled = false; setTimeout(() => setProgress('upskaletorProgressBarBg', 'upskaletorProgressBarFill', 0), 800); }
  });

  $('btnCopyCmd').addEventListener('click', async () => {
    const file = upFile || (lastMaster && { name: lastMaster.name }) || { name: 'kaptura_master.mp4' };
    const cmd = window.KapturaUpskaletor.command(file.name, $('upskaletorProfileSelect').value, $('upskaletorEngineSelect').value);
    try { await navigator.clipboard.writeText(cmd); toast('Comando copiado al portapapeles.', 'success'); }
    catch { window.prompt('Copia el comando de UPSKALETOR:', cmd); }
  });

  /* ---- shared dropzone wiring ------------------------------------------- */
  function wireDropzone(zoneId, inputId, onFile) {
    const zone = $(zoneId), input = $(inputId);
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => { if (e.target.files[0]) onFile(e.target.files[0]); });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('dragover'); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
  }
  function baseName(n) { const i = n.lastIndexOf('.'); return i > 0 ? n.substring(0, i) : n; }

  /* ---- tabs ------------------------------------------------------------- */
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.tab).classList.add('active');
    });
  });

  /* ---- boot ------------------------------------------------------------- */
  refreshVault();
  if (!caps.canMp4) toast('Este navegador no puede codificar MP4; se usará WebM real donde aplique.', 'notice', 8000);
})();
