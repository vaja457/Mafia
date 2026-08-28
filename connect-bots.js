import { io } from 'socket.io-client';

const serverUrl = 'https://mafia-mfr1.onrender.com';
const roomCode = 'D3CDS7';

const botNames = [
  'სალომე 🌸',
  'ერეკლე ⚔️',
  'თამარი 👑',
  'გიგა 🎯',
  'სოფიო 🌙',
  'ლუკა 🎲',
  'დავითი 🛡️'
];

console.log(`🤖 Connecting ${botNames.length} test players to room ${roomCode} at ${serverUrl}...`);

const bots = [];

botNames.forEach((name, index) => {
  setTimeout(() => {
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    const playerId = `bot_${index}_${Math.random().toString(36).substring(2, 7)}`;

    socket.on('connect', () => {
      console.log(`✅ [${name}] Socket connected (${socket.id}). Joining room...`);
      socket.emit('joinRoom', {
        roomCode,
        playerName: name,
        playerId
      });
    });

    socket.on('joinedRoomSuccess', (data) => {
      console.log(`🎉 [${name}] Joined room ${roomCode} successfully!`);
    });

    socket.on('gameStateUpdate', (gameState) => {
      const myPlayer = gameState.myPlayer;
      if (!myPlayer) return;

      console.log(`📡 [${name}] Game Phase: ${gameState.phase}, Role: ${myPlayer.role}, Alive: ${myPlayer.isAlive}`);

      // Auto-respond during Night if this bot is an active role
      if (gameState.phase === 'night_action' && myPlayer.isAlive) {
        const aliveOthers = gameState.players.filter(p => p.isAlive && p.id !== myPlayer.id);
        const randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];

        if (gameState.currentNightStep === 'mafia_kill' && (myPlayer.role === 'mafia' || myPlayer.role === 'don')) {
          if (randomTarget) {
            console.log(`💀 [${name} (Mafia)] Selecting target: ${randomTarget.name}`);
            socket.emit('submitMafiaTarget', { roomCode, targetId: randomTarget.id, playerId });
          }
        } else if (gameState.currentNightStep === 'doctor_heal' && myPlayer.role === 'doctor') {
          const healable = gameState.players.filter(p => p.isAlive && (!p.healedCount || p.healedCount === 0));
          const target = healable[Math.floor(Math.random() * healable.length)];
          if (target) {
            console.log(`💉 [${name} (Doctor)] Healing: ${target.name}`);
            socket.emit('submitDoctorHeal', { roomCode, targetId: target.id, playerId });
          }
        } else if (gameState.currentNightStep === 'detective_check' && myPlayer.role === 'detective') {
          if (randomTarget) {
            console.log(`🔍 [${name} (Detective)] Checking: ${randomTarget.name}`);
            socket.emit('submitDetectiveCheck', { roomCode, targetId: randomTarget.id, playerId });
          }
        } else if (gameState.currentNightStep === 'serial_kill' && myPlayer.role === 'serial_killer') {
          if (randomTarget) {
            console.log(`🩸 [${name} (Serial)] Targeting: ${randomTarget.name}`);
            socket.emit('submitSerialAction', { roomCode, targetId: randomTarget.id, playerId });
          }
        }
      }
    });

    socket.on('errorMsg', (msg) => {
      console.warn(`⚠️ [${name}] Error: ${msg}`);
    });

    bots.push(socket);
  }, index * 400);
});

// Keep process running
process.stdin.resume();
