import { io, Socket } from 'socket.io-client';
import { GameState, RoomConfig } from '../types/game';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private playerId: string;

  constructor() {
    // Generate or load permanent player ID for this browser session
    let savedId = '';
    try {
      savedId = localStorage.getItem('mafia_playerId') || '';
      if (!savedId) {
        savedId = 'p_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('mafia_playerId', savedId);
      }
    } catch (e) {
      savedId = 'p_' + Math.random().toString(36).substring(2, 10);
    }
    this.playerId = savedId;
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public connect(): Socket {
    if (!this.socket) {
      const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : window.location.origin;

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to Mafia server with socket ID:', this.socket?.id);
        this.emitLocal('connectionStatus', true);

        // Auto-reconnect session if room exists in storage
        try {
          const savedRoom = localStorage.getItem('mafia_roomCode');
          const savedName = localStorage.getItem('mafia_playerName');
          if (savedRoom) {
            this.socket?.emit('reconnectSession', {
              roomCode: savedRoom,
              playerId: this.playerId,
              playerName: savedName
            });
          }
        } catch (e) {}
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from Mafia server');
        this.emitLocal('connectionStatus', false);
      });

      this.socket.on('gameStateUpdate', (gameState: GameState) => {
        this.emitLocal('gameStateUpdate', gameState);
      });

      this.socket.on('roomCreated', (data: any) => {
        if (data?.roomCode) {
          try {
            localStorage.setItem('mafia_roomCode', data.roomCode);
          } catch (e) {}
        }
        if (data?.gameState) {
          this.emitLocal('gameStateUpdate', data.gameState);
        }
      });

      this.socket.on('joinedRoomSuccess', (data: any) => {
        if (data?.roomCode) {
          try {
            localStorage.setItem('mafia_roomCode', data.roomCode);
          } catch (e) {}
        }
      });

      this.socket.on('errorMsg', (msg: string) => {
        this.emitLocal('errorMsg', msg);
      });

      this.socket.on('playAudioSequence', (data: any) => {
        this.emitLocal('playAudioSequence', data);
      });

      this.socket.on('playAudioCue', (data: any) => {
        this.emitLocal('playAudioCue', data);
      });
    }
    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  public off(event: string, callback: Function) {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(cb => cb !== callback));
    }
  }

  private emitLocal(event: string, data: any) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => cb(data));
    }
  }

  // Clear session to leave room
  public leaveRoom(onLeft?: () => void) {
    try {
      const currentRoom = localStorage.getItem('mafia_roomCode');
      if (currentRoom) {
        this.socket?.emit('leaveRoom', { roomCode: currentRoom, playerId: this.playerId });
      }
      localStorage.removeItem('mafia_roomCode');
      localStorage.removeItem('mafia_playerName');
    } catch (e) {}

    // Clear URL params
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {}

    this.emitLocal('gameStateUpdate', null);

    if (onLeft) {
      onLeft();
    }
  }

  // Game actions with persistent playerId
  public createRoom(hostName: string, config: Partial<RoomConfig>) {
    try {
      localStorage.setItem('mafia_playerName', hostName);
    } catch (e) {}
    this.socket?.emit('createRoom', { 
      hostName, 
      hostId: this.playerId,
      config 
    });
  }

  public joinRoom(roomCode: string, playerName: string) {
    try {
      localStorage.setItem('mafia_roomCode', roomCode);
      localStorage.setItem('mafia_playerName', playerName);
    } catch (e) {}
    this.socket?.emit('joinRoom', { 
      roomCode, 
      playerName, 
      playerId: this.playerId 
    });
  }

  public updateConfig(roomCode: string, config: Partial<RoomConfig>) {
    this.socket?.emit('updateConfig', { roomCode, config, playerId: this.playerId });
  }

  public startGame(roomCode: string) {
    this.socket?.emit('startGame', { roomCode, playerId: this.playerId });
  }

  public startNight1(roomCode: string) {
    this.socket?.emit('startNight1', { roomCode, playerId: this.playerId });
  }

  public startDay1(roomCode: string) {
    this.socket?.emit('startDay1', { roomCode, playerId: this.playerId });
  }

  public controlSpeakerTimer(roomCode: string, action: 'start' | 'pause' | 'next') {
    this.socket?.emit('controlSpeakerTimer', { roomCode, action, playerId: this.playerId });
  }

  public speakerTimerTick(roomCode: string, timeLeft: number) {
    this.socket?.emit('speakerTimerTick', { roomCode, timeLeft, playerId: this.playerId });
  }

  public startNightAction(roomCode: string) {
    this.socket?.emit('startNightAction', { roomCode, playerId: this.playerId });
  }

  public setNightStep(roomCode: string, step: string) {
    this.socket?.emit('setNightStep', { roomCode, step, playerId: this.playerId });
  }

  public submitMafiaTarget(roomCode: string, targetId: string) {
    this.socket?.emit('submitMafiaTarget', { roomCode, targetId, playerId: this.playerId });
  }

  public submitDonCheck(roomCode: string, targetId: string) {
    this.socket?.emit('submitDonCheck', { roomCode, targetId, playerId: this.playerId });
  }

  public submitDetectiveCheck(roomCode: string, targetId: string) {
    this.socket?.emit('submitDetectiveCheck', { roomCode, targetId, playerId: this.playerId });
  }

  public submitDoctorHeal(roomCode: string, targetId: string) {
    this.socket?.emit('submitDoctorHeal', { roomCode, targetId, playerId: this.playerId });
  }

  public submitSerialAction(roomCode: string, targetId: string) {
    this.socket?.emit('submitSerialAction', { roomCode, targetId, playerId: this.playerId });
  }

  public resolveNight(roomCode: string) {
    this.socket?.emit('resolveNight', { roomCode, playerId: this.playerId });
  }

  public toggleNomination(roomCode: string, candidateId: string) {
    this.socket?.emit('toggleNomination', { roomCode, candidateId, playerId: this.playerId });
  }

  public startDefensePhase(roomCode: string) {
    this.socket?.emit('startDefensePhase', { roomCode, playerId: this.playerId });
  }

  public nextDefenseSpeaker(roomCode: string) {
    this.socket?.emit('nextDefenseSpeaker', { roomCode, playerId: this.playerId });
  }

  public submitVotesTally(roomCode: string, votes: Record<string, number>) {
    this.socket?.emit('submitVotesTally', { roomCode, votes, playerId: this.playerId });
  }

  public resolveVoteOutcome(roomCode: string, action: string, candidateId?: string, tiedCandidates?: string[]) {
    this.socket?.emit('resolveVoteOutcome', { roomCode, action, candidateId, tiedCandidates, playerId: this.playerId });
  }

  public restartGame(roomCode: string) {
    this.socket?.emit('restartGame', { roomCode, playerId: this.playerId });
  }
}

export const socketClient = new SocketService();
