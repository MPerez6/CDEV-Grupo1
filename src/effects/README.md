# Efectos visuales

Referentes sugeridos: Valentino; soporte de programación.

`brazier-effects.ts` anima fuego/papel, combustible y caída; `fuel-flames.ts` construye llamas del combustible; `ember-scatter.ts` dispersa fragmentos; `grill-embers.ts` representa las brasas colocadas.

`createBrazier(...).updateVisuals(world, elapsedReal)` y `createGrillEmbers(groups).update(world, elapsedReal)`. Leer el estado; nunca consumir masa o alterar temperaturas. No se añadieron efectos nuevos en esta reorganización.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
