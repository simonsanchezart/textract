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
  markCreationMode: "quad" | "grid";
};

type CanvasStore = {
  canvas: Record<CanvasType, CanvasState>;
  transientCanvas: Record<CanvasType, TransientCanvasState>;

  setCanvasScale: (canvas: CanvasType, scale: number) => void;
  setCanvasPosition: (canvas: CanvasType, pos: Vec2) => void;

  setSelectedNodes: (canvas: CanvasType, nodes: Node<NodeConfig>[]) => void;
  setHoverShape: (canvas: CanvasType, shape: Konva.Shape | null) => void;
  toggleMarkCreationMode: (canvas: CanvasType) => void;
};

export const useCanvasStore = create(
  persist(
    immer<CanvasStore>(set => ({
      canvas: {
        [CanvasType.MARK]: { scale: 1, x: 0, y: 0 },
        [CanvasType.ATLAS]: { scale: 1, x: 0, y: 0 },
      },
      transientCanvas: {
        [CanvasType.MARK]: { hoverShape: null, selectedNodes: [], markCreationMode: "quad" },
        [CanvasType.ATLAS]: { hoverShape: null, selectedNodes: [], markCreationMode: "quad" },
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
          state.transientCanvas[canvas].markCreationMode
            = state.transientCanvas[canvas].markCreationMode === "quad" ? "grid" : "quad";
        }),
    })),
    {
      name: "canvas-storage",
      partialize: state => ({ canvas: state.canvas }),
    },
  ),
);
