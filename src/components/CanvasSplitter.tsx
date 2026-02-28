import { Group as ResizableGroup, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import Canvas from "./Canvas";

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
                    className="bg-dark-main rounded-l-md"
                    minSize={PANEL_MIN_SIZE}
                >
                    <Canvas className="rounded-l-md"/>
                </Panel>

                <Separator
                    className="bg-dark-main focus:outline-none w-0.5 drop-shadow-md/50 duration-100 transition-all
                                hover:drop-shadow-xl/75
                                data-[separator='hover']:drop-shadow-xl/75
                                data-[separator='active']:drop-shadow-xl/75
                                hover:w-2
                                data-[separator='hover']:w-2
                                data-[separator='active']:w-2
                    "
                    onClick={(e) => e.preventDefault()}
                    onDoubleClick={() => leftPanelRef.current?.resize("50%")}
                />

                <Panel id="atlasPanel" className="bg-dark-main drop-shadow-2xl rounded-r-md" minSize={PANEL_MIN_SIZE}>
                    <Canvas className="rounded-r-md"/>
                </Panel>
            </ResizableGroup>
        </div>
    );
}
export default CanvasSplitter;
