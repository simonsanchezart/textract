import Footer from "./components/footer/Footer";
import Navbar from "./components/Navbar";
import Textract from "./components/Textract";
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
      <Footer />
    </main>
  );
}

export default App;
