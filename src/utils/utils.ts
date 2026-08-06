import type { ClassValue } from "clsx";
import type { Vec2 } from "@/types/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const VALID_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp"];

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
