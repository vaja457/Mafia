import React, { useState, useEffect } from 'react';
import { GameState, Player } from '../types/game';
import { socketClient } from '../lib/socketClient';
import { audioManager } from '../lib/audioManager';
import { 
  ShieldAlert, 
  Vote, 
  Skull, 
  Check, 
  HelpCircle, 
  Users, 
  ChevronRight, 
  UserMinus, 
  ShieldCheck, 
  Moon,
  Clock
} from 'lucide-react';

interface VotingViewProps {
  gameState: GameState;
}

export const VotingView: React.FC<VotingViewProps> = ({ gameState }) => {
  const isDefense = gameState.phase === 'day_defense';
  const isVoting = gameState.phase === 'day_voting';
  const myPlayer = gameState.myPlayer;
  const isHost = myPlayer?.isHost || false;
  const voting = gameState.voting;

  const candidateIds = voting.isTieResolution ? voting.tiedCandidates : voting.nominatedPlayers;
  const currentDefendingPlayer = gameState.players.find(
    p => p.id === candidateIds[voting.currentDefenseIndex]
  );

  // Local state for vote counts input by Host
  const [voteTally, setVoteTally] = useState<Record<string, number>>({});
  const [defenseSeconds, setDefenseSeconds] = useState(gameState.config.defenseSpeechSeconds || 30);

  // Defense countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isDefense && defenseSeconds > 0) {
      interval = setInterval(() => {
        setDefenseSeconds(prev => {
          if (prev <= 5 && prev > 1) {
            audioManager.playTick();
          } else if (prev === 1) {
            audioManager.playGong();
          }
          return Math.max(0, prev - 1);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDefense, defenseSeconds]);

  // Reset timer on new defense speaker
  useEffect(() => {
    setDefenseSeconds(gameState.config.defenseSpeechSeconds || 30);
  }, [voting.currentDefenseIndex, gameState.phase]);

  // Initialize vote counts
  useEffect(() => {
    const initial: Record<string, number> = {};
    candidateIds.forEach(id => {
      initial[id] = voting.votes[id] || 0;
    });
    setVoteTally(initial);
  }, [candidateIds.join(',')]);

  const handleVoteChange = (id: string, delta: number) => {
    setVoteTally(prev => {
      const current = prev[id] || 0;
      const updated = Math.max(0, current + delta);
      const next = { ...prev, [id]: updated };
      socketClient.submitVotesTally(gameState.roomCode, next);
      return next;
    });
  };

  const handleNextDefense = () => {
    socketClient.nextDefenseSpeaker(gameState.roomCode);
  };

  // Evaluate highest votes & ties
  const getVoteResults = () => {
    const candidatesWithVotes = candidateIds.map(id => ({
      player: gameState.players.find(p => p.id === id),
      id,
      votes: voteTally[id] || 0
    }));

    candidatesWithVotes.sort((a, b) => b.votes - a.votes);

    if (candidatesWithVotes.length === 0) return { winnerId: null, isTie: false, tiedIds: [] };

    const highestVotes = candidatesWithVotes[0].votes;
    const tied = candidatesWithVotes.filter(c => c.votes === highestVotes && c.votes > 0);

    if (tied.length > 1) {
      return {
        winnerId: null,
        isTie: true,
        tiedIds: tied.map(t => t.id),
        highestVotes
      };
    } else if (candidatesWithVotes[0].votes > 0) {
      return {
        winnerId: candidatesWithVotes[0].id,
        isTie: false,
        tiedIds: [],
        highestVotes
      };
    }

    return { winnerId: null, isTie: false, tiedIds: [] };
  };

  const voteResult = getVoteResults();

  // Resolution triggers by Host
  const handleEliminateSingle = (playerId: string) => {
    audioManager.playGunshot();
    socketClient.resolveVoteOutcome(gameState.roomCode, 'eliminate_single', playerId);
  };

  const handleStartTieDefense = () => {
    socketClient.resolveVoteOutcome(gameState.roomCode, 'start_tie_defense', undefined, voteResult.tiedIds);
  };

  const handleAskEliminateBoth = () => {
    socketClient.resolveVoteOutcome(gameState.roomCode, 'ask_eliminate_both');
  };

  const handleEliminateBoth = () => {
    audioManager.playGunshot();
    socketClient.resolveVoteOutcome(gameState.roomCode, 'eliminate_both', undefined, voting.tiedCandidates);
  };

  const handleKeepBoth = () => {
    socketClient.resolveVoteOutcome(gameState.roomCode, 'keep_both');
  };

  return (
    <div className="w-full max-w-lg mx-auto pb-24 animate-fade-in">
      {/* Phase Banner */}
      <div className="glass-panel rounded-3xl p-5 mb-5 border border-amber-500/20 text-center relative overflow-hidden shadow-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-amber-950/60 text-amber-300 border border-amber-700/50">
          {isDefense ? <ShieldAlert className="w-3.5 h-3.5" /> : <Vote className="w-3.5 h-3.5" />}
          <span>{isDefense ? 'თავის გამართლების სპიჩი' : 'კენჭისყრის ფაზა'}</span>
        </div>

        <h2 className="text-xl font-bold text-white font-serif-title">
          {isDefense
            ? `დაცვა: ${currentDefendingPlayer?.name || 'მოთამაშე'}`
            : 'ხმის მიცემა და შედეგების დათვლა'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isDefense
            ? `მოთამაშეს აქვს 30 წამი თავის გასამართლებლად (${voting.currentDefenseIndex + 1}/${candidateIds.length})`
            : 'ჰოსტი ითვლის მოთამაშეთა მიერ მიცემულ ხმებს'}
        </p>
      </div>

      {/* 30-Second Defense Speeches View */}
      {isDefense && (
        <div className="glass-panel-glow rounded-3xl p-6 mb-5 border border-amber-500/30 text-center">
          <div className="w-28 h-28 rounded-full bg-amber-950/50 border-2 border-amber-500/60 mx-auto flex flex-col items-center justify-center mb-4 shadow-xl shadow-amber-950/50">
            <span className={`text-4xl font-extrabold font-mono ${
              defenseSeconds <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'
            }`}>
              {defenseSeconds}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-amber-400/80">წამი</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1 font-serif-title">
            {currentDefendingPlayer?.name}
          </h3>
          <p className="text-xs text-slate-400 mb-5">იცავს თავს დასახელებისგან</p>

          {isHost && (
            <button
              onClick={handleNextDefense}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-amber-950/40 transition-all btn-press text-sm"
            >
              <span>
                {voting.currentDefenseIndex < candidateIds.length - 1
                  ? 'შემდეგ დაცვაზე გადასვლა'
                  : 'კენჭისყრის დაწყება (ხმის მიცემა)'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Voting Tally View */}
      {isVoting && (
        <div className="space-y-4 mb-5">
          {/* Candidates List with Vote Counters */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-400" />
              დასახელებული კანდიდატები ({candidateIds.length})
            </h3>

            <div className="space-y-3">
              {candidateIds.map(id => {
                const player = gameState.players.find(p => p.id === id);
                const votes = voteTally[id] || 0;
                const isLeading = voteResult.winnerId === id;
                const isTied = voteResult.isTie && voteResult.tiedIds.includes(id);

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isLeading
                        ? 'bg-rose-950/50 border-rose-500 shadow-md shadow-rose-950/50'
                        : isTied
                          ? 'bg-amber-950/40 border-amber-500'
                          : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm text-white block">
                        {player?.name || 'მოთამაშე'}
                      </span>
                      {isLeading && (
                        <span className="text-[10px] text-rose-400 font-bold">ყველაზე მეტი ხმა</span>
                      )}
                      {isTied && (
                        <span className="text-[10px] text-amber-400 font-bold">ხმები გაიყო</span>
                      )}
                    </div>

                    {/* Host Vote Controls */}
                    {isHost ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVoteChange(id, -1)}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center justify-center btn-press"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-base text-rose-400">
                          {votes}
                        </span>
                        <button
                          onClick={() => handleVoteChange(id, 1)}
                          className="w-8 h-8 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm border border-rose-600 flex items-center justify-center btn-press shadow-md"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-lg text-rose-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                        {votes} ხმა
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tie Resolution Controls for Host */}
          {isHost && (
            <div className="glass-panel-glow rounded-3xl p-5 border border-rose-500/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-1">
                ჰოსტის გადაწყვეტილება
              </span>

              {/* Case 1: Single Clear Winner */}
              {voteResult.winnerId && !voteResult.isTie && (
                <button
                  onClick={() => handleEliminateSingle(voteResult.winnerId!)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-rose-950/40 transition-all btn-press text-sm font-serif-title"
                >
                  <Skull className="w-4 h-4" />
                  <span>
                    გააგდე: {gameState.players.find(p => p.id === voteResult.winnerId)?.name}
                  </span>
                </button>
              )}

              {/* Case 2: Tie -> Start Re-defense & Re-vote */}
              {voteResult.isTie && !voting.isBothEliminateQuestion && (
                <div className="space-y-2">
                  <div className="bg-amber-950/50 border border-amber-600/60 p-3 rounded-2xl text-xs text-amber-200 text-center font-medium">
                    ⚠️ ხმები გაიყო {voteResult.tiedIds.length} მოთამაშეს შორის!
                  </div>

                  <button
                    onClick={handleStartTieDefense}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all btn-press text-xs"
                  >
                    <Clock className="w-4 h-4" />
                    <span>30 წმ დაცვის მიცემა გაყოფილებისთვის</span>
                  </button>

                  <button
                    onClick={handleAskEliminateBoth}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl border border-slate-700 transition-all btn-press text-xs"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>კითხვა: „გავარდეს თუ არა ორივე?“</span>
                  </button>
                </div>
              )}

              {/* Case 3: Question Active ">50% Eliminate Both" */}
              {voting.isBothEliminateQuestion && (
                <div className="space-y-2">
                  <div className="bg-slate-900 border border-rose-500/40 p-3 rounded-2xl text-xs text-slate-200 text-center font-medium">
                    კენჭისყრა: გავარდეს თუ არა ორივე მოთამაშე?
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleEliminateBoth}
                      className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all btn-press text-xs shadow-lg"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>ორივე გავარდეს (&gt;50%)</span>
                    </button>

                    <button
                      onClick={handleKeepBoth}
                      className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all btn-press text-xs shadow-lg"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>ორივე დარჩეს (&le;50%)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
