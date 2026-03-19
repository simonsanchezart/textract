import "./App.css";
import Navbar from "./components/Navbar";
import Textract from "./components/Textract";
import { Button } from "./components/ui/button";

function App() {
    return (
        <main className="flex flex-col h-screen text-light-main">
            <Navbar />
            <Textract />
        </main>
    );
}

export default App;
