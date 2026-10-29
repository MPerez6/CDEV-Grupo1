# Jugabilidad y controles

Referentes sugeridos: Luciano.

`actions.ts` implementa acciones; `input.ts` asigna teclas/clic; `player.ts` mueve y selecciona; `collisions.ts` resuelve límites; `targets.ts` define objetivos; `tools.ts` enumera herramientas.

`createGameplay(world, onMessage)` recibe objetivos semánticos sin DOM. `createPlayer(camera, clickable, obstacles)` adapta cámara/selección. Los bindings de entrada devuelven una función para retirar sus listeners. Probar carga, encendido, pala y pinza.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
