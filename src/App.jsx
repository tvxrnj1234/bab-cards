import { HoloCard } from "./components/HoloCard";
import { CARDS } from "./data/cards";
import groundBg from "./assets/backgrounds/ground.png";

function App() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{ backgroundImage: `url(${groundBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="w-full max-w-[424px]">
        <HoloCard card={CARDS[0]} />
      </div>
    </main>
  )
}

export default App
