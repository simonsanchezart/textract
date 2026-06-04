import type Konva from "konva";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { ReactNode } from "react";
import { debug } from "@tauri-apps/plugin-log";
import { EyeIcon, TrashIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { IoIosResize } from "react-icons/io";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import useCanvasGrid from "@/components/canvas/hooks/use-canvas-grid";
import useCanvasSelection from "@/components/canvas/hooks/use-canvas-selection";
import useTransformSnapping from "@/components/canvas/hooks/use-canvas-snapping";
import useCanvasZoom from "@/components/canvas/hooks/use-canvas-zoom";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import PopupConfirm from "../PopupConfirm";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "../ui/ContextMenu";
import useCanvasPanning from "./hooks/use-canvas-panning";

type CanvasProps = {
  canvasType: CanvasType;
  onDelete?: (ids: string[]) => void;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  contextMenu?: ReactNode;
  children?: ReactNode;
  className?: string;
} & React.ComponentProps<typeof Stage>;

function Canvas({ canvasType, onDelete, transformerRef, contextMenu, children, className, ...props }: CanvasProps) {
  const STAGE_SIZE = 2048;
  const stageRef = useRef<Konva.Stage>(null);

  const snapSize = useSettingsStore(s => s.snap);
  const canvasState = useCanvasStore(s => s.canvas[canvasType]);

  const drawGrid = useCanvasGrid({ dotSize: 1, dotSpacing: snapSize }, stageRef);
  const handleZoom = useCanvasZoom({ stageRef, canvasType });
  const { handlePan, resetPan } = useCanvasPanning({ stageRef, canvasType });
  const { selectedNodes, handleSelection } = useCanvasSelection({ canvasType, transformerRef });
  const { handleTransformDragMove, handleTransformSnapping } = useTransformSnapping({ stageRef, snapSize });
  const [openConfirmation, setOpenConfirmation] = useState(false);

  const confirmImageDelete = () => {
    const selected = transformerRef.current?.nodes() ?? [];
    if (selected.length !== 0)
      setOpenConfirmation(true);
  };

  const onConfirmDeletion = useCallback(() => {
    const selected = transformerRef.current?.nodes() ?? [];
    const selectedIds = selected.map(node => node.id());
    debug(`Removing following images: ${selectedIds}`);

    onDelete?.(selectedIds);
    transformerRef.current?.nodes([]);
  }, [onDelete, transformerRef]);

  const handleShortcuts = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.code) {
      case "Delete": {
        confirmImageDelete();
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="h-full" tabIndex={-1} onKeyDown={handleShortcuts}>
      <PopupConfirm
        title="Delete Selected"
        description={
          "Are you sure you want to delete the selected images?\nThis cannot be undone"
        }
        confirmLabel="Delete"
        open={openConfirmation}
        setOpen={setOpenConfirmation}
        onConfirm={onConfirmDeletion}
      />

      <ContextMenu>
        <ContextMenuTrigger>
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
            onDragMove={handleTransformDragMove}
            onDragEnd={handlePan}
            onClick={(e) => {
              if (e.evt.button === 0)
                handleSelection(e as KonvaPointerEvent);
            }}
            onContextMenu={() => {
              if (!stageRef.current)
                return;

              const stage = stageRef.current;
              const shape = stage.getIntersection(stage.getPointerPosition()!);
              useCanvasStore.getState().setHoverShape(canvasType, shape);
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
        </ContextMenuTrigger>

        <ContextMenuContent onContextMenu={e => e.preventDefault()}>
          {contextMenu}

          {selectedNodes.length > 0
            && (
              <>
                <ContextMenuGroup>
                  <ContextMenuItem onClick={() => {
                    transformerRef.current?.nodes().forEach((n) => {
                      n.getAttr("resetScale")?.();
                    });
                  }}
                  >
                    <IoIosResize />
                    Reset Scale
                  </ContextMenuItem>

                  <ContextMenuItem variant="destructive" onClick={confirmImageDelete}>
                    <TrashIcon />
                    Delete Images
                    <ContextMenuShortcut>Del</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
              </>
            )}

          <ContextMenuGroup>
            <ContextMenuItem onClick={resetPan}>
              <EyeIcon />
              {" "}
              Reset View
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>

      <small className="opacity-50 text-sm select-none absolute bottom-0 right-0 m-2">
        {Math.round(canvasState.scale * 100)}
        %
      </small>
    </div>
  );
}
export default Canvas;
