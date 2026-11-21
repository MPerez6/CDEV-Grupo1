/**
 * Lluvia sintetizada: ruido rosado filtrado (el "shhh" de fondo) y algún goteo sobre la chapa.
 * `update(nivel, activo)` sigue la intensidad del clima; sin archivos de audio.
 */
export function createLluviaAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;
  let nivel = 0;
  let goteo: ReturnType<typeof setInterval> | null = null;

  function ruidoRosado(context: AudioContext, segundos: number): AudioBuffer {
    const n = Math.ceil(context.sampleRate * segundos);
    const buffer = context.createBuffer(1, n, context.sampleRate);
    const d = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for(let i = 0;i < n;i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099; b1 = 0.963 * b1 + white * 0.2965; b2 = 0.57 * b2 + white * 1.0526;
      d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
    }
    return buffer;
  }

  function gota(): void {
    if(!ctx || !master || nivel < 0.15 || Math.random() > nivel) return;
    const t = ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(1800 + Math.random() * 1600, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    g.gain.setValueAtTime(0.04 * nivel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + 0.07);
  }

  function start(): void {
    if(ctx) { void ctx.resume(); return; }
    const AudioCtor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if(!AudioCtor) return;
    ctx = new AudioCtor();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 3800;
    source = ctx.createBufferSource(); source.buffer = ruidoRosado(ctx, 4); source.loop = true;
    source.connect(filtro); filtro.connect(master); source.start();
    goteo = setInterval(gota, 90);
  }

  return {
    start,
    update(level: number, playing: boolean): void {
      nivel = playing ? level : 0;
      if(ctx && master) master.gain.setTargetAtTime(0.55 * nivel, ctx.currentTime, 0.6);
    },
    pause(): void { if(ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.1); },
    dispose(): void {
      if(goteo) clearInterval(goteo);
      source?.stop(); void ctx?.close();
      ctx = null; master = null; source = null;
    },
  };
}
