import type Konva from "konva";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { CanvasType } from "@/types/types";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCanvasStore } from "@/stores/canvas-store";

type CanvasSelectionProps = {
  canvasType: CanvasType;
  transformerRef: React.RefObject<Konva.Transformer | null>;
};

export default function useCanvasSelection({ canvasType, transformerRef }: CanvasSelectionProps) {
  const [selectedNodes, setSelectedNodes] = useCanvasStore(useShallow(
    s => [s.transientCanvas[canvasType].selectedNodes ?? [], s.setSelectedNodes],
  ));

  useEffect(() => {
    transformerRef.current?.nodes(selectedNodes);
  }, [selectedNodes, transformerRef]);

  const handleSelection = (e: KonvaPointerEvent) => {
    if (e.target === e.target.getStage()) {
      setSelectedNodes(canvasType, []);
      return;
    }

    const group = e.target.findAncestor(".master", false);
    if (!group)
      return;

    let nodes = [];
    if (!e.evt.shiftKey)
      nodes = [group];
    else if (selectedNodes.includes(group))
      nodes = selectedNodes.filter(i => i !== group);
    else
      nodes = [...selectedNodes, group];

    setSelectedNodes(canvasType, nodes);
  };

  return { selectedNodes, handleSelection };
}
