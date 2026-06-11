import { getVersion } from "@tauri-apps/api/app";
import { error } from "@tauri-apps/plugin-log";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function Updater() {
  const [version, setVersion] = useState("0.0.0");

  useEffect(() => {
    const checkUpdate = async () => {
      setVersion(await getVersion());

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

  return (
    <>
      <h1>{version}</h1>
    </>
  );
}
