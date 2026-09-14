import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Lobby from './pages/Lobby';
import Voting from './pages/Voting';
import Results from './pages/Results';

function App() {
  return (
    <Router>
      <div className="min-h-[100dvh] bg-slate-100 text-slate-800 flex flex-col font-sans">
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:roomId" element={<Lobby />} />
            <Route path="/voting/:roomId" element={<Voting />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/results/:roomId" element={<Results />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
