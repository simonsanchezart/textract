import Konva from "konva";
import { useRef } from "react";
import { Layer, Rect, Shape, Stage } from "react-konva";

function Canvas({ className }: { className?: string }) {
    const SIZE = 2048;
    const DOT_SPACING = 32;
    const DOT_SIZE = 1;

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

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };

        stage.scale({ x: newScale, y: newScale });
        stage.position(newPos);
        stage.batchDraw();
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
        <Stage
            width={SIZE}
            height={SIZE}
            x={32}
            y={32}
            draggable
            className={`rounded-md ${className}-300`}
            ref={stageRef}
            onWheel={handleZoom}
        >
            <Layer listening={false}>
                <Shape sceneFunc={dragGrid} />
            </Layer>
            <Layer>
                <Rect fill={"red"} width={32} height={32} />
                <Rect fill={"red"} width={32} height={32} x={64} draggable />
            </Layer>
        </Stage>
    );
}
export default Canvas;
