import { getCurrentWindow } from "@tauri-apps/api/window";
import { CgMinimizeAlt, CgMaximizeAlt, CgClose } from "react-icons/cg";

function Navbar() {
    const appWindow = getCurrentWindow();

    return (
        <nav className="bg-dark-main-darker p-1">
            <div className="relative" data-tauri-drag-region>
                <div className="select-none text-center font-light tracking-widest" data-tauri-drag-region>
                    Textract
                </div>

                <div className="flex gap-2 text-center items-center absolute right-0 top-0">
                    <CgMinimizeAlt
                        className="size-5 hover:text-blue-400 button-icon"
                        onClick={appWindow.minimize.bind(appWindow)}
                    />
                    <CgMaximizeAlt
                        className="size-5 hover:text-yellow-400 button-icon"
                        onClick={appWindow.toggleMaximize.bind(appWindow)}
                    />
                    <CgClose
                        className="size-6 hover:text-red-400 button-icon"
                        onClick={appWindow.close.bind(appWindow)}
                    />
                </div>
            </div>
        </nav>
    );
}
export default Navbar;
