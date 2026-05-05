import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings-store";
import { snap as snapFn, snapPowerOfTwo } from "@/utils/utils";
import FooterNumberSetting from "./FooterSetting";

export default function Footer() {
  const { snap, setSnap, atlasResolution, setAtlasResolution, atlasAlpha, setAtlasAlpha }
    = useSettingsStore(
      useShallow(s => ({
        snap: s.snap,
        setSnap: s.setSnap,
        atlasResolution: s.atlasResolution,
        setAtlasResolution: s.setAtlasResolution,
        atlasAlpha: s.atlasAlpha,
        setAtlasAlpha: s.setAtlasAlpha,
      })),
    );

  return (
    <div className="bg-dark-main-darker/80 p-1.5 px-3 flex gap-6 items-center justify-between ring-1 ring-primary/25 z-10">
      <div className="flex gap-4">
        <FooterNumberSetting
          title="Snap"
          value={snap}
          setValue={setSnap}
          unit="px"
          min={2}
          max={96}
          onIncrement={x => x + 8}
          onDecrement={x => x - 8}
          postProcess={x => snapFn(x, 2)}
        />
      </div>

      <div className="flex gap-4">
        <FooterNumberSetting
          title="Resolution"
          value={atlasResolution}
          setValue={setAtlasResolution}
          unit="px"
          min={16}
          max={8192}
          onIncrement={x => Math.round(x * 2)}
          onDecrement={x => Math.round(x / 2)}
          postProcess={x => snapPowerOfTwo(x)}
          className="w-18"
        />
      </div>
    </div>
  );
}
