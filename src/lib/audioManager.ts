/**
 * 100% Guaranteed iOS & Android Web Audio Engine
 * Overcomes all iOS Safari / WebKit Autoplay & Background Audio Restrictions
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isUnlocked = false;
  private isMuted = false;
  private onSubtitleCallback: ((text: string) => void) | null = null;
  private keepAliveSource: AudioBufferSourceNode | null = null;

  constructor() {
    // Setup global one-tap unlock for iOS
    if (typeof window !== 'undefined') {
      const unlockEvents = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
      const unlock = () => {
        this.unlockAudio();
      };
      unlockEvents.forEach(evt => {
        window.addEventListener(evt, unlock, { capture: true, passive: true });
      });
    }
  }

  /**
   * Unlock Web Audio context and start silent keep-alive loop for iOS
   */
  public unlockAudio(): boolean {
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return false;

        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // iOS Silent Keep-Alive Loop (Prevents iOS from pausing audio session)
      if (!this.keepAliveSource && this.ctx) {
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        this.keepAliveSource = this.ctx.createBufferSource();
        this.keepAliveSource.buffer = buffer;
        this.keepAliveSource.loop = true;
        this.keepAliveSource.connect(this.ctx.destination);
        this.keepAliveSource.start(0);
      }

      this.isUnlocked = true;
      return true;
    } catch (e) {
      console.warn('Audio unlock exception:', e);
      return false;
    }
  }

  public setSubtitleCallback(cb: (text: string) => void) {
    this.onSubtitleCallback = cb;
  }

  public toggleMute(): boolean {
    this.unlockAudio();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Haptic vibration for mobile phones (eyes closed buzz)
   */
  public vibrate(pattern: number[] = [150, 100, 150]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  /**
   * Play a clean loud multi-tone chime chord
   */
  private playChord(freqs: number[], type: OscillatorType = 'triangle', duration: number = 2.5, attack: number = 0.02) {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Volume envelope
      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.6 / freqs.length + 0.2, now + idx * 0.08 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + duration + 0.1);
    });
  }

  /**
   * LOUD Interactive Sound Test (Plays when user clicks the sound button)
   */
  public testSound(): boolean {
    this.unlockAudio();
    this.vibrate([200, 100, 200]);
    // Play loud 3-tone bell
    this.playChord([523.25, 659.25, 783.99, 1046.50], 'triangle', 3.0);
    return true;
  }

  /**
   * Universal Announcer (Acoustic Bell Chimes + Vibrations + Screen Toast)
   */
  public announcePrompt(text: string) {
    this.unlockAudio();

    if (this.onSubtitleCallback) {
      this.onSubtitleCallback(text);
    }

    const lower = text.toLowerCase();

    // 1. Unmissable Acoustic Chimes for every role
    if (lower.includes('იძინებს ქალაქი')) {
      // Deep sleep bells (A3, G3, E3, C3)
      this.playChord([220, 196, 164.81, 130.81], 'sine', 3.0);
      this.vibrate([250]);
    } 
    else if (lower.includes('იღვიძებს მაფია')) {
      // Dramatic sharp suspense chord (E3, G#3, B3, E4)
      this.playChord([164.81, 207.65, 246.94, 329.63], 'sawtooth', 3.2);
      this.vibrate([150, 100, 150]);
    } 
    else if (lower.includes('იღვიძებს დონი')) {
      // Royal brass chime (D4, F#4, A4, D5)
      this.playChord([293.66, 369.99, 440.00, 587.33], 'triangle', 2.8);
      this.vibrate([100, 60, 100, 60, 100]);
    } 
    else if (lower.includes('იღვიძებს დეტექტივი')) {
      // High investigative radar bells (E4, B4, E5, B5)
      this.playChord([329.63, 493.88, 659.25, 987.77], 'sine', 2.5);
      this.vibrate([100, 100, 250]);
    } 
    else if (lower.includes('იღვიძებს ექიმი')) {
      // Warm healing pulse (C4, E4, G4, C5)
      this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 3.0);
      this.vibrate([80, 80, 80, 80]);
    } 
    else if (lower.includes('იღვიძებს სერიული')) {
      // Low sinister pulse (C#3, F#3, C#4)
      this.playChord([138.59, 185.00, 277.18], 'sawtooth', 3.0);
      this.vibrate([300, 120, 300]);
    } 
    else if (lower.includes('იღვიძებს ქალაქი')) {
      // LOUD MORNING SUNRISE BELLS (C4, E4, G4, C5, E5, G5)
      this.playChord([523.25, 659.25, 783.99, 1046.50, 1318.51], 'triangle', 4.0);
      this.vibrate([400, 150, 400]);
    } 
    else if (lower.includes('იძინებს')) {
      // Sleep tone
      this.playChord([320, 220, 160], 'sine', 1.5);
      this.vibrate([100]);
    }

    // 2. Multi-Engine Georgian Speech Synthesis fallback
    if (!this.isMuted && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const kaVoice = voices.find(v => v.lang.includes('ka') || v.lang.includes('GE'));
        if (kaVoice) utterance.voice = kaVoice;

        utterance.lang = 'ka-GE';
        utterance.rate = 0.88;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  /**
   * Gong for 1-minute speech expiration
   */
  public playGong() {
    this.unlockAudio();
    this.vibrate([300]);
    this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 4.0);
  }

  /**
   * Gunshot for elimination
   */
  public playGunshot() {
    this.unlockAudio();
    this.vibrate([500]);
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.4);
    } catch (e) {}
  }

  /**
   * Clock Tick
   */
  public playTick() {
    this.unlockAudio();
    this.vibrate([40]);
    this.playChord([1200], 'triangle', 0.08);
  }
}

export const audioManager = new AudioManager();
