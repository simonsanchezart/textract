import type Konva from "konva";
import type { ReactNode } from "react";
import { debug } from "@tauri-apps/plugin-log";
import { useCallback, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import useCanvasGrid from "@/components/canvas/hooks/use-canvas-grid";
import useCanvasSelection from "@/components/canvas/hooks/use-canvas-selection";
import useTransformSnapping from "@/components/canvas/hooks/use-canvas-snapping";
import useCanvasZoom from "@/components/canvas/hooks/use-canvas-zoom";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import PopupConfirm from "../PopupConfirm";

type CanvasProps = {
  canvasType: CanvasType;
  className?: string;
  children?: ReactNode;
  onDelete?: (ids: string[]) => void;
} & React.ComponentProps<typeof Stage>;

function Canvas({ canvasType, className, children, onDelete, ...props }: CanvasProps) {
  const STAGE_SIZE = 2048;

  const snapSize = useSettingsStore(s => s.snap);
  const canvasState = useCanvasStore(s => s.canvas[canvasType]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const drawGrid = useCanvasGrid({ dotSize: 1, dotSpacing: snapSize }, stageRef);
  const handleZoom = useCanvasZoom({ stageRef, canvasType });
  const handleSelection = useCanvasSelection({ transformerRef });
  const [handleDragMove, handleTransformSnapping] = useTransformSnapping({ stageRef, snapSize });
  const [openConfirmation, setOpenConfirmation] = useState(false);

  const handleShortcuts = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.code) {
      case "Delete": {
        const selected = transformerRef.current?.nodes() ?? [];
        if (selected.length !== 0)
          setOpenConfirmation(true);
      }
    }
  };

  const onConfirmDeletion = useCallback(() => {
    const selected = transformerRef.current?.nodes() ?? [];
    const selectedIds = selected.map(node => node.id());
    debug(`Removing following images: ${selectedIds}`);

    onDelete?.(selectedIds);
    transformerRef.current?.nodes([]);
  }, [onDelete]);

  return (
    <div className="h-full" tabIndex={-1} onKeyDown={handleShortcuts}>
      <PopupConfirm
        title="Delete Selected"
        description="Are you sure you want to delete the selected images?"
        confirmLabel="Delete"
        open={openConfirmation}
        setOpen={setOpenConfirmation}
        onConfirm={onConfirmDeletion}
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
