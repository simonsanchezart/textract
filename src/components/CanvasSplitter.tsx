import { Group as ResizableGroup, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";

function CanvasSplitter({ className }: { className?: string }) {
    const PANEL_MIN_PERCENT = `${10}%`;

    const { defaultLayout, onLayoutChanged } = useDefaultLayout({
        id: "default",
        storage: localStorage,
    });

    const leftPanel = usePanelRef();

    return (
        <div className={className}>
            <ResizableGroup defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
                <Panel
                    id="markPanel"
                    panelRef={leftPanel}
                    className="bg-red-500 rounded-l-md"
                    minSize={PANEL_MIN_PERCENT}
                >
                    Left
                </Panel>

                <Separator
                    className="bg-amber-400 focus:outline-none w-0 opacity-100 drop-shadow-sm/50 hover:w-2 data-[separator='hover']:w-2 data-[separator='active']:w-2 duration-100 transition-all"
                    onClick={(e) => e.preventDefault()}
                    onDoubleClick={() => leftPanel.current?.resize("50%")}
                />

                <Panel id="atlasPanel" className="bg-blue-500 rounded-r-md" minSize={PANEL_MIN_PERCENT}>
                    Right
                </Panel>
            </ResizableGroup>
        </div>
    );
}
export default CanvasSplitter;
