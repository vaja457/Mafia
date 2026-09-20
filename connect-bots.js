import { io } from 'socket.io-client';

const serverUrl = 'https://mafia-mfr1.onrender.com';
const roomCode = process.argv[2] || 'ZXTGE3';
const botCount = parseInt(process.argv[3]) || 2;

const allBotNames = [
  'სალომე 🌸',
  'ერეკლე ⚔️',
  'თამარი 👑',
  'გიგა 🎯',
  'სოფიო 🌙',
  'ლუკა 🎲',
  'დავითი 🛡️'
];

const botNames = allBotNames.slice(0, botCount);

console.log(`🤖 Connecting ${botNames.length} test players to room ${roomCode} at ${serverUrl}...`);

const bots = [];
const actedSteps = new Map(); // botIndex -> Set of "round_step"

botNames.forEach((name, index) => {
  actedSteps.set(index, new Set());

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

    socket.on('joinedRoomSuccess', () => {
      console.log(`🎉 [${name}] Joined room ${roomCode} successfully!`);
    });

    socket.on('gameStateUpdate', (gameState) => {
      const myPlayer = gameState.myPlayer;
      if (!myPlayer) return;

      const stepKey = `${gameState.roundNumber}_${gameState.currentNightStep}`;
      const botActed = actedSteps.get(index);

      // Auto-respond once per night step
      if (gameState.phase === 'night_action' && myPlayer.isAlive && !botActed?.has(stepKey)) {
        const aliveOthers = gameState.players.filter(p => p.isAlive && p.id !== myPlayer.id);
        const randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];

        if (gameState.currentNightStep === 'mafia_kill' && (myPlayer.role === 'mafia' || myPlayer.role === 'don')) {
          if (randomTarget) {
            botActed?.add(stepKey);
            setTimeout(() => {
              console.log(`💀 [${name} (Mafia)] Target chosen: ${randomTarget.name}`);
              socket.emit('submitMafiaTarget', { roomCode, targetId: randomTarget.id, playerId });
            }, 1200);
          }
        } else if (gameState.currentNightStep === 'doctor_heal' && myPlayer.role === 'doctor') {
          const healable = gameState.players.filter(p => p.isAlive && (!p.healedCount || p.healedCount === 0));
          const target = healable[Math.floor(Math.random() * healable.length)];
          if (target) {
            botActed?.add(stepKey);
            setTimeout(() => {
              console.log(`💉 [${name} (Doctor)] Healed: ${target.name}`);
              socket.emit('submitDoctorHeal', { roomCode, targetId: target.id, playerId });
            }, 1000);
          }
        } else if (gameState.currentNightStep === 'detective_check' && myPlayer.role === 'detective') {
          if (randomTarget) {
            botActed?.add(stepKey);
            setTimeout(() => {
              console.log(`🔍 [${name} (Detective)] Checked: ${randomTarget.name}`);
              socket.emit('submitDetectiveCheck', { roomCode, targetId: randomTarget.id, playerId });
            }, 1000);
          }
        } else if (gameState.currentNightStep === 'serial_kill' && myPlayer.role === 'serial_killer') {
          if (randomTarget) {
            botActed?.add(stepKey);
            setTimeout(() => {
              console.log(`🩸 [${name} (Serial)] Targeted: ${randomTarget.name}`);
              socket.emit('submitSerialAction', { roomCode, targetId: randomTarget.id, playerId });
            }, 1000);
          }
        }
      }
    });

    bots.push(socket);
  }, index * 350);
});

process.stdin.resume();
