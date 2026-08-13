<p align="center"><img src="assets/logo.png" alt="Textract Logo" width="512">

<p align="center">
  <strong>A standalone desktop application for easy texture extraction & deskewing from images.</strong>
</p>

<p align="center">
    <a href="https://www.youtube.com/watch?v=77IxX3Gs30A">
    <img src="https://img.shields.io/badge/▶%20Watch%20the%20Trailer-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch the Trailer">
    </a>
    <a href="https://github.com/simonsanchezart/textract/releases/latest">
        <img src="https://img.shields.io/github/v/release/simonsanchezart/textract?style=for-the-badge" alt="Release">
    </a>
</p>

## Overview

**Textract** allows you to load images, mark sections to extract (such as signage, product labels, or building), apply a perspective warp and pack the flattened output into custom texture atlas or export them individually.

<p align="center">
  <img src="assets/demo.gif" alt="Textract In Action" width="800">
</p>

## Key Features

- **Dual-Pane Interactive Workspace**:
    - **Mark Canvas (Left)**: Load source images and mark sections to extract.
    - **Atlas Canvas (Right)**: Arrange extracted textures into an atlas or to export individually.
- **Perspective Correction**: - Extremely fast using **imageproc** and **rayon** for parallelism.
- **Grid Snapping** - With custom grid sizes.
- **Atlas Export**: Arrange your textures into a single atlas for export.
- **Individual Export**: Export textures individually.
- **Auto Updater**: Simple one-click updater to get the latest features and fixes.

## How It Works

```mermaid
graph LR
    A[1. Load Images] --> B[2. Place Marks]
    B --> C[3. Extract]
    C --> D[4. Export]
```

1. **Load Images**: Load PNG, JPG, JPEG, or BMP files.
2. **Place Marks**: Hold `Cmd` on macOS or `Ctrl` on Windows/Linux and click four points to form a rect around your target texture.
3. **Extract**: Hit `Shift + R` or click the Convert button.
4. **Export**: Position the extracted textures on the Atlas Canvas and export!

## 📚 Documentation

See [`docs/help.md`](docs/help.md).

The documentation is also available in-app via the 📕 icon in the bottom-left corner.

## Issues

<details>
<summary>I cannot run the .app in MacOS</summary>
The .app is not signed. You must manually remove the quarantine attribute so it can be properly executed.

In the terminal, run:

`xattr -c "PATH_TO_TEXTRACT.APP"`

</details>

## 🛠️ Stack

- **Frontend**:
    - [React 19](https://react.dev) & [TypeScript](https://www.typescriptlang.org)
    - [react-konva](https://github.com/konvajs/react-konva) / [Konva](https://konvajs.org)
    - [Tailwind CSS](https://tailwindcss.com)
    - [Zustand](https://github.com/pmndrs/zustand)

- **Backend & Core**:
    - [Tauri v2](https://tauri.app) (Secure, fast desktop framework)
    - **Rust Backend**:
        - `imageproc` (Warping, bilinear interpolation, geometric transformations)
        - `rayon` (Data parallelism for multi-threaded mark processing)
        - `base64` (Base64 encoding/decoding for inter-process communication)
    - [Github Actions](https://github.com/features/actions)
