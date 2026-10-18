/**
 * Loud attention alarm synthesised with Web Audio — no audio file to download or cache.
 * A sawtooth "wail" sweeping 650–1450 Hz sits in the range the ear is most sensitive to,
 * and a compressor pushes perceived loudness without clipping.
 */
export class Siren {
  private ctx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private vibrateTimer: ReturnType<typeof setInterval> | null = null;

  get active(): boolean {
    return this.nodes.length > 0;
  }

  /**
   * Create/unlock the audio context. Call this inside a user gesture (pointerdown): Safari only
   * allows audio to start during one, and the alarm itself fires after a press-and-hold delay.
   */
  async prime(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio is not supported on this device');
      this.ctx = new Ctx();
    }
    await this.ctx.resume();
    return this.ctx;
  }

  async start(): Promise<void> {
    if (this.active) return;
    const ctx = await this.prime();

    const tone = ctx.createOscillator();
    tone.type = 'sawtooth';
    tone.frequency.value = 1050;

    // LFO sweeps the pitch up and down (the classic wail).
    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = 0.55;
    const depth = ctx.createGain();
    depth.gain.value = 400;
    lfo.connect(depth).connect(tone.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4200;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 12;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.25);

    tone.connect(filter).connect(compressor).connect(out).connect(ctx.destination);
    tone.start();
    lfo.start();

    this.nodes = [tone, lfo, depth, filter, compressor, out];

    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400]);
      this.vibrateTimer = setInterval(() => navigator.vibrate([400, 200, 400]), 1200);
    }
  }

  stop(): void {
    if (this.vibrateTimer) clearInterval(this.vibrateTimer);
    this.vibrateTimer = null;
    if ('vibrate' in navigator) navigator.vibrate(0);
    for (const node of this.nodes) {
      if (node instanceof OscillatorNode) node.stop();
      node.disconnect();
    }
    this.nodes = [];
    void this.ctx?.close();
    this.ctx = null;
  }
}
