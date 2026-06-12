import { error } from "@tauri-apps/plugin-log";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";

export default function useAutoUpdater() {
  useEffect(() => {
    const checkUpdate = async () => {
      const update = await check().catch((err) => {
        toast.error("Was not able to check for updates.");
        error(err);
      });

      if (!update)
        return;

      toast.info(`New Update Available`, {
        action: {
          label: "Install Update",
          onClick: async () => {
            await update?.downloadAndInstall();
            await relaunch();
          },
        },
      });
    };

    checkUpdate();
  }, []);
}
