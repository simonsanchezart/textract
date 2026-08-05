# Textract — Learnings

Project-local learnings log for the Textract macOS port + curved-surface feature. Promote anything universal to the global `tooling-gotchas` skill or a new `~/ClaudeShared/skills-building/` skill once patterns stabilize; anything Tauri/Rust-image-warp-specific stays here or gets promoted to a new dedicated skill if this becomes a recurring project type.

## Rust / Tauri / macOS

- **The app builds and runs natively on macOS with zero code changes.** `cargo check` / `npm run tauri dev` both succeed out of the box (Xcode 26.3, rustc 1.97.1, macOS 15.7.8, Apple Silicon). The Rust backend has no platform-specific code; the only reason macOS "isn't supported" upstream is missing bundle/CI config (see Phase 2).
- **Benign updater error in dev mode:** `[ERROR][webview] None of the fallback platforms ["darwin-aarch64-app", "darwin-aarch64"] were found in the response platforms object`. This is the `tauri-plugin-updater` checking `latest.json` on GitHub Releases, which (as expected) has no macOS entry since CI never built one. Not a real error — will resolve itself once macOS releases exist, or can be ignored entirely in dev.
- **Dev-mode window may open on a secondary monitor, and multi-display screenshot tooling can miss it.** On this 3-monitor setup, the Tauri window appeared on the monitor arranged *below* the primary display in global coordinate space (Y=1440+), not the primary. `screencapture -D <n>` display-index numbering did NOT match `CGDirectDisplayID` order — confirm actual window position via `CGWindowListCopyWindowInfo` (or the Swift one-liner below) before concluding a window failed to launch. Don't assume "nothing on any display capture" means the app crashed — check window existence via the window list APIs first.
  ```swift
  // /tmp/winlist.swift — list windows by owner name (bypasses accessibility/TCC restrictions)
  import CoreGraphics
  let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as! [[String: AnyObject]]
  for w in list where (w["kCGWindowOwnerName"] as? String)?.lowercased().contains("textract") == true { print(w) }
  ```
  Then capture that specific window regardless of which monitor it's on: `screencapture -x -l <kCGWindowNumber> out.png` (note: `CGWindowListCreateImage` is removed as of macOS 15 — `screencapture -l` still works and uses ScreenCaptureKit internally).
- **`computer-use` MCP cannot target an unbundled dev binary.** `request_access` resolves app names against the LaunchServices index; a `cargo run`/`tauri dev` binary launched directly (no `.app` wrapper, no bundle ID) isn't registered there, so `request_access` returns "doesn't match any installed or running application" even though `lsappinfo`/`ps` show it as a live foreground GUI process. Interactive click-testing (drag corners, verify extraction) has to wait for a real `.app` bundle (Phase 2) — dev-mode verification is visual-only (screenshot the window) until then. Similarly, AppleScript/System Events `count of windows` on the process returns 0 without Accessibility (TCC) permission granted to the calling shell — don't mistake that for "no window exists"; cross-check with the CGWindowList approach above, which doesn't require any special permission.
- **Network-drive build cache pattern confirmed necessary here too.** `npm install` directly on the SMB-mounted project (`/Volumes/gfxWorkDrive/...`) took ~20 minutes for 855 packages. For the Rust build, set `CARGO_TARGET_DIR` to a local disk cache (e.g. `/Volumes/Studio 4TB T500/_Caches/CodingBUILD_Cache/textract-dev/target`) instead of letting `target/` live on the network mount — cuts a from-scratch `cargo check` down to ~30s. Source stays on the network drive (edited normally); only the Rust build output needs to be local. Per the global CLAUDE.md build-cache rule, delete the cache folder when the project wraps up.

## Image warp / geometry (curved-surface feature)

_(none yet)_
