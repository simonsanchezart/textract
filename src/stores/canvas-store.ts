import type Konva from "konva";
import type { Node, NodeConfig } from "konva/lib/Node";
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

export type TransientCanvasState = {
  hoverShape: Konva.Shape | null;
  selectedNodes: Node<NodeConfig>[];
  /** Mark canvas only: which mark type Ctrl+Click creates next. */
  markCreationMode: "quad" | "grid" | "bezier";
  /** Mark canvas only: rows/cols used to seed the next new grid mark. */
  markGridRows: number;
  markGridCols: number;
  /**
   * Mark canvas only: currently-selected mark point(s). An array (not a
   * single value) even though only one point can be selected today, so a
   * future multi-select-and-convert-to-curve feature doesn't need a
   * breaking shape change.
   */
  selectedPoints: { markId: string; pointIndex: number }[];
};

type CanvasStore = {
  canvas: Record<CanvasType, CanvasState>;
  transientCanvas: Record<CanvasType, TransientCanvasState>;

  setCanvasScale: (canvas: CanvasType, scale: number) => void;
  setCanvasPosition: (canvas: CanvasType, pos: Vec2) => void;

  setSelectedNodes: (canvas: CanvasType, nodes: Node<NodeConfig>[]) => void;
  setHoverShape: (canvas: CanvasType, shape: Konva.Shape | null) => void;
  toggleMarkCreationMode: (canvas: CanvasType) => void;
  setMarkCreationMode: (canvas: CanvasType, mode: "quad" | "grid" | "bezier") => void;
  setMarkGridRows: (canvas: CanvasType, rows: number) => void;
  setMarkGridCols: (canvas: CanvasType, cols: number) => void;
  selectPoint: (canvas: CanvasType, markId: string, pointIndex: number) => void;
  togglePointSelection: (canvas: CanvasType, markId: string, pointIndex: number) => void;
  clearSelectedPoints: (canvas: CanvasType) => void;
};

export const useCanvasStore = create(
  persist(
    immer<CanvasStore>(set => ({
      canvas: {
        [CanvasType.MARK]: { scale: 1, x: 0, y: 0 },
        [CanvasType.ATLAS]: { scale: 1, x: 0, y: 0 },
      },
      transientCanvas: {
        [CanvasType.MARK]: { hoverShape: null, selectedNodes: [], markCreationMode: "quad", markGridRows: 4, markGridCols: 4, selectedPoints: [] },
        [CanvasType.ATLAS]: { hoverShape: null, selectedNodes: [], markCreationMode: "quad", markGridRows: 4, markGridCols: 4, selectedPoints: [] },
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
      setSelectedNodes: (canvas, nodes) =>
        set((state) => {
          state.transientCanvas[canvas].selectedNodes = nodes;
        }),
      setHoverShape: (canvas, shape) =>
        set((state) => {
          state.transientCanvas[canvas].hoverShape = shape;
        }),
      toggleMarkCreationMode: canvas =>
        set((state) => {
          const next = { quad: "grid", grid: "bezier", bezier: "quad" } as const;
          state.transientCanvas[canvas].markCreationMode
            = next[state.transientCanvas[canvas].markCreationMode];
        }),
      setMarkCreationMode: (canvas, mode) =>
        set((state) => {
          state.transientCanvas[canvas].markCreationMode = mode;
        }),
      setMarkGridRows: (canvas, rows) =>
        set((state) => {
          state.transientCanvas[canvas].markGridRows = rows;
        }),
      setMarkGridCols: (canvas, cols) =>
        set((state) => {
          state.transientCanvas[canvas].markGridCols = cols;
        }),
      selectPoint: (canvas, markId, pointIndex) =>
        set((state) => {
          state.transientCanvas[canvas].selectedPoints = [{ markId, pointIndex }];
        }),
      togglePointSelection: (canvas, markId, pointIndex) =>
        set((state) => {
          const points = state.transientCanvas[canvas].selectedPoints;
          const existingIdx = points.findIndex(p => p.markId === markId && p.pointIndex === pointIndex);
          if (existingIdx >= 0)
            points.splice(existingIdx, 1);
          else
            points.push({ markId, pointIndex });
        }),
      clearSelectedPoints: canvas =>
        set((state) => {
          state.transientCanvas[canvas].selectedPoints = [];
        }),
    })),
    {
      name: "canvas-storage",
      partialize: state => ({ canvas: state.canvas }),
    },
  ),
);
