# Simulación

Referentes sugeridos: Luciano y Manuel; revisión de reglas de Gonzalo.

`world.ts` coordina estado y acciones; `embers.ts` combustión/brasas; `meat.ts` cinco capas; `parameters.ts` coeficientes; `meatCatalog.ts` cortes; `meatFootprint.ts` exposición; `clock.ts` paso fijo.

Conservar masa y energía, paso fijo y cinco capas. No importar Three.js, DOM, audio ni módulos de presentación. Los coeficientes siguen siendo provisionales; la reorganización no modifica estos archivos TypeScript.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
