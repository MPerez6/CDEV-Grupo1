# Simulación

Referentes sugeridos: Luciano y Manuel; revisión de reglas de Gonzalo.

`world.ts` coordina estado y acciones; `embers.ts` combustión/brasas; `meat.ts` cinco capas; `parameters.ts` coeficientes; `meatCatalog.ts` cortes; `meatFootprint.ts` exposición; `clock.ts` paso fijo; `trash.ts` tacho de basura: llenado por unidades (pieza de carne 1–3, restos de cada plato servido 1) y olor que crece con el tiempo de simulación según lo lleno que esté; al sacar la bolsa queda un resto que se ventila. `world.ts` suma `discardCarriedMeat`, `emptyTrash`, las piezas en la boca del perro (`location: 'dog'`, `tainted`) y `drainNotices()` para los avisos de olor.

Conservar masa y energía, paso fijo y cinco capas. No importar Three.js, DOM, audio ni módulos de presentación. Los coeficientes siguen siendo provisionales; la reorganización no modifica estos archivos TypeScript.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
