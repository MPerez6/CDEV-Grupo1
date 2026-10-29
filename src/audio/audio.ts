export const AUDIO_SETTINGS = {
  loopSeconds: 2, noiseAmplitude: 0.28, highpassHz: 1300,
  maxVolume: 0.18, fluxThreshold: 1200, fluxRange: 50000,
};

/** Chisporroteo sintético provisional. start se llama desde un gesto del usuario. */
export function createAudio() {
  let audioContext: AudioContext | null = null;
  let audioGain: GainNode | null = null;
  function start(): void {
    if(audioContext) { void audioContext.resume(); return; }
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * AUDIO_SETTINGS.loopSeconds, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for(let i = 0;i < samples.length;i++) samples[i] = (Math.random() * 2 - 1) * AUDIO_SETTINGS.noiseAmplitude;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = AUDIO_SETTINGS.highpassHz;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    audioContext = ctx;
    audioGain = gain;
  }


  function pause(): void {
    if(audioContext && audioGain) audioGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.08);
  }
  return {
    start, pause, update(flux: number, playing: boolean): void {
      if(!audioContext || !audioGain) return;
      const volume = playing ? Math.min(AUDIO_SETTINGS.maxVolume, Math.max(0, (flux - AUDIO_SETTINGS.fluxThreshold) / AUDIO_SETTINGS.fluxRange)) : 0;
      audioGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.15);
    }, dispose(): void { if(audioContext) void audioContext.close(); audioContext = null; audioGain = null; }
  };
}
