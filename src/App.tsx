import "./App.css";
import Navbar from "./components/Navbar";
import Textract from "./components/Textract";

function App() {
    return (
        <main className="flex flex-col h-screen">
            <Navbar />
            <Textract />
        </main>
    );
}

export default App;
