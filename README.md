# Rubik's Cube Solver & Tutorial

A **single-file, self-contained** Rubik's cube app: an interactive 3D cube, a working
step-by-step solver, and a complete beginner tutorial — all in [`index.html`](index.html).
No build step, no dependencies, no network calls. It works offline.

## What it does

- **Interactive 3D cube** — drag to orbit, turn faces with buttons or the keyboard
  (<kbd>U</kbd> <kbd>D</kbd> <kbd>L</kbd> <kbd>R</kbd> <kbd>F</kbd> <kbd>B</kbd>, hold
  <kbd>Shift</kbd> for counter-clockwise).
- **Solver** — press *Solve step-by-step* from any position. The solution is grouped into
  the same 7 steps as the tutorial (white cross → white corners → middle layer → yellow
  cross → yellow edges → position corners → orient corners), with play / pause / step
  forward / step back controls.
- **Enter your real cube** — *Enter my cube* opens a flat sticker map (centers fixed so
  orientation is unambiguous). Paint in your cube, and invalid states are rejected with a
  specific reason (impossible piece, duplicate piece, twisted corner, flipped edge,
  swapped pieces) before solving.
- **Follow along on the cube itself** — Back / Play / Next controls float on the 3D view
  with a step-and-move counter, each move flashes on screen with its layer and direction
  ("R′ — right layer, counter-clockwise"), and the camera glides back to the canonical
  angle before every solution move so the notation always matches what you see.
  <kbd>→</kbd>/<kbd>←</kbd> step, <kbd>Space</kbd> plays.
- **Tutorial** — a full beginner's (layer-by-layer) course. Every algorithm on the page is
  clickable and animates on the cube, and each step has a *Practice* button that sets the
  cube up so only that step remains.

## Run it

**On your laptop:** just open `index.html` in any modern browser (double-click it).

**Or serve it locally:**

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Host it (free)

Because it's one static file, anything that serves static files works:

- **GitHub Pages** (easiest for this repo): repo **Settings → Pages → Build and deployment**,
  set *Source* to "Deploy from a branch", pick your default branch and `/ (root)`, save.
  Your site appears at `https://<username>.github.io/rubic_cube_tutorial/` in a minute or two.
- **Netlify Drop / Cloudflare Pages / Vercel**: drag-and-drop or point them at the repo.
- Or copy `index.html` anywhere — a USB stick works too.

## How the solver works

The cube is modeled at the piece level (8 corners + 12 edges with position and
orientation). Move tables are **derived from 3D geometry at startup** rather than
hand-coded, so they can't be mis-transcribed. The solver reproduces the human beginner
method so its output matches the tutorial:

1. **White cross** — a small exact-depth search (≤ 6 moves per edge) that never disturbs
   edges already placed.
2. **White corners** — pop out with `R U R'`, insert by repeating `R U R' U'`.
3. **Middle edges** — the standard right/left insertion algorithms, with ejection for
   stuck edges.
4. **Yellow cross** — `F R U R' U' F'` with a greedy lookahead over the four top-layer
   pre-rotations.
5. **Yellow edges** — Sune (`R U R' U R U2 R'`) 3-cycles with lookahead.
6. **Position yellow corners** — corner 3-cycle (`U R U' L' U R' U' L`) in all four
   rotations, both directions.
7. **Orient yellow corners** — repeated `R' D' R D` at the front-right corner, then final
   alignment.

Solutions average ~150 moves — long by speedcubing standards, but each move maps to a
tutorial step, which is the point.

## Tests

```sh
node tests/core.test.mjs          # 500-scramble fuzz (default)
node tests/core.test.mjs 5000     # heavier fuzz
```

The harness extracts the exact engine code embedded in `index.html` and verifies move-table
identities, permutation/orientation invariants, the contract of every algorithm the solver
relies on, and that random scrambles are always solved (the returned move list is replayed
on a fresh copy of the scramble and must reach the solved state).

## License

See [LICENSE](LICENSE).
