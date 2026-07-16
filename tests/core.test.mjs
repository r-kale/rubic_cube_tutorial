// Test harness for the cube engine + solver embedded in index.html.
// Run with: node tests/core.test.mjs [fuzzCount]
//
// It extracts the script between the __CORE_START__/__CORE_END__ markers so the
// exact code that ships in the page is what gets tested.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const m = html.match(/\/\*__CORE_START__\*\/([\s\S]*?)\/\*__CORE_END__\*\//);
if (!m) { console.error('CORE markers not found in index.html'); process.exit(1); }
const C = new Function(m[1] + '; return CubeCore;')();

let failures = 0;
function check(name, fn){
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${name}: ${err.message}`);
  }
}
function assert(cond, msg){ if (!cond) throw new Error(msg || 'assertion failed'); }

const statesEqual = (a, b) =>
  a.cp.join() === b.cp.join() && a.co.join() === b.co.join() &&
  a.ep.join() === b.ep.join() && a.eo.join() === b.eo.join();

// ---------- structural sanity ----------
check('each base move applied 4x is identity', () => {
  for (const f of C.FACES){
    const s = C.solvedState();
    for (let i = 0; i < 4; i++) C.applyMove(s, f);
    assert(C.isSolved(s), `${f}^4 != identity`);
  }
});

check("X2 == X X and X' == X X X", () => {
  for (const f of C.FACES){
    const a = C.solvedState(); C.applyMove(a, f + '2');
    const b = C.solvedState(); C.applyMove(b, f); C.applyMove(b, f);
    assert(statesEqual(a, b), `${f}2 mismatch`);
    const c = C.solvedState(); C.applyMove(c, f + "'");
    const d = C.solvedState(); for (let i = 0; i < 3; i++) C.applyMove(d, f);
    assert(statesEqual(c, d), `${f}' mismatch`);
  }
});

check('sexy move (R U R\' U\') has order 6', () => {
  const s = C.solvedState();
  for (let i = 0; i < 6; i++){
    C.applyAlg(s, "R U R' U'");
    if (i < 5) assert(!C.isSolved(s), `solved too early at rep ${i + 1}`);
  }
  assert(C.isSolved(s), 'not identity after 6 reps');
});

check('parity + orientation invariants after 2000 random moves', () => {
  const s = C.solvedState();
  for (let i = 0; i < 2000; i++) C.applyMove(s, C.MOVE_NAMES[(Math.random() * 18) | 0]);
  const parity = perm => {
    let p = 0;
    const arr = Array.from(perm);
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++)
        if (arr[i] > arr[j]) p ^= 1;
    return p;
  };
  assert(parity(s.cp) === parity(s.ep), 'corner/edge permutation parity mismatch');
  assert(Array.from(s.co).reduce((a, b) => a + b, 0) % 3 === 0, 'corner twist sum != 0 mod 3');
  assert(Array.from(s.eo).reduce((a, b) => a + b, 0) % 2 === 0, 'edge flip sum != 0 mod 2');
});

// ---------- geometric direction checks ----------
check('R turn brings the front column up (U face right column shows F color)', () => {
  const s = C.solvedState();
  C.applyMove(s, 'R');
  for (const st of C.stickers(s)){
    if (st.face === 'U' && st.pos[0] === 1) assert(st.color === 'F', `got ${st.color}`);
  }
});

check('U turn sends front top row toward the left (F top row shows R color)', () => {
  const s = C.solvedState();
  C.applyMove(s, 'U');
  for (const st of C.stickers(s)){
    if (st.face === 'F' && st.pos[1] === 1) assert(st.color === 'R', `got ${st.color}`);
  }
});

check('every face shows 9 stickers of one color on a solved cube', () => {
  const s = C.solvedState();
  const count = {};
  for (const st of C.stickers(s)){
    assert(st.face === st.color, 'solved cube has off-color sticker');
    count[st.face] = (count[st.face] || 0) + 1;
  }
  for (const f of C.FACES) assert(count[f] === 9, `face ${f} has ${count[f]} stickers`);
});

// ---------- named algorithm contracts used by the solver ----------
check("right insert (U R U' R' U' F' U F) moves UF into FR, preserves first layer", () => {
  const s = C.solvedState();
  C.applyAlg(s, "U R U' R' U' F' U F");
  // First layer (D edges + D corners) intact:
  for (const e of [4, 5, 6, 7]) assert(s.ep[e] === e && !s.eo[e], 'D edge disturbed');
  for (const c of [4, 5, 6, 7]) assert(s.cp[c] === c && !s.co[c], 'D corner disturbed');
  // Other middle slots intact:
  for (const e of [9, 10, 11]) assert(s.ep[e] === e && !s.eo[e], 'other middle edge disturbed');
  // UF piece (index 1) is now in FR (index 8) showing its F sticker on F:
  assert(s.ep[8] === 1, `FR now holds edge ${s.ep[8]}, expected UF(1)`);
});

check("left insert (U' L' U L U F U' F') moves UF into FL, preserves first layer", () => {
  const s = C.solvedState();
  C.applyAlg(s, "U' L' U L U F U' F'");
  for (const e of [4, 5, 6, 7]) assert(s.ep[e] === e && !s.eo[e], 'D edge disturbed');
  for (const c of [4, 5, 6, 7]) assert(s.cp[c] === c && !s.co[c], 'D corner disturbed');
  for (const e of [8, 10, 11]) assert(s.ep[e] === e && !s.eo[e], 'other middle edge disturbed');
  assert(s.ep[9] === 1, `FL now holds edge ${s.ep[9]}, expected UF(1)`);
});

check("Sune preserves first two layers and top edge orientation", () => {
  const s = C.solvedState();
  C.applyAlg(s, "R U R' U R U2 R'");
  for (const e of [4,5,6,7,8,9,10,11]) assert(s.ep[e] === e && !s.eo[e], 'F2L edge disturbed');
  for (const c of [4,5,6,7]) assert(s.cp[c] === c && !s.co[c], 'F2L corner disturbed');
  for (const e of [0,1,2,3]) assert(!s.eo[e], 'top edge flipped');
});

check("corner cycle (U R U' L' U R' U' L) preserves ALL edges and D corners", () => {
  const s = C.solvedState();
  C.applyAlg(s, "U R U' L' U R' U' L");
  for (let e = 0; e < 12; e++) assert(s.ep[e] === e && !s.eo[e], `edge ${e} disturbed`);
  for (const c of [4,5,6,7]) assert(s.cp[c] === c && !s.co[c], 'D corner disturbed');
  const moved = [0,1,2,3].filter(c => s.cp[c] !== c);
  assert(moved.length === 3, `expected a 3-cycle of top corners, ${moved.length} moved`);
});

check("(R' D' R D)x2 twists only the URF corner among top pieces", () => {
  const s = C.solvedState();
  C.applyAlg(s, "R' D' R D R' D' R D");
  assert(s.cp[0] === 0 && s.co[0] !== 0, 'URF should stay in place, twisted');
  for (const c of [1, 2, 3]) assert(s.cp[c] === c && !s.co[c], 'other top corner disturbed');
  for (const e of [0, 1, 2, 3]) assert(s.ep[e] === e && !s.eo[e], 'top edge disturbed');
});

check("yellow-cross alg (F R U R' U' F') preserves first two layers", () => {
  const s = C.solvedState();
  C.applyAlg(s, "F R U R' U' F'");
  for (const e of [4,5,6,7,8,9,10,11]) assert(s.ep[e] === e && !s.eo[e], 'F2L edge disturbed');
  for (const c of [4,5,6,7]) assert(s.cp[c] === c && !s.co[c], 'F2L corner disturbed');
});

// ---------- solver fuzz ----------
const FUZZ = parseInt(process.argv[2] || '500', 10);
check(`solver fuzz: ${FUZZ} random scrambles`, () => {
  let totalLen = 0, maxLen = 0, maxMs = 0;
  const t0 = Date.now();
  for (let i = 0; i < FUZZ; i++){
    const s = C.solvedState();
    for (const mv of C.scramble(30)) C.applyMove(s, mv);
    const snapshot = C.cloneState(s);
    const t1 = Date.now();
    let res;
    try {
      res = C.solve(s);
    } catch (err) {
      throw new Error(`scramble #${i}: solver threw "${err.message}" (state cp=${Array.from(snapshot.cp)} co=${Array.from(snapshot.co)} ep=${Array.from(snapshot.ep)} eo=${Array.from(snapshot.eo)})`);
    }
    maxMs = Math.max(maxMs, Date.now() - t1);
    // solve() must not mutate its input
    assert(statesEqual(s, snapshot), `scramble #${i}: solve() mutated its input`);
    // replay the returned moves and verify they actually solve the cube
    const replay = C.cloneState(snapshot);
    for (const p of res.phases) for (const mv of p.moves) C.applyMove(replay, mv);
    assert(C.isSolved(replay), `scramble #${i}: replayed solution does not solve the cube`);
    totalLen += res.length; maxLen = Math.max(maxLen, res.length);
  }
  console.log(`     avg ${Math.round(totalLen / FUZZ)} moves, max ${maxLen} moves, ` +
              `worst solve ${maxMs}ms, total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
});

check('solver on an already-solved cube returns 7 empty phases', () => {
  const res = C.solve(C.solvedState());
  assert(res.phases.length === 7, 'wrong phase count');
  assert(res.length === 0, 'expected zero moves');
});

console.log(failures ? `\n${failures} test(s) FAILED` : '\nall tests passed');
process.exit(failures ? 1 : 0);
