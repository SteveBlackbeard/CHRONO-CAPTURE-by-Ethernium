/*
 * ============================================================================
 * KAPTURA · Lanczos-3 Resampler  (pure JavaScript · zero dependencies)
 * ============================================================================
 * High-quality separable image resampling driven entirely by mathematics:
 * the Lanczos kernel  L(x) = sinc(x) * sinc(x / a)  for |x| < a  (a = 3).
 *
 * Separable 2-pass (horizontal then vertical) with precomputed weight tables,
 * so cost is O(W*H*a) rather than O(W*H*a^2). Runs on any CPU, no GPU, no HW
 * codec — the "reduce hardware dependence" requirement, satisfied with math.
 * ----------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const A = 3; // Lanczos "a" parameter (Lanczos-3)

  function sinc(x) {
    if (x === 0) return 1;
    const px = Math.PI * x;
    return Math.sin(px) / px;
  }
  function lanczos(x) {
    if (x <= -A || x >= A) return 0;
    return sinc(x) * sinc(x / A);
  }

  /**
   * Precompute, for each destination pixel, the source sample indices and
   * their normalized Lanczos weights along one axis.
   */
  function buildWeights(srcSize, dstSize) {
    const scale = dstSize / srcSize;
    const filterScale = scale < 1 ? 1 / scale : 1;       // widen kernel when downscaling (anti-alias)
    const support = A * filterScale;
    const table = new Array(dstSize);
    for (let d = 0; d < dstSize; d++) {
      const center = (d + 0.5) / scale - 0.5;
      const start = Math.max(0, Math.floor(center - support));
      const end = Math.min(srcSize - 1, Math.ceil(center + support));
      const idx = [];
      const wts = [];
      let sum = 0;
      for (let s = start; s <= end; s++) {
        const w = lanczos((s - center) / filterScale);
        if (w === 0) continue;
        idx.push(s); wts.push(w); sum += w;
      }
      // normalize so brightness is preserved
      if (sum !== 0) for (let i = 0; i < wts.length; i++) wts[i] /= sum;
      table[d] = { idx, wts };
    }
    return table;
  }

  /**
   * Resample RGBA pixel data.
   * @param {Uint8ClampedArray} src  length sw*sh*4
   * @returns {Uint8ClampedArray}     length dw*dh*4
   */
  function resample(src, sw, sh, dw, dh) {
    const xW = buildWeights(sw, dw);
    const yW = buildWeights(sh, dh);

    // Pass 1: horizontal  (sw x sh) -> (dw x sh) in float
    const tmp = new Float32Array(dw * sh * 4);
    for (let y = 0; y < sh; y++) {
      const srcRow = y * sw * 4;
      const tmpRow = y * dw * 4;
      for (let x = 0; x < dw; x++) {
        const { idx, wts } = xW[x];
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = 0; k < idx.length; k++) {
          const p = srcRow + idx[k] * 4;
          const w = wts[k];
          r += src[p] * w; g += src[p + 1] * w; b += src[p + 2] * w; a += src[p + 3] * w;
        }
        const q = tmpRow + x * 4;
        tmp[q] = r; tmp[q + 1] = g; tmp[q + 2] = b; tmp[q + 3] = a;
      }
    }

    // Pass 2: vertical  (dw x sh) -> (dw x dh)
    const out = new Uint8ClampedArray(dw * dh * 4);
    for (let x = 0; x < dw; x++) {
      const col = x * 4;
      for (let y = 0; y < dh; y++) {
        const { idx, wts } = yW[y];
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = 0; k < idx.length; k++) {
          const p = idx[k] * dw * 4 + col;
          const w = wts[k];
          r += tmp[p] * w; g += tmp[p + 1] * w; b += tmp[p + 2] * w; a += tmp[p + 3] * w;
        }
        const q = (y * dw + x) * 4;
        out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = a;
      }
    }
    return out;
  }

  const api = { resample, _kernel: lanczos, A };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KapturaLanczos = api;
})(typeof self !== 'undefined' ? self : this);
