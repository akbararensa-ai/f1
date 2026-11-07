class SoundManager {
  private ctx: AudioContext | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private squealGain: GainNode | null = null;
  private squealOsc: OscillatorNode | null = null;
  private kerbGain: GainNode | null = null;
  private kerbOsc: OscillatorNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainBufferSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      // --- Engine Synthesizer (V6 Turbo-Hybrid F1 Harmonics) ---
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1600;
      this.filter.Q.value = 1.6;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';

      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'square';

      this.engineOsc1.connect(this.filter);
      this.engineOsc2.connect(this.filter);
      this.engineSub.connect(this.filter);
      this.filter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSub.start();

      // --- Tyre Squeal Synth ---
      this.squealGain = this.ctx.createGain();
      this.squealGain.gain.value = 0;
      this.squealOsc = this.ctx.createOscillator();
      this.squealOsc.type = 'sawtooth';
      this.squealOsc.frequency.value = 850;
      const squealFilter = this.ctx.createBiquadFilter();
      squealFilter.type = 'bandpass';
      squealFilter.frequency.value = 1100;
      squealFilter.Q.value = 3;
      this.squealOsc.connect(squealFilter);
      squealFilter.connect(this.squealGain);
      this.squealGain.connect(this.masterGain);
      this.squealOsc.start();

      // --- Kerb Rumble Synth ---
      this.kerbGain = this.ctx.createGain();
      this.kerbGain.gain.value = 0;
      this.kerbOsc = this.ctx.createOscillator();
      this.kerbOsc.type = 'triangle';
      this.kerbOsc.frequency.value = 45;
      this.kerbOsc.connect(this.kerbGain);
      this.kerbGain.connect(this.masterGain);
      this.kerbOsc.start();

      // --- Wind Noise Synth (White Noise Generator) ---
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.8;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSource.start();

      this.initialized = true;
    } catch {
      // Audio autoplay policy or not supported
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public updateEngine(rpm: number, throttle: number, speedKmh: number, isPaused: boolean = false) {
    if (!this.ctx || !this.initialized || this.isMuted || isPaused) {
      if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      if (this.windGain && this.ctx) this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }

    const t = this.ctx.currentTime;
    const baseFreq = (rpm / 60) * 1.5; // F1 V6 pulse harmonics

    if (this.engineOsc1) this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.025);
    if (this.engineOsc2) this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.025);
    if (this.engineSub) this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.03);

    // Dynamic lowpass filter opening with throttle and high RPM
    if (this.filter) {
      const cutoff = 800 + (rpm / 12000) * 2200 + throttle * 900;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.03);
    }

    if (this.engineGain) {
      const vol = 0.04 + throttle * 0.06 + (rpm / 13000) * 0.04;
      this.engineGain.gain.setTargetAtTime(vol, t, 0.04);
    }

    if (this.windGain) {
      const windVol = Math.min(0.08, (speedKmh / 350) * 0.08);
      this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    }
  }

  public playGearShift() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  public playBeep(freq: number = 880, duration: number = 0.12) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.02);
    } catch {}
  }

  public playCollision(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(Math.min(0.2, intensity * 0.25), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {}
  }

  public updateTyreSlip(slip: number) {
    if (!this.ctx || !this.squealGain || this.isMuted) return;
    const target = slip > 0.2 ? Math.min(0.09, (slip - 0.2) * 0.15) : 0;
    this.squealGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  public updateKerb(onKerb: boolean, speedKmh: number) {
    if (!this.ctx || !this.kerbGain || this.isMuted) return;
    const target = onKerb && speedKmh > 20 ? Math.min(0.12, (speedKmh / 200) * 0.1) : 0;
    this.kerbGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }
}

export const soundManager = new SoundManager();
