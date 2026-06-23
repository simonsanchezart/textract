import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings-store";
import { snap as snapFn, snapPowerOfTwo } from "@/utils/utils";
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

export default function Footer() {
  const { snap, atlasResolution, atlasAlpha }
    = useSettingsStore(
      useShallow(s => ({
        snap: s.snap,
        atlasResolution: s.atlasResolution,
        atlasAlpha: s.atlasAlpha,
      })),
    );

  return (
    <div className="bg-dark-main-darker/80 p-1.5 px-3 flex gap-6 items-center justify-between ring-1 ring-primary/25 z-10">
      <div className="flex gap-2 text-light-main/50 align-baseline justify-center text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-xs" className="rounded-full">?</Button>
          </TooltipTrigger>

          <TooltipContent className="flex flex-col gap-2">
            <ShortcutHelper shortcut="Shift+A" description="Load Images" />
            <ShortcutHelper shortcut="Ctrl+A" description="Select All" />
            <ShortcutHelper shortcut="Delete" description="Delete Images" />

            <hr />

            <ShortcutHelper shortcut="Ctrl+Click" description="Add Mark Point" />
            <ShortcutHelper shortcut="Shift+R" description="Convert Marks" />
            <ShortcutHelper shortcut="Alt+Click" description="Delete Mark" />

            <hr />

            <ShortcutHelper shortcut="Ctrl+E" description="Export Atlas" />
            <ShortcutHelper shortcut="Ctrl+S" description="Export Selected" />
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex gap-4">
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
