/**
 * Pure Acoustic Sound Signals Engine for Mafia Moderator
 * NO robotic speech synthesis - 100% Pure, Distinct, High-Quality Chimes, Bells & Vibrations
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
        this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
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
      const baseFreqs = [55, 110, 164.81, 220]; // A Minor subtle noir drone

      baseFreqs.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280 + i * 35, now);

        gain.gain.setValueAtTime(0.04 / (i + 1), now);

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

  /**
   * Play clean, musical, resonant chord
   */
  public playChord(freqs: number[], type: OscillatorType = 'triangle', duration: number = 2.8, stagger: number = 0.09) {
    try {
      this.unlockAudio();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;

      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + idx * stagger);

        gain.gain.setValueAtTime(0.0001, now + idx * stagger);
        gain.gain.linearRampToValueAtTime(0.65 / freqs.length + 0.25, now + idx * stagger + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * stagger + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * stagger);
        osc.stop(now + idx * stagger + duration + 0.1);
      });
    } catch (e) {}
  }

  // ================= DISTINCT ROLE SOUND SIGNALS =================

  /**
   * 🌙 ქალაქის დაძინება (Night falls / City sleeps)
   * Deep calm descending chimes
   */
  public playCitySleepChime() {
    this.vibrate([300]);
    this.playChord([261.63, 220.00, 174.61, 130.81], 'sine', 3.2, 0.14);
  }

  /**
   * 💀 მაფიის გაღვიძება (Mafia wakes up)
   * Dark dramatic minor suspense strike
   */
  public playMafiaWakeChime() {
    this.vibrate([180, 90, 180]);
    this.playChord([146.83, 174.61, 220.00, 293.66], 'sawtooth', 3.5, 0.08);
  }

  /**
   * 👑 დონის გაღვიძება (Don wakes up)
   * Regal 4-tone brassy bell chime
   */
  public playDonWakeChime() {
    this.vibrate([120, 60, 120, 60, 120]);
    this.playChord([293.66, 369.99, 440.00, 587.33], 'triangle', 3.0, 0.1);
  }

  /**
   * 🔍 დეტექტივის გაღვიძება (Detective wakes up)
   * High crystalline investigative radar chime
   */
  public playDetectiveWakeChime() {
    this.vibrate([100, 100, 300]);
    this.playChord([392.00, 523.25, 659.25, 783.99, 1046.50], 'sine', 2.8, 0.07);
  }

  /**
   * 💉 ექიმის გაღვიძება (Doctor wakes up)
   * Warm healing pulse harmony
   */
  public playDoctorWakeChime() {
    this.vibrate([80, 80, 80, 80]);
    this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 3.2, 0.12);
  }

  /**
   * 🩸 სერიული მკვლელის გაღვიძება (Serial Killer wakes up)
   * Low sinister dark tension pulse
   */
  public playSerialWakeChime() {
    this.vibrate([350, 120, 350]);
    this.playChord([130.81, 155.56, 185.00, 261.63], 'sawtooth', 3.5, 0.08);
  }

  /**
   * 😴 როლის დაძინება (Current role goes to sleep)
   * Quick 2-tone gentle downward fade
   */
  public playSleepTone() {
    this.vibrate([120]);
    this.playChord([440.00, 329.63, 220.00], 'sine', 1.4, 0.1);
  }

  /**
   * ☀️ დილის გათენება (Morning sunrise / City wakes up)
   * Loud bright festive church bells / sunrise fanfare
   */
  public playMorningSunriseChime() {
    this.vibrate([450, 150, 450]);
    this.playChord([523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], 'triangle', 4.5, 0.12);
  }

  /**
   * 🔔 1-წუთიანი სიტყვის ამოწურვის გონგი (Gong)
   */
  public playGong() {
    this.vibrate([400]);
    this.playChord([261.63, 329.63, 392.00, 523.25], 'triangle', 4.5, 0.02);
  }

  /**
   * 💥 გასროლის / გავარდნის ხმა (Gunshot / Elimination)
   */
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
    this.playChord([1200], 'triangle', 0.08, 0);
  }

  public testSound(): boolean {
    this.unlockAudio();
    this.playMorningSunriseChime();
    return true;
  }

  /**
   * Main Announce Dispatcher (Pure Sound Signals + Subtitle Banner)
   */
  public announcePrompt(text: string) {
    try {
      this.unlockAudio();

      if (this.onSubtitleCallback) {
        this.onSubtitleCallback(text);
      }

      const lower = text.toLowerCase();

      if (lower.includes('იღვიძებს მაფია')) {
        this.playMafiaWakeChime();
      } 
      else if (lower.includes('იღვიძებს დონი')) {
        this.playDonWakeChime();
      } 
      else if (lower.includes('იღვიძებს დეტექტივი')) {
        this.playDetectiveWakeChime();
      } 
      else if (lower.includes('იღვიძებს ექიმი')) {
        this.playDoctorWakeChime();
      } 
      else if (lower.includes('იღვიძებს სერიული')) {
        this.playSerialWakeChime();
      } 
      else if (lower.includes('იღვიძებს ქალაქი') || lower.includes('დილა')) {
        this.playMorningSunriseChime();
      } 
      else if (lower.includes('იძინებს ქალაქი')) {
        this.playCitySleepChime();
      } 
      else if (lower.includes('იძინებს')) {
        this.playSleepTone();
      }
    } catch (e) {}
  }

  public speak(text: string, onEnd?: () => void) {
    this.announcePrompt(text);
    if (onEnd) setTimeout(onEnd, 2500);
  }
}

export const audioManager = new AudioManager();
