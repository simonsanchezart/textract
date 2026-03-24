import Konva from "konva";
import { KonvaPointerEvent } from "konva/lib/PointerEvents";
import React, { ReactNode, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import PopupConfirm from "./PopupConfirm";

type CanvasProps = {
    className?: string;
    children?: ReactNode;
    onDelete?: (ids: string[]) => void;
} & React.ComponentProps<typeof Stage>;

function Canvas({ className, children, onDelete, ...props }: CanvasProps) {
    const ZOOM_MULTIPLIER = 1.1;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 100;
    const SIZE = 2048;
    const DOT_SPACING = 64;
    const DOT_SIZE = 2;

    const [zoomLevel, setZoomLevel] = useState(1.0);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer | null>(null);

    const [openConfirmation, setOpenConfirmation] = useState(false);

    const handleZoom = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition()!;
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;

        let newScale = direction > 0 ? oldScale * ZOOM_MULTIPLIER : oldScale / ZOOM_MULTIPLIER;
        newScale = Math.max(Math.min(MAX_ZOOM, newScale), MIN_ZOOM);
        if (Math.abs(newScale - 1.0) < 0.05) newScale = 1;

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };

        stage.scale({ x: newScale, y: newScale });
        stage.position(newPos);
        stage.batchDraw();
        setZoomLevel(newScale);
    };

    //todo: multiselect

    const onKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
        switch (e.code) {
            case "Delete":
                const selected = transformerRef.current?.nodes() ?? [];
                if (selected.length !== 0) setOpenConfirmation(true);
        }
    };

    const dragGrid = (ctx: Konva.Context, shape: Konva.Shape) => {
        const stage = stageRef.current;
        if (!stage) return;

        const scale = stage.scaleX();
        const stagePos = stage.getPosition();

        // don't draw grid if zoom < 50%
        if (scale < 0.35) return;

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
    };

    return (
        <div className="h-full" tabIndex={-1} onKeyDown={onKeyDown}>
            <PopupConfirm
                title="Delete Selected"
                description="Are you sure you want to delete the selected images?"
                confirmLabel="Delete"
                open={openConfirmation}
                setOpen={setOpenConfirmation}
                onConfirm={() => {
                    const selected = transformerRef.current?.nodes() ?? [];
                    const selectedIds = selected.map((node) => node.id());
                    onDelete?.(selectedIds);
                    transformerRef.current?.nodes([]);
                }}
            />

            <Stage
                width={SIZE}
                height={SIZE}
                x={32}
                y={32}
                draggable
                className={`h-0 ${className}`}
                ref={stageRef}
                onWheel={handleZoom}
                onClick={(e: KonvaPointerEvent) => {
                    if (e.target === e.target.getStage()) {
                        transformerRef.current?.nodes([]);
                        return;
                    }

                    const group = e.target.findAncestor(".master", false);
                    if (group) transformerRef.current?.nodes([group]);
                }}
                onContextMenu={(e) => {
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
                        keepRatio={true}
                        enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                    />
                </Layer>
            </Stage>
            <p className="opacity-50 text-sm select-none absolute bottom-0 right-0 m-2">
                {Math.round(zoomLevel * 100)}%
            </p>
        </div>
    );
}
export default Canvas;
