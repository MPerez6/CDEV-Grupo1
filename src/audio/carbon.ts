
export function createCarbonAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let activo = false;
  //para que vaya aumentando el sonido del carbon dependiendo factores
  let intensidad = 0;

  // Genera ruido digital
  function crearRuido(
    context: AudioContext,
    duracion: number
  ): AudioBuffer {
    const cantidad = Math.ceil(
      context.sampleRate * duracion
    );

    const buffer = context.createBuffer(
      1,
      cantidad,
      context.sampleRate
    );

    const datos = buffer.getChannelData(0);

    for (let i = 0; i < cantidad; i++) {
      datos[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  // Pequeños chasquidos del carbón
  function chasquido() {
    if (!ctx || !master || !activo) return;

    const duracion = 0.015 + Math.random() * 0.05;
    const ahora = ctx.currentTime;

    const ruido = ctx.createBufferSource();
    ruido.buffer = crearRuido(ctx, duracion);

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value =
      900 + Math.random() * 2600;
    filtro.Q.value = 0.8;

    const volumen = ctx.createGain();

    const fuerza = (0.12 + Math.random() * 0.22)
        * (0.45 + intensidad * 0.55);

    volumen.gain.setValueAtTime(0.001, ahora);
    volumen.gain.exponentialRampToValueAtTime(
      fuerza,
      ahora + 0.002
    );
    volumen.gain.exponentialRampToValueAtTime(
      0.001,
      ahora + duracion
    );

    ruido.connect(filtro);
    filtro.connect(volumen);
    volumen.connect(master);

    ruido.start(ahora);
    ruido.stop(ahora + duracion);
  }

  // Chasquidos a intervalos aleatorios
  function programarChasquidos() {
    if (!activo) return;

    chasquido();

    
    const esperaMinima = 650 - intensidad * 490;
    const esperaAleatoria = 1100 - intensidad * 750;

    timer = setTimeout(
    programarChasquidos,
    esperaMinima + Math.random() * esperaAleatoria
    );

  }

  function start() {
    if (!ctx) {
      ctx = new AudioContext();

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Ruido de fondo suave de las brasas
      source = ctx.createBufferSource();
      source.buffer = crearRuido(ctx, 3);
      source.loop = true;

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 380;

      const fondo = ctx.createGain();
      fondo.gain.value = 0.15;

      source.connect(filtro);
      filtro.connect(fondo);
      fondo.connect(master);

      source.start();
    }

    void ctx.resume();
  }

  // Activar o desactivar según la combustión

    function update(nuevaIntensidad: number, factorDistancia: number = 1) {
        if (!ctx || !master) return;

        intensidad = Math.max(
            0,
            Math.min(1, nuevaIntensidad)
    );

    const encendido = intensidad > 0.01;

    // Volumen según combustión
    const volumenBase = encendido
        ? 0.35 + intensidad * 0.55
        : 0;

    const volumen = volumenBase *
        Math.max(0, Math.min(1, factorDistancia));

    master.gain.setTargetAtTime(
        volumen,
        ctx.currentTime,
        0.3
    );

    if (encendido && !activo) {
        activo = true;
        programarChasquidos();
    }

    if (!encendido && activo) {
        activo = false;

        if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        }
    }
    }


  function pause() {
    update(0);
  }

  function dispose() {
    activo = false;

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    if (source) {
      source.stop();
      source.disconnect();
    }

    if (ctx) void ctx.close();

    ctx = null;
    master = null;
    source = null;
  }

  return { start, update, pause, dispose };
}
