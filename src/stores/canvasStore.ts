import type { Vec2 } from "@/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CanvasType } from "@/types/types";

export type CanvasState = {
  scale: number;
  x: number;
  y: number;
};

type CanvasStore = {
  canvas: Record<CanvasType, CanvasState>;

  setCanvasScale: (canvas: CanvasType, scale: number) => void;
  setCanvasPosition: (canvas: CanvasType, pos: Vec2) => void;
};

export const useCanvasStore = create(
  persist(
    immer<CanvasStore>(set => ({
      canvas: {
        [CanvasType.MARK]: { scale: 1, x: 0, y: 0 },
        [CanvasType.ATLAS]: { scale: 1, x: 0, y: 0 },
      },
      setCanvasScale: (canvas, scale) =>
        set((state) => {
          state.canvas[canvas].scale = scale;
        }),
      setCanvasPosition: (canvas, pos) =>
        set((state) => {
          state.canvas[canvas].x = pos.x;
          state.canvas[canvas].y = pos.y;
        }),
    })),
    { name: "canvas-storage" },
  ),
);
