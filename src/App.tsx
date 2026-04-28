import Navbar from "./components/Navbar";
import Textract from "./components/Textract";
import { Button } from "./components/ui/Button";
import { ButtonGroup } from "./components/ui/button-group";
import { Input } from "./components/ui/input";
import "./App.css";

function App() {
  // document.addEventListener("keydown", (e) => {
  //     if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
  //         e.preventDefault();
  //     }
  // });

  return (
    <main className="flex flex-col h-screen text-light-main dark">
      <Navbar />

      <Textract />

      <div className="bg-dark-main-darker/80 p-2 flex gap-2">
        <div className="select-none font-light tracking-widest">
          Snapping
        </div>

        <ButtonGroup aria-label="Snapping Controls" className="h-fit">
          <Button variant="outline" size="icon-xs">-</Button>
          {/* <Input type="number" value={8} /> */}
          <Button variant="outline" size="icon-xs">+</Button>
        </ButtonGroup>
      </div>

    </main>
  );
}

export default App;
