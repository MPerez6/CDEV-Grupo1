# Modelos y materiales

Referentes sugeridos: Valentino.

`meat-visual.ts` selecciona el corte; `matambre-visual.ts` y `vacio-visual.ts` sus materiales; `meat-surface-geometry.ts` geometría compartida; `meat-views.ts` ubica instancias; `brazier-model.ts` y `fuel-model.ts` construyen modelos.

`createMeatVisual(meat, scaleX, scaleZ)` devuelve grupo, mallas seleccionables y `update`. Las texturas y prompts siguen en `src/assets/meat/`. El contorno físico se define en `sim/meatCatalog.ts`; coordinar cambios de silueta. Revisar ambas caras en las muestras.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
