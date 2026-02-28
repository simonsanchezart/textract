import CanvasSplitter from "./CanvasSplitter";

function Textract() {
    return (
        <div className="grow flex flex-col justify-center w-screen overflow-hidden p-4 bg-gray-800">
            <CanvasSplitter className="h-11/12 w-[95%] mx-auto drop-shadow-xl/20 rounded-md outline-1 outline-white/25 " />
        </div>
    );
}
export default Textract;
