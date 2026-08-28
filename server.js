import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// In-memory rooms repository
const rooms = new Map();

/**
 * Helper to generate random 6-character uppercase room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Default Game State Factory
 */
function createInitialGameState(roomCode, hostId, socketId, hostName, config) {
  return {
    roomCode,
    phase: 'lobby',
    roundNumber: 0,
    config: {
      roomCode,
      totalPlayers: config?.totalPlayers || 11,
      mafiaCount: config?.mafiaCount || 3,
      hasDon: config?.hasDon !== undefined ? config.hasDon : true,
      hasDetective: config?.hasDetective !== undefined ? config.hasDetective : true,
      hasDoctor: config?.hasDoctor !== undefined ? config.hasDoctor : true,
      hasSerialKiller: config?.hasSerialKiller !== undefined ? config.hasSerialKiller : true,
      serialCanKillNight1: config?.serialCanKillNight1 || false,
      nightDurationSeconds: config?.nightDurationSeconds || 25,
      daySpeechSeconds: config?.daySpeechSeconds || 60,
      defenseSpeechSeconds: config?.defenseSpeechSeconds || 30
    },
    players: [
      {
        id: hostId,
        socketId: socketId,
        name: hostName || 'ჰოსტი',
        role: 'citizen',
        isAlive: true,
        isHost: true,
        isReady: true,
        healedRounds: []
      }
    ],
    firstSpeakerId: null,
    currentSpeakerId: null,
    speakerTimeLeft: 60,
    isSpeakerTimerRunning: false,
    currentNightStep: null,
    nightStepTimeLeft: 0,
    isNightStepTimerRunning: false,
    nightActions: {
      mafiaTarget: null,
      donCheckTarget: null,
      donCheckResult: null,
      detectiveCheckTarget: null,
      detectiveCheckResult: null,
      doctorTarget: null,
      serialKillerTarget: null,
      serialKillsUsed: 0
    },
    lastNightDeaths: [],
    voting: {
      nominatedPlayers: [],
      currentDefenseIndex: 0,
      defenseTimeLeft: 30,
      isDefenseActive: false,
      votes: {},
      tiedCandidates: [],
      isTieResolution: false,
      isBothEliminateQuestion: false
    },
    winner: null,
    winnerReason: null
  };
}

/**
 * Check Win Conditions
 */
function checkWinCondition(game) {
  const alivePlayers = game.players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia' || p.role === 'don');
  const aliveSerial = alivePlayers.find(p => p.role === 'serial_killer');
  const aliveTownies = alivePlayers.filter(p => p.role !== 'mafia' && p.role !== 'don' && p.role !== 'serial_killer');

  // Serial Killer win condition
  if (aliveSerial) {
    if (alivePlayers.length <= 2) {
      return {
        winner: 'serial_killer',
        reason: 'სერიული მკვლელი დარჩა 1-1-ზე და გაიმარჯვა!'
      };
    }
  }

  // If all mafia and serial killer are dead -> Town wins
  if (aliveMafia.length === 0 && !aliveSerial) {
    return {
      winner: 'town',
      reason: 'ქალაქმა გაანადგურა ყველა მაფიოზი და სერიული მკვლელი!'
    };
  }

  // If Serial Killer is dead and Mafia >= Townies -> Mafia wins
  if (!aliveSerial && aliveMafia.length > 0 && aliveMafia.length >= aliveTownies.length) {
    return {
      winner: 'mafia',
      reason: 'მაფიამ მოიპოვა რიცხობრივი უპირატესობა ქალაქზე!'
    };
  }

  return null;
}

/**
 * Assign Roles Randomly
 */
function distributeRoles(game) {
  const cfg = game.config;
  const rolesPool = [];

  // Mafia & Don
  if (cfg.hasDon) {
    rolesPool.push('don');
    for (let i = 0; i < cfg.mafiaCount - 1; i++) {
      rolesPool.push('mafia');
    }
  } else {
    for (let i = 0; i < cfg.mafiaCount; i++) {
      rolesPool.push('mafia');
    }
  }

  // Detective
  if (cfg.hasDetective) {
    rolesPool.push('detective');
  }

  // Doctor
  if (cfg.hasDoctor) {
    rolesPool.push('doctor');
  }

  // Serial Killer
  if (cfg.hasSerialKiller) {
    rolesPool.push('serial_killer');
  }

  // Fill remaining slots with Citizens
  while (rolesPool.length < game.players.length) {
    rolesPool.push('citizen');
  }

  // Shuffle roles using Fisher-Yates
  for (let i = rolesPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
  }

  // Assign to players
  game.players.forEach((player, idx) => {
    player.role = rolesPool[idx];
    player.isAlive = true;
    player.healedRounds = [];
  });
}

/**
 * Filter Game State for a specific player
 */
function getSanitizedGameState(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  const isHost = player?.isHost || false;
  const role = player?.role || 'citizen';

  const isMafiaGroup = role === 'mafia' || role === 'don';
  const mafiaTeam = isMafiaGroup
    ? game.players.filter(p => p.role === 'mafia' || p.role === 'don').map(p => ({
        id: p.id,
        name: p.name,
        isDon: p.role === 'don',
        isAlive: p.isAlive
      }))
    : [];

  return {
    ...game,
    myPlayer: player ? {
      ...player,
      mafiaTeam: isMafiaGroup ? mafiaTeam : undefined
    } : null,
    players: game.players.map(p => {
      const showRole = game.phase === 'game_over' || p.id === playerId || (!p.isAlive && game.phase !== 'lobby');
      return {
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isHost: p.isHost,
        role: showRole ? p.role : (isMafiaGroup && (p.role === 'mafia' || p.role === 'don') ? p.role : 'hidden'),
        eliminatedBy: p.eliminatedBy,
        eliminatedRound: p.eliminatedRound,
        healedCount: p.healedRounds.length
      };
    }),
    nightActions: {
      mafiaTarget: isMafiaGroup ? game.nightActions.mafiaTarget : null,
      donCheckTarget: role === 'don' ? game.nightActions.donCheckTarget : null,
      donCheckResult: role === 'don' ? game.nightActions.donCheckResult : null,
      detectiveCheckTarget: role === 'detective' ? game.nightActions.detectiveCheckTarget : null,
      detectiveCheckResult: role === 'detective' ? game.nightActions.detectiveCheckResult : null,
      doctorTarget: role === 'doctor' ? game.nightActions.doctorTarget : null,
      serialKillerTarget: role === 'serial_killer' ? game.nightActions.serialKillerTarget : null,
      serialKillsUsed: role === 'serial_killer' ? game.nightActions.serialKillsUsed : 0
    }
  };
}

/**
 * Broadcast Game State to all players in room
 */
function broadcastGameState(game) {
  game.players.forEach(p => {
    const targetSocket = p.socketId || p.id;
    io.to(targetSocket).emit('gameStateUpdate', getSanitizedGameState(game, p.id));
  });
}

// ----------------- SOCKET.IO HANDLERS -----------------
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Helper to find and update player socket
  const updatePlayerSocket = (roomCode, playerId) => {
    const game = rooms.get(roomCode);
    if (!game) return null;
    const p = game.players.find(pl => pl.id === playerId || pl.socketId === socket.id);
    if (p) {
      p.socketId = socket.id;
    }
    return game;
  };

  // 1. Create Room
  socket.on('createRoom', ({ hostName, hostId, config }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const effectiveHostId = hostId || `p_${socket.id}`;
    const game = createInitialGameState(roomCode, effectiveHostId, socket.id, hostName, config);
    rooms.set(roomCode, game);
    socket.join(roomCode);

    socket.emit('roomCreated', { 
      roomCode, 
      playerId: effectiveHostId,
      gameState: getSanitizedGameState(game, effectiveHostId) 
    });
    broadcastGameState(game);
    console.log(`Room created: ${roomCode} by ${hostName} (${socket.id})`);
  });

  // 2. Join Room
  socket.on('joinRoom', ({ roomCode, playerName, playerId }) => {
    const code = roomCode?.toUpperCase().trim();
    const game = rooms.get(code);

    if (!game) {
      return socket.emit('errorMsg', 'ოთახი ამ კოდით ვერ მოიძებნა!');
    }

    const effectivePlayerId = playerId || `p_${socket.id}`;

    // Check if player already exists in room (reconnection or existing)
    const existing = game.players.find(p => p.id === effectivePlayerId || p.name.toLowerCase() === playerName?.toLowerCase());
    if (existing) {
      existing.socketId = socket.id;
      existing.id = effectivePlayerId;
      socket.join(code);
      socket.emit('joinedRoomSuccess', { roomCode: code, playerId: existing.id });
      broadcastGameState(game);
      console.log(`Player ${existing.name} reconnected to room ${code}`);
      return;
    }

    if (game.phase !== 'lobby') {
      return socket.emit('errorMsg', 'თამაში უკვე დაწყებულია!');
    }

    if (game.players.length >= game.config.totalPlayers) {
      return socket.emit('errorMsg', 'ოთახი უკვე შევსებულია!');
    }

    // Add new player
    const newPlayer = {
      id: effectivePlayerId,
      socketId: socket.id,
      name: playerName || `მოთამაშე ${game.players.length + 1}`,
      role: 'citizen',
      isAlive: true,
      isHost: false,
      isReady: true,
      healedRounds: []
    };

    game.players.push(newPlayer);
    socket.join(code);
    socket.emit('joinedRoomSuccess', { roomCode: code, playerId: effectivePlayerId });
    broadcastGameState(game);
    console.log(`Player ${newPlayer.name} joined room ${code}. Total players: ${game.players.length}`);
  });

  // 3. Reconnect Session
  socket.on('reconnectSession', ({ roomCode, playerId, playerName }) => {
    const code = roomCode?.toUpperCase().trim();
    const game = rooms.get(code);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId || p.name.toLowerCase() === playerName?.toLowerCase());
    if (player) {
      player.socketId = socket.id;
      if (playerId) player.id = playerId;
      socket.join(code);
      socket.emit('gameStateUpdate', getSanitizedGameState(game, player.id));
      broadcastGameState(game);
      console.log(`Session restored for ${player.name} in room ${code}`);
    }
  });

  // 4. Update Room Config (Host only)
  socket.on('updateConfig', ({ roomCode, config, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'lobby') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.config = { ...game.config, ...config };
    broadcastGameState(game);
  });

  // 5. Start Game (Distribute roles)
  socket.on('startGame', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'lobby') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    distributeRoles(game);
    game.phase = 'role_reveal';
    game.roundNumber = 0;

    broadcastGameState(game);
  });

  // 6. Start Night 1
  socket.on('startNight1', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.phase = 'night_1_intro';
    game.roundNumber = 1;
    game.currentNightStep = 'mafia_intro';
    game.nightStepTimeLeft = game.config.nightDurationSeconds;
    game.isNightStepTimerRunning = true;

    game.nightActions = {
      mafiaTarget: null,
      donCheckTarget: null,
      donCheckResult: null,
      detectiveCheckTarget: null,
      detectiveCheckResult: null,
      doctorTarget: null,
      serialKillerTarget: null,
      serialKillsUsed: 0
    };

    broadcastGameState(game);

    io.to(player.socketId || player.id).emit('playAudioSequence', {
      type: 'night_1_intro',
      nightDuration: game.config.nightDurationSeconds
    });
  });

  // 7. Start Day 1
  socket.on('startDay1', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.phase = 'day_1_intro';
    game.roundNumber = 1;

    const alivePlayers = game.players.filter(p => p.isAlive);
    const randomOpener = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    game.firstSpeakerId = randomOpener ? randomOpener.id : game.players[0].id;
    game.currentSpeakerId = game.firstSpeakerId;
    game.speakerTimeLeft = game.config.daySpeechSeconds;
    game.isSpeakerTimerRunning = false;

    broadcastGameState(game);

    io.to(player.socketId || player.id).emit('playAudioCue', { cue: 'wake_city' });
  });

  // 8. Day Speaker Timer Controls
  socket.on('controlSpeakerTimer', ({ roomCode, action, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    if (action === 'start') {
      game.isSpeakerTimerRunning = true;
    } else if (action === 'pause') {
      game.isSpeakerTimerRunning = false;
    } else if (action === 'next') {
      const alivePlayers = game.players.filter(p => p.isAlive);
      const currentIndex = alivePlayers.findIndex(p => p.id === game.currentSpeakerId);
      const nextIndex = (currentIndex + 1) % alivePlayers.length;
      game.currentSpeakerId = alivePlayers[nextIndex]?.id || null;
      game.speakerTimeLeft = game.config.daySpeechSeconds;
      game.isSpeakerTimerRunning = false;
    }
    broadcastGameState(game);
  });

  socket.on('speakerTimerTick', ({ roomCode, timeLeft }) => {
    const game = rooms.get(roomCode);
    if (!game) return;
    game.speakerTimeLeft = timeLeft;
    if (timeLeft <= 0) {
      game.isSpeakerTimerRunning = false;
      const host = game.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId || host.id).emit('playAudioCue', { cue: 'time_up_gong' });
      }
    }
    broadcastGameState(game);
  });

  // 9. Start Night Action (Night 2+)
  socket.on('startNightAction', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.phase = 'night_action';
    if (game.roundNumber === 1 && game.phase === 'day_1_intro') {
      game.roundNumber = 2;
    } else {
      game.roundNumber += 1;
    }

    game.currentNightStep = 'mafia_kill';
    game.nightStepTimeLeft = game.config.nightDurationSeconds;
    game.isNightStepTimerRunning = true;

    game.nightActions.mafiaTarget = null;
    game.nightActions.donCheckTarget = null;
    game.nightActions.donCheckResult = null;
    game.nightActions.detectiveCheckTarget = null;
    game.nightActions.detectiveCheckResult = null;
    game.nightActions.doctorTarget = null;
    game.nightActions.serialKillerTarget = null;

    broadcastGameState(game);

    io.to(player.socketId || player.id).emit('playAudioSequence', {
      type: 'night_action_flow',
      hasDon: game.config.hasDon,
      hasDetective: game.config.hasDetective,
      hasDoctor: game.config.hasDoctor,
      hasSerialKiller: game.config.hasSerialKiller,
      nightDuration: game.config.nightDurationSeconds
    });
  });

  socket.on('setNightStep', ({ roomCode, step, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.currentNightStep = step;
    game.nightStepTimeLeft = game.config.nightDurationSeconds;
    broadcastGameState(game);
  });

  // 10. Night Action Submissions
  socket.on('submitMafiaTarget', ({ roomCode, targetId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'night_action') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player || (player.role !== 'mafia' && player.role !== 'don') || !player.isAlive) return;

    game.nightActions.mafiaTarget = targetId;
    broadcastGameState(game);
  });

  socket.on('submitDonCheck', ({ roomCode, targetId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'night_action') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player || player.role !== 'don' || !player.isAlive) return;

    const target = game.players.find(p => p.id === targetId);
    game.nightActions.donCheckTarget = targetId;
    game.nightActions.donCheckResult = target?.role === 'detective';
    broadcastGameState(game);
  });

  socket.on('submitDetectiveCheck', ({ roomCode, targetId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'night_action') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player || player.role !== 'detective' || !player.isAlive) return;

    const target = game.players.find(p => p.id === targetId);
    game.nightActions.detectiveCheckTarget = targetId;
    game.nightActions.detectiveCheckResult = target?.role === 'mafia' || target?.role === 'don';
    broadcastGameState(game);
  });

  socket.on('submitDoctorHeal', ({ roomCode, targetId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || game.phase !== 'night_action') return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player || player.role !== 'doctor' || !player.isAlive) return;

    const target = game.players.find(p => p.id === targetId);
    if (target && target.healedRounds.length === 0) {
      game.nightActions.doctorTarget = targetId;
    }
    broadcastGameState(game);
  });

  socket.on('submitSerialAction', ({ roomCode, targetId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game || (game.phase !== 'night_action' && game.phase !== 'night_1_intro')) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player || player.role !== 'serial_killer' || !player.isAlive) return;

    if (targetId === 'skip') {
      game.nightActions.serialKillerTarget = 'skip';
    } else if (game.nightActions.serialKillsUsed < 2) {
      game.nightActions.serialKillerTarget = targetId;
    }
    broadcastGameState(game);
  });

  // 11. Resolve Night
  socket.on('resolveNight', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    const deadThisNight = new Set();
    const mafiaTarget = game.nightActions.mafiaTarget;
    const doctorTarget = game.nightActions.doctorTarget;
    const serialTarget = game.nightActions.serialKillerTarget;

    if (doctorTarget) {
      const healedPlayer = game.players.find(p => p.id === doctorTarget);
      if (healedPlayer && healedPlayer.healedRounds.length === 0) {
        healedPlayer.healedRounds.push(game.roundNumber);
      }
    }

    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      deadThisNight.add(mafiaTarget);
      const p = game.players.find(pl => pl.id === mafiaTarget);
      if (p) {
        p.eliminatedBy = 'night_mafia';
        p.eliminatedRound = game.roundNumber;
      }
    }

    if (serialTarget && serialTarget !== 'skip' && serialTarget !== doctorTarget) {
      deadThisNight.add(serialTarget);
      game.nightActions.serialKillsUsed += 1;
      const p = game.players.find(pl => pl.id === serialTarget);
      if (p) {
        p.eliminatedBy = 'night_serial';
        p.eliminatedRound = game.roundNumber;
      }
    }

    deadThisNight.forEach(deadId => {
      const deadP = game.players.find(p => p.id === deadId);
      if (deadP) deadP.isAlive = false;
    });

    game.lastNightDeaths = Array.from(deadThisNight);
    game.phase = 'day_discussion';

    const alivePlayers = game.players.filter(p => p.isAlive);
    if (game.firstSpeakerId) {
      const allPlayers = game.players;
      const lastIndex = allPlayers.findIndex(p => p.id === game.firstSpeakerId);
      let nextFirst = null;
      for (let i = 1; i <= allPlayers.length; i++) {
        const candidate = allPlayers[(lastIndex + i) % allPlayers.length];
        if (candidate.isAlive) {
          nextFirst = candidate;
          break;
        }
      }
      game.firstSpeakerId = nextFirst ? nextFirst.id : (alivePlayers[0]?.id || null);
    } else {
      game.firstSpeakerId = alivePlayers[0]?.id || null;
    }
    game.currentSpeakerId = game.firstSpeakerId;
    game.speakerTimeLeft = game.config.daySpeechSeconds;
    game.isSpeakerTimerRunning = false;

    game.voting = {
      nominatedPlayers: [],
      currentDefenseIndex: 0,
      defenseTimeLeft: game.config.defenseSpeechSeconds,
      isDefenseActive: false,
      votes: {},
      tiedCandidates: [],
      isTieResolution: false,
      isBothEliminateQuestion: false
    };

    const winResult = checkWinCondition(game);
    if (winResult) {
      game.phase = 'game_over';
      game.winner = winResult.winner;
      game.winnerReason = winResult.reason;
    }

    broadcastGameState(game);

    io.to(player.socketId || player.id).emit('playAudioCue', { 
      cue: 'wake_city', 
      deathsCount: game.lastNightDeaths.length 
    });
  });

  // 12. Day Nominations & Voting
  socket.on('toggleNomination', ({ roomCode, candidateId, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    const list = game.voting.nominatedPlayers;
    const idx = list.indexOf(candidateId);
    if (idx === -1) {
      list.push(candidateId);
    } else {
      list.splice(idx, 1);
    }
    broadcastGameState(game);
  });

  socket.on('startDefensePhase', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    if (game.voting.nominatedPlayers.length === 0) return;

    game.phase = 'day_defense';
    game.voting.currentDefenseIndex = 0;
    game.voting.defenseTimeLeft = game.config.defenseSpeechSeconds;
    game.voting.isDefenseActive = true;

    broadcastGameState(game);
  });

  socket.on('nextDefenseSpeaker', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    const candidates = game.voting.isTieResolution ? game.voting.tiedCandidates : game.voting.nominatedPlayers;
    if (game.voting.currentDefenseIndex < candidates.length - 1) {
      game.voting.currentDefenseIndex += 1;
      game.voting.defenseTimeLeft = game.config.defenseSpeechSeconds;
    } else {
      game.phase = 'day_voting';
      game.voting.isDefenseActive = false;
    }
    broadcastGameState(game);
  });

  socket.on('submitVotesTally', ({ roomCode, votes, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.voting.votes = votes;
    broadcastGameState(game);
  });

  socket.on('resolveVoteOutcome', ({ roomCode, action, candidateId, tiedCandidates, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    if (action === 'eliminate_single' && candidateId) {
      const target = game.players.find(p => p.id === candidateId);
      if (target) {
        target.isAlive = false;
        target.eliminatedBy = 'day_vote';
        target.eliminatedRound = game.roundNumber;
      }
    } else if (action === 'eliminate_both' && tiedCandidates?.length) {
      tiedCandidates.forEach(cid => {
        const target = game.players.find(p => p.id === cid);
        if (target) {
          target.isAlive = false;
          target.eliminatedBy = 'tie_vote';
          target.eliminatedRound = game.roundNumber;
        }
      });
    } else if (action === 'start_tie_defense' && tiedCandidates?.length) {
      game.voting.isTieResolution = true;
      game.voting.tiedCandidates = tiedCandidates;
      game.voting.currentDefenseIndex = 0;
      game.voting.defenseTimeLeft = game.config.defenseSpeechSeconds;
      game.phase = 'day_defense';
      broadcastGameState(game);
      return;
    } else if (action === 'ask_eliminate_both') {
      game.voting.isBothEliminateQuestion = true;
      broadcastGameState(game);
      return;
    }

    const win = checkWinCondition(game);
    if (win) {
      game.phase = 'game_over';
      game.winner = win.winner;
      game.winnerReason = win.reason;
    } else {
      game.phase = 'day_discussion';
    }

    broadcastGameState(game);
  });

  // 13. Restart Game
  socket.on('restartGame', ({ roomCode, playerId }) => {
    const game = updatePlayerSocket(roomCode, playerId);
    if (!game) return;
    const player = game.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player?.isHost) return;

    game.phase = 'lobby';
    game.roundNumber = 0;
    game.winner = null;
    game.winnerReason = null;
    game.lastNightDeaths = [];
    game.players.forEach(p => {
      p.isAlive = true;
      p.role = 'citizen';
      p.eliminatedBy = undefined;
      p.eliminatedRound = undefined;
      p.healedRounds = [];
    });

    broadcastGameState(game);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production' || true) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mafia Moderator Server running on http://localhost:${PORT}`);
});
