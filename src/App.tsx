import { Toaster } from "sonner";
import Footer from "./components/footer/Footer";
import Navbar from "./components/Navbar";
import Textract from "./components/Textract";
import "./App.css";

function App() {
  document.addEventListener("keydown", (e) => {
    // if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r"))
    //   e.preventDefault();
    if (e.ctrlKey && e.code === "KeyA")
      e.preventDefault();
  });

  return (
    <main className="flex flex-col h-screen text-light-main dark">
      <Navbar />
      <Textract />
      <Footer />
      <Toaster
        theme="dark"
        visibleToasts={6}
        position="bottom-left"
        offset={{ bottom: 52, left: 16 }}
        richColors
        closeButton
        swipeDirections={["left"]}
        toastOptions={{
          style: { width: "fit-content" },
        }}

      />
    </main>
  );
}

export default App;
