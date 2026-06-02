import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings-store";
import { snap as snapFn, snapPowerOfTwo } from "@/utils/utils";
import FooterBooleanSetting from "./FooterBooleanSetting";
import FooterNumberSetting from "./FooterNumberSetting";

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
      <div className="flex gap-2">
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
      </div>

      <div className="flex gap-2">
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
