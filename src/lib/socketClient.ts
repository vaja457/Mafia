import { io, Socket } from 'socket.io-client';
import { GameState, RoomConfig } from '../types/game';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  public connect(): Socket {
    if (!this.socket) {
      // In dev, Vite proxies /socket.io to backend or we connect directly
      const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : window.location.origin;

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to Mafia server with ID:', this.socket?.id);
        this.emitLocal('connectionStatus', true);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from Mafia server');
        this.emitLocal('connectionStatus', false);
      });

      this.socket.on('gameStateUpdate', (gameState: GameState) => {
        this.emitLocal('gameStateUpdate', gameState);
      });

      this.socket.on('roomCreated', (data: any) => {
        if (data?.gameState) {
          this.emitLocal('gameStateUpdate', data.gameState);
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

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Event subscription
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

  // Game actions
  public createRoom(hostName: string, config: Partial<RoomConfig>) {
    this.socket?.emit('createRoom', { hostName, config });
  }

  public joinRoom(roomCode: string, playerName: string) {
    this.socket?.emit('joinRoom', { roomCode, playerName });
  }

  public updateConfig(roomCode: string, config: Partial<RoomConfig>) {
    this.socket?.emit('updateConfig', { roomCode, config });
  }

  public startGame(roomCode: string) {
    this.socket?.emit('startGame', { roomCode });
  }

  public startNight1(roomCode: string) {
    this.socket?.emit('startNight1', { roomCode });
  }

  public startDay1(roomCode: string) {
    this.socket?.emit('startDay1', { roomCode });
  }

  public controlSpeakerTimer(roomCode: string, action: 'start' | 'pause' | 'next') {
    this.socket?.emit('controlSpeakerTimer', { roomCode, action });
  }

  public speakerTimerTick(roomCode: string, timeLeft: number) {
    this.socket?.emit('speakerTimerTick', { roomCode, timeLeft });
  }

  public startNightAction(roomCode: string) {
    this.socket?.emit('startNightAction', { roomCode });
  }

  public setNightStep(roomCode: string, step: string) {
    this.socket?.emit('setNightStep', { roomCode, step });
  }

  public submitMafiaTarget(roomCode: string, targetId: string) {
    this.socket?.emit('submitMafiaTarget', { roomCode, targetId });
  }

  public submitDonCheck(roomCode: string, targetId: string) {
    this.socket?.emit('submitDonCheck', { roomCode, targetId });
  }

  public submitDetectiveCheck(roomCode: string, targetId: string) {
    this.socket?.emit('submitDetectiveCheck', { roomCode, targetId });
  }

  public submitDoctorHeal(roomCode: string, targetId: string) {
    this.socket?.emit('submitDoctorHeal', { roomCode, targetId });
  }

  public submitSerialAction(roomCode: string, targetId: string) {
    this.socket?.emit('submitSerialAction', { roomCode, targetId });
  }

  public resolveNight(roomCode: string) {
    this.socket?.emit('resolveNight', { roomCode });
  }

  public toggleNomination(roomCode: string, candidateId: string) {
    this.socket?.emit('toggleNomination', { roomCode, candidateId });
  }

  public startDefensePhase(roomCode: string) {
    this.socket?.emit('startDefensePhase', { roomCode });
  }

  public nextDefenseSpeaker(roomCode: string) {
    this.socket?.emit('nextDefenseSpeaker', { roomCode });
  }

  public submitVotesTally(roomCode: string, votes: Record<string, number>) {
    this.socket?.emit('submitVotesTally', { roomCode, votes });
  }

  public resolveVoteOutcome(roomCode: string, action: string, candidateId?: string, tiedCandidates?: string[]) {
    this.socket?.emit('resolveVoteOutcome', { roomCode, action, candidateId, tiedCandidates });
  }

  public restartGame(roomCode: string) {
    this.socket?.emit('restartGame', { roomCode });
  }
}

export const socketClient = new SocketService();
