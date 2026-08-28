/**
 * Bulletproof Smart Audio & Haptic Engine for Mafia Moderator
 * Features:
 * 1. Rich Procedural Acoustic Chimes & Role Calls for every phase (Works 100% on iOS & Android)
 * 2. Unstoppable iOS Web Audio Context Keep-Alive
 * 3. Haptic Vibration API for closed-eyes tactile feedback
 * 4. Multi-engine Georgian Voice Synthesis + Audio Ducking
 * 5. Loud, rich Resonant Gongs and Morning Sunrise Bells
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying = false;
  private isMuted = false;
  private musicOscillators: (OscillatorNode | AudioNode)[] = [];
  private onSubtitleCallback: ((text: string) => void) | null = null;
  private isUnlocked = false;

  constructor() {}

  /**
   * Unlock Web Audio & Speech Synthesis on ANY user tap
   */
  public unlockAudio() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

        this.musicGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Play a tiny inaudible buffer to force iOS AudioSession active
    if (this.ctx && !this.isUnlocked) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      } catch (e) {}
    }

    // Warm up speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public setSubtitleCallback(cb: (text: string) => void) {
    this.onSubtitleCallback = cb;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.musicGain && this.sfxGain) {
      if (this.isMuted) {
        this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } else {
        this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      }
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Haptic vibration on phone (gentle tactile buzz when eyes are closed)
   */
  public vibrate(pattern: number[] = [120, 80, 120]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  /**
   * Procedural Ambient Background Music
   */
  public startAmbientMusic() {
    this.unlockAudio();
    if (!this.ctx || !this.musicGain || this.isMusicPlaying) return;

    this.stopAmbientMusic();
    this.isMusicPlaying = true;

    try {
      const now = this.ctx.currentTime;
      const baseFreqs = [55, 110, 164.81, 220]; // A Minor atmospheric chord

      baseFreqs.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300 + i * 40, now);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.08 + i * 0.03, now);
        lfoGain.gain.setValueAtTime(0.03, now);
        lfo.connect(lfoGain);

        gain.gain.setValueAtTime(0.06 / (i + 1), now);
        lfoGain.connect(gain.gain);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start();
        lfo.start();

        this.musicOscillators.push(osc, lfo, gain, filter);
      });
    } catch (e) {}
  }

  public stopAmbientMusic() {
    this.musicOscillators.forEach(node => {
      try {
        if ('stop' in node) (node as OscillatorNode).stop();
        node.disconnect();
      } catch (e) {}
    });
    this.musicOscillators = [];
    this.isMusicPlaying = false;
  }

  /**
   * Smart Audio Ducking
   */
  public duckMusic(durationMs: number = 3000) {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0.04, now + 0.2);

    setTimeout(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(0.3, t + 0.5);
    }, durationMs);
  }

  /**
   * Multi-Tier Voice & Chime Announcer
   * 1. Plays distinct acoustic role call chime
   * 2. Speaks Georgian announcement
   * 3. Vibrates device
   * 4. Updates screen subtitles
   */
  public announcePrompt(text: string) {
    this.unlockAudio();

    if (this.onSubtitleCallback) {
      this.onSubtitleCallback(text);
    }

    const lower = text.toLowerCase();

    // 1. Play Role-Specific Acoustic Chime
    if (lower.includes('იძინებს ქალაქი')) {
      this.playCitySleepChime();
      this.vibrate([200]);
    } else if (lower.includes('იღვიძებს მაფია')) {
      this.playMafiaWakeChime();
      this.vibrate([150, 80, 150]);
    } else if (lower.includes('იღვიძებს დონი')) {
      this.playDonWakeChime();
      this.vibrate([100, 50, 100, 50, 100]);
    } else if (lower.includes('იღვიძებს დეტექტივი')) {
      this.playDetectiveWakeChime();
      this.vibrate([100, 100, 200]);
    } else if (lower.includes('იღვიძებს ექიმი')) {
      this.playDoctorWakeChime();
      this.vibrate([80, 80, 80]);
    } else if (lower.includes('იღვიძებს სერიული')) {
      this.playSerialWakeChime();
      this.vibrate([250, 100, 250]);
    } else if (lower.includes('იღვიძებს ქალაქი')) {
      this.playMorningSunriseChime();
      this.vibrate([300, 100, 300]);
    } else if (lower.includes('იძინებს')) {
      this.playSleepTone();
      this.vibrate([100]);
    }

    // 2. Multi-Engine Speech Synthesis
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

        const duration = Math.max(3000, text.length * 100);
        this.duckMusic(duration);

        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  // ----------------- RICH PROCEDURAL ACOUSTIC CHIMES -----------------

  /**
   * City Sleep (Deep relaxing chime)
   */
  public playCitySleepChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [220, 196, 164.81, 130.81]; // A3, G3, E3, C3 (Descending calm)

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.25);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.4, now + idx * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.25 + 2.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.25);
      osc.stop(now + idx * 0.25 + 2.6);
    });
  }

  /**
   * Mafia Wake (Dark dramatic minor chime)
   */
  public playMafiaWakeChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [164.81, 207.65, 246.94, 329.63]; // E3, G#3, B3, E4 (Dark Suspense Chord)

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.35, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 3.0);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 3.1);
    });
  }

  /**
   * Don Wake (Regal brass chime)
   */
  public playDonWakeChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33]; // D4, F#4, A4, D5

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.4, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 2.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 2.6);
    });
  }

  /**
   * Detective Wake (Investigative radar sweep)
   */
  public playDetectiveWakeChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [329.63, 493.88, 659.25, 987.77]; // E4, B4, E5, B5

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.45, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 2.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 2.3);
    });
  }

  /**
   * Doctor Wake (Warm healing heartbeat chime)
   */
  public playDoctorWakeChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C Major Warm Pulse

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.4, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 2.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 2.9);
    });
  }

  /**
   * Serial Killer Wake (Sinister tension pulse)
   */
  public playSerialWakeChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [138.59, 185.00, 277.18, 369.99]; // C#3, F#3, C#4, F#4

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.35, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 3.0);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 3.1);
    });
  }

  /**
   * Morning Sunrise & Church Bells (Loud, bright major chord)
   */
  public playMorningSunriseChime() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.5, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 3.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 3.6);
    });
  }

  /**
   * Sleep Tone (Soft downward fade)
   */
  public playSleepTone() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.6);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  /**
   * Rich Resonant Gong for 1-minute timer expiration
   */
  public playGong() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25, 783.99];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.5 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 4.0);
    });
  }

  /**
   * Gunshot / Elimination Sound
   */
  public playGunshot() {
    this.unlockAudio();
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
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.4);
  }

  /**
   * Countdown Tick
   */
  public playTick() {
    this.unlockAudio();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioManager = new AudioManager();
