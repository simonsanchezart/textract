import Konva from "konva";
import { ReactNode, useRef, useState } from "react";
import { Layer, Shape, Stage } from "react-konva";

//marker: if I need custom actions I can make a type of Actions, all optional, and call them from the childs

function Canvas({ className, children }: { className?: string; children?: ReactNode }) {
    const SIZE = 2048;
    const DOT_SPACING = 32;
    const DOT_SIZE = 1;

    const [zoomLevel, setZoomLevel] = useState(1.0);
    const stageRef = useRef<Konva.Stage>(null);

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

        let newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
        newScale = Math.max(Math.min(10, newScale), 0.1);
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

    const dragGrid = (ctx: Konva.Context, shape: Konva.Shape) => {
        const stage = stageRef.current;
        if (!stage) return;

        const scale = stage.scaleX();
        const stagePos = stage.getPosition();

        if (scale < 0.5) return;

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
        <div className="h-full">
            <Stage
                width={SIZE}
                height={SIZE}
                x={32}
                y={32}
                draggable
                className={`h-0 ${className}`}
                ref={stageRef}
                onWheel={handleZoom}
            >
                <Layer listening={false}>
                    <Shape sceneFunc={dragGrid} />
                </Layer>
                <Layer>{children}</Layer>
            </Stage>
            <p className="opacity-50 text-sm select-none absolute bottom-0 right-0 m-2">
                {Math.round(zoomLevel * 100)}%
            </p>
        </div>
    );
}
export default Canvas;
