import { openPath } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { FaCog } from "react-icons/fa";
import { IoMdRefresh } from "react-icons/io";
import { useShallow } from "zustand/react/shallow";
import { checkUpdate } from "@/hooks/UseAutoUpdater";
import { useSettingsStore } from "@/stores/settings-store";
import { getCacheDirectory, getLogFile } from "@/utils/utils";
import FooterBooleanSetting from "./footer/FooterBooleanSetting";
import FooterNumberSetting from "./footer/FooterNumberSetting";
import PopupConfirm from "./PopupConfirm";
import { Button } from "./ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

export default function SettingsMenu() {
  const { checkUpdates, showGrid, markHandleScale, cacheSize } = useSettingsStore(
    useShallow(s => ({
      checkUpdates: s.checkUpdates,
      showGrid: s.showGrid,
      markHandleScale: s.markHandleScale,
      cacheSize: s.cacheSize,
    })),
  );

  const [openCacheDeleteConfirmation, setOpenCacheDeleteConfirmation] = useState(false);

  return (
    <Tooltip>
      <PopupConfirm
        title="Clear Cache"
        description="Are you sure you want to delete all files in the cache folder?"
        confirmLabel="Delete"
        open={openCacheDeleteConfirmation}
        setOpen={setOpenCacheDeleteConfirmation}
      />
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-xs" className="rounded-full">
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
          className=" w-full"
        />
        <FooterBooleanSetting
          value={showGrid}
          setValue={useSettingsStore.getState().setShowGrid}
          name="Show Grid"
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
        <div className="flex justify-between w-full">
          <Button
            variant="outline"
            size="icon"
            className="flex-1 w-full px-4 rounded-r-none cursor-pointer"
            onClick={openCacheDir}
          >
            Open Cache (
            {cacheSize}
            MB)
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="flex-1 w-full px-4 rounded-l-none cursor-pointer"
            onClick={openLogFile}
          >
            Open Log
          </Button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// todo: check if this works on macos and linux
async function openCacheDir() {
  const cacheDir = await getCacheDirectory();
  openPath(cacheDir);
}

// todo: check if this works on macos and linux
async function openLogFile() {
  const logFile = await getLogFile();
  if (!logFile)
    return;
  openPath(logFile);
}
