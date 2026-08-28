import React, { useState, useEffect } from 'react';
import { GameState } from './types/game';
import { socketClient } from './lib/socketClient';
import { audioManager } from './lib/audioManager';

import { Header } from './components/Header';
import { AudioSubtitleToast } from './components/AudioSubtitleToast';
import { ShareModal } from './components/ShareModal';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { RoleRevealCard } from './components/RoleRevealCard';
import { NightPhaseView } from './components/NightPhaseView';
import { DayDiscussionView } from './components/DayDiscussionView';
import { VotingView } from './components/VotingView';
import { GameOverModal } from './components/GameOverModal';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track phase & step transitions to guarantee audio triggers locally as well
  const prevStepRef = React.useRef<string | null>(null);
  const prevPhaseRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const currentKey = `${gameState.phase}_${gameState.currentNightStep}_${gameState.roundNumber}`;
    if (prevStepRef.current !== currentKey) {
      prevStepRef.current = currentKey;

      if (gameState.phase === 'night_1_intro') {
        audioManager.announcePrompt('იძინებს ქალაქი. იღვიძებს მაფია და ეცნობა ერთმანეთს.');
      } else if (gameState.phase === 'night_action') {
        if (gameState.currentNightStep === 'mafia_kill') {
          audioManager.announcePrompt('იძინებს ქალაქი. იღვიძებს მაფია და ირჩევს მსხვერპლს.');
        } else if (gameState.currentNightStep === 'don_check') {
          audioManager.announcePrompt('იძინებს მაფია. იღვიძებს დონი და ეძებს დეტექტივს.');
        } else if (gameState.currentNightStep === 'detective_check') {
          audioManager.announcePrompt('იღვიძებს დეტექტივი და ამოწმებს მოთამაშეს.');
        } else if (gameState.currentNightStep === 'doctor_heal') {
          audioManager.announcePrompt('იღვიძებს ექიმი და ჰილავს მოთამაშეს.');
        } else if (gameState.currentNightStep === 'serial_kill') {
          audioManager.announcePrompt('იღვიძებს სერიული მკვლელი.');
        }
      } else if (gameState.phase === 'day_discussion' || gameState.phase === 'day_1_intro') {
        if (prevPhaseRef.current?.includes('night')) {
          audioManager.announcePrompt('იძინებს ყველა. იღვიძებს ქალაქი.');
        }
      }
      prevPhaseRef.current = gameState.phase;
    }
  }, [gameState?.phase, gameState?.currentNightStep, gameState?.roundNumber]);

  useEffect(() => {
    socketClient.connect();

    socketClient.on('connectionStatus', (status: boolean) => {
      setIsConnected(status);
    });

    socketClient.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
    });

    socketClient.on('errorMsg', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    // Realtime Voice & Acoustic Role Call Prompt from Server
    socketClient.on('playAudioPrompt', (data: { text: string; duration?: number }) => {
      if (data?.text) {
        audioManager.startAmbientMusic();
        audioManager.announcePrompt(data.text);
      }
    });

    socketClient.on('playAudioCue', (data: any) => {
      if (data.cue === 'wake_city') {
        audioManager.playMorningChime();
        audioManager.speak('იღვიძებს ქალაქი');
      } else if (data.cue === 'time_up_gong') {
        audioManager.playGong();
      }
    });
  }, []);

  const renderCurrentPhase = () => {
    if (!gameState || !gameState.phase) {
      return <HomeView />;
    }

    try {
      switch (gameState.phase) {
        case 'lobby':
          return (
            <LobbyView
              gameState={gameState}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          );
        case 'role_reveal':
          return <RoleRevealCard gameState={gameState} />;
        case 'night_1_intro':
        case 'night_action':
          return <NightPhaseView gameState={gameState} />;
        case 'day_1_intro':
        case 'day_discussion':
          return <DayDiscussionView gameState={gameState} />;
        case 'day_defense':
        case 'day_voting':
          return <VotingView gameState={gameState} />;
        case 'game_over':
          return <GameOverModal gameState={gameState} />;
        default:
          return <HomeView />;
      }
    } catch (e) {
      console.error('Render error:', e);
      return <HomeView />;
    }
  };

  const handleLeaveRoom = () => {
    socketClient.leaveRoom(() => {
      setGameState(null);
    });
  };

  return (
    <div className="min-h-screen bg-mafia-dark text-slate-100 flex flex-col justify-between selection:bg-rose-600 selection:text-white">
      {/* App Header */}
      <Header
        gameState={gameState}
        isConnected={isConnected}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Floating narration subtitle toast */}
      <AudioSubtitleToast />

      {/* Error alert toast */}
      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl border border-rose-400 animate-slide-up">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Main App Body */}
      <main className="flex-1 flex flex-col justify-center px-3 sm:px-4 py-4 max-w-2xl mx-auto w-full">
        {renderCurrentPhase()}
      </main>

      {/* Share / QR Modal */}
      {gameState && (
        <ShareModal
          roomCode={gameState.roomCode}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};
