// Audio module — generates countdown ticks, shutter, and click sounds
// with the Web Audio API so no audio asset files are needed.

export class AudioEngine {
  private ctx: AudioContext | null = null;

  /** Lazily create the AudioContext on first user gesture / playback. */
  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** A soft two-tone blip used for each countdown beat. */
  countdown(): void {
    this.tone(880, 0.12, 'sine', 0.18, 0);
    this.tone(1320, 0.18, 'sine', 0.12, 0.04);
  }

  /** A crisp camera shutter — short noise burst + low click. */
  shutter(): void {
    const ctx = this.ensure();
    const now = ctx.currentTime;

    // Noise burst for the mechanical shutter
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    noise.connect(hp).connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // Low click
    this.tone(180, 0.05, 'square', 0.2, 0);
  }

  /** A gentle UI click for button presses. */
  click(): void {
    this.tone(1200, 0.04, 'sine', 0.08, 0);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay: number,
  ): void {
    const ctx = this.ensure();
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
