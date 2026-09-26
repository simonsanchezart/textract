import type { ClassValue } from "clsx";
import type { Vec2 } from "@/types/types";
import { appLocalDataDir, appLogDir, join } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const VALID_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp"];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getCacheDirectory() {
  const appLocalData = await appLocalDataDir();
  const cacheDir = await join(appLocalData, "cache");
  await mkdir(cacheDir, { recursive: true });

  return cacheDir;
}

export async function getLogFile() {
  const logDir = await appLogDir();
  if (!(await exists(logDir)))
    return;

  const logFile = await join(logDir, "Textract.log");
  if (!(await exists(logFile)))
    return;

  return logFile;
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

export const RAD_TO_DEG = (180 / Math.PI);

export function angleBetweenPoints(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
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

export function roundObject(object: object) {
  return Object.fromEntries(Object.entries(object).map(([k, v]) => [k, Math.round(v)]));
}
