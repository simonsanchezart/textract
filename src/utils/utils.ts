import type { ClassValue } from "clsx";
import type { Vec2 } from "@/types/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isMacOS() {
  return navigator.platform.toLowerCase().includes("mac");
}

export function isShortcutModifierPressed(e: Pick<KeyboardEvent | MouseEvent, "ctrlKey" | "metaKey">) {
  return isMacOS() ? e.metaKey : e.ctrlKey;
}

export function getShortcutModifierLabel() {
  return isMacOS() ? "Cmd" : "Ctrl";
}

export function getMiddle(v: Vec2[]) {
  const average = v.reduce((a, b) => {
    return { x: a.x + b.x, y: a.y + b.y };
  });

  average.x /= v.length;
  average.y /= v.length;
  return average;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function lerpFloat(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function snap(x: number, increment: number) {
  return Math.round(x / increment) * increment;
}

export function snapPowerOfTwo(x: number) {
  if (x <= 0)
    return 1;
  return 2 ** Math.round(Math.log2(x));
}

export function clamp(x: number, min: number, max: number) {
  return Math.max(Math.min(x, max), min);
}

/**
 * Classifies 4 arbitrarily-ordered corner points into { tl, tr, bl, br } by
 * comparing each to the centroid. Works for any reasonably convex quad the
 * user clicks (not just axis-aligned ones) — the common case for a mark.
 */
export function classifyCorners(points: Vec2[]): { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 } {
  const center = getMiddle(points);
  const tl = points.find(p => p.x < center.x && p.y < center.y) ?? points[0];
  const tr = points.find(p => p.x >= center.x && p.y < center.y) ?? points[1];
  const bl = points.find(p => p.x < center.x && p.y >= center.y) ?? points[2];
  const br = points.find(p => p.x >= center.x && p.y >= center.y) ?? points[3];
  return { tl, tr, bl, br };
}

/**
 * Bilinearly interpolates a rows x cols grid of points across a quad defined
 * by its 4 corners, returned row-major (row 0 first, left-to-right).
 * Used to seed a new curved-surface (grid) mark's interior control points —
 * the user then drags individual points to trace the actual curve.
 */
export function bilinearGrid(corners: { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 }, rows: number, cols: number): Vec2[] {
  const { tl, tr, bl, br } = corners;
  const points: Vec2[] = [];

  for (let i = 0; i < rows; i++) {
    const v = rows === 1 ? 0 : i / (rows - 1);
    const left = lerpVec2(tl, bl, v);
    const right = lerpVec2(tr, br, v);

    for (let j = 0; j < cols; j++) {
      const u = cols === 1 ? 0 : j / (cols - 1);
      points.push(lerpVec2(left, right, u));
    }
  }

  return points;
}
