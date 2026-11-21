# Modelos y materiales

Referentes sugeridos: Valentino.

`meat-visual.ts` selecciona el corte; cada `*-visual.ts` arma los materiales de su corte sobre `meat-shading.ts`; `meat-surface-geometry.ts` geometría compartida; `meat-views.ts` ubica instancias; `brazier-model.ts` y `fuel-model.ts` construyen modelos.

`createMeatVisual(meat, scaleX, scaleZ)` devuelve grupo, mallas seleccionables y `update`. Las texturas y prompts siguen en `src/assets/meat/`. El contorno físico se define en `sim/meatCatalog.ts`; coordinar cambios de silueta. Revisar ambas caras en las muestras.

Sombreado de la carne (`meat-shading.ts`), compartido por todos los cortes:

- Rampas de color en sRGB convertidas a lineal: costra de Maillard (sellado → dorado → marrón rojizo → caoba), grasa (marfil → ámbar → caramelo), tripa de chorizo y de morcilla. `rampGlsl` genera la misma rampa en GLSL; la foto cocida del atlas se re-tiñe hacia caoba en vez de aclararse a dorado.
- Marcas de parrilla en el shader, a lo largo de Z local (los hierros), proporcionales al dorado de **esa** cara y más oscuras con `burn`. `GrillMarkTracker` reparte el dorado según `quarterTurns`: girar con Q deja el cuadriculado.
- Carbón en manchas irregulares con halo (no oscurecimiento parejo); bordes de la pieza más tostados (atributo `meatEdge` de `meat-surface-geometry.ts`).
- Brillo: entorno equirectangular de 128×64 generado en código (`meatEnvironment`), rugosidad menor y clearcoat mayor sobre la grasa, carbón opaco.
- `sausage-casing.ts`: tripa común de chorizo y morcilla (ampollas, anillos o franja de hierro, tripa partida con relleno visible cuando `casingDamage` supera ~35). `costilla-bone.ts`: el hueso queda marfil tostado y solo se asan o carbonizan las puntas.

Probar ambas caras, el cuadriculado (dorar, Q, seguir dorando), `burn` alto y tripa partida.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
