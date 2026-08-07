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

/** Evaluates a cubic bezier P0-P1-P2-P3 at parameter t in [0,1]. */
export function cubicBezierPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
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
 * Classifies 4 arbitrarily-ordered corner points into { tl, tr, bl, br }.
 * Sorts by angle around the centroid first (rotation-invariant — this is
 * what makes it safe for any quad orientation the user clicks, not just
 * axis-aligned ones), then starts the cycle at whichever point is closest to
 * top-left. Quadrant membership tests alone aren't enough here: a rotated
 * quad (e.g. a diamond) can put two points in one quadrant and none in
 * another, which silently duplicates a corner and drops one entirely.
 */
export function classifyCorners(points: Vec2[]): { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 } {
  const center = getMiddle(points);
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });

  let startIdx = 0;
  let best = Infinity;
  sorted.forEach((p, i) => {
    const score = p.x + p.y;
    if (score < best) {
      best = score;
      startIdx = i;
    }
  });

  const [tl, tr, br, bl] = [0, 1, 2, 3].map(offset => sorted[(startIdx + offset) % 4]);
  return { tl, tr, bl, br };
}

/**
 * Seeds the 8 bezier handles (2 per edge) for a brand-new bezier mark from
 * its 4 corners [tl, tr, br, bl], placed at each straight edge's 1/3 and 2/3
 * points — the standard "this cubic bezier is actually a straight line"
 * control-point placement, so a fresh mark renders as a plain straight-edged
 * quad until the user drags a handle to bow it.
 */
export function straightBezierHandles(corners: Vec2[]): Vec2[] {
  const handles: Vec2[] = [];
  for (let i = 0; i < 4; i++) {
    const p0 = corners[i];
    const p3 = corners[(i + 1) % 4];
    handles.push(lerpVec2(p0, p3, 1 / 3), lerpVec2(p0, p3, 2 / 3));
  }
  return handles;
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
