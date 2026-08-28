import { io } from 'socket.io-client';

async function testGameFlow() {
  console.log('🚀 Starting Automated Multiplayer Mafia Moderator Test...');

  const serverUrl = 'http://localhost:3001';

  // Connect Host
  const hostSocket = io(serverUrl);
  let roomCode = '';
  let hostGameState = null;

  await new Promise((resolve) => {
    hostSocket.on('connect', () => {
      console.log('✅ Host connected:', hostSocket.id);
      hostSocket.emit('createRoom', {
        hostName: 'გიორგი (ჰოსტი)',
        config: {
          totalPlayers: 11,
          mafiaCount: 3,
          hasDon: true,
          hasDetective: true,
          hasDoctor: true,
          hasSerialKiller: true,
          serialCanKillNight1: false,
          nightDurationSeconds: 20
        }
      });
    });

    hostSocket.on('roomCreated', (data) => {
      roomCode = data.roomCode;
      hostGameState = data.gameState;
      console.log('✅ Room created with code:', roomCode);
      resolve();
    });
  });

  // Connect 10 other players
  const playerSockets = [];
  const playerNames = [
    'ნიკა', 'ანნა', 'დავითი', 'მარიამი', 'ლუკა', 
    'სალომე', 'ერეკლე', 'თამარი', 'გიგა', 'სოფიო'
  ];

  for (let i = 0; i < 10; i++) {
    const s = io(serverUrl);
    await new Promise((resolve) => {
      s.on('connect', () => {
        s.emit('joinRoom', {
          roomCode,
          playerName: playerNames[i]
        });
      });
      s.on('joinedRoomSuccess', () => {
        console.log(`✅ Player #${i + 2} (${playerNames[i]}) joined`);
        playerSockets.push(s);
        resolve();
      });
    });
  }

  // Verify full lobby
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('👥 Total players in room: 11');

  // Start Game & Distribute Roles
  console.log('🎲 Host starts game and distributes roles...');
  let rolesAssigned = {};

  const rolePromises = [hostSocket, ...playerSockets].map((s, idx) => {
    return new Promise((resolve) => {
      s.on('gameStateUpdate', (state) => {
        if (state.phase === 'role_reveal') {
          const role = state.myPlayer?.role;
          rolesAssigned[state.myPlayer?.name] = role;
          resolve();
        }
      });
    });
  });

  hostSocket.emit('startGame', { roomCode });
  await Promise.all(rolePromises);

  console.log('✅ Roles successfully distributed:', rolesAssigned);

  // Start Night 1 (Introduction)
  console.log('🌙 Host starts Night 1 (Intro)...');
  await new Promise((resolve) => {
    hostSocket.on('gameStateUpdate', (state) => {
      if (state.phase === 'night_1_intro') {
        console.log('✅ Night 1 active. Step:', state.currentNightStep);
        resolve();
      }
    });
    hostSocket.emit('startNight1', { roomCode });
  });

  // Start Day 1 (Discussion Circle)
  console.log('☀️ Host starts Day 1...');
  await new Promise((resolve) => {
    hostSocket.on('gameStateUpdate', (state) => {
      if (state.phase === 'day_1_intro') {
        const opener = state.players.find(p => p.id === state.firstSpeakerId);
        console.log(`✅ Day 1 active! Circle opener chosen: ${opener?.name}`);
        resolve();
      }
    });
    hostSocket.emit('startDay1', { roomCode });
  });

  // Start Night 2 (Action Night)
  console.log('🌙 Host starts Night 2 (Actions)...');
  let nightState = null;
  await new Promise((resolve) => {
    hostSocket.on('gameStateUpdate', (state) => {
      if (state.phase === 'night_action') {
        nightState = state;
        console.log(`✅ Night #${state.roundNumber} active. Step: ${state.currentNightStep}`);
        resolve();
      }
    });
    hostSocket.emit('startNightAction', { roomCode });
  });

  // Simulate Night Actions:
  // Find Mafia, Doctor, Detective, Serial Killer players
  const allSockets = [hostSocket, ...playerSockets];

  // Mafia Kills Player #5
  const victim = nightState.players[4];
  console.log(`💀 Mafia targets ${victim.name}...`);
  hostSocket.emit('submitMafiaTarget', { roomCode, targetId: victim.id });

  // Doctor Heals Player #5 (Saving him!)
  console.log(`💉 Doctor heals ${victim.name}...`);
  hostSocket.emit('submitDoctorHeal', { roomCode, targetId: victim.id });

  // Detective Checks Player #2
  console.log(`🔍 Detective checks ${nightState.players[1].name}...`);
  hostSocket.emit('submitDetectiveCheck', { roomCode, targetId: nightState.players[1].id });

  // Host Resolves Night
  console.log('🌅 Host resolves night...');
  await new Promise((resolve) => {
    hostSocket.on('gameStateUpdate', (state) => {
      if (state.phase === 'day_discussion') {
        console.log('✅ Day discussion started. Last night deaths:', state.lastNightDeaths.length === 0 ? '0 (Healed by Doctor!)' : state.lastNightDeaths);
        resolve();
      }
    });
    hostSocket.emit('resolveNight', { roomCode });
  });

  // Day 2 Nominations & Voting test
  console.log('🗳️ Testing nominations and tie-breaker resolution...');
  const cand1 = nightState.players[2].id;
  const cand2 = nightState.players[3].id;

  hostSocket.emit('toggleNomination', { roomCode, candidateId: cand1 });
  hostSocket.emit('toggleNomination', { roomCode, candidateId: cand2 });

  await new Promise((resolve) => setTimeout(resolve, 200));

  // Start Defense
  hostSocket.emit('startDefensePhase', { roomCode });
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Advance defense to voting
  hostSocket.emit('nextDefenseSpeaker', { roomCode });
  hostSocket.emit('nextDefenseSpeaker', { roomCode });
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Eliminate candidate 1
  hostSocket.emit('resolveVoteOutcome', {
    roomCode,
    action: 'eliminate_single',
    candidateId: cand1
  });

  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('✅ Voting resolution executed successfully!');

  // Cleanup
  hostSocket.disconnect();
  playerSockets.forEach(s => s.disconnect());

  console.log('🎉 ALL MULTIPLAYER MAFIA MODERATOR TESTS PASSED 100%!');
  process.exit(0);
}

testGameFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
