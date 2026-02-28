import { getCurrentWindow } from "@tauri-apps/api/window";
import { CgMinimizeAlt, CgMaximizeAlt, CgClose } from "react-icons/cg";

function Navbar() {
    const appWindow = getCurrentWindow();

    const buttonGeneralStyle = "text-white/50 hover:cursor-pointer hover:scale-125 duration-100 transition-all";

    return (
        <nav className="bg-gray-900 text-white p-1">
            <div className="relative" data-tauri-drag-region>
                <div className="select-none text-center font-light tracking-widest" data-tauri-drag-region>
                    Textract
                </div>

                <div className="flex gap-2 text-center items-center absolute right-0 top-0">
                    <CgMinimizeAlt
                        className={`size-5 hover:text-blue-400 ${buttonGeneralStyle}`}
                        onClick={() => appWindow.minimize()}
                    />
                    <CgMaximizeAlt
                        className={`size-5 hover:text-yellow-400 ${buttonGeneralStyle}`}
                        onClick={() => appWindow.toggleMaximize()}
                    />
                    <CgClose
                        className={`size-6 hover:text-red-400 ${buttonGeneralStyle}`}
                        onClick={() => appWindow.close()}
                    />
                </div>
            </div>
        </nav>
    );
}
export default Navbar;
