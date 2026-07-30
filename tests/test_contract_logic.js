/*
 * Locks the HONESTY guarantees at the module boundary (no DOM needed):
 *  - AI profile => 'handoff', never a processed/renamed original
 *  - CLI command uses _UPSKALED, never the old fake _4K_AI suffix
 *  - codec fallback is reported honestly (fellBack flag)
 * Run: node tests/test_contract_logic.js
 */
const path = require('path');
const p = (f) => path.join(__dirname, '..', 'js', f);

// node-safe modules (guarded module.exports, no DOM at load time)
const Caps = require(p('capabilities.js'));
const Ups = require(p('upskaletor.js'));

let failures = 0;
const check = (n, c) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n); if (!c) failures++; };

// --- honest codec fallback --------------------------------------------------
const noMp4 = { recorder: { 'video/webm;codecs=vp9': true } };
const picked = Caps.pickMimeType(noMp4, 'mp4');
check('mp4 requested without support falls back to webm', picked.real === 'webm');
check('fallback is flagged honestly', picked.fellBack === true);

const withMp4 = { recorder: { 'video/mp4;codecs=avc1': true } };
const picked2 = Caps.pickMimeType(withMp4, 'mp4');
check('mp4 kept when supported', picked2.real === 'mp4' && !picked2.fellBack);

// --- honest command ---------------------------------------------------------
const cmd = Ups.command('clip.mp4', '4k_ai', 'ai');
check('command targets _UPSKALED output', cmd.includes('_UPSKALED.mp4'));
check('command does NOT use fake _4K_AI suffix', !cmd.includes('_4K_AI'));

// --- AI profile is a handoff, never fake processing -------------------------
(async () => {
  const res = await Ups.run({ name: 'clip.mp4' }, '4k_ai', 'ai', { caps: {} });
  check('AI profile returns handoff mode', res.mode === 'handoff');
  check('handoff carries a real command', typeof res.command === 'string' && res.command.length > 10);
  check('handoff does NOT return a processed blob', res.blob === undefined);

  if (failures) { console.error('\nCONTRACT LOGIC TEST FAILED (' + failures + ')'); process.exit(1); }
  console.log('\nCONTRACT LOGIC TEST PASSED');
})();
