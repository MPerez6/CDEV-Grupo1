# Efectos visuales

Referentes sugeridos: Valentino; soporte de programación.

`brazier-effects.ts` anima fuego/papel, combustible, caída y el humo del brasero; `fuel-flames.ts` construye llamas del combustible; `ember-scatter.ts` dispersa fragmentos; `grill-embers.ts` representa las brasas colocadas; `smoke.ts` es el pool de sprites de humo (sube y se curva hacia la chimenea); `smoke-sources.ts` calcula cuánto humo sale del brasero (papel y leña mucho, brasa madura casi nada) y de cada carne (grasa que gotea = blanco, quemado = gris oscuro); `meat-smoke.ts` lo emite sobre cada pieza en la parrilla. La luz del fuego (`lighting/lighting.ts`) proyecta sombras solo mientras arde.

`createBrazier(...).updateVisuals(world, elapsedReal)` y `createGrillEmbers(groups).update(world, elapsedReal)`. Leer el estado; nunca consumir masa o alterar temperaturas.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
