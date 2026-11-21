# Iluminación

Referentes sugeridos: Valentino; soporte de Manuel.

Editar `lighting.ts`: `LIGHTING_SETTINGS` para patio/fuego y `createPreviewLighting` para las muestras.

`createPatioLighting(scene)` (devuelve el sol y la luz ambiente), `createFireLighting(root)` (proyecta sombras solo mientras arde) y `createPreviewLighting(scene)`. `day-night.ts` aplica la hora y el clima de `sim/daytime.ts`: mueve el sol o la luna, tiñe cielo y niebla, prende faroles y la guirnalda de la pérgola. La lámpara del asador y su llave están en `level/asador-light.ts`. La luz de fuego lee sólo dos booleanos y tiempo real. Revisar sombras, extinción y ambas muestras.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
