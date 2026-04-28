import type Konva from "konva";
import type { Node, NodeConfig } from "konva/lib/Node";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { Box } from "konva/lib/shapes/Transformer";
import type { ReactNode } from "react";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import useCanvasZoom from "@/hooks/use-canvas-zoom";
import { snap } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasType } from "@/types/types";
import PopupConfirm from "./PopupConfirm";

type CanvasProps = {
  canvasType: CanvasType;
  className?: string;
  children?: ReactNode;
  onDelete?: (ids: string[]) => void;
} & React.ComponentProps<typeof Stage>;

function Canvas({ canvasType, className, children, ...props }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const canvasState = useCanvasStore(s => s.canvas[canvasType]);
  const handleZoom = useCanvasZoom({ stageRef, canvasType });

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node<NodeConfig>[]>([]);

  const [openConfirmation, setOpenConfirmation] = useState(false);

  const STAGE_SIZE = 2048;
  const DOT_SPACING = 64;
  const DOT_SIZE = 2;
  const SNAP_SIZE = 16;

  // refactor: extract to hook
  const dragGrid = useCallback((ctx: Konva.Context, shape: Konva.Shape) => {
    const stage = stageRef.current;
    if (!stage)
      return;

    const scale = stage.scaleX();
    const stagePos = stage.getPosition();

    // don't draw grid if zoom < 35%
    if (scale < 0.35)
      return;

    const viewWidth = stage.width() / scale;
    const viewHeight = stage.height() / scale;

    const startX = -stagePos.x / scale;
    const startY = -stagePos.y / scale;
    const endX = startX + viewWidth;
    const endY = startY + viewHeight;

    const firstX = Math.floor(startX / DOT_SPACING) * DOT_SPACING;
    const firstY = Math.floor(startY / DOT_SPACING) * DOT_SPACING;

    ctx.fillStyle = "#3e3e3e";
    for (let x = firstX; x < endX; x += DOT_SPACING) {
      for (let y = firstY; y < endY; y += DOT_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStrokeShape(shape);
  }, []);

  const handleShortcuts = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.code) {
      case "Delete":{
        const selected = transformerRef.current?.nodes() ?? [];
        if (selected.length !== 0)
          setOpenConfirmation(true);
      }
    }
  };

  useEffect(() => {
    transformerRef.current?.nodes(selectedNodes);
  }, [selectedNodes]);

  // refactor: extract to hook (with above useEffect)
  const handleSelection = (e: KonvaPointerEvent) => {
    if (e.target === e.target.getStage()) {
      setSelectedNodes([]);
      return;
    }

    const group = e.target.findAncestor(".master", false);
    if (!group)
      return;

    setSelectedNodes((prev) => {
      if (!e.evt.shiftKey)
        return [group];
      if (selectedNodes.includes(group))
        return prev.filter(i => i !== group);
      return [...prev, group];
    });
  };

  // refactor: extract to hook
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    if (target.name() !== "master")
      return;

    const x = snap(target.x(), SNAP_SIZE);
    const y = snap(target.y(), SNAP_SIZE);

    target.position({ x, y });
  };

  // refactor: extract to hook (with handleDragMove)
  const handleTransformSnapping = (_oldBox: Box, newBox: Box) => {
    const stage = stageRef.current;
    if (!stage)
      return newBox;

    const scale = stage.scaleX();
    const stageX = stage.x();
    const stageY = stage.y();

    const newX = snap((newBox.x - stageX) / scale, SNAP_SIZE);
    const newY = snap((newBox.y - stageY) / scale, SNAP_SIZE);
    const newW = snap(newBox.width / scale, SNAP_SIZE);
    const newH = snap(newBox.height / scale, SNAP_SIZE);

    return {
      x: newX * scale + stageX,
      y: newY * scale + stageY,
      width: Math.max(newW * scale, scale * SNAP_SIZE),
      height: Math.max(newH * scale, scale * SNAP_SIZE),
      rotation: newBox.rotation,
    };
  };

  return (
    <div className="h-full" tabIndex={-1} onKeyDown={handleShortcuts}>
      <PopupConfirm
        title="Delete Selected"
        description="Are you sure you want to delete the selected images?"
        confirmLabel="Delete"
        open={openConfirmation}
        setOpen={setOpenConfirmation}
        onConfirm={() => {
          const selected = transformerRef.current?.nodes() ?? [];
          const selectedIds = selected.map(node => node.id());
          props.onDelete?.(selectedIds);
          transformerRef.current?.nodes([]);
        }}
      />

      <Stage
        width={STAGE_SIZE}
        height={STAGE_SIZE}
        scale={{ x: canvasState.scale, y: canvasState.scale }}
        x={canvasState.x}
        y={canvasState.y}
        draggable
        className={`h-0 ${className}`}
        ref={stageRef}
        onWheel={handleZoom}
        onDragMove={handleDragMove}
        onClick={handleSelection}
        onContextMenu={(e) => {
          // todo: add context menu
          e.evt.preventDefault();
        }}
        {...props}
      >
        <Layer listening={false}>
          <Shape sceneFunc={dragGrid} />
        </Layer>
        <Layer>
          {children}
          <Transformer
            ref={transformerRef}
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={45}
            keepRatio={canvasType === CanvasType.MARK}
            boundBoxFunc={handleTransformSnapping}
            enabledAnchors={
              canvasType === CanvasType.MARK
                ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                : [
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                    "middle-left",
                    "middle-right",
                    "top-center",
                    "bottom-center",
                  ]
            }
          />
        </Layer>
      </Stage>
      <small className="opacity-50 text-sm select-none absolute bottom-0 right-0 m-2">
        {Math.round(canvasState.scale * 100)}
        %
      </small>
    </div>
  );
}
export default Canvas;
