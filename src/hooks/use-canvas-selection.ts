import type Konva from "konva";
import type { Node, NodeConfig } from "konva/lib/Node";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import { useEffect, useState } from "react";

type CanvasSelectionProps = {
  transformerRef: React.RefObject<Konva.Transformer | null>;
};

export default function useCanvasSelection({ transformerRef }: CanvasSelectionProps) {
  const [selectedNodes, setSelectedNodes] = useState<Node<NodeConfig>[]>([]);

  useEffect(() => {
    transformerRef.current?.nodes(selectedNodes);
  }, [selectedNodes, transformerRef]);

  const handleSelection = (e: KonvaPointerEvent) => {
    if (e.target === e.target.getStage()) {
      setSelectedNodes([]);
      return;
    }

    const group = e.target.findAncestor(".master", false);
    if (!group)
      return;

    setSelectedNodes((prev) => {
      if (!e.evt.shiftKey)
        return [group];
      if (selectedNodes.includes(group))
        return prev.filter(i => i !== group);
      return [...prev, group];
    });
  };

  return handleSelection;
}
