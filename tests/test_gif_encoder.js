/*
 * Structural validation of the native GIF89a encoder.
 * Generates a small animated GIF and asserts the byte layout is spec-valid.
 * Run:  node tests/test_gif_encoder.js
 */
const fs = require('fs');
const path = require('path');
const { GIFEncoder } = require(path.join(__dirname, '..', 'js', 'gif-encoder.js'));

function makeFrame(w, h, shift) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      rgba[p] = (x * 4 + shift) & 0xff;
      rgba[p + 1] = (y * 4) & 0xff;
      rgba[p + 2] = (x + y + shift) & 0xff;
      rgba[p + 3] = 255;
    }
  }
  return rgba;
}

const W = 48, H = 48, FRAMES = 6;
const enc = new GIFEncoder(W, H, { delay: 120, repeat: 0, dither: true });
for (let f = 0; f < FRAMES; f++) enc.addFrame(makeFrame(W, H, f * 20));
const bytes = enc.render();

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('  PASS  ' + name); }
  else { console.log('  FAIL  ' + name); failures++; }
}

const header = String.fromCharCode(...bytes.subarray(0, 6));
check('header is GIF89a', header === 'GIF89a');
check('logical width byte', bytes[6] === W && bytes[7] === 0);
check('logical height byte', bytes[8] === H && bytes[9] === 0);
check('trailer byte is 0x3B', bytes[bytes.length - 1] === 0x3b);

// count image descriptors (0x2C) that are frame separators
let imageBlocks = 0;
for (let i = 0; i < bytes.length; i++) if (bytes[i] === 0x2c) imageBlocks++;
check('at least ' + FRAMES + ' image descriptors present', imageBlocks >= FRAMES);

// NETSCAPE2.0 loop extension present
const asStr = Buffer.from(bytes).toString('latin1');
check('NETSCAPE2.0 loop extension present', asStr.includes('NETSCAPE2.0'));
check('output is non-trivial in size', bytes.length > 200);

const outPath = path.join(__dirname, 'sample_output.gif');
fs.writeFileSync(outPath, Buffer.from(bytes));
console.log('\n  wrote ' + bytes.length + ' bytes -> ' + outPath);

if (failures) { console.error('\nGIF ENCODER TEST FAILED (' + failures + ')'); process.exit(1); }
console.log('\nGIF ENCODER TEST PASSED');
