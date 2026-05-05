import { listen } from "@tauri-apps/api/event";
import { info } from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import CanvasSplitter from "./canvas/CanvasSplitter";

type ConversionProgress = {
  img_name: string;
  idx: number;
  mark_count: number;
  progress: number;
};

function Textract() {
  // todo: separate into hook
  // todo: add on started conversion event
  // todo: add on finish conversion event
  useEffect(() => {
    const unlisten = listen<ConversionProgress>("conversion-progress", (e) => {
      info(JSON.stringify(e.payload));
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="grow flex flex-col w-screen h-screen">
      <CanvasSplitter className="flex-1" />
    </div>
  );
}
export default Textract;
