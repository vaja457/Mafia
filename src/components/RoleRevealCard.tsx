import React, { useState } from 'react';
import { GameState, RoleType } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { 
  Skull, 
  Shield, 
  Eye, 
  Stethoscope, 
  Crosshair, 
  Crown, 
  Moon, 
  EyeOff, 
  Sparkles,
  Users
} from 'lucide-react';

interface RoleRevealCardProps {
  gameState: GameState;
}

export const RoleRevealCard: React.FC<RoleRevealCardProps> = ({ gameState }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const myPlayer = gameState.myPlayer;
  const isHost = myPlayer?.isHost || false;
  const role = myPlayer?.role || 'citizen';

  const getRoleData = (role: RoleType) => {
    switch (role) {
      case 'don':
        return {
          title: 'დონი (Don)',
          subtitle: 'მაფიის ლიდერი',
          icon: Crown,
          bgGradient: 'from-rose-950 via-rose-900 to-black',
          border: 'border-rose-500/60',
          textColor: 'text-rose-400',
          description: 'შენ ხარ მაფიის მეთაური! ღამით ირჩევთ მსხვერპლს და ცალკე ეძებ დეტექტივს.',
        };
      case 'mafia':
        return {
          title: 'მაფია (Mafia)',
          subtitle: 'ბოროტი ძალა',
          icon: Skull,
          bgGradient: 'from-rose-950 via-slate-900 to-black',
          border: 'border-rose-600/50',
          textColor: 'text-rose-400',
          description: 'შენ ხარ მაფიოზი! ღამით გუნდთან ერთად კლავთ მოქალაქეებს, დღისით კი თავს მშვიდობიანად ასაღებთ.',
        };
      case 'detective':
        return {
          title: 'დეტექტივი / შერიფი',
          subtitle: 'ქალაქის მცველი',
          icon: Eye,
          bgGradient: 'from-blue-950 via-slate-900 to-black',
          border: 'border-blue-500/50',
          textColor: 'text-blue-400',
          description: 'შენ ხარ დეტექტივი! ყოველ ღამეს ამოწმებ ერთ მოთამაშეს, რათა გაარკვიო მაფიაა თუ არა.',
        };
      case 'doctor':
        return {
          title: 'ექიმი (Doctor)',
          subtitle: 'სიცოცხლის გადამრჩენელი',
          icon: Stethoscope,
          bgGradient: 'from-emerald-950 via-slate-900 to-black',
          border: 'border-emerald-500/50',
          textColor: 'text-emerald-400',
          description: 'შენ ხარ ექიმი! ყოველ ღამეს შეგიძლია გადაარჩინო 1 მოთამაშე. (გახსოვდეს: 1 მოთამაშის ან საკუთარი თავის დაჰილვა მხოლოდ ერთხელ შეგიძლია მთელ თამაშში!).',
        };
      case 'serial_killer':
        return {
          title: 'სერიული მკვლელი',
          subtitle: 'მარტოხელა მანიაკი',
          icon: Crosshair,
          bgGradient: 'from-purple-950 via-slate-900 to-black',
          border: 'border-purple-500/50',
          textColor: 'text-purple-400',
          description: 'შენ ხარ მარტოხელა მკვლელი! გაქვს მაქსიმუმ 2 მკვლელობის უფლება. შეგიძლია სვლა გამოტოვო და შეინახო. იგებ თუ დარჩები 1-1-ზე!',
        };
      case 'citizen':
      default:
        return {
          title: 'პატიოსანი მოქალაქე',
          subtitle: 'ქალაქის მცხოვრები',
          icon: Shield,
          bgGradient: 'from-slate-900 via-slate-950 to-black',
          border: 'border-slate-700/60',
          textColor: 'text-slate-200',
          description: 'შენ ხარ მშვიდობიანი მოქალაქე! გამოიყენე დაკვირვება და ლოგიკა, რათა დღის დისკუსიებზე ამოიცნო მაფია და სერიული მკვლელი.',
        };
    }
  };

  const roleInfo = getRoleData(role);
  const IconComponent = roleInfo.icon;

  const handleStartNight1 = () => {
    socketClient.startNight1(gameState.roomCode);
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center min-h-[75vh] px-4 animate-fade-in">
      <div className="text-center mb-5">
        <span className="text-xs uppercase tracking-widest text-rose-400 font-bold">საიდუმლო ბარათი</span>
        <h2 className="text-2xl font-bold text-white font-serif-title">შენი როლი</h2>
        <p className="text-xs text-slate-400 mt-1">დარწმუნდით, რომ თქვენს ეკრანს სხვა მოთამაშეები ვერ ხედავენ!</p>
      </div>

      {/* Flip / Reveal Card */}
      <div
        onClick={() => setIsRevealed(!isRevealed)}
        className={`w-full aspect-[3/4] max-h-[420px] rounded-3xl p-6 border transition-all duration-500 cursor-pointer select-none relative overflow-hidden flex flex-col items-center justify-between shadow-2xl ${
          isRevealed
            ? `bg-gradient-to-b ${roleInfo.bgGradient} ${roleInfo.border} shadow-rose-950/40`
            : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black border-slate-800 shadow-slate-950/80 hover:border-slate-700'
        }`}
      >
        {/* Card Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <IconComponent className="w-72 h-72" />
        </div>

        {isRevealed ? (
          <>
            {/* Card Top */}
            <div className="w-full flex items-center justify-between z-10">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">MAFIA CARD</span>
              <span className={`text-xs font-bold ${roleInfo.textColor}`}>{roleInfo.subtitle}</span>
            </div>

            {/* Card Center */}
            <div className="flex flex-col items-center text-center z-10 my-auto">
              <div className={`p-4 rounded-2xl bg-black/40 border ${roleInfo.border} mb-3 shadow-lg`}>
                <IconComponent className={`w-12 h-12 ${roleInfo.textColor}`} />
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-wide font-serif-title mb-1">
                {roleInfo.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[260px] bg-black/30 p-2.5 rounded-xl border border-white/5">
                {roleInfo.description}
              </p>

              {/* Mafia Teammates list (Secret) */}
              {(role === 'mafia' || role === 'don') && myPlayer?.mafiaTeam && myPlayer.mafiaTeam.length > 0 && (
                <div className="mt-3 w-full bg-rose-950/50 border border-rose-800/40 rounded-xl p-2.5 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300 mb-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>შენი მაფიის გუნდი:</span>
                  </div>
                  <div className="space-y-1">
                    {myPlayer.mafiaTeam.map((m) => (
                      <div key={m.id} className="text-xs flex items-center justify-between text-rose-100">
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-[10px] text-rose-400 font-mono">
                          {m.isDon ? '(დონი 👑)' : '(მაფია)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card Bottom */}
            <div className="w-full text-center z-10">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <EyeOff className="w-3 h-3" /> დააჭირე დასაფარად
              </span>
            </div>
          </>
        ) : (
          /* Hidden State */
          <div className="my-auto flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-rose-950/40 border border-rose-700/40 flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-1 font-serif-title">ბარათი დაფარულია</h3>
            <p className="text-xs text-rose-400/90 font-medium">დააჭირეთ როლის სანახავად</p>
          </div>
        )}
      </div>

      {/* Host Action to Start Night 1 */}
      {isHost ? (
        <button
          onClick={handleStartNight1}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-rose-900/40 border border-rose-500/50 transition-all btn-press text-sm"
        >
          <Moon className="w-4 h-4 fill-white" />
          <span>პირველი ღამის დაწყება (გაცნობა)</span>
        </button>
      ) : (
        <p className="mt-5 text-xs text-slate-400 text-center animate-pulse">
          დაელოდეთ ჰოსტს, სანამ ყველა გაეცნობა თავის როლს...
        </p>
      )}
    </div>
  );
};
