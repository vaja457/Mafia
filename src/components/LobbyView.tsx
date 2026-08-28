import React, { useState } from 'react';
import { GameState, RoomConfig } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { audioManager } from '../lib/audioManager';
import { 
  Users, 
  Crown, 
  Settings2, 
  Play, 
  Share2, 
  Shield, 
  Crosshair, 
  Stethoscope, 
  Skull, 
  Eye,
  Clock,
  UserCheck,
  Check,
  Copy,
  Volume2
} from 'lucide-react';

interface LobbyViewProps {
  gameState: GameState;
  onOpenShareModal: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ gameState, onOpenShareModal }) => {
  const isHost = gameState.myPlayer?.isHost || false;
  const config = gameState.config;

  // Local state for host adjustments before syncing
  const [totalPlayers, setTotalPlayers] = useState(config.totalPlayers);
  const [mafiaCount, setMafiaCount] = useState(config.mafiaCount);
  const [hasDon, setHasDon] = useState(config.hasDon);
  const [hasDetective, setHasDetective] = useState(config.hasDetective);
  const [hasDoctor, setHasDoctor] = useState(config.hasDoctor);
  const [hasSerialKiller, setHasSerialKiller] = useState(config.hasSerialKiller);
  const [serialCanKillNight1, setSerialCanKillNight1] = useState(config.serialCanKillNight1);
  const [nightDuration, setNightDuration] = useState(config.nightDurationSeconds);
  const [showSettings, setShowSettings] = useState(false);

  // Compute number of citizens
  const specialRolesCount = (hasDetective ? 1 : 0) + (hasDoctor ? 1 : 0) + (hasSerialKiller ? 1 : 0);
  const citizensCount = Math.max(0, totalPlayers - mafiaCount - specialRolesCount);

  const handleConfigChange = (newConfig: Partial<RoomConfig>) => {
    socketClient.updateConfig(gameState.roomCode, newConfig);
  };

  const handleStartGame = () => {
    socketClient.startGame(gameState.roomCode);
  };

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto pb-20 animate-fade-in">
      {/* Lobby Banner Card */}
      <div className="glass-panel rounded-3xl p-5 mb-4 border border-rose-500/20 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-rose-400">სათამაშო ოთახი</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-3xl font-extrabold text-white font-mono tracking-wider">{gameState.roomCode}</h2>
              <button
                onClick={handleCopyCode}
                title="ოთახის კოდის კოპირება"
                className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all btn-press shadow-sm"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">კოპირებულია!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>კოპირება</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => audioManager.testSound()}
              title="ხმის შემოწმება"
              className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-2xl text-xs font-bold transition-all btn-press shadow-md"
            >
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>ხმის ტესტი 🔔</span>
            </button>
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all btn-press shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>მოწვევა</span>
            </button>
          </div>
        </div>

        {/* Players progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              მოთამაშეები
            </span>
            <span className="font-bold text-slate-200">
              {gameState.players.length} / {config.totalPlayers}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (gameState.players.length / config.totalPlayers) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Role Composition Preview Badges */}
      <div className="glass-panel rounded-2xl p-4 mb-4 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">როლების განაწილება</span>
          {isHost && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showSettings ? 'დახურვა' : 'კონფიგურაცია'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-2.5 text-center">
            <Skull className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <span className="block font-bold text-rose-200">{config.mafiaCount} მაფია</span>
            <span className="text-[10px] text-rose-400/80">{config.hasDon ? '(1 დონი)' : ''}</span>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2.5 text-center">
            <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <span className="block font-bold text-blue-200">{config.hasDetective ? '1 დეტექტივი' : '0 დეტექტივი'}</span>
            <span className="text-[10px] text-blue-400/80">შემმოწმებელი</span>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5 text-center">
            <Stethoscope className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="block font-bold text-emerald-200">{config.hasDoctor ? '1 ექიმი' : '0 ექიმი'}</span>
            <span className="text-[10px] text-emerald-400/80">1 ჰილი/თამაშში</span>
          </div>

          <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-2.5 text-center">
            <Crosshair className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <span className="block font-bold text-purple-200">{config.hasSerialKiller ? '1 სერიული' : '0 სერიული'}</span>
            <span className="text-[10px] text-purple-400/80">მაქს. 2 ქილი</span>
          </div>

          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <div>
              <span className="font-bold text-slate-200 block text-xs">{citizensCount} მოქალაქე</span>
              <span className="text-[10px] text-slate-400">პატიოსანი ქალაქი</span>
            </div>
          </div>
        </div>
      </div>

      {/* Host Settings Accordion */}
      {isHost && showSettings && (
        <div className="glass-panel-glow rounded-3xl p-5 mb-4 border border-rose-500/30 space-y-4 animate-scale-in">
          <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            პარამეტრების რედაქტირება
          </h3>

          {/* Total players slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">მოთამაშეების რაოდენობა:</span>
              <span className="text-rose-400 font-bold text-sm">{totalPlayers}</span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              value={totalPlayers}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTotalPlayers(val);
                handleConfigChange({ totalPlayers: val });
              }}
              className="w-full accent-rose-600"
            />
          </div>

          {/* Mafia count slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">მაფიის რაოდენობა:</span>
              <span className="text-rose-400 font-bold text-sm">{mafiaCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.min(5, Math.floor(totalPlayers / 3))}
              value={mafiaCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMafiaCount(val);
                handleConfigChange({ mafiaCount: val });
              }}
              className="w-full accent-rose-600"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDon}
                onChange={(e) => {
                  setHasDon(e.target.checked);
                  handleConfigChange({ hasDon: e.target.checked });
                }}
                className="rounded accent-rose-600 w-4 h-4"
              />
              <span className="text-slate-200">დონი (Don)</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDetective}
                onChange={(e) => {
                  setHasDetective(e.target.checked);
                  handleConfigChange({ hasDetective: e.target.checked });
                }}
                className="rounded accent-rose-600 w-4 h-4"
              />
              <span className="text-slate-200">დეტექტივი</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDoctor}
                onChange={(e) => {
                  setHasDoctor(e.target.checked);
                  handleConfigChange({ hasDoctor: e.target.checked });
                }}
                className="rounded accent-rose-600 w-4 h-4"
              />
              <span className="text-slate-200">ექიმი (Doctor)</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSerialKiller}
                onChange={(e) => {
                  setHasSerialKiller(e.target.checked);
                  handleConfigChange({ hasSerialKiller: e.target.checked });
                }}
                className="rounded accent-rose-600 w-4 h-4"
              />
              <span className="text-slate-200">სერიული მკვლელი</span>
            </label>
          </div>

          {/* Serial Killer Night 1 kill toggle */}
          {hasSerialKiller && (
            <label className="flex items-center gap-2 bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/40 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={serialCanKillNight1}
                onChange={(e) => {
                  setSerialCanKillNight1(e.target.checked);
                  handleConfigChange({ serialCanKillNight1: e.target.checked });
                }}
                className="rounded accent-purple-600 w-4 h-4"
              />
              <span className="text-purple-200">სერიულს შეუძლია 1-ლ ღამეს მკვლელობა</span>
            </label>
          )}

          {/* Night Duration */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400" />
                ღამის ფიქრის დრო:
              </span>
              <span className="text-rose-400 font-bold">{nightDuration} წმ</span>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={nightDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setNightDuration(val);
                handleConfigChange({ nightDurationSeconds: val });
              }}
              className="w-full accent-rose-600"
            />
          </div>
        </div>
      )}

      {/* Players List in Lobby */}
      <div className="glass-panel rounded-3xl p-5 mb-6 border border-slate-800/80">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          შემოსული მოთამაშეები ({gameState.players.length})
        </h3>

        <div className="space-y-2">
          {gameState.players.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-3.5 py-2.5 rounded-2xl transition-all hover:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                  {p.name}
                  {p.isHost && (
                    <span title="ჯგუფის ჰოსტი">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    </span>
                  )}
                  {p.id === gameState.myPlayer?.id && (
                    <span className="text-[10px] bg-rose-950/70 text-rose-400 border border-rose-800/50 px-1.5 py-0.5 rounded font-normal">
                      შენ
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">მზადაა</span>
              </div>
            </div>
          ))}

          {/* Empty slots placeholders */}
          {Array.from({ length: Math.max(0, config.totalPlayers - gameState.players.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-between bg-slate-950/40 border border-dashed border-slate-800/60 px-3.5 py-2.5 rounded-2xl opacity-60"
            >
              <span className="text-xs text-slate-500 italic">
                მოთამაშე #{gameState.players.length + i + 1} ელოდება შემოსვლას...
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start Game Action */}
      {isHost ? (
        <button
          onClick={handleStartGame}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-rose-900/40 border border-rose-500/50 transition-all btn-press text-base font-serif-title"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>თამაშის დაწყება და როლების დარიგება</span>
        </button>
      ) : (
        <div className="text-center p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-sm flex items-center justify-center gap-2 animate-pulse">
          <Clock className="w-4 h-4" />
          <span>ჰოსტი მალე დაიწყებს თამაშს...</span>
        </div>
      )}
    </div>
  );
};
