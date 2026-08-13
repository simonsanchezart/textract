import { join, resourceDir } from "@tauri-apps/api/path";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { FaBook } from "react-icons/fa";
import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings-store";
import { getShortcutModifierLabel, snap as snapFn, snapPowerOfTwo } from "@/utils/utils";
import { Button } from "../ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/Tooltip";
import FooterBooleanSetting from "./FooterBooleanSetting";
import FooterNumberSetting from "./FooterNumberSetting";

function ShortcutHelper({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <>
      <span>
        <b>{shortcut}</b>
        {" "}
        -
        {" "}
        <span className="opacity-50">{description}</span>
      </span>
    </>
  );
}

async function openHelpDoc() {
  const helpPath = await join(await resourceDir(), "resources", "help.html");
  await openPath(helpPath);
}

export default function Footer() {
  const shortcutModifier = getShortcutModifierLabel();
  const { snap, atlasResolution, atlasAlpha, markHandleScale }
    = useSettingsStore(
      useShallow(s => ({
        snap: s.snap,
        atlasResolution: s.atlasResolution,
        atlasAlpha: s.atlasAlpha,
        markHandleScale: s.markHandleScale,
      })),
    );

  return (
    <div className="bg-dark-main-darker/80 p-1.5 px-3 flex gap-6 items-center justify-between ring-1 ring-primary/25 z-10">
      <div className="flex gap-2 text-light-main/50 align-baseline justify-center text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-xs" className="rounded-full cursor-pointer" onClick={openHelpDoc}><FaBook /></Button>
          </TooltipTrigger>

          <TooltipContent className="flex flex-col gap-2">
            <ShortcutHelper shortcut="Shift+A" description="Load Images" />
            <ShortcutHelper shortcut={`${shortcutModifier}+A`} description="Select All" />
            <ShortcutHelper shortcut="Delete" description="Delete Images" />

            <hr />

            <ShortcutHelper shortcut="Shift+G" description="Cycle Quad/Grid/Bezier Mode" />
            <ShortcutHelper shortcut={`${shortcutModifier}+Click`} description="Add Mark Point" />
            <ShortcutHelper shortcut="Shift+Click (on point)" description="Add/Remove From Selection" />
            <ShortcutHelper shortcut="Esc" description="Clear Point Selection" />
            <ShortcutHelper shortcut="Shift+R" description="Convert Marks" />
            <ShortcutHelper shortcut="Alt+Click" description="Delete Mark" />
            <ShortcutHelper shortcut={`${shortcutModifier}+Z`} description="Undo" />
            <ShortcutHelper shortcut={`Shift+${shortcutModifier}+Z`} description="Redo" />
            <ShortcutHelper shortcut="S" description="Toggle Smooth For Selected Point(s)" />
            <ShortcutHelper shortcut="- / =" description="Decrease/Increase Tension" />

            <hr />

            <ShortcutHelper shortcut={`${shortcutModifier}+E`} description="Export Atlas" />
            <ShortcutHelper shortcut={`${shortcutModifier}+S`} description="Export Selected" />

            <hr />

            <small
              onClick={async () => await openUrl("https://www.simonsanchez.art/")}
              className="text-gray-400 hover:cursor-pointer hover:text-red"
            >
              made by simon sanchez
            </small>
            <small
              onClick={async () => await openUrl("https://github.com/ghsnyc/textract")}
              className="text-gray-400 hover:cursor-pointer hover:text-red"
            >
              macOS port by ghsnyc
            </small>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex gap-4">
        <FooterNumberSetting
          title="Handles"
          value={markHandleScale}
          setValue={useSettingsStore.getState().setMarkHandleScale}
          min={0.25}
          max={4}
          onIncrement={x => x + 0.1}
          onDecrement={x => x - 0.1}
          postProcess={x => Math.round(x * 10) / 10}
        />
        <FooterNumberSetting
          title="Snap"
          value={snap}
          setValue={useSettingsStore.getState().setSnap}
          unit="px"
          min={2}
          max={96}
          onIncrement={x => x + 8}
          onDecrement={x => x - 8}
          postProcess={x => snapFn(x, 2)}
        />
        <FooterNumberSetting
          title="Resolution"
          value={atlasResolution}
          setValue={useSettingsStore.getState().setAtlasResolution}
          unit="px"
          min={16}
          max={8192}
          onIncrement={x => Math.round(x * 2)}
          onDecrement={x => Math.round(x / 2)}
          postProcess={x => snapPowerOfTwo(x)}
          className="w-18"
        />

        <FooterBooleanSetting value={atlasAlpha} setValue={useSettingsStore.getState().setAtlasAlpha} name="Transparent Background" />
      </div>
    </div>
  );
}
