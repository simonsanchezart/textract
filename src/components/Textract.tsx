import CanvasSplitter from "./CanvasSplitter";

function Textract() {
    return (
        <div className="flex flex-col justify-center h-screen w-screen overflow-hidden p-4 bg-gray-800 ">
            <CanvasSplitter className="h-11/12 w-[95%] mx-auto drop-shadow-2xl/25"/>
        </div>
    );
}
export default Textract;
