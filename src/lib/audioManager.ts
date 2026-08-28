/**
 * Smart Audio Engine for Mafia Moderator
 * Handles:
 * 1. Atmospheric Ambient Background Music (Web Audio API procedural synth)
 * 2. Automatic Audio Ducking (lowers background music during speech)
 * 3. Georgian Speech Synthesis / Voice Prompts
 * 4. Realistic Sound FX (Gong, Gunshot, Chime, Heartbeat, Ticking)
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying = false;
  private isMuted = false;
  private musicOscillators: (OscillatorNode | AudioNode)[] = [];
  private duckingTimeout: any = null;
  private onSubtitleCallback: ((text: string) => void) | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  /**
   * Unlock audio context and iOS speech synthesis on user gesture
   */
  public unlockAudio() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Warm up speech synthesis for iOS Safari
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      const warmUp = new SpeechSynthesisUtterance('');
      warmUp.volume = 0.01;
      window.speechSynthesis.speak(warmUp);
    }
  }

  public init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

        this.musicGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
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
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      }
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural Ambient Noir Background Track
   * Creates a mysterious, suspenseful atmospheric soundscape using multi-harmonic oscillators + filters
   */
  public startAmbientMusic() {
    this.init();
    if (!this.ctx || !this.musicGain || this.isMusicPlaying) return;

    this.stopAmbientMusic();
    this.isMusicPlaying = true;

    try {
      const now = this.ctx.currentTime;
      const baseFreqs = [55, 110, 164.81, 220]; // A1, A2, E3, A3 - Mysterious A Minor chord

      // Main Ambient Drone
      baseFreqs.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Lowpass filter for deep cinematic warmth
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320 + i * 40, now);

        // LFO for slow ambient breathing movement
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.1 + i * 0.04, now);
        lfoGain.gain.setValueAtTime(0.04, now);
        lfo.connect(lfoGain);

        gain.gain.setValueAtTime(0.08 / (i + 1), now);
        lfoGain.connect(gain.gain);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start();
        lfo.start();

        this.musicOscillators.push(osc, lfo, gain, filter);
      });
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
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
   * Smart Audio Ducking:
   * Smoothly decreases music volume during voice/speech, then fades it back up.
   */
  public duckMusic(durationMs: number = 3000) {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Duck to 10% volume smoothly
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0.06, now + 0.3);

    if (this.duckingTimeout) clearTimeout(this.duckingTimeout);

    this.duckingTimeout = setTimeout(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(0.35, t + 0.6);
    }, durationMs);
  }

  /**
   * Speak Georgian Voice Prompt with Audio Ducking & Fallback
   */
  public speak(text: string, onEnd?: () => void) {
    this.unlockAudio();

    if (this.onSubtitleCallback) {
      this.onSubtitleCallback(text);
    }

    if (this.isMuted) {
      if (onEnd) setTimeout(onEnd, 2500);
      return;
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find best voice available on device
        const voices = window.speechSynthesis.getVoices();
        const georgianVoice = voices.find(v => v.lang.includes('ka') || v.lang.includes('GE'));
        if (georgianVoice) {
          utterance.voice = georgianVoice;
        }

        utterance.lang = 'ka-GE';
        utterance.rate = 0.88;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;

        const estimatedDuration = Math.max(2500, text.length * 95);
        this.duckMusic(estimatedDuration + 600);

        let hasEnded = false;
        utterance.onend = () => {
          if (!hasEnded) {
            hasEnded = true;
            if (onEnd) onEnd();
          }
        };

        utterance.onerror = (e) => {
          console.warn('Speech synthesis error:', e);
          if (!hasEnded) {
            hasEnded = true;
            if (onEnd) onEnd();
          }
        };

        // Fallback safety timeout in case onend never fires on some mobile browsers
        setTimeout(() => {
          if (!hasEnded) {
            hasEnded = true;
            if (onEnd) onEnd();
          }
        }, estimatedDuration + 500);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis exception:', err);
        this.duckMusic(3000);
        if (onEnd) setTimeout(onEnd, 3000);
      }
    } else {
      this.duckMusic(3000);
      if (onEnd) setTimeout(onEnd, 3000);
    }
  }

  // ----------------- PROCEDURAL SOUND EFFECTS (SFX) -----------------

  /**
   * Rich Resonant Gong / Bell for 1-minute timer expiration
   */
  public playGong() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25, 783.99]; // C Major Rich Chord

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.4 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 3.5);
    });
  }

  /**
   * Gunshot / Elimination Sound
   */
  public playGunshot() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Noise buffer for blast
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
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.4);
  }

  /**
   * Morning Sunrise Chime (Warm, peaceful bells)
   */
  public playMorningChime() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.3, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 2.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 2.3);
    });
  }

  /**
   * Countdown Tick (Clock click)
   */
  public playTick() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Suspense Heartbeat
   */
  public playHeartbeat() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    [0, 0.14].forEach((delay, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(65 - i * 10, now + delay);

      gain.gain.setValueAtTime(0.5, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.13);
    });
  }
}

export const audioManager = new AudioManager();
