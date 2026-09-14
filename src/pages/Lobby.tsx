import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Play } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const isHost = true; // TODO: Implement proper host detection via Firebase

  const startGame = () => {
    navigate(`/game/${roomId}`);
  };

  return (
    <div className="flex-1 flex flex-col pt-4">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sala</h2>
          <div className="text-3xl font-black text-white tracking-widest">{roomId}</div>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8">
        {/* Host controls / QR */}
        <div className="md:w-1/3 flex flex-col items-center p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Invita a tus amigos</h3>
          <div className="bg-white p-4 rounded-2xl mb-4">
            <QRCodeSVG 
              value={`${window.location.origin}/lobby/${roomId}`} 
              size={180}
              level="H"
            />
          </div>
          <p className="text-sm text-slate-400 text-center">
            Escanea el código o entra en<br/>
            <span className="font-bold text-pink-400">{window.location.host}</span><br/>
            y usa el PIN: <span className="font-bold text-white">{roomId}</span>
          </p>
        </div>

        {/* Players list */}
        <div className="md:flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-purple-400" />
            <h3 className="text-xl font-bold">Jugadores (1/8)</h3>
          </div>
          
          <div className="flex-1 bg-slate-800 rounded-3xl border border-slate-700 p-4 space-y-2">
            {/* Dummy player */}
            <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-xl">
              <span className="font-medium">Tú (Host)</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">Listo</span>
            </div>
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-500 h-20">
              Esperando jugadores...
            </div>
          </div>

          {isHost && (
            <button 
              onClick={startGame}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              <Play size={24} />
              <span>Empezar Partida</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
