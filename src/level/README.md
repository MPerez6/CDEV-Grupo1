# Escenario

Referentes sugeridos: Emily y Gonzalo.

`patio.ts` arma entorno/mesas; `asador.ts` estructura y suministros; `grill.ts` parrilla fija; `layout.ts` posiciones compartidas; `primitives.ts` ayudas de construcción; `trash-bin.ts` tacho de basura con pedal (entre la mesa de preparación y la heladera): tapa que se abre al tirar algo, bolsa negra que sube con el llenado y sale atada al vaciarla, moscas y vaho verdoso según el olor (solo lee `world.trash`).

`createPatio(scene, clickable)` y `createGrill(scene, clickable)`. Al mover una estructura, coordinar su volumen visible, límites y selección. No modificar coeficientes físicos para ajustar posiciones.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.

[Guía de arquitectura y coordinación](../../ARQUITECTURA_MODULAR.md).
