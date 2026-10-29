# Base técnica

Referentes sugeridos: Manuel; Alessandro en dirección técnica.

`application.ts` conecta los sistemas y posee el reloj de la partida. `scene.ts` compone la escena; `renderer.ts` configura WebGL. No colocar reglas de cocción ni contenido del HUD aquí.

`startApplication(app)` devuelve una función para retirar controles, audio y renderizador. El reloj se conserva en `sim/clock.ts`.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
