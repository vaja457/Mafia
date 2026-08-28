/**
 * 100% Guaranteed Web Audio Engine for Mafia Moderator
 * Includes all audio functions: chimes, speech, ambient music, and sound tests.
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isUnlocked = false;
  private isMuted = false;
  private isMusicPlaying = false;
  private musicOscillators: any[] = [];
  private onSubtitleCallback: ((text: string) => void) | null = null;
  private keepAliveSource: AudioBufferSourceNode | null = null;

  constructor() {
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
        this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (!this.keepAliveSource && this.ctx) {
        try {
          const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
          this.keepAliveSource = this.ctx.createBufferSource();
          this.keepAliveSource.buffer = buffer;
          this.keepAliveSource.loop = true;
          this.keepAliveSource.connect(this.ctx.destination);
          this.keepAliveSource.start(0);
        } catch (e) {}
      }

      this.isUnlocked = true;
      return true;
    } catch (e) {
      console.warn('Audio unlock error:', e);
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

  public vibrate(pattern: number[] = [150, 100, 150]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  public startAmbientMusic() {
    try {
      this.unlockAudio();
      if (!this.ctx || !this.musicGain || this.isMusicPlaying || this.isMuted) return;

      this.stopAmbientMusic();
      this.isMusicPlaying = true;

      const now = this.ctx.currentTime;
      const baseFreqs = [55, 110, 164.81, 220]; // A Minor chord

      baseFreqs.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300 + i * 40, now);

        gain.gain.setValueAtTime(0.05 / (i + 1), now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start();
        this.musicOscillators.push(osc, gain, filter);
      });
    } catch (e) {}
  }

  public stopAmbientMusic() {
    try {
      this.musicOscillators.forEach(node => {
        try {
          if ('stop' in node) node.stop();
          node.disconnect();
        } catch (e) {}
      });
      this.musicOscillators = [];
      this.isMusicPlaying = false;
    } catch (e) {}
  }

  public playChord(freqs: number[], type: OscillatorType = 'triangle', duration: number = 2.5, attack: number = 0.02) {
    try {
      this.unlockAudio();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;

      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.6 / freqs.length + 0.2, now + idx * 0.08 + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + duration + 0.1);
      });
    } catch (e) {}
  }

  public testSound(): boolean {
    this.unlockAudio();
    this.vibrate([200, 100, 200]);
    this.playChord([523.25, 659.25, 783.99, 1046.50], 'triangle', 3.0);
    return true;
  }

  public playMorningChime() {
    this.playChord([523.25, 659.25, 783.99, 1046.50, 1318.51], 'triangle', 4.0);
  }

  public playDonWakeChime() {
    this.playChord([293.66, 369.99, 440.00, 587.33], 'triangle', 2.8);
  }

  public speak(text: string, onEnd?: () => void) {
    this.announcePrompt(text);
    if (onEnd) setTimeout(onEnd, 3000);
  }

  public announcePrompt(text: string) {
    try {
      this.unlockAudio();

      if (this.onSubtitleCallback) {
        this.onSubtitleCallback(text);
      }

      const lower = text.toLowerCase();

      if (lower.includes('იძინებს ქალაქი')) {
        this.playChord([220, 196, 164.81, 130.81], 'sine', 3.0);
        this.vibrate([250]);
      } 
      else if (lower.includes('იღვიძებს მაფია')) {
        this.playChord([164.81, 207.65, 246.94, 329.63], 'sawtooth', 3.2);
        this.vibrate([150, 100, 150]);
      } 
      else if (lower.includes('იღვიძებს დონი')) {
        this.playChord([293.66, 369.99, 440.00, 587.33], 'triangle', 2.8);
        this.vibrate([100, 60, 100, 60, 100]);
      } 
      else if (lower.includes('იღვიძებს დეტექტივი')) {
        this.playChord([329.63, 493.88, 659.25, 987.77], 'sine', 2.5);
        this.vibrate([100, 100, 250]);
      } 
      else if (lower.includes('იღვიძებს ექიმი')) {
        this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 3.0);
        this.vibrate([80, 80, 80, 80]);
      } 
      else if (lower.includes('იღვიძებს სერიული')) {
        this.playChord([138.59, 185.00, 277.18], 'sawtooth', 3.0);
        this.vibrate([300, 120, 300]);
      } 
      else if (lower.includes('იღვიძებს ქალაქი')) {
        this.playChord([523.25, 659.25, 783.99, 1046.50, 1318.51], 'triangle', 4.0);
        this.vibrate([400, 150, 400]);
      } 
      else if (lower.includes('იძინებს')) {
        this.playChord([320, 220, 160], 'sine', 1.5);
        this.vibrate([100]);
      }

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
    } catch (e) {}
  }

  public playGong() {
    this.unlockAudio();
    this.vibrate([300]);
    this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 4.0);
  }

  public playGunshot() {
    try {
      this.unlockAudio();
      this.vibrate([500]);
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

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

  public playTick() {
    this.unlockAudio();
    this.vibrate([40]);
    this.playChord([1200], 'triangle', 0.08);
  }
}

export const audioManager = new AudioManager();
