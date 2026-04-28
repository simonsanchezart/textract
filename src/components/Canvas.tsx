import type Konva from "konva";
import type { Node, NodeConfig } from "konva/lib/Node";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { Box } from "konva/lib/shapes/Transformer";
import type { ReactNode } from "react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import useCanvasGrid from "@/hooks/use-canvas-grid";
import useCanvasZoom from "@/hooks/use-canvas-zoom";
import { snap } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import PopupConfirm from "./PopupConfirm";

type CanvasProps = {
  canvasType: CanvasType;
  className?: string;
  children?: ReactNode;
  onDelete?: (ids: string[]) => void;
} & React.ComponentProps<typeof Stage>;

function Canvas({ canvasType, className, children, ...props }: CanvasProps) {
  const STAGE_SIZE = 2048;
  const snapSize = useSettingsStore(s => s.snap);

  const stageRef = useRef<Konva.Stage>(null);
  const canvasState = useCanvasStore(s => s.canvas[canvasType]);

  const handleZoom = useCanvasZoom({ stageRef, canvasType });
  const drawGrid = useCanvasGrid({ dotSize: 1, dotSpacing: snapSize }, stageRef);

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node<NodeConfig>[]>([]);

  const [openConfirmation, setOpenConfirmation] = useState(false);

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

    const x = snap(target.x(), snapSize);
    const y = snap(target.y(), snapSize);

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

    const newX = snap((newBox.x - stageX) / scale, snapSize);
    const newY = snap((newBox.y - stageY) / scale, snapSize);
    const newW = snap(newBox.width / scale, snapSize);
    const newH = snap(newBox.height / scale, snapSize);

    return {
      x: newX * scale + stageX,
      y: newY * scale + stageY,
      width: Math.max(newW * scale, scale * snapSize),
      height: Math.max(newH * scale, scale * snapSize),
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
          <Shape sceneFunc={drawGrid} />
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
