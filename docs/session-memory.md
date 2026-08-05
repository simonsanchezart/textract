# Textract — Session Memory

## Project Identity
Fork of [simonsanchezart/textract](https://github.com/simonsanchezart/textract) (MIT, 292 stars) — a Tauri v2 desktop app that extracts/deskews textures from photos via 4-corner perspective warp. Our fork: `ghsnyc/textract`. Goals: (1) native macOS support, (2) a private signed installer for personal machines, (3) a new curved-surface (mesh-warp) extraction feature, (4) upstream PRs for both.

Stack: React 19 + TypeScript + Vite + Tailwind + Zustand + react-konva (frontend) / Rust + Tauri v2 + image/imageproc/rayon (backend, `src-tauri/`).

## What Works
- Fork + clone + upstream remote set up.
- Rust toolchain (rustc 1.97.1, stable-aarch64-apple-darwin) confirmed installed.

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

### 2026-08-05 — Session 1: Planning + Phase 0
- Explored upstream repo via GitHub API/raw fetches (no local clone needed for planning) — confirmed Tauri v2 stack, no macOS bundle/CI target, and that the extraction algorithm is a pure 4-point homography with no curve support.
- Confirmed machine has Developer ID signing cert and authenticated `gh` (ghsnyc) already — no setup needed there.
- User confirmed: arm64-only installer, mesh/grid curved UX, two separate upstream PRs.
- Forked to `ghsnyc/textract`, cloned to `Textract_GHS/textract`, added `upstream` remote, installed rustup (rustc 1.97.1).
- Next: docs scaffold finish (this file + LEARNINGS.md), NotebookLM notebook, then Phase 1 (`npm install && npm run tauri dev`).
