import React, { useEffect, useState, useRef } from 'react';
import { GameState, Player } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { audioManager } from '../lib/audioManager';
import { 
  Sun, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  UserCheck, 
  Skull, 
  Crown, 
  ShieldAlert, 
  Volume2,
  Moon,
  Flame,
  Check
} from 'lucide-react';

interface DayDiscussionViewProps {
  gameState: GameState;
}

export const DayDiscussionView: React.FC<DayDiscussionViewProps> = ({ gameState }) => {
  const myPlayer = gameState.myPlayer;
  const isHost = myPlayer?.isHost || false;
  const isDay1 = gameState.phase === 'day_1_intro';
  const config = gameState.config;

  const currentSpeaker = gameState.players.find(p => p.id === gameState.currentSpeakerId);
  const firstSpeaker = gameState.players.find(p => p.id === gameState.firstSpeakerId);
  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);

  const nominatedPlayers = gameState.voting.nominatedPlayers || [];

  // Local timer tick handler for host
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isHost && gameState.isSpeakerTimerRunning && gameState.speakerTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        const nextTime = gameState.speakerTimeLeft - 1;
        socketClient.speakerTimerTick(gameState.roomCode, nextTime);

        // Sound cues
        if (nextTime <= 5 && nextTime > 0) {
          audioManager.playTick();
        } else if (nextTime === 0) {
          audioManager.playGong();
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHost, gameState.isSpeakerTimerRunning, gameState.speakerTimeLeft, gameState.roomCode]);

  // Host Actions
  const handleStartTimer = () => {
    socketClient.controlSpeakerTimer(gameState.roomCode, 'start');
  };

  const handlePauseTimer = () => {
    socketClient.controlSpeakerTimer(gameState.roomCode, 'pause');
  };

  const handleNextSpeaker = () => {
    socketClient.controlSpeakerTimer(gameState.roomCode, 'next');
  };

  const handleToggleNominate = (playerId: string) => {
    socketClient.toggleNomination(gameState.roomCode, playerId);
  };

  const handleStartDefenseOrVoting = () => {
    socketClient.startDefensePhase(gameState.roomCode);
  };

  const handleStartNextNight = () => {
    socketClient.startNightAction(gameState.roomCode);
  };

  // Timer circle calculation
  const totalSeconds = config.daySpeechSeconds || 60;
  const progressPercent = Math.max(0, (gameState.speakerTimeLeft / totalSeconds) * 100);

  return (
    <div className="w-full max-w-lg mx-auto pb-24 animate-fade-in">
      {/* Morning Deaths Alert Banner */}
      {!isDay1 && gameState.lastNightDeaths && (
        <div className={`p-4 rounded-3xl mb-5 border text-center relative overflow-hidden shadow-2xl ${
          gameState.lastNightDeaths.length > 0
            ? 'bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border-rose-600/60 shadow-rose-950/50'
            : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-600/50 shadow-emerald-950/40'
        }`}>
          {gameState.lastNightDeaths.length > 0 ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/30 text-rose-300 text-xs font-bold mb-2 border border-rose-500/40">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>ღამის მსხვერპლი</span>
              </div>
              <h3 className="text-xl font-bold text-white font-serif-title">
                {gameState.lastNightDeaths.map(id => {
                  const p = gameState.players.find(pl => pl.id === id);
                  return p ? p.name : 'მოთამაშე';
                }).join(', ')} მოკლეს!
              </h3>
              <p className="text-xs text-rose-300/80 mt-1">მოთამაშე ტოვებს ქალაქს.</p>
            </div>
          ) : (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/30 text-emerald-300 text-xs font-bold mb-2 border border-emerald-500/40">
                <Sun className="w-3.5 h-3.5 text-emerald-400" />
                <span>მშვიდობიანი ღამე</span>
              </div>
              <h3 className="text-lg font-bold text-white font-serif-title">
                ღამით არავინ მომკვდარა!
              </h3>
              <p className="text-xs text-emerald-300/80 mt-1">ექიმმა გადაარჩინა მსხვერპლი ან თავდასხმა არ მომხდარა.</p>
            </div>
          )}
        </div>
      )}

      {/* Circle Opener Banner */}
      {firstSpeaker && (
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl px-4 py-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200">წრეს ხსნის:</span>
            <span className="font-bold text-white bg-amber-900/60 px-2 py-0.5 rounded-lg border border-amber-700/50">
              {firstSpeaker.name}
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80">1 წუთი / მოთამაშე</span>
        </div>
      )}

      {/* Active Speaker Card with Digital Timer */}
      <div className="glass-panel-glow rounded-3xl p-6 mb-5 border border-rose-500/30 text-center relative overflow-hidden shadow-2xl">
        <span className="text-[11px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
          მიმდინარე სპიკერი
        </span>
        <h2 className="text-2xl font-extrabold text-white font-serif-title mb-4 flex items-center justify-center gap-2">
          <span>{currentSpeaker?.name || 'მოთამაშე'}</span>
          {currentSpeaker?.id === myPlayer?.id && (
            <span className="text-xs bg-rose-950 text-rose-400 border border-rose-700/50 px-2 py-0.5 rounded-full font-sans">
              შენ
            </span>
          )}
        </h2>

        {/* Circular Countdown Progress Timer */}
        <div className="relative w-36 h-36 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-slate-800"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className={`transition-all duration-1000 ${
                gameState.speakerTimeLeft <= 10 ? 'stroke-rose-500 animate-pulse' : 'stroke-rose-600'
              }`}
              strokeWidth="7"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${
              gameState.speakerTimeLeft <= 10 ? 'text-rose-400' : 'text-white'
            }`}>
              {gameState.speakerTimeLeft}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">წამი</span>
          </div>
        </div>

        {/* Host Timer Controls */}
        {isHost && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {gameState.isSpeakerTimerRunning ? (
              <button
                onClick={handlePauseTimer}
                className="flex items-center gap-2 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all btn-press"
              >
                <Pause className="w-4 h-4" />
                <span>პაუზა</span>
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="flex items-center gap-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all btn-press shadow-md"
              >
                <Play className="w-4 h-4 fill-emerald-300" />
                <span>დაწყება (1 წთ)</span>
              </button>
            )}

            <button
              onClick={handleNextSpeaker}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all btn-press"
            >
              <SkipForward className="w-4 h-4" />
              <span>შემდეგი სპიკერი</span>
            </button>
          </div>
        )}
      </div>

      {/* Players Circle & Nominations List */}
      <div className="glass-panel rounded-3xl p-5 mb-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-rose-400" />
            მოთამაშეები წრეში ({alivePlayers.length} ცოცხალი)
          </span>
          {isHost && !isDay1 && (
            <span className="text-[11px] text-rose-400 font-medium">დაასახელე კანდიდატი 👇</span>
          )}
        </div>

        <div className="space-y-2">
          {gameState.players.map((p, idx) => {
            const isSpeaking = p.id === gameState.currentSpeakerId;
            const isNominated = nominatedPlayers.includes(p.id);

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  !p.isAlive
                    ? 'bg-slate-950/40 border-slate-900 opacity-40'
                    : isSpeaking
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/40'
                      : isNominated
                        ? 'bg-amber-950/30 border-amber-600/60'
                        : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center ${
                    isSpeaking ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className={`font-semibold text-sm flex items-center gap-1.5 ${
                      !p.isAlive ? 'line-through text-slate-500' : isSpeaking ? 'text-rose-300' : 'text-slate-200'
                    }`}>
                      {p.name}
                      {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    </span>
                    {!p.isAlive && (
                      <span className="text-[10px] text-rose-500 block">გავარდნილია</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isNominated && (
                    <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-lg font-bold">
                      დასახელებულია
                    </span>
                  )}

                  {/* Host Nomination Toggle Button */}
                  {isHost && p.isAlive && !isDay1 && (
                    <button
                      onClick={() => handleToggleNominate(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition-all btn-press ${
                        isNominated
                          ? 'bg-rose-600 text-white border-rose-500 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {isNominated ? 'მოხსნა' : 'დასახელება'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Action Buttons for Transitions */}
      {isHost && (
        <div className="glass-panel rounded-3xl p-4 border border-rose-500/30 space-y-2.5">
          {/* If there are nominations, Host can start defense/voting */}
          {!isDay1 && nominatedPlayers.length > 0 && (
            <button
              onClick={handleStartDefenseOrVoting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-amber-950/40 transition-all btn-press text-sm font-serif-title"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>დაცვის სიტყვის დაწყება ({nominatedPlayers.length} დასახელებული)</span>
            </button>
          )}

          {/* Start Night Action */}
          <button
            onClick={handleStartNextNight}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-indigo-950/40 transition-all btn-press text-sm font-serif-title"
          >
            <Moon className="w-4 h-4" />
            <span>ღამის დაწყება</span>
          </button>
        </div>
      )}
    </div>
  );
};
