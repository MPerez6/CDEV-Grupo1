export function createPasosAudio() {
  let ctx: AudioContext | null = null;
  let ultimoPie = 0;

  function start() {
    if (!ctx) {
      ctx = new AudioContext();
    }
    void ctx.resume();
  }

  function playStep() {
    if (!ctx || ctx.state !== 'running') return;

    const ahora = ctx.currentTime;

    // Alternamos pequeñas variaciones entre pasos
    ultimoPie = 1 - ultimoPie;

    const duracion = 0.16;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duracion),
      ctx.sampleRate
    );

    const datos = buffer.getChannelData(0);
    let ruidoFiltrado = 0;

    // Golpe de zapatilla contra cemento firme
    for (let i = 0; i < datos.length; i++) {
      const t = i / ctx.sampleRate;

      const envolvente = Math.exp(-t * 45);

      // Impacto grave, sin resonancia exagerada
      const golpe =
        Math.sin(2 * Math.PI * 95 * t) *
        Math.exp(-t * 55);

      // Roce muy suave y de corta duración
      ruidoFiltrado =
        ruidoFiltrado * 0.85 +
        (Math.random() * 2 - 1) * 0.15;

      const roce =
        ruidoFiltrado *
        Math.exp(-t * 70) * 0.12;

      datos[i] =
        (golpe * 0.7 + roce) * envolvente;
    }

    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 450;

    const volumen = ctx.createGain();

    // Volumen discreto para ambiente
    volumen.gain.value =
      (ultimoPie === 0 ? 0.28 : 0.25);

    fuente.connect(filtro);
    filtro.connect(volumen);
    volumen.connect(ctx.destination);

    fuente.start(ahora);
    fuente.stop(ahora + duracion);
  }

  function pause() {
    if (ctx) void ctx.suspend();
  }

  function dispose() {
    if (ctx) void ctx.close();
    ctx = null;
  }

  return { start, playStep, pause, dispose };
}
