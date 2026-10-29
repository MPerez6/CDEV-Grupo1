# Fase 2.1 — Primera muestra visual del matambre

22/10/2026. El usuario pidió un acabado cercano al fotorrealismo y aportó referencias de matambre crudo y cocinado. Se mejoró primero este producto para revisar el nivel de acabado antes de extenderlo al resto. La heladera permanece pendiente.

## Cambios

- Contorno más detallado, con recorte y faldón inspirado en la foto del crudo.
- Malla cerrada subdividida, con espesor variable visual, pequeños relieves, normales suaves y borde afinado. Se mantiene la masa de 1,5 kg, el espesor térmico de referencia de 1,5 cm y las cinco capas.
- Atlas fotográfico generado con la herramienta integrada imagegen: fibras rosadas, membranas y grasa fina en una mitad; superficie dorada y tostada en la otra. El modelo mezcla las superficies gradualmente según el dorado de cada cara.
- Material físico de Three.js con relieve superficial y brillo de grasa/humedad. Quemado por manchas irregulares y rugosidad creciente, sin las barras negras de geometría del modelo anterior.
- Estados de cara A/B independientes, incluidos al dar vuelta y transportar. El renderizado no avanza ni modifica la simulación.
- El cálculo de huella y ocupación ahora admite contornos cóncavos, triangulando antes de intersectar. El hueco del contorno no recibe calor ni bloquea otra pieza. Se conserva el área térmica derivada de masa, densidad y espesor.

## Cómo revisarlo

Con `npm run dev`, abrir `/matambre-preview.html` en el puerto indicado por Vite. La muestra compara crudo y dorado lado a lado. Se puede orbitar arrastrando, acercar con la rueda, cambiar a quemado y mirar la otra cara. Los botones fijan **estados ilustrativos de material**, separados de la partida: no son una prueba de tiempos ni del punto de cocción.

El juego normal (`/`) utiliza exactamente el mismo modelo del matambre y lo actualiza según las temperaturas, dorado, quemado y jugosidad reales de su instancia. Se conservan los controles de pinza, selección y colocación. Los otros cinco productos mantienen su presentación de fase 2 hasta revisar esta muestra.

## Recurso y referencias

- Atlas definitivo del proyecto: `src/assets/meat/matambre-raw-cooked-v1.png` (3.694.094 bytes).
- Prompt completo, procedencia y uso de UV: [src/assets/meat/README.md](src/assets/meat/README.md).
- Fotos proporcionadas: `docs/referencias/matambre-crudo.png` y `docs/referencias/matambre-cocinado.png`.
- La textura se carga desde el proyecto y se comparte entre instancias. No depende de archivos temporales ni de servicios externos durante el juego.

Es una aproximación visual a partir de referencias, no fotogrametría ni un escaneo PBR. Se reutiliza el atlas en ambas caras con estados independientes; no se dispone todavía de referencias distintas para cada lado del corte.

## Archivos modificados o agregados

- `src/game/matambre-visual.ts`: malla, UV, material, mezcla de estados y carga compartida del atlas.
- `src/game/meat-visual.ts`: integración del nuevo modelo específico del matambre.
- `src/sim/meatCatalog.ts`: nuevo contorno; sin cambios en propiedades térmicas ni objetivos.
- `src/sim/meatFootprint.ts`, `src/sim/world.ts`: exposición y colisiones de contornos cóncavos.
- `src/game/matambre-preview.ts`, `matambre-preview.html`: comparación 3D independiente de la partida.
- `vite.config.ts`: compilación de la partida y de la página de comparación.
- `tests/matambre-visual.test.ts`: regresiones de concavidad y coherencia de la malla cerrada.
- Atlas, fotos de referencia y documentación: archivos indicados arriba, `README.md`, `CONTEXTO_CODEX_ASADO.md` y este informe.

## Validación ejecutada

- `npm test`: **72/72 aprobadas**, sin omisiones. Incluye las 70 anteriores y dos nuevas: un contorno cóncavo conserva área sin ocupar su hueco; la malla es cerrada, tiene UV válidas y su área proyectada coincide con el modelo térmico.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado; incluye ambas páginas y el PNG local. El chunk compartido es de 541,55 kB minificado y 141,16 kB gzip; persiste la advertencia de Vite por superar 500 kB.
- Revisión en navegador de crudo/dorado, quemado y cambio de cara. Carga limpia sin errores ni advertencias en consola tras corregir el material y la carga inicial de textura.
- Carga inicial del juego con el matambre integrado, también sin errores ni advertencias. La revisión de primera persona sigue requiriendo Chrome/Edge con Pointer Lock, como en fase 2.

La calibración del equilibrio entre punto interno y dorado detectada después de fase 2 sigue pendiente. Esta muestra mejora apariencia y geometría; no cambia las fórmulas ni los coeficientes térmicos para ocultar ese pendiente. Todos los parámetros físicos del prototipo conservan su carácter provisional.
