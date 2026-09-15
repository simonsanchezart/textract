import { error } from "@tauri-apps/plugin-log";
import { openPath } from "@tauri-apps/plugin-opener";
import { TrashIcon } from "lucide-react";
import { FaCog } from "react-icons/fa";
import { IoMdRefresh } from "react-icons/io";
import { useShallow } from "zustand/react/shallow";
import { checkUpdate } from "@/hooks/UseAutoUpdater";
import { useSettingsStore } from "@/stores/settings-store";
import { getCacheDirectory } from "@/utils/utils";
import FooterBooleanSetting from "./footer/FooterBooleanSetting";
import FooterNumberSetting from "./footer/FooterNumberSetting";
import { Button } from "./ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

export default function SettingsMenu() {
  const { checkUpdates, markHandleScale, cacheSize } = useSettingsStore(
    useShallow(s => ({
      checkUpdates: s.checkUpdates,
      markHandleScale: s.markHandleScale,
      cacheSize: s.cacheSize,
    })),
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-xs"
          className="rounded-full"
        >
          <FaCog />
        </Button>
      </TooltipTrigger>

      <TooltipContent className="flex flex-col gap-2">
        Settings

        <hr />

        <FooterNumberSetting
          title="Handle Size"
          value={markHandleScale}
          setValue={useSettingsStore.getState().setMarkHandleScale}
          min={0.25}
          max={4}
          onIncrement={x => x + 0.1}
          onDecrement={x => x - 0.1}
          postProcess={x => Math.round(x * 10) / 10}
        />

        <div className="flex justify-between">
          <FooterBooleanSetting
            value={checkUpdates}
            setValue={useSettingsStore.getState().setCheckUpdates}
            name="AutoCheck Updates"
            className="flex-1 rounded-r-none"
          />
          <Button
            variant="outline"
            size="icon-xs"
            className="rounded-l-none cursor-pointer"
            onClick={checkUpdate}
          >
            <IoMdRefresh />
          </Button>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" size="icon-xs" className="flex-1 rounded-r-none cursor-pointer" onClick={openCacheDir}>
            View Cache (
            {cacheSize}
            MB)
          </Button>
          {/* todo: implement */}
          <Button variant="outline" size="icon-xs" className="rounded-l-none bg-red/50 cursor-pointer" onClick={() => error("NOT IMPLEMNETED")}><TrashIcon /></Button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

async function openCacheDir() {
  const cacheDir = await getCacheDirectory();
  openPath(cacheDir);
}
