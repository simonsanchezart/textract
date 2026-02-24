import { Group as ResizableGroup, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

function Textract() {
    const { defaultLayout, onLayoutChanged } = useDefaultLayout({
        id: "default",
        storage: localStorage,
    });

    return (
        // xfunc: into own component
        // todo: read https://react-resizable-panels.vercel.app/
        <div className="bg-black h-screen">
            <ResizableGroup className="bg-gray-300" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
                {/* todo: extract constants like 10% into global configuration file (or zustand store) */}
                <Panel id="left" className="bg-red-500" minSize={"10%"}>
                    Left
                </Panel>
                <Separator className="bg-amber-400 w-1 focus:outline-none data-[separator='hover']:bg-purple-400 transition-all duration-100" />
                <Panel id="right" className="bg-blue-500" minSize={"10%"}>
                    Right
                </Panel>
            </ResizableGroup>
        </div>
    );
}
export default Textract;
