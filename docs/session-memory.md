# Textract — Session Memory

## Project Identity
Fork of [simonsanchezart/textract](https://github.com/simonsanchezart/textract) (MIT, 292 stars) — a Tauri v2 desktop app that extracts/deskews textures from photos via 4-corner perspective warp. Our fork: `ghsnyc/textract`. Goals: (1) native macOS support, (2) a private signed installer for personal machines, (3) a new curved-surface (mesh-warp) extraction feature, (4) upstream PRs for both.

Stack: React 19 + TypeScript + Vite + Tailwind + Zustand + react-konva (frontend) / Rust + Tauri v2 + image/imageproc/rayon (backend, `src-tauri/`).

## What Works
- Fork + clone + upstream remote set up.
- Rust toolchain (rustc 1.97.1, stable-aarch64-apple-darwin) confirmed installed.

## How to test the curved-surface (grid mark) feature
1. `cd textract && CARGO_TARGET_DIR="/Volumes/Studio 4TB T500/_Caches/CodingBUILD_Cache/textract-dev/target" npm run tauri dev`
2. Load a photo with an actual curved surface (bottle label, bent sign, etc.)
3. Click the new 3x3-grid toolbar icon (top-left, next to Load/Convert) or press Shift+G to switch to grid mode — icon highlights when active
4. Cmd+Click (macOS) or Ctrl+Click (Windows/Linux) 4 corners around the curved region, same gesture as a normal (quad) mark — this seeds a straight 4x4 interior grid
5. Drag the interior grid points (not just corners) to trace the actual curve in the photo
6. Shift+R or the Convert toolbar button to extract — should produce a flattened rectangle on the right (export) canvas
7. Shift+G back to quad mode for normal marks

## What Doesn't (yet) — current as of end of session 2026-08-05 (upstream PRs opened)
Everything from Phase 4b is built AND confirmed working live by the user, including the multi-select group-drag fix and help-doc table alignment fix from this session. Remaining gaps:
- **Minor, not fixed**: removing a mark doesn't clean up its entries from `selectedPoints` (multi-select) — harmless today, no consumer reads stale entries, but will matter once multi-select feeds something (e.g. the deferred curve/tension phase).
- Per-vertex curve/tension editing (Phase 4b plan item 6) — deliberately deferred, design captured in the plan file but not built.
- **Split for upstream and opened**: [PR #18](https://github.com/simonsanchezart/textract/pull/18) (curved-surface), [#19](https://github.com/simonsanchezart/textract/pull/19) (undo/redo), [#20](https://github.com/simonsanchezart/textract/pull/20) (mark-editing UX), [#21](https://github.com/simonsanchezart/textract/pull/21) (help doc — flagged in its own description to merge last). Now awaiting maintainer review/feedback on all 4.

## Key Technical Decisions
- Curved-surface warp approach: piecewise-affine / Delaunay-triangulated mesh warp over an NxM point grid (not full thin-plate-spline) — simpler, uses primitives already available via `imageproc`/hand-rolled barycentric warps, and `imageproc::geometric_transformations::Projection` is retained unchanged for the existing 4-point path.
- New mesh-warp feature is additive: new Tauri command (e.g. `transform_image_mesh`) alongside existing `transform_image`, not a replacement.
- Personal installer: arm64-only (this machine + user's other machines are all Apple Silicon), signed with `Developer ID Application: Glenn Hernandez Studios Incorporated`, kept private — not published anywhere.
- Rust installed via standard global rustup (`~/.cargo`, `~/.rustup`), not project-local — user's explicit choice after weighing self-containment vs reusability.

## Critical Gotchas
_(none yet — populate as Phase 1+ surfaces macOS-specific build/runtime issues)_

## Session Log (newest first)

### 2026-08-05 — Session 4: multi-select group-drag fix, help doc alignment fix, upstream PR split and open
- **User confirmed session 3's batch works**, plus reported two new bugs: (1) Shift+Click multi-select worked but dragging one of several selected points only moved that one point, not the group; (2) the bundled help doc's mac/windows shortcut columns visually collided.
- **Multi-select group-drag root cause**: `onMouseDown` unconditionally called `selectPoint` (replacing the whole selection) before a drag started, so grabbing any already-selected point collapsed the selection to just that point right before `onDragStart` fired. Fixed by only collapsing to single-select if the clicked point wasn't already part of the current selection; added a drag-start snapshot (`dragStartRef`) so `onDragMove`/`onDragEnd` can apply the same delta to every selected point, not just the one Konva reports drag events for.
- **Help doc alignment root cause**: `table-layout: auto` (the default) let each of the 3 shortcut tables independently compute column widths based on their own mix of `colspan`/3-column rows, so the macOS header drifted out of alignment with the shortcut pills below it. Fixed with `table-layout: fixed` + an explicit `<colgroup>` on all 3 tables.
- **Split `feature/macos-support` into 4 upstream PRs** per the maintainer's explicit one-PR-per-feature request: curved-surface mesh warp ([#18](https://github.com/simonsanchezart/textract/pull/18)), undo/redo ([#19](https://github.com/simonsanchezart/textract/pull/19)), mark-editing UX ([#20](https://github.com/simonsanchezart/textract/pull/20)), help doc ([#21](https://github.com/simonsanchezart/textract/pull/21)). Used 4 isolated `git worktree`s, cherry-picking commits per-feature onto fresh branches off `upstream/main`. Required real surgery during conflict resolution to keep each branch's diff scoped to its own feature (e.g. dropping grid-mode code that leaked into non-curved-surface branches via shared-file conflicts, moving a misplaced Undo/Redo tooltip line from the UX branch to the undo branch).
- **Opus review pass on all 4 branches before pushing** (user's explicit request: "use opus if it helps to make sure it's all done well") found zero leftover conflict markers and zero cross-PR contamination, but did catch two real issues: a stale code comment in the UX branch that called multi-select a "future feature" right next to the code implementing it, and two commit messages in the curved-surface branch that leaked fork-internal references (a PROGRESS.md mention, a fork-only commit hash) not meaningful upstream. Both fixed before push.
- **Gotcha**: interactive rebase (`reword`/`edit`) on this network-drive-hosted repo repeatedly threw spurious "local changes would be overwritten by merge" errors mid-sequence — not real conflicts, just retry-and-continue each time (verified no data loss via diff-stat comparison). Plain `git push` had zero issues. See `LEARNINGS.md`.
- All 4 PRs opened same session. Help-doc PR's description explicitly flags it should merge last, since it documents features from the other 3.

### 2026-08-05 — Session 3: Phase 4b bugs fixed and confirmed, new multi-select feature, compacting on context limit
- **Both bugs from session 2's cutoff, fixed and confirmed working live by the user**: point-drag undo (root cause: `Mark.tsx`'s local `points` React state never re-synced from the store — a plain React staleness bug, not another zundo issue) and the quad-mode icon/toolbar dimming. Found by re-reading code directly, no Opus needed for either.
- **Handle sizing bug**: user reported handles were "still tiny and not changeable" even after session 2's zoom-compensation fix. Root cause: base size was still derived from `imageData.sizeSum * 0.0001` (image pixel dimensions), which gives ~0.1-0.3x for typical photos — so even the Handles stepper at max (4x) barely moved the needle. Decoupled entirely from image size; now `scaleFactor = markHandleScale / canvasZoom`, giving a sane ~20px default.
- **New user asks, all addressed**: Handles stepper 0.1 step (was 0.25), stepper visual alignment fix, Shift+Click multi-select for points, mac/windows shortcut differentiation matching the README's own convention (applied to the new bundled help doc).
- **Opus review (requested by user, batched for both the multi-select feature and the alignment CSS fix) found two real bugs neither of us caught**:
  1. My alignment-fix hypothesis was directionally right (asymmetric borders) but the actual defect was the *opposite* of what I guessed — a doubled 2px border on the left, not a missing border on the right. Also caught that my first attempted fix was silently dropped by tailwind-merge's conflict resolution (string-order-dependent, not CSS-cascade-dependent) — see `LEARNINGS.md`.
  2. Shift+Click multi-select didn't actually work at all when first implemented: Konva's synthetic `click` event bubbles through parent Groups, and `MarkImage`'s background-click handler was clearing the selection immediately after each mousedown selected/toggled it. This affected the pre-existing single-select too, but only surfaced as occasional flakiness there (Konva suppresses the synthetic click above ~3px of drag jitter, so unsteady clicks "worked" by accident). Fixed with `e.cancelBubble = true`. See `LEARNINGS.md`'s new React-Konva section.
- Both Opus review agents this session found genuine, non-obvious bugs neither the user nor I caught on our own — reinforces the value of the standing "use Opus for tricky logic" instruction, including for CSS/event-bubbling issues, not just algorithmic code.
- Session ended proactively on context limit (89%) rather than rate limit this time — compacted with full save-state docs written first.

### 2026-08-05 — Session 2: Phase 4b (grid-mark UX), PR #1 closed, ended on rate limit
- User hands-on confirmed the core curved-surface feature works on a real bottle-label photo (session 1's "no interactive test yet" gap closed). Minor edge softness at low grid density noted as expected, not a bug.
- Cherry-picked [upstream PR #14](https://github.com/simonsanchezart/textract/pull/14) (community fix, since merged) for macOS's Ctrl+Click-is-right-click conflict — app-wide `isShortcutModifierPressed()`/`getShortcutModifierLabel()` helpers, Cmd on macOS.
- **PR #1 closed by the maintainer** — redundant with #14. Doesn't affect our own signed installer (entitlements only matter for signed builds; maintainer isn't signing his). PR #2 (curved-surface) will rebase on current `upstream/main` and only contain the mesh-warp feature.
- Planned + built Phase 4b (see plan file): Opus review of the merged grid-mark code found and fixed 4 confirmed + 1 plausible bug (rotated-quad corner classification, async-forEach race in convertMarks, missing error handling on both invoke calls, grid preview lines stealing hoverShape, non-integer rows/cols). Then built: zoom-stable adjustable handle/line sizing (Footer "Handles" stepper), selected-vertex highlight (canvas-store `selectedPoints`, array-shaped for a later multi-select curve phase), and started undo/redo (zundo `temporal` middleware).
- **Undo/redo hit two real bugs in a row**, both fixed via Opus investigation rather than guessing: first, dragging a point calls two store actions (`updateMarkPoint` + `updateMarkDirty`), and `temporal` snapshots every `set()` call, so one drag produced two history entries — fixed with a debounced `handleSet`. Second (subtler): that debounce was trailing-edge, but zundo calls `handleSet` with the state *before* the triggering set — a trailing debounce keeps the *last* call's (nearly-final) state, so undo looked like a no-op. Fixed with a leading-edge debounce (keeps the state from *before* the drag started), verified against the real `persist(temporal(immer(...)))` composition via a standalone script before landing.
- **Session ended on rate limit with undo still not fully fixed**: user confirmed image-position undo now works, but mark point-drag undo still doesn't — see "What Doesn't (yet)" above for exact next-session starting point. Also captured a new UX ask (quad-mode icon + toolbar dimming) not yet started.
- Business side: user is weighing selling a signed Mac build (MIT permits it) and had a few back-and-forth exchanges with the maintainer on the PR thread about signing/entitlements — informational, not a code change.

### 2026-08-05 — Session 1 continued: Phases 1-4 + PR #1
- **Phase 1**: app runs natively on macOS, zero code changes (see LEARNINGS.md for the multi-monitor/computer-use gotchas hit while verifying this).
- **Phase 2**: added `dmg`/`app` bundle targets + `macOS.minimumSystemVersion` to `tauri.conf.json`. Working release build produced.
- **Phase 3**: signed with the user's existing Developer ID cert + `Entitlements.plist` (hardened runtime), notarized via their existing `App-Notarization` keychain profile (no new credentials needed), stapled. Final `.dmg` copied to `Textract_GHS/personal-installer/` — private, not published.
- **PR #1 opened**: [simonsanchezart/textract#16](https://github.com/simonsanchezart/textract/pull/16) — macOS bundle target + entitlements + CI matrix, prepared in an isolated `git worktree` after a concurrent spawned session collided with cherry-picks in the shared working tree.
- **Phase 4 (in progress)**: added `transform_image_mesh` (piecewise-affine mesh warp, Rust) and a new "grid" mark type (frontend) for curved-surface extraction. Opus review caught a real half-pixel sampling bug (destination pixel-center vs source index-space convention mismatch) before it shipped — fixed and re-verified with unit tests. Frontend type-checks and lints clean, app boots fine, but **no interactive click-through test has been done yet** — needs the user (or a session with computer-use/Accessibility access) to actually place a grid mark on a real curved photo and confirm the output looks right.

### 2026-08-05 — Session 1: Planning + Phase 0
- Explored upstream repo via GitHub API/raw fetches (no local clone needed for planning) — confirmed Tauri v2 stack, no macOS bundle/CI target, and that the extraction algorithm is a pure 4-point homography with no curve support.
- Confirmed machine has Developer ID signing cert and authenticated `gh` (ghsnyc) already — no setup needed there.
- User confirmed: arm64-only installer, mesh/grid curved UX, two separate upstream PRs.
- Forked to `ghsnyc/textract`, cloned to `Textract_GHS/textract`, added `upstream` remote, installed rustup (rustc 1.97.1).
- Next: docs scaffold finish (this file + LEARNINGS.md), NotebookLM notebook, then Phase 1 (`npm install && npm run tauri dev`).
