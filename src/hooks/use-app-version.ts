import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

export default function useAppVersion() {
  const [version, setVersion] = useState("0.0.0");

  useEffect(() => {
    const checkUpdate = async () => setVersion(await getVersion());
    checkUpdate();
  }, []);

  return version;
}
