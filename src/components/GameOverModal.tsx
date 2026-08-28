import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, RoleType } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { Trophy, Skull, Crosshair, Shield, RotateCcw, Crown, Eye, Stethoscope } from 'lucide-react';

interface GameOverModalProps {
  gameState: GameState;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ gameState }) => {
  const winner = gameState.winner;
  const isHost = gameState.myPlayer?.isHost || false;

  useEffect(() => {
    // Fire celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  const getWinnerData = () => {
    switch (winner) {
      case 'town':
        return {
          title: 'ქალაქმა გაიმარჯვა!',
          subtitle: 'მშვიდობიანმა მოქალაქეებმა გაანადგურეს ბოროტება!',
          icon: Trophy,
          bgGradient: 'from-emerald-950 via-slate-900 to-black',
          border: 'border-emerald-500/60',
          textColor: 'text-emerald-400',
        };
      case 'mafia':
        return {
          title: 'მაფიამ გაიმარჯვა!',
          subtitle: 'მაფიამ ქალაქზე სრული კონტროლი დაამყარა!',
          icon: Skull,
          bgGradient: 'from-rose-950 via-slate-900 to-black',
          border: 'border-rose-600/60',
          textColor: 'text-rose-400',
        };
      case 'serial_killer':
        return {
          title: 'სერიულმა მკვლელმა გაიმარჯვა!',
          subtitle: 'მარტოხელა მკვლელმა ყველა გაანადგურა!',
          icon: Crosshair,
          bgGradient: 'from-purple-950 via-slate-900 to-black',
          border: 'border-purple-600/60',
          textColor: 'text-purple-400',
        };
      default:
        return {
          title: 'თამაში დასრულდა!',
          subtitle: '',
          icon: Trophy,
          bgGradient: 'from-slate-900 via-slate-950 to-black',
          border: 'border-slate-700',
          textColor: 'text-slate-200',
        };
    }
  };

  const winInfo = getWinnerData();
  const IconComp = winInfo.icon;

  const handleRestart = () => {
    socketClient.restartGame(gameState.roomCode);
  };

  const getRoleLabel = (role: RoleType) => {
    switch (role) {
      case 'don': return 'დონი 👑';
      case 'mafia': return 'მაფია 💀';
      case 'detective': return 'დეტექტივი 🔍';
      case 'doctor': return 'ექიმი 💉';
      case 'serial_killer': return 'სერიული 🩸';
      case 'citizen': default: return 'მოქალაქე 🛡️';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto pb-20 animate-scale-in">
      {/* Victory Card */}
      <div className={`rounded-3xl p-6 mb-5 border text-center relative overflow-hidden shadow-2xl bg-gradient-to-b ${winInfo.bgGradient} ${winInfo.border}`}>
        <div className="w-20 h-20 rounded-full bg-black/40 border border-white/10 mx-auto flex items-center justify-center mb-3 shadow-xl">
          <IconComp className={`w-10 h-10 ${winInfo.textColor}`} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-title mb-1">
          {winInfo.title}
        </h1>
        <p className="text-xs text-slate-300 max-w-xs mx-auto mb-2 font-medium">
          {gameState.winnerReason || winInfo.subtitle}
        </p>
      </div>

      {/* Full Roles Reveal Table */}
      <div className="glass-panel rounded-3xl p-5 mb-5 border border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          მოთამაშეთა როლები და შედეგები
        </h3>

        <div className="space-y-2">
          {gameState.players.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-2xl border ${
                p.isAlive ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-sm text-white block">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {p.isAlive ? '🟢 ცოცხალი' : '🔴 გავარდა'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
                  {getRoleLabel(p.role)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons for Host & Players */}
      <div className="space-y-3">
        {isHost ? (
          <button
            onClick={handleRestart}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-rose-900/40 transition-all btn-press text-sm font-serif-title"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ახალი თამაშის დაწყება (ოთახის გადატვირთვა)</span>
          </button>
        ) : (
          <p className="text-center text-xs text-slate-400 animate-pulse mb-2">
            დაელოდეთ ჰოსტს ახალი თამაშის დასაწყებად...
          </p>
        )}

        <button
          onClick={() => socketClient.leaveRoom()}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-3.5 rounded-2xl border border-slate-800 transition-all btn-press text-xs"
        >
          🚪 მთავარ გვერდზე დაბრუნება (ოთახიდან გასვლა)
        </button>
      </div>
    </div>
  );
};
