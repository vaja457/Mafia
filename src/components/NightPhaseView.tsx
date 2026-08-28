import React, { useState, useEffect } from 'react';
import { GameState, NightStep, Player } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { 
  Moon, 
  Skull, 
  Eye, 
  Stethoscope, 
  Crosshair, 
  Crown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sun,
  Shield,
  FastForward,
  Check
} from 'lucide-react';

interface NightPhaseViewProps {
  gameState: GameState;
}

export const NightPhaseView: React.FC<NightPhaseViewProps> = ({ gameState }) => {
  const isNight1 = gameState.phase === 'night_1_intro';
  const myPlayer = gameState.myPlayer;
  const isHost = myPlayer?.isHost || false;
  const role = myPlayer?.role || 'citizen';
  const isAlive = myPlayer?.isAlive ?? true;
  const currentStep = gameState.currentNightStep;
  const nightActions = gameState.nightActions;

  // Selected targets in local state for immediate feedback
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const alivePlayers = gameState.players.filter(p => p.isAlive);

  // Check if current user is active in this night step
  const isMyTurn = () => {
    if (!isAlive) return false;
    if (isNight1) {
      return role === 'mafia' || role === 'don';
    }
    switch (currentStep) {
      case 'mafia_kill':
        return role === 'mafia' || role === 'don';
      case 'don_check':
        return role === 'don';
      case 'detective_check':
        return role === 'detective';
      case 'doctor_heal':
        return role === 'doctor';
      case 'serial_kill':
        return role === 'serial_killer';
      default:
        return false;
    }
  };

  const handleSelectTarget = (targetId: string) => {
    setSelectedTarget(targetId);

    if (currentStep === 'mafia_kill' || (isNight1 && role === 'mafia')) {
      socketClient.submitMafiaTarget(gameState.roomCode, targetId);
    } else if (currentStep === 'don_check') {
      socketClient.submitDonCheck(gameState.roomCode, targetId);
    } else if (currentStep === 'detective_check') {
      socketClient.submitDetectiveCheck(gameState.roomCode, targetId);
    } else if (currentStep === 'doctor_heal') {
      socketClient.submitDoctorHeal(gameState.roomCode, targetId);
    } else if (currentStep === 'serial_kill') {
      socketClient.submitSerialAction(gameState.roomCode, targetId);
    }
  };

  const handleSkipSerial = () => {
    setSelectedTarget('skip');
    socketClient.submitSerialAction(gameState.roomCode, 'skip');
  };

  // Host Next Step Controls
  const getNextStep = (current: NightStep | null): NightStep => {
    const config = gameState.config;
    if (isNight1) return 'night_end';
    
    if (current === 'mafia_kill') {
      if (config.hasDon) return 'don_check';
      if (config.hasDetective) return 'detective_check';
      if (config.hasDoctor) return 'doctor_heal';
      if (config.hasSerialKiller) return 'serial_kill';
      return 'night_end';
    }
    if (current === 'don_check') {
      if (config.hasDetective) return 'detective_check';
      if (config.hasDoctor) return 'doctor_heal';
      if (config.hasSerialKiller) return 'serial_kill';
      return 'night_end';
    }
    if (current === 'detective_check') {
      if (config.hasDoctor) return 'doctor_heal';
      if (config.hasSerialKiller) return 'serial_kill';
      return 'night_end';
    }
    if (current === 'doctor_heal') {
      if (config.hasSerialKiller) return 'serial_kill';
      return 'night_end';
    }
    return 'night_end';
  };

  const handleHostAdvanceStep = () => {
    const next = getNextStep(currentStep);
    if (next === 'night_end') {
      socketClient.resolveNight(gameState.roomCode);
    } else {
      socketClient.setNightStep(gameState.roomCode, next);
    }
  };

  const handleEndNight1 = () => {
    socketClient.startDay1(gameState.roomCode);
  };

  // Get current step title & description
  const getStepDetails = () => {
    if (isNight1) {
      return {
        title: 'მაფიის გაცნობა',
        desc: 'მაფიოზები ეცნობიან ერთმანეთს და თანხმდებიან ტაქტიკაზე.',
        icon: Skull,
        badgeColor: 'bg-rose-950/70 border-rose-700/60 text-rose-300'
      };
    }
    switch (currentStep) {
      case 'mafia_kill':
        return {
          title: 'მაფია ირჩევს მსხვერპლს',
          desc: 'მაფია თათბირობს და ირჩევს ერთ მოთამაშეს მოსაკლავად.',
          icon: Skull,
          badgeColor: 'bg-rose-950/70 border-rose-700/60 text-rose-300'
        };
      case 'don_check':
        return {
          title: 'დონი ეძებს დეტექტივს',
          desc: 'დონი ამოწმებს ერთ მოთამაშეს, რათა გაიგოს არის თუ არა დეტექტივი.',
          icon: Crown,
          badgeColor: 'bg-amber-950/70 border-amber-700/60 text-amber-300'
        };
      case 'detective_check':
        return {
          title: 'დეტექტივი ამოწმებს მაფიას',
          desc: 'დეტექტივი ამოწმებს ერთ მოთამაშეს (მაფიაა თუ მშვიდობიანი).',
          icon: Eye,
          badgeColor: 'bg-blue-950/70 border-blue-700/60 text-blue-300'
        };
      case 'doctor_heal':
        return {
          title: 'ექიმი ჰილავს მოთამაშეს',
          desc: 'ექიმი ირჩევს ერთ მოთამაშეს გადასარჩენად (თითოს მხოლოდ 1-ჯერ).',
          icon: Stethoscope,
          badgeColor: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
        };
      case 'serial_kill':
        return {
          title: 'სერიული მკვლელი მოქმედებს',
          desc: 'სერიულ მკვლელს შეუძლია მოკლას ან შეინახოს სვლა.',
          icon: Crosshair,
          badgeColor: 'bg-purple-950/70 border-purple-700/60 text-purple-300'
        };
      default:
        return {
          title: 'ღამე სრულდება',
          desc: 'ქალაქი ემზადება გასაღვიძებლად.',
          icon: Moon,
          badgeColor: 'bg-slate-900 border-slate-700 text-slate-300'
        };
    }
  };

  const stepDetails = getStepDetails();
  const StepIcon = stepDetails.icon;

  return (
    <div className="w-full max-w-lg mx-auto pb-24 animate-fade-in">
      {/* Night Atmosphere Header */}
      <div className="glass-panel rounded-3xl p-5 mb-5 border border-indigo-500/20 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border shadow-sm backdrop-blur-md transition-all">
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-200">
            {isNight1 ? 'პირველი გაცნობითი ღამე' : `ღამის ფაზა #${gameState.roundNumber}`}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 mb-2">
            <StepIcon className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold text-white font-serif-title mb-1">
            {stepDetails.title}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">{stepDetails.desc}</p>
        </div>
      </div>

      {/* Main Interactive Content */}
      {isMyTurn() ? (
        <div className="glass-panel-glow rounded-3xl p-5 mb-5 border border-rose-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <StepIcon className="w-4 h-4" />
              შენი სვლაა!
            </span>
            <span className="text-xs text-slate-400 font-medium">აირჩიე სამიზნე:</span>
          </div>

          {/* Detective Instant Feedback Box */}
          {currentStep === 'detective_check' && nightActions.detectiveCheckResult !== null && (
            <div className={`p-4 rounded-2xl mb-4 border text-center animate-scale-in ${
              nightActions.detectiveCheckResult 
                ? 'bg-rose-950/80 border-rose-600 text-rose-200' 
                : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
            }`}>
              <span className="text-xs uppercase font-bold block mb-1">გადამოწმების შედეგი:</span>
              <span className="text-lg font-extrabold font-serif-title">
                {nightActions.detectiveCheckResult ? '🔴 მაფიაა!' : '🟢 მშვიდობიანია'}
              </span>
            </div>
          )}

          {/* Don Instant Feedback Box */}
          {currentStep === 'don_check' && nightActions.donCheckResult !== null && (
            <div className={`p-4 rounded-2xl mb-4 border text-center animate-scale-in ${
              nightActions.donCheckResult 
                ? 'bg-blue-950/80 border-blue-600 text-blue-200' 
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}>
              <span className="text-xs uppercase font-bold block mb-1">გადამოწმების შედეგი:</span>
              <span className="text-lg font-extrabold font-serif-title">
                {nightActions.donCheckResult ? '🔍 არის დეტექტივი!' : '❌ არ არის დეტექტივი'}
              </span>
            </div>
          )}

          {/* Serial Killer Kills Used Counter & Skip Button */}
          {currentStep === 'serial_kill' && (
            <div className="mb-4">
              <div className="flex justify-between items-center bg-purple-950/40 border border-purple-800/40 p-3 rounded-2xl text-xs text-purple-200 mb-3">
                <span>დარჩენილი მკვლელობები:</span>
                <span className="font-bold font-mono text-sm text-purple-300">
                  {2 - (nightActions.serialKillsUsed || 0)} / 2
                </span>
              </div>

              <button
                onClick={handleSkipSerial}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all btn-press mb-3 ${
                  selectedTarget === 'skip' || nightActions.serialKillerTarget === 'skip'
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-purple-500'
                }`}
              >
                ⏭️ სვლის გამოტოვება (შენახვა)
              </button>
            </div>
          )}

          {/* Target Players Selection Grid */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {alivePlayers.map((player) => {
              const isSelected = selectedTarget === player.id || 
                (currentStep === 'mafia_kill' && nightActions.mafiaTarget === player.id) ||
                (currentStep === 'detective_check' && nightActions.detectiveCheckTarget === player.id) ||
                (currentStep === 'don_check' && nightActions.donCheckTarget === player.id) ||
                (currentStep === 'doctor_heal' && nightActions.doctorTarget === player.id) ||
                (currentStep === 'serial_kill' && nightActions.serialKillerTarget === player.id);

              // Doctor Rule: Cannot heal player who was already healed before
              const isDoctorStep = currentStep === 'doctor_heal';
              const isHealDisabled = isDoctorStep && (player.healedCount || 0) > 0;

              return (
                <button
                  key={player.id}
                  disabled={isHealDisabled}
                  onClick={() => handleSelectTarget(player.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all btn-press ${
                    isHealDisabled 
                      ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : isSelected
                        ? 'bg-rose-600/30 border-rose-500 text-white shadow-lg shadow-rose-950/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-sm block">{player.name}</span>
                      {isHealDisabled && (
                        <span className="text-[10px] text-amber-400/80">⚠️ უკვე ერთხელ გადაარჩინე</span>
                      )}
                      {player.id === myPlayer?.id && (
                        <span className="text-[10px] text-slate-400">(შენ)</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs text-rose-400 font-bold">
                      <Check className="w-4 h-4" />
                      <span>არჩეულია</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Sleeping State for Inactive Players */
        <div className="glass-panel rounded-3xl p-8 mb-5 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[260px]">
          <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 relative">
            <Moon className="w-9 h-9 text-slate-500 animate-pulse" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-indigo-500/60 animate-ping" />
          </div>
          <h3 className="text-lg font-bold text-slate-300 font-serif-title mb-1">
            ქალაქს სძინავს...
          </h3>
          <p className="text-xs text-slate-500 max-w-xs">
            დახუჭეთ თვალები და დაელოდეთ წამყვანის ხმოვან შეტყობინებას.
          </p>
        </div>
      )}

      {/* Host Night Step Controls */}
      {isHost && (
        <div className="glass-panel rounded-3xl p-4 border border-rose-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              ჰოსტის მართვა
            </span>
          </div>

          {isNight1 ? (
            <button
              onClick={handleEndNight1}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-amber-950/40 transition-all btn-press text-sm font-serif-title"
            >
              <Sun className="w-4 h-4 fill-white" />
              <span>პირველი დღის დაწყება (წრის გახსნა)</span>
            </button>
          ) : (
            <button
              onClick={handleHostAdvanceStep}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-rose-950/40 transition-all btn-press text-sm font-serif-title"
            >
              {getNextStep(currentStep) === 'night_end' ? (
                <>
                  <Sun className="w-4 h-4 fill-white" />
                  <span>გათენება (შედეგების გამოცხადება)</span>
                </>
              ) : (
                <>
                  <FastForward className="w-4 h-4" />
                  <span>შემდეგ როლზე გადასვლა</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
