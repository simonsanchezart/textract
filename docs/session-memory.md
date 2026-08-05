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
4. Ctrl+Click 4 corners around the curved region, same gesture as a normal (quad) mark — this seeds a straight 4x4 interior grid
5. Drag the interior grid points (not just corners) to trace the actual curve in the photo
6. Shift+R or the Convert toolbar button to extract — should produce a flattened rectangle on the right (export) canvas
7. Shift+G back to quad mode for normal marks

## What Doesn't (yet)
- Never run `npm run tauri dev` on this machine yet — Phase 1 not started.
- No macOS bundle target in `tauri.conf.json` (only Windows NSIS + Linux deb/AppImage).
- No macOS runner in `.github/workflows/publish.yml` (only ubuntu-22.04 + windows-latest).
- No curved-surface extraction — current `transform_image` command is a single 4-point planar homography (`imageproc::geometric_transformations::Projection::from_control_points`), which can't model non-planar curvature.

## Key Technical Decisions
- Curved-surface warp approach: piecewise-affine / Delaunay-triangulated mesh warp over an NxM point grid (not full thin-plate-spline) — simpler, uses primitives already available via `imageproc`/hand-rolled barycentric warps, and `imageproc::geometric_transformations::Projection` is retained unchanged for the existing 4-point path.
- New mesh-warp feature is additive: new Tauri command (e.g. `transform_image_mesh`) alongside existing `transform_image`, not a replacement.
- Personal installer: arm64-only (this machine + user's other machines are all Apple Silicon), signed with `Developer ID Application: Glenn Hernandez Studios Incorporated`, kept private — not published anywhere.
- Rust installed via standard global rustup (`~/.cargo`, `~/.rustup`), not project-local — user's explicit choice after weighing self-containment vs reusability.

## Critical Gotchas
_(none yet — populate as Phase 1+ surfaces macOS-specific build/runtime issues)_

## Session Log (newest first)

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
