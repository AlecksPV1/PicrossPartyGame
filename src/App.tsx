import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Lobby from './pages/Lobby';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:roomId" element={<Lobby />} />
            <Route path="/game/:roomId" element={<Game />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
