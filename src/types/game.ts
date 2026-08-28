export type RoleType = 'citizen' | 'mafia' | 'don' | 'detective' | 'doctor' | 'serial_killer';

export type GamePhase = 
  | 'lobby'
  | 'role_reveal'
  | 'night_1_intro'
  | 'day_1_intro'
  | 'night_action'
  | 'day_discussion'
  | 'day_defense'
  | 'day_voting'
  | 'game_over';

export type NightStep = 
  | 'mafia_intro'     // Night 1
  | 'mafia_kill'      // Night 2+
  | 'don_check'       // Night 2+
  | 'detective_check' // Night 2+
  | 'doctor_heal'     // Night 2+
  | 'serial_kill'     // Night 2+ (or Night 1 if enabled)
  | 'night_end';

export interface Player {
  id: string;              // Socket ID or unique device ID
  name: string;
  role: RoleType;
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  eliminatedBy?: 'night_mafia' | 'night_serial' | 'day_vote' | 'tie_vote';
  eliminatedRound?: number;
  healedRounds: number[];  // Keep track of which players have been healed (Doctor 1-time rule)
  hasBeenHealedEver?: boolean;
}

export interface RoomConfig {
  roomCode: string;
  totalPlayers: number;
  mafiaCount: number;
  hasDon: boolean;
  hasDetective: boolean;
  hasDoctor: boolean;
  hasSerialKiller: boolean;
  serialCanKillNight1: boolean;
  nightDurationSeconds: number;
  daySpeechSeconds: number;
  defenseSpeechSeconds: number;
}

export interface NightActions {
  mafiaTarget: string | null;
  donCheckTarget: string | null;
  donCheckResult: boolean | null; // true if detective
  detectiveCheckTarget: string | null;
  detectiveCheckResult: boolean | null; // true if mafia or don
  doctorTarget: string | null;
  serialKillerTarget: string | null; // string ID or 'skip' or null
  serialKillsUsed: number; // Max 2
}

export interface VotingState {
  nominatedPlayers: string[]; // Player IDs
  currentDefenseIndex: number;
  defenseTimeLeft: number;
  isDefenseActive: boolean;
  votes: Record<string, number>; // playerId -> count
  tiedCandidates: string[]; // Player IDs in case of a tie
  isTieResolution: boolean;
  isBothEliminateQuestion: boolean; // ">50% eliminate both" question active
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  config: RoomConfig;
  players: Player[];
  
  // Day discussion state
  firstSpeakerId: string | null;
  currentSpeakerId: string | null;
  speakerTimeLeft: number;
  isSpeakerTimerRunning: boolean;

  // Night state
  currentNightStep: NightStep | null;
  nightStepTimeLeft: number;
  isNightStepTimerRunning: boolean;
  nightActions: NightActions;
  lastNightDeaths: string[]; // Player IDs who died last night

  // Voting state
  voting: VotingState;

  // Winner state
  winner: 'town' | 'mafia' | 'serial_killer' | null;
  winnerReason: string | null;
}
