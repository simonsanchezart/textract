import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings-store";
import FooterNumberSetting from "./FooterSetting";

export default function Footer() {
  const { snap, setSnap } = useSettingsStore(useShallow(s => ({ snap: s.snap, setSnap: s.setSnap })));

  return (
    <div className="bg-dark-main-darker/80 p-1.5 px-3 flex gap-6 items-center justify-between ring-1 ring-primary/25 z-10">
      <div className="flex gap-4">
        <FooterNumberSetting
          title="Snap"
          value={snap}
          setValue={setSnap}
          unit="px"
          min={1}
          max={96}
          increment={8}
        />
      </div>
    </div>
  );
}
