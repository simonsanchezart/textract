import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { ReactNode } from "react";
import { debug, warn } from "@tauri-apps/plugin-log";
import Konva from "konva";
import { EyeIcon, TrashIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { BiExport, BiSolidFileExport } from "react-icons/bi";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
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
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "../ui/ContextMenu";

type CanvasProps = {
  canvasType: CanvasType;
  onDelete?: (ids: string[]) => void;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  children?: ReactNode;
  className?: string;
} & React.ComponentProps<typeof Stage>;

function Canvas({ canvasType, onDelete, transformerRef, children, className, ...props }: CanvasProps) {
  const STAGE_SIZE = 2048;

  const snapSize = useSettingsStore(s => s.snap);
  const canvasState = useCanvasStore(s => s.canvas[canvasType]);

  const stageRef = useRef<Konva.Stage>(null);
  const [currentHoverShape, setCurrentHoverShape] = useState<Konva.Shape | null>(null);

  const drawGrid = useCanvasGrid({ dotSize: 1, dotSpacing: snapSize }, stageRef);
  const handleZoom = useCanvasZoom({ stageRef, canvasType });
  const { selectedNodes, handleSelection } = useCanvasSelection({ transformerRef });
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
  }, [onDelete, transformerRef]);

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
            onDragMove={handleDragMove}
            onClick={(e) => {
              if (e.evt.button === 0)
                handleSelection(e as KonvaPointerEvent);
            }}
            onContextMenu={() => {
              if (!stageRef.current)
                return;

              const stage = stageRef.current;
              const shape = stage.getIntersection(stage.getPointerPosition()!);
              setCurrentHoverShape(shape);
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

        <ContextMenuContent>
          {/* refactor: Context menu for specific menu type should be passed from that specific Canvas file (AtlasCanvas - MarkCanvas) */}
          <ContextMenuGroup>
            {canvasType === CanvasType.MARK
              ? (
                  <>
                    <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                      <CgAdd />
                      Add Images
                    </ContextMenuItem>

                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <FaPlay />
                        <span className="mx-2">
                          Convert
                        </span>
                      </ContextMenuSubTrigger>

                      <ContextMenuSubContent>
                        <ContextMenuGroup>
                          {(currentHoverShape && currentHoverShape instanceof Konva.Line)
                            ? (
                                <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                                  Hovered
                                </ContextMenuItem>
                              )
                            : <></>}

                          {/* todo: show only if there are marks */}
                          {selectedNodes.length > 0
                            ? (
                                <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                                  Selected Images
                                </ContextMenuItem>
                              )
                            : <></>}

                          {/* todo: show only if there are marks */}
                          <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                            All
                          </ContextMenuItem>
                        </ContextMenuGroup>
                      </ContextMenuSubContent>
                    </ContextMenuSub>

                    {(currentHoverShape && currentHoverShape instanceof Konva.Line)
                      ? (
                          <>
                            <ContextMenuGroup>
                              <ContextMenuItem variant="destructive" onClick={() => warn("TO IMPLEMENT")}>
                                <TrashIcon />
                                Remove Mark
                                <ContextMenuShortcut>
                                  <span className="flex">
                                    Alt+LClick
                                  </span>
                                </ContextMenuShortcut>
                              </ContextMenuItem>
                            </ContextMenuGroup>
                          </>
                        )
                      : <></>}
                  </>
                )
              : (
                  <>
                    <ContextMenuGroup>
                      <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                        <BiSolidFileExport />
                        {" "}
                        Export Canvas
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                        <BiExport />
                        Export Selected
                      </ContextMenuItem>

                      <ContextMenuCheckboxItem checked={true}>
                        Transparent Background
                      </ContextMenuCheckboxItem>
                    </ContextMenuGroup>
                  </>
                )}
          </ContextMenuGroup>

          {/* todo: shouldn't always showup */}

          {selectedNodes.length > 0
            ? (
                <>
                  <ContextMenuSeparator />

                  <ContextMenuGroup>
                    <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                      <IoIosResize />
                      Reset Scale
                    </ContextMenuItem>

                    <ContextMenuItem variant="destructive" onClick={() => warn("TO IMPLEMENT")}>
                      <TrashIcon />
                      Delete Images
                      <ContextMenuShortcut>Del</ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuGroup>
                </>
              )
            : <></>}

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
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
