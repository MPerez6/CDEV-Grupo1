# Fase 2 — Catálogo de carnes y cocción simultánea

20/10/2026. Fase 1 aceptada por el usuario. **Fase 2 implementada, con validación automática y revisión visual. Pendiente la prueba jugable del equipo antes de comenzar fase 3.**

## Comportamiento implementado

El catálogo define matambre, vacío, tira de asado, falda, chorizo y morcilla. Cada instancia tiene identidad, cinco temperaturas, masa por capa, orientación, posición, dorado y quemado independientes por cara, jugosidad y tiempo transcurrido. Los embutidos incluyen deterioro irreversible de la envoltura por cada mitad exterior. Recoger, transportar y volver a colocar una pieza conserva su estado térmico.

La demo comienza con siete piezas en una mesa ampliada a la derecha: seis tipos y un segundo vacío. Esta presentación es **PROVISIONAL** para probar la fase sin incorporar todavía la heladera. La primera fila contiene matambre, vacío y tira; la segunda, falda, chorizo y morcilla; detrás queda el segundo vacío. No hay rótulos flotantes por producto. Los nombres y cálculos se consultan apuntando con F3.

| Producto | Masa | Espesor / diámetro | Flujo recomendado | Objetivo de jugabilidad |
| --- | --- | --- | --- | --- |
| Matambre | 1,5 kg | 1,5 cm | 3.000–5.500 W/m² | Centro 68–74 °C |
| Vacío | 1,8 kg | 3,5 cm | 4.000–7.000 W/m² | Centro 68–74 °C |
| Tira de asado | 1,2 kg | 3 cm | 3.000–6.000 W/m² | Centro 68–74 °C |
| Falda | 1,2 kg | 2,5 cm | 4.000–6.500 W/m² | Centro 68–74 °C |
| Chorizo | 150 g | Ø 3,2 cm | 4.500–7.500 W/m² | Centro ≥ 71 °C |
| Morcilla precocida | 140 g | Ø 3,2 cm | 2.500–4.500 W/m² | PENDIENTE, `target: null` |

Los rangos de flujo son referencias de calibración, **no límites**. Un flujo inferior o superior sigue aportando energía. Los objetivos y el indicador de resultado del prototipo no certifican inocuidad alimentaria. La morcilla conserva su condición de precocida y su historial de calentamiento al transportarla, sin declarar un recalentamiento objetivo alcanzado.

## Modelo térmico y exposición

- **Cortes planos:** cinco volúmenes desde cara A hasta cara B. Se preservó el modelo térmico del matambre. Espesor, masa, calor específico y conductividad se obtienen del catálogo; vacío y tira tienen propiedades efectivas distintas, provisionales, para aproximar grasa y presencia de hueso.
- **Embutidos:** cinco volúmenes anulares desde la envoltura hasta el centro. Las fracciones de masa son 36 %, 28 %, 20 %, 12 % y 4 %, según volumen. El centro corresponde a la quinta capa. La conducción usa área de interfaz cilíndrica y distancia entre centros de los anillos. A/B son dos mitades exteriores para dorado, quemado y rodado, no cinco caras.
- **Energía:** potencia incidente × área proyectada × absorptividad; cada intercambio entre capas resta la misma energía que suma a la siguiente. Se mantienen convección y evaporación. La corrección superficial para dorado no agrega energía a las cinco capas. No se alteró el consumo ni la eficiencia de las brasas.
- **Huella:** se intersecta el contorno convexo de la pieza con cada sector. El peso es área cubierta / área proyectada total de la pieza. Se contemplan orientación y reflexión del contorno al dar vuelta. No se reutiliza el promedio fijo 2 × 2 del prototipo anterior. Las coberturas se almacenan y se recalculan al cambiar la colocación, orientación o cara.
- **Ocupación:** la colocación ajusta el centro en los bordes para conservar la pieza dentro de la parrilla y rechaza superposiciones reales de contornos. Si no cabe, queda sostenida. Un giro que produzca superposición o salida se rechaza sin alterar el estado.
- **Independencia:** el mundo actualiza todas las piezas, estén en mesa, pinza o parrilla. Solo las que están en la parrilla reciben su flujo de brasas. La cámara y la visibilidad no deciden qué se simula.

Las geometrías utilizan el mismo contorno y dimensiones del catálogo: matambre plano y ancho; vacío grueso con cubierta grasa; tira alargada con cinco huesos visibles; falda irregular con vetas grasas; chorizo cilíndrico rosado; morcilla cilíndrica oscura. Color superficial, marcas de parrilla, grasa y envoltura evolucionan por pieza y por cara. El renderizado no modifica la simulación.

## Pruebas y resultados

- `npm test`: **70/70 aprobadas**, sin omisiones. Se agregaron 22 pruebas en `tests/meats.test.ts` y se mantuvo la suite previa.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado. JavaScript minificado: 570,68 kB; gzip: 152,67 kB. Persiste la advertencia existente de Vite por superar 500 kB.
- Revisión en navegador: carga de la aplicación y del menú, mesa con siete piezas, seis productos colocados simultáneamente, avance de cocción y giro/rodado mediante una página temporal que empleaba los módulos reales. Sin errores de consola en esa revisión visual. La página de prueba se eliminó.
- El navegador integrado rechaza Pointer Lock al entrar a primera persona. Por eso **no se afirma una validación gráfica completa de WASD y clic en primera persona**; debe realizarse en Chrome/Edge del usuario. La lógica de interacción y los rayos de selección tienen cobertura automática.

Las nuevas pruebas comprueban datos del catálogo; exactamente cinco capas y suma de masas; anillos radiales; balances energéticos; avance del calor hacia el centro; calentamiento más lento del vacío frente al matambre con igual flujo; calor fuera del rango recomendado; conservación al girar, rodar y mover; objetivo del chorizo y ausencia de objetivo inventado para morcilla; deterioro de envoltura; intersecciones y pesos por área; dos vacíos independientes; rechazo de colocaciones; contorno reflejado; energía de piezas simultáneas; volumen, selección, alcance de las siete piezas y ausencia de mutaciones desde el renderizado.

La prueba previa de FPS ahora compara matambre, vacío y chorizo colocados simultáneamente a 10, 30, 60 y 144 FPS, incluyendo frames variables. Sus estados físicos son idénticos al mismo tiempo simulado. Las identidades difieren entre escenarios independientes y se excluyen de esa comparación.

Se adaptó la prueba de absorción de fase 1 a un flujo interior uniforme conocido de 4.928 W/m²: así sigue comprobando la aplicación única del 18 %, sin depender del promedio fijo de cuatro sectores que esta fase reemplazó. No se ajustaron coeficientes para satisfacer pruebas.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/sim/meatCatalog.ts` | Catálogo, contornos, dimensiones y parámetros provisionales de superficie |
| `src/sim/meat.ts` | Motor compartido de cinco capas planas/radiales, objetivos y estado por pieza |
| `src/sim/meatFootprint.ts` | Intersecciones geométricas y contribución por área |
| `src/sim/world.ts` | Colección de carnes, exposición, transporte, giro y colocación |
| `src/game/meat-visual.ts` | Geometrías diferenciadas y cambios visuales por estado |
| `src/game/scene.ts` | Mesa de preparación, sincronización de varias piezas y selección por identidad |
| `src/main.ts` | Controles de piezas individuales, orientación Q y diagnóstico por pieza |
| `src/style.css` | Espacio del diagnóstico de varias carnes |
| `tests/meats.test.ts` | 22 pruebas nuevas |
| `tests/clock.test.ts` | Escenario con varios cortes y comparación física sin identidad entre escenarios |
| `tests/embers-audit.test.ts` | Fixture de absorción compatible con exposición geométrica |
| `README.md`, `CONTEXTO_CODEX_ASADO.md`, `FASE_2_CORTES.md` | Estado, controles, resultados y límites |

## Parámetros provisionales y límites

Las masas, espesores, diámetros, rangos y objetivos solicitados están configurados. Siguen siendo **PROVISIONALES** las propiedades térmicas efectivas, contornos, grasa, influencia del hueso, absorptividad, evaporación, dorado, quemado y sensibilidad de envolturas. Están centralizados en `parameters.ts` y `meatCatalog.ts`. No hay validación experimental ni temporizadores fijos de cocción.

La conducción es 1D. Los anillos de un embutido promedian la temperatura alrededor de su circunferencia; no modelan una distribución angular ni tres dimensiones completas. Los huesos y la grasa usan propiedades efectivas y representación visual, sin resolver una malla térmica propia. Los contornos son convexos y provisionales. El deterioro de envoltura se expresa mediante oscurecimiento, rugosidad y marcas, sin simulación física de rotura.

La mesa tiene siete piezas iniciales; no genera reposición automática ni stock ilimitado. La creación mediante catálogo queda preparada para integrarse con la heladera en fase 3. No se agregaron clientes, jornadas, guardado ni evaluación de pedidos. El reloj permanece ×10 y el paso fijo en 0,25 s simulados. No se realizó un benchmark formal de FPS gráficos.

## Prueba manual para validar esta fase

1. Ejecutá `npm run dev` desde esta carpeta y abrí la dirección que indique Vite en Chrome o Edge. Entrá al patio; mantené el procedimiento habitual de fuego y brasas.
2. A la derecha, equipá **3** y apuntá a una carne sobre una tabla. **E** la recoge. Con la pieza sostenida, **Q** la orienta y **clic** sobre un sector la coloca. Si no cabe, elegí otro sector.
3. Colocá al menos dos piezas, incluidos los dos vacíos, sobre zonas con distinta cantidad de brasas. Deben calentar y dorar de manera independiente. Alejate y volvé: sus estados deben continuar avanzando.
4. Apuntá a una carne con la pinza y pulsá **R**: los cortes se dan vuelta; chorizo y morcilla ruedan media vuelta. **Q** cambia su orientación sobre la parrilla si hay espacio.
5. Con **E**, retirala y trasladala a otra zona o devolvela apuntando a una tabla y pulsando **E**. Comprobá con **F3** que ninguna acción reinicie temperaturas, jugosidad, dorado o quemado. La cara apoyada también se conserva al transportarla.
6. Revisá en F3 las cinco capas de cada producto; en embutidos, el centro es el último valor. Compará caras y deterioro de envoltura. La morcilla debe indicar objetivo pendiente.

La validación de estos controles y del ritmo de juego cierra la fase 2 antes de comenzar la heladera.
