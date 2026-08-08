import type { DragDropEvent } from "@tauri-apps/api/webview";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useRef, useState } from "react";

type DropEvent = Extract<DragDropEvent, { type: "drop" }>;
type DragNDropProps = {
  onDrop: (payload: DropEvent) => void;
};

export default function useDragNDrop({ onDrop }: DragNDropProps) {
  const [dragHover, setDragHover] = useState(false);
  const dragHoverInitializedRef = useRef(false);

  useEffect(() => {
    if (dragHoverInitializedRef.current)
      return;
    dragHoverInitializedRef.current = true;

    let unlisten: () => void;

    const setup = async () => {
      unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
        switch (event.payload.type) {
          case "enter":
            setDragHover(true);
            break;

          case "drop":
            await onDrop(event.payload);
            setDragHover(false);
            break;

          case "leave":
            setDragHover(false);
            break;
        }
      });
    };

    setup();
    return () => {
      unlisten?.();
    };
  });

  return dragHover;
}
