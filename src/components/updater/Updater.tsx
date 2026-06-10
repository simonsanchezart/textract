import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";

export function Updater() {
  useEffect(() => {
    const checkUpdate = async () => {
      const update = await check();
      console.log(update);

      if (!update)
        return;

      console.log("Update found");
    };

    checkUpdate();
  }, []);

  return (
    <>
      <h1>Hi</h1>
    </>
  );
}
