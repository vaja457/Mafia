import React, { useState, useEffect } from 'react';
import { socketClient } from '../lib/socketClient';
import { audioManager } from '../lib/audioManager';
import { 
  Users, 
  Crown, 
  LogIn, 
  Plus, 
  Skull, 
  Shield, 
  Settings2, 
  Sparkles,
  Volume2
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Host state
  const [hostName, setHostName] = useState('');
  const [totalPlayers, setTotalPlayers] = useState(11);
  const [mafiaCount, setMafiaCount] = useState(3);
  const [hasDon, setHasDon] = useState(true);
  const [hasDetective, setHasDetective] = useState(true);
  const [hasDoctor, setHasDoctor] = useState(true);
  const [hasSerialKiller, setHasSerialKiller] = useState(true);
  const [serialCanKillNight1, setSerialCanKillNight1] = useState(false);
  const [nightDuration, setNightDuration] = useState(25);

  // Player state
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Check URL param for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      setActiveTab('join');
    }
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    // Start background music and audio engine on user interaction
    audioManager.startAmbientMusic();

    socketClient.createRoom(hostName.trim(), {
      totalPlayers,
      mafiaCount,
      hasDon,
      hasDetective,
      hasDoctor,
      hasSerialKiller,
      serialCanKillNight1,
      nightDurationSeconds: nightDuration
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;

    audioManager.startAmbientMusic();

    socketClient.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center min-h-[85vh] animate-fade-in">
      {/* Title & Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-600/40 mb-3 shadow-2xl shadow-rose-950/80">
          <Skull className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-serif-title tracking-tight mb-1">
          მაფია
        </h1>
        <p className="text-xs uppercase tracking-widest text-rose-400 font-semibold">
          ჭკვიანი სამაგიდო მოდერატორი
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>ოთახის შექმნა</span>
        </button>

        <button
          onClick={() => setActiveTab('join')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'join'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>შეერთება</span>
        </button>
      </div>

      {/* Form Section */}
      {activeTab === 'create' ? (
        <form onSubmit={handleCreateRoom} className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              შენი სახელი (ჰოსტი)
            </label>
            <input
              type="text"
              required
              placeholder="მაგ: გიორგი"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
            />
          </div>

          {/* Quick presets / Settings */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">მოთამაშეთა რაოდენობა:</span>
              <span className="text-rose-400 font-mono font-bold text-sm">{totalPlayers}</span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              value={totalPlayers}
              onChange={(e) => setTotalPlayers(parseInt(e.target.value))}
              className="w-full accent-rose-600"
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">მაფიოზების რაოდენობა:</span>
              <span className="text-rose-400 font-mono font-bold text-sm">{mafiaCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.min(5, Math.floor(totalPlayers / 3))}
              value={mafiaCount}
              onChange={(e) => setMafiaCount(parseInt(e.target.value))}
              className="w-full accent-rose-600"
            />

            {/* Quick role pills */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <label className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDon}
                  onChange={(e) => setHasDon(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span className="text-slate-300">დონი</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDetective}
                  onChange={(e) => setHasDetective(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span className="text-slate-300">დეტექტივი</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDoctor}
                  onChange={(e) => setHasDoctor(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span className="text-slate-300">ექიმი</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSerialKiller}
                  onChange={(e) => setHasSerialKiller(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span className="text-slate-300">სერიული</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-rose-950/40 transition-all btn-press text-sm font-serif-title mt-4"
          >
            <Plus className="w-4 h-4" />
            <span>ოთახის შექმნა</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoinRoom} className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              ოთახის კოდი (6 სიმბოლო)
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="მაგ: ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center text-rose-400 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              შენი სახელი
            </label>
            <input
              type="text"
              required
              placeholder="მაგ: ნიკა"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-rose-950/40 transition-all btn-press text-sm font-serif-title mt-4"
          >
            <LogIn className="w-4 h-4" />
            <span>ოთახში შესვლა</span>
          </button>
        </form>
      )}
    </div>
  );
};
