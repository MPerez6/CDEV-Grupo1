/**
 * Radio portátil del patio (propuesta). Toda la música es sintetizada y original: una chacarera en 6/8
 * con guitarra (Karplus-Strong), bombo legüero y una melodía generada con semilla fija. Sin archivos ni
 * grabaciones con derechos. Suena desde la posición de la radio (audio espacial) con filtro de radio AM.
 */
export const RADIO_SETTINGS = {
  sampleRate: 22050,     // la radio corta arriba de ~3,6 kHz: no hace falta más
  eighthSeconds: 0.27,   // corchea; un compás de 6/8 dura 1,62 s
  volume: 0.55,
  refDistance: 1.4, rolloffFactor: 1.15, maxDistance: 30,
  staticLevel: 0.012,
  highpassHz: 280, lowpassHz: 3600,
};

type Voicing = number[];
const CHORDS: Record<string, Voicing> = {
  Am: [110, 164.81, 220, 261.63, 329.63],
  E7: [82.41, 123.47, 146.83, 207.65, 246.94, 329.63],
  Dm: [146.83, 220, 293.66, 349.23],
  G7: [98, 123.47, 146.83, 196, 246.94, 349.23],
  C: [130.81, 164.81, 196, 261.63, 329.63],
  F: [87.31, 130.81, 174.61, 220, 261.63],
};
/** Progresión de 16 compases (vuelve a empezar en La menor). */
export const PROGRESSION = ['Am', 'Am', 'E7', 'E7', 'Am', 'Am', 'Dm', 'E7', 'Dm', 'G7', 'C', 'F', 'Dm', 'E7', 'Am', 'Am'];
/** Notas de la melodía (La menor armónica, registro medio-agudo). */
const MELODY_SCALE = [329.63, 349.23, 392.0, 415.3, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 830.61];

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cuerda pulsada (Karplus-Strong) sumada en `out` a partir de t0. */
function pluck(out: Float32Array, sr: number, rand: () => number, t0: number, freq: number, dur: number, amp: number, brightness = 0.5, decay = 0.996): void {
  const n = Math.max(2, Math.round(sr / freq));
  const buf = new Float32Array(n);
  let prev = 0;
  for(let i = 0;i < n;i++) { prev += brightness * ((rand() * 2 - 1) - prev); buf[i] = prev * amp; }
  const start = Math.round(t0 * sr), len = Math.round(dur * sr);
  let idx = 0;
  for(let i = 0;i < len && start + i < out.length;i++) {
    const s = buf[idx];
    buf[idx] = decay * 0.5 * (s + buf[(idx + 1) % n]);
    out[start + i] += s;
    idx = (idx + 1) % n;
  }
}

/** Rasguido: recorre las cuerdas hacia abajo (graves → agudas) o hacia arriba. */
function strum(out: Float32Array, sr: number, rand: () => number, t0: number, chord: Voicing, dir: 'down' | 'up', amp: number, muted = false): void {
  const strings = dir === 'down' ? chord : [...chord].reverse().slice(0, 4);
  strings.forEach((f, i) => pluck(out, sr, rand, t0 + i * 0.011, f, muted ? 0.09 : 1.1, amp * (0.75 + rand() * 0.25), muted ? 0.9 : 0.55, muted ? 0.93 : 0.9965));
}

/** Bombo legüero: golpe grave con caída de tono, o "aro" (golpe seco en el borde). */
function drum(out: Float32Array, sr: number, rand: () => number, t0: number, amp: number, rim: boolean): void {
  const start = Math.round(t0 * sr), len = Math.round((rim ? 0.05 : 0.35) * sr);
  let phase = 0;
  for(let i = 0;i < len && start + i < out.length;i++) {
    const t = i / sr;
    if(rim) { out[start + i] += (rand() * 2 - 1) * amp * Math.exp(-t * 90); continue; }
    const f = 52 + 48 * Math.exp(-t * 28);
    phase += (2 * Math.PI * f) / sr;
    out[start + i] += Math.sin(phase) * amp * Math.exp(-t * 9) + (rand() * 2 - 1) * amp * 0.25 * Math.exp(-t * 60);
  }
}

/** Renderiza el loop completo (mono, normalizado a 0,8). Función pura: misma salida en cada llamada. */
export function renderFolkLoop(sampleRate = RADIO_SETTINGS.sampleRate): Float32Array<ArrayBuffer> {
  const e = RADIO_SETTINGS.eighthSeconds, bar = e * 6;
  const loopSeconds = PROGRESSION.length * bar, tail = 1.5;
  const loopLen = Math.round(loopSeconds * sampleRate);
  const out = new Float32Array(loopLen + Math.round(tail * sampleRate));
  const rand = seeded(1952), melodyRand = seeded(806);
  let note = 4; // índice en MELODY_SCALE (La)
  PROGRESSION.forEach((name, b) => {
    const chord = CHORDS[name], t = b * bar;
    pluck(out, sampleRate, rand, t, chord[0] / 2, 1.4, 0.55, 0.35, 0.997); // bajo
    strum(out, sampleRate, rand, t, chord, 'down', 0.5);
    strum(out, sampleRate, rand, t + 2 * e, chord, 'up', 0.22);
    strum(out, sampleRate, rand, t + 3 * e, chord, 'down', 0.4, true); // chasquido
    strum(out, sampleRate, rand, t + 4 * e, chord, 'up', 0.2);
    strum(out, sampleRate, rand, t + 5 * e, chord, 'down', 0.3);
    drum(out, sampleRate, rand, t, 0.55, false);
    drum(out, sampleRate, rand, t + 3 * e, 0.35, false);
    for(const k of [1, 2, 4, 5]) drum(out, sampleRate, rand, t + k * e, 0.08, true);
    // Melodía: entra en la segunda vuelta de la progresión (compases 9 a 16).
    if(b >= 8) for(const k of [0, 2, 3, 5]) {
      if(melodyRand() > 0.72) continue;
      const step = Math.round((melodyRand() - 0.5) * 4);
      note = Math.min(MELODY_SCALE.length - 1, Math.max(0, note + step));
      // En tiempo fuerte, acercarla a una nota del acorde.
      let f = MELODY_SCALE[note];
      if(k === 0) {
        const target = chord.map(c => c * 2).concat(chord.map(c => c * 4)).reduce((best, c) => Math.abs(c - f) < Math.abs(best - f) ? c : best);
        f = target;
      }
      pluck(out, sampleRate, rand, t + k * e + 0.02, f, 0.6, 0.42, 0.75, 0.995);
    }
  });
  // Cola sobre el principio: el loop empalma sin corte.
  for(let i = loopLen;i < out.length;i++) out[i - loopLen] += out[i];
  const loop = out.subarray(0, loopLen);
  let peak = 0;
  for(let i = 0;i < loop.length;i++) peak = Math.max(peak, Math.abs(loop[i]));
  const gain = peak > 0 ? 0.8 / peak : 1;
  const result = new Float32Array(loopLen);
  for(let i = 0;i < loopLen;i++) result[i] = loop[i] * gain;
  return result;
}

type Vec3 = { x: number; y: number; z: number };

/** Radio con audio espacial. `start` se llama desde un gesto del usuario (Entrar al patio). */
export function createRadioAudio(position: readonly [number, number, number]) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let loopData: Float32Array<ArrayBuffer> | null = null;
  let on = true, active = false;
  const prepare = () => { if(!loopData) loopData = renderFolkLoop(); };
  // Se prepara al rato de cargar para que el clic de "Entrar al patio" no se trabe.
  if(typeof window !== 'undefined') window.setTimeout(prepare, 1200);

  const target = () => (on && active ? RADIO_SETTINGS.volume : 0);
  const ramp = () => { if(ctx && master) master.gain.setTargetAtTime(target(), ctx.currentTime, 0.12); };

  function build(): void {
    prepare();
    const c = new AudioContext();
    const sr = RADIO_SETTINGS.sampleRate;
    const data = loopData as Float32Array<ArrayBuffer>;
    const music = c.createBuffer(1, data.length, sr);
    music.copyToChannel(data, 0);
    const source = c.createBufferSource();
    source.buffer = music;
    source.loop = true;
    // Estática de fondo, con un leve vaivén.
    const noise = c.createBuffer(1, sr * 2, sr);
    const nd = noise.getChannelData(0), r = seeded(77);
    for(let i = 0;i < nd.length;i++) nd[i] = (r() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / sr * 2.3));
    const hiss = c.createBufferSource();
    hiss.buffer = noise;
    hiss.loop = true;
    const hissGain = c.createGain();
    hissGain.gain.value = RADIO_SETTINGS.staticLevel;
    // Cadena "radio AM": pasa-altos, pasa-bajos y una saturación suave.
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = RADIO_SETTINGS.highpassHz;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = RADIO_SETTINGS.lowpassHz;
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for(let i = 0;i < curve.length;i++) { const x = (i / 511.5) - 1; curve[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); }
    shaper.curve = curve;
    const panner = c.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = RADIO_SETTINGS.refDistance;
    panner.rolloffFactor = RADIO_SETTINGS.rolloffFactor;
    panner.maxDistance = RADIO_SETTINGS.maxDistance;
    if(panner.positionX) { panner.positionX.value = position[0]; panner.positionY.value = position[1]; panner.positionZ.value = position[2]; }
    else panner.setPosition(...position);
    const out = c.createGain();
    out.gain.value = 0;
    source.connect(hp); hp.connect(lp); lp.connect(shaper); shaper.connect(panner);
    hiss.connect(hissGain); hissGain.connect(panner);
    panner.connect(out); out.connect(c.destination);
    source.start(); hiss.start();
    ctx = c; master = out;
  }

  return {
    start(): void { active = true; if(!ctx) build(); else void ctx.resume(); ramp(); },
    pause(): void { active = false; ramp(); },
    /** Prende o apaga la radio y devuelve el mensaje para el HUD. */
    toggle(): string { on = !on; ramp(); return on ? 'Prendiste la radio: folklore de domingo.' : 'Apagaste la radio.'; },
    isOn(): boolean { return on; },
    /** Ubica al oyente en la cámara (posición y hacia dónde mira). */
    update(pos: Vec3, forward: Vec3): void {
      if(!ctx) return;
      const l = ctx.listener;
      if(l.positionX) {
        l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
        l.forwardX.value = forward.x; l.forwardY.value = forward.y; l.forwardZ.value = forward.z;
        l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
      } else {
        l.setPosition(pos.x, pos.y, pos.z);
        l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
      }
    },
    dispose(): void { if(ctx) void ctx.close(); ctx = null; master = null; },
  };
}
