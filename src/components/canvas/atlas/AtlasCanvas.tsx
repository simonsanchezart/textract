import type Konva from "konva";
import { dirname } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { info } from "@tauri-apps/plugin-log";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { Redo2, Undo2 } from "lucide-react";
import { useRef } from "react";
import { BiSolidImageAlt } from "react-icons/bi";
import { PiSelection } from "react-icons/pi";
import { Group, Rect, Text } from "react-konva";
import { toast } from "sonner";
import { useStore } from "zustand";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { ContextMenuCheckboxItem, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut } from "@/components/ui/ContextMenu";
import { useAtlasStore } from "@/stores/atlas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import { getShortcutModifierLabel, isShortcutModifierPressed } from "@/utils/utils";
import Canvas from "../Canvas";
import AtlasImageComponent from "./AtlasImage";

function AtlasCanvas({ className }: { className?: string }) {
  const atlasImages = useAtlasStore(state => state.images);
  const atlasAlpha = useSettingsStore(s => s.atlasAlpha);
  const atlasResolution = useSettingsStore(s => s.atlasResolution);

  const masterGroupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shortcutModifier = getShortcutModifierLabel();
  const canUndo = useStore(useAtlasStore.temporal, s => s.pastStates.length > 0);
  const canRedo = useStore(useAtlasStore.temporal, s => s.futureStates.length > 0);

  const exportCanvas = async () => {
    const exportPath = await save({
      title: "Export Atlas",
      filters: [{ name: "Image", extensions: ["png"] }],
      defaultPath: "stage.png",
    });

    if (!masterGroupRef.current || !exportPath)
      return;

    const backgroundShapes = masterGroupRef.current.find(".background");
    if (atlasAlpha) {
      for (const shape of backgroundShapes)
        shape.hide();
    }

    const clone = masterGroupRef.current.clone();
    const dataUrl = clone.toDataURL({
      x: 0,
      y: 0,
      width: atlasResolution,
      height: atlasResolution,
      pixelRatio: 1,
    });
    clone.destroy();

    for (const shape of backgroundShapes)
      shape.show();

    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    const imageArray = new Uint8Array(buffer);

    await writeFile(exportPath, imageArray);

    info(`Exported canvas to ${exportPath}`);
    toast.success(`Exported canvas to ${exportPath}`, {
      action: {
        label: "Show in Folder",
        onClick: () => revealItemInDir(exportPath),
      },
    });
  };

  const exportSelected = async () => {
    if (!transformerRef.current)
      return;
    const transformer = transformerRef.current;

    if (!transformer.getNodes().length) {
      info("No selected images to export");
      toast.warning("No selected images to export");
      return;
    }

    const exportDir = await save(
      {
        title: "Export Selected",
        defaultPath: "texture",
      },
    );

    if (!exportDir)
      return;

    const exportBasePath = await dirname(exportDir);
    const selectedImages = transformer.getNodes();
    for (const img of selectedImages) {
      const rect = img.getClientRect({
        skipShadow: true,
        skipStroke: true,
      });

      const dataUrl = img.toDataURL({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        pixelRatio: 1,
        imageSmoothingEnabled: false,
      });

      const response = await fetch(dataUrl);
      const buffer = await response.arrayBuffer();
      const imageArray = new Uint8Array(buffer);

      const exportPath = `${exportDir}${img._id}.png`;
      await writeFile(exportPath, imageArray, { createNew: true });

      info(`Exported image with id ${img._id} to ${exportPath}`);
      toast.success(`Exported image with id ${img._id} to ${exportPath}`, {
        action: {
          label: "Open Folder",
          onClick: () => openPath(exportBasePath),
        },
      });
    }
  };

  const contextMenu = () => (
    <ContextMenuGroup>
      <ContextMenuItem onClick={exportCanvas}>
        <BiSolidImageAlt />
        {" "}
        Export Atlas
        <ContextMenuShortcut>
          <span className="flex">
            {shortcutModifier}
            +E
          </span>
        </ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem onClick={exportSelected}>
        <PiSelection />
        Export Selected
        <ContextMenuShortcut>
          <span className="flex">
            {shortcutModifier}
            +S
          </span>
        </ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuCheckboxItem checked={atlasAlpha} onClick={() => useSettingsStore.getState().setAtlasAlpha(!atlasAlpha)}>
        Transparent Background
      </ContextMenuCheckboxItem>
      <ContextMenuSeparator />
    </ContextMenuGroup>
  );

  const handleShortcuts = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.code) {
      case "KeyE":
        if (isShortcutModifierPressed(e))
          exportCanvas();
        break;
      case "KeyS":
        if (isShortcutModifierPressed(e))
          exportSelected();
        break;
      case "KeyZ":
        if (isShortcutModifierPressed(e)) {
          // Stop the webview's own text-undo from also firing.
          e.preventDefault();
          if (e.shiftKey)
            useAtlasStore.temporal.getState().redo();
          else
            useAtlasStore.temporal.getState().undo();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className={`relative h-full ${className}`} onKeyDown={handleShortcuts}>
      <Canvas
        canvasType={CanvasType.ATLAS}
        transformerRef={transformerRef}
        contextMenu={contextMenu()}
        onDelete={async (ids) => {
          for (const id of ids) useAtlasStore.getState().removeImage(id);
        }}
        offset={{ x: atlasResolution / 2, y: atlasResolution / 2 }}
      >
        <Group ref={masterGroupRef}>
          <Rect
            name="background"
            width={atlasResolution}
            height={atlasResolution}
            fill={atlasAlpha ? "#00000022" : "#999999"}
            listening={false}
            shadowEnabled
            shadowBlur={50}
            shadowOffsetX={10}
            shadowOffsetY={10}
            shadowOpacity={0.5}
          />

          {Object.values(atlasImages).map((i) => {
            return <AtlasImageComponent key={i.id} imageData={i} />;
          })}

          <Rect
            name="background"
            x={-1}
            y={-1}
            width={atlasResolution + 2}
            height={atlasResolution + 2}
            stroke="#999999"
            listening={false}
            dash={[4, 8]}
            shadowEnabled
            shadowOffsetX={0.5}
            shadowOffsetY={0.5}
            shadowOpacity={0.5}
          />

          <Text
            text={`${atlasResolution}px`}
            x={0}
            y={atlasResolution + 8}
            fontSize={32}
            fontFamily="Calibri"
            fontStyle="100"
            fill="white"
            opacity={0.5}
            listening={false}
          />
        </Group>
      </Canvas>

      <Toolbar>
        <ToolbarAction Icon={BiSolidImageAlt} onClick={exportCanvas} tooltip={`Export Atlas (${shortcutModifier}+E)`} />
        <ToolbarAction Icon={PiSelection} onClick={exportSelected} tooltip={`Export Selected (${shortcutModifier}+S)`} />
      </Toolbar>

      <Toolbar position="top-right">
        <ToolbarAction Icon={Undo2} disabled={!canUndo} onClick={() => useAtlasStore.temporal.getState().undo()} tooltip={`Undo (${shortcutModifier}+Z)`} />
        <ToolbarAction Icon={Redo2} disabled={!canRedo} onClick={() => useAtlasStore.temporal.getState().redo()} tooltip={`Redo (Shift+${shortcutModifier}+Z)`} />
      </Toolbar>
    </div>
  );
}
export default AtlasCanvas;
