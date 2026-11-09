
export function createPerroAudio() {
  const sonido = new Audio('/audio/perro-feliz.wav');

  sonido.volume = 0.65;
  sonido.preload = 'auto';

  function play() {
    sonido.pause();
    sonido.currentTime = 0;

    void sonido.play().catch(console.error);
  }

  function dispose() {
    sonido.pause();
    sonido.removeAttribute('src');
    sonido.load();
  }

  return { play, dispose };
}
