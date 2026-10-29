# Fase 2.1 — Vacío crudo con dos caras

22/10/2026. El usuario aprobó la muestra del matambre y aportó tres referencias de vacío crudo. Esta entrega trabaja el crudo; el acabado cocinado queda pendiente de fotografías posteriores.

## Resultado

- **Cara B, cuero/membrana:** superficie fina perlada y grisácea, con músculo visible debajo y grasa irregular. Es la cara que queda arriba al iniciar una pieza.
- **Cara A, fibras y grasa:** músculo rojo con fibras longitudinales y acumulaciones de grasa, distinta de la membrana. Aparece arriba al dar vuelta la pieza.
- **Volumen:** contorno alargado, asimétrico e irregular, cuerpo redondeado y borde más grueso que el matambre. El borde muestra músculo y una franja superficial fina. Se eliminó la cubierta blanca uniforme del modelo anterior.
- La tercera foto se utilizó como referencia de espesor y corte lateral; no se reprodujo el enrollado de exhibición.
- El mismo modelo está integrado en la mesa, el transporte y la parrilla. Cada textura sigue unida a su cara al girar, sin intercambiar identidades ni reiniciar el estado.

Se conservaron los valores provisionales de **1,8 kg, 3,5 cm y cinco capas**, junto con los coeficientes y fórmulas térmicas. Cambió el contorno y su proporción para aproximar las referencias; la exposición y las colisiones usan ese contorno y mantienen el área térmica derivada de masa, densidad y espesor. La membrana se representa visualmente; no se agregó un coeficiente térmico específico nuevo para ella.

## Cómo revisarlo

Con el servidor de `npm run dev` iniciado, abrir `/vacio-preview.html`. La muestra presenta dos instancias crudas del mismo corte orientadas por caras opuestas:

1. Arrastrar y acercar con la rueda para observar la superficie.
2. Usar **Ver espesor** para mirar el borde desde abajo o **Vista superior** para comparar las superficies.
3. Pulsar **Dar vuelta**: las caras visibles y sus nombres se intercambian correctamente.
4. En la partida (`/`), recoger un vacío con **3 + E**, colocarlo con clic y darlo vuelta con **R**, como antes.

La página de comparación no avanza la cocción. Las tres referencias recibidas son de crudo y no se generaron imágenes de vacío cocinado. El dorado y quemado del juego mantienen una aproximación genérica provisional para conservar la funcionalidad, a ajustar cuando se reciban las referencias cocinadas.

## Recursos y archivos

- Atlas generado con la herramienta integrada imagegen: `src/assets/meat/vacio-raw-sides-v1.png`, 3.399.612 bytes. Mitad izquierda: membrana; derecha: fibras.
- Prompt final, procedencia y referencias: [src/assets/meat/vacio-raw-sides-v1.md](src/assets/meat/vacio-raw-sides-v1.md).
- Fotos del usuario: `docs/referencias/vacio-cuero-crudo.png`, `vacio-fibras-crudo.png` y `vacio-espesor-crudo.png`.
- `src/game/vacio-visual.ts`: materiales por cara, relieve, borde y sincronización de la representación.
- `src/game/meat-surface-geometry.ts`: geometría cerrada compartida con perfiles de espesor visual por corte; se extrajo del matambre conservando su perfil anterior.
- `src/game/meat-preview-stage.ts`: iluminación y cámara de muestras compartidas; se extrajeron de la comparación del matambre.
- `src/game/matambre-visual.ts`, `src/game/matambre-preview.ts`: consumen esas funciones compartidas. Su atlas y acabado aprobado se conservan.
- `src/game/meat-visual.ts`: integración del nuevo vacío.
- `src/sim/meatCatalog.ts`: contorno y proporción del vacío.
- `vacio-preview.html`, `src/game/vacio-preview.ts`, `vite.config.ts`: comparación orbital y compilación de las tres páginas.
- `tests/vacio-visual.test.ts`: selección de las caras al girar y espesor relativo.
- `README.md`, `CONTEXTO_CODEX_ASADO.md` y este informe: alcance, estado y validación.

## Validación

- `npm test`: **74/74 aprobadas**, sin omisiones. Se mantienen las 72 anteriores y se agregan dos comprobaciones: rayos de selección confirman que al girar aparece la otra cara con su material correspondiente; la altura visual del vacío supera el doble de la del matambre, respetando parámetros y cinco capas.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado. Incluye juego, muestra del matambre, muestra del vacío y ambos PNG locales. Chunk compartido: 546,22 kB minificado / 142,49 kB gzip. Persiste la advertencia de Vite por superar 500 kB.
- Revisión gráfica del vacío crudo por ambas caras, vista de espesor y giro; sin errores ni advertencias en consola. Las pruebas de selección, alcance y conservación del estado siguen aprobadas.

No se afirma validación experimental de los parámetros, fotogrametría ni un escaneo físico de material. La validación estética de esta muestra corresponde al usuario. Siguen pendientes las referencias de cocinado, los siguientes cortes y la calibración entre punto interno y dorado identificada previamente. No se inició la heladera.
