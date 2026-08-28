import React, { useState } from 'react';
import { Volume2, VolumeX, Share2, Copy, Check, Users, Moon, Sun, ShieldAlert } from 'lucide-react';
import { audioManager } from '../lib/audioManager';
import { GameState } from '../types/game';

interface HeaderProps {
  gameState: GameState | null;
  isConnected: boolean;
  onOpenShareModal?: () => void;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ gameState, isConnected, onOpenShareModal, onLeaveRoom }) => {
  const [isMuted, setIsMuted] = useState(audioManager.getIsMuted());
  const [copied, setCopied] = useState(false);

  const handleToggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPhaseName = () => {
    if (!gameState) return '';
    switch (gameState.phase) {
      case 'lobby': return 'მოლოდინის ოთახი';
      case 'role_reveal': return 'როლების გაცნობა';
      case 'night_1_intro': return 'პირველი ღამე (გაცნობა)';
      case 'day_1_intro': return 'პირველი დღე (დისკუსია)';
      case 'night_action': return `ღამე #${gameState.roundNumber}`;
      case 'day_discussion': return `დღე #${gameState.roundNumber}`;
      case 'day_defense': return 'დაცვის სიტყვა (30წმ)';
      case 'day_voting': return 'კენჭისყრა';
      case 'game_over': return 'თამაშის დასასრული';
      default: return '';
    }
  };

  const isNight = gameState?.phase.includes('night');

  const handleLogoClick = () => {
    window.location.reload();
  };

  const handleLeaveRoom = () => {
    if (window.confirm('ნამდვილად გსურთ ოთახიდან გასვლა?')) {
      if (onLeaveRoom) {
        onLeaveRoom();
      } else {
        socketClient.leaveRoom();
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 pb-3 pt-safe flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={handleLogoClick}
          title="გვერდის განახლება (რეფრეში)"
          className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 active:scale-95 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider text-rose-400 transition-all btn-press shadow-sm group"
        >
          <span className="text-rose-500 group-hover:rotate-180 transition-transform duration-300">#</span>
          <span>{gameState?.roomCode || 'MAFIA'}</span>
        </button>

        {gameState && (
          <button
            onClick={handleLeaveRoom}
            title="ოთახის დატოვება"
            className="text-[10px] text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800 px-2 py-1.5 rounded-lg transition-all"
          >
            გასვლა
          </button>
        )}
        
        {gameState && gameState.phase !== 'lobby' && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
            isNight 
              ? 'bg-indigo-950/70 border-indigo-700/50 text-indigo-300' 
              : 'bg-amber-950/50 border-amber-600/50 text-amber-300'
          }`}>
            {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{getPhaseName()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Share / Copy Button */}
        {gameState && gameState.phase === 'lobby' && (
          <button
            onClick={onOpenShareModal || handleCopyLink}
            className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg text-xs font-medium transition-all btn-press"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'დაკოპირდა' : 'მოწვევა'}</span>
          </button>
        )}

        {/* Audio Mute/Unmute */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'ხმის ჩართვა' : 'ხმის გათიშვა'}
          className={`p-1.5 rounded-lg border transition-all btn-press ${
            isMuted 
              ? 'bg-slate-800/80 border-slate-700 text-slate-400' 
              : 'bg-rose-950/60 border-rose-700/60 text-rose-300 shadow-sm shadow-rose-900/40'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Connection indicator */}
        <div 
          title={isConnected ? 'სერვერთან კავშირი დამყარებულია' : 'კავშირი გაწყვეტილია'} 
          className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 animate-pulse'}`}
        />
      </div>
    </header>
  );
};
