# Sonido

Referentes sugeridos: Tiziana; soporte de Manuel.

Editar `audio.ts`: `AUDIO_SETTINGS` controla volumen, filtro y umbral. El sonido actual es sintético y provisional.

`createAudio()` devuelve `start`, `update(flux, playing)`, `pause` y `dispose`. Iniciar desde un gesto del usuario. No depende del mundo ni de Three.js. Probar entrada y pausa en la partida.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
