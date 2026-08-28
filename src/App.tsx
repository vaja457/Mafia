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

    // Smart Audio Sequence Triggers on Host Device
    socketClient.on('playAudioSequence', (data: any) => {
      if (data.type === 'night_1_intro') {
        const dur = data.nightDuration || 25;
        audioManager.startAmbientMusic();

        // 1. City Sleeps
        audioManager.speak('იძინებს ქალაქი', () => {
          // 2. 10s pause -> Mafia Intro
          setTimeout(() => {
            audioManager.speak(`იღვიძებს მაფია და ეცნობა ერთმანეთს, მაფიას აქვს ${dur} წამი მოსაფიქრებლად`, () => {
              // 3. Wait duration -> Mafia sleeps
              setTimeout(() => {
                audioManager.speak('იძინებს მაფია', () => {
                  // 4. Short pause -> City wakes
                  setTimeout(() => {
                    audioManager.playMorningChime();
                    audioManager.speak('იღვიძებს ქალაქი');
                  }, 4000);
                });
              }, dur * 1000);
            });
          }, 8000);
        });
      } else if (data.type === 'night_action_flow') {
        const dur = data.nightDuration || 25;
        audioManager.startAmbientMusic();

        audioManager.speak('იძინებს ქალაქი', () => {
          setTimeout(() => {
            audioManager.speak(`იღვიძებს მაფია და ირჩევს მსხვერპლს, მაფიას აქვს ${dur} წამი მოსაფიქრებლად`);
          }, 4000);
        });
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
    if (!gameState) {
      return <HomeView />;
    }

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
