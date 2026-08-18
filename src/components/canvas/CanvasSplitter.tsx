import { Panel, Group as ResizableGroup, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import AtlasCanvas from "./atlas/AtlasCanvas";
import MarkCanvas from "./mark/MarkCanvas";

function CanvasSplitter({ className }: { className?: string }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "default",
    storage: localStorage,
  });

  const PANEL_MIN_SIZE = `${10}%`;
  const leftPanelRef = usePanelRef();

  return (
    <div className={className}>
      <ResizableGroup defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
        <Panel
          id="markPanel"
          panelRef={leftPanelRef}
          className="bg-dark-main"
          minSize={PANEL_MIN_SIZE}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-panel-resize]"))
              return;
            leftPanelRef.current?.resize("80%");
          }}
        >
          <MarkCanvas />
        </Panel>

        <Separator
          className="bg-dark-main focus:outline-none w-1 drop-shadow-md/40 duration-100 transition-all
                                hover:drop-shadow-xl/100
                                data-[separator='hover']:drop-shadow-xl/100
                                data-[separator='active']:drop-shadow-xl/100
                    "
          onClick={e => e.preventDefault()}
          onDoubleClick={() => leftPanelRef.current?.resize("50%")}
        />

        <Panel
          id="atlasPanel"
          className="bg-dark-main drop-shadow-2xl"
          minSize={PANEL_MIN_SIZE}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-panel-resize]"))
              return;
            leftPanelRef.current?.resize("20%");
          }}
        >
          <AtlasCanvas />
        </Panel>
      </ResizableGroup>
    </div>
  );
}
export default CanvasSplitter;
