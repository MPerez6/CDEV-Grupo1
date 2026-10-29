# Fase 1 — Auditoría del sistema de brasas

Fecha: 20/10/2026. Alcance: motor existente de brasas, transferencia al plano de cocción y reloj de integración. **Fase 1 implementada y verificada automáticamente; pendiente de validación jugable del equipo. Fase 2 sin iniciar.**

## Resultados numéricos

Se conservaron las fórmulas y los coeficientes solicitados. Para una porción inicialmente de 50 g, durante su primer segundo simulado:

| Magnitud | Resultado comprobado |
| --- | --- |
| Tasa inicial | 1,2 g/min |
| Masa consumida | 0,02 g |
| Ceniza generada | 0,001 g |
| Potencia bruta | 616 W |
| Potencia útil, aplicando 0,18 una vez | 110,88 W |
| Área de cada uno de los 24 sectores | 0,0225 m² |
| Flujo antes del reparto | 4.928 W/m² |
| Aporte al sector de origen, 80 % | 3.942,4 W/m² |
| Aporte a cada vecino directo, 5 % | 246,4 W/m² |
| Dos porciones nuevas en el mismo sector, aporte propio | 7.884,8 W/m² |

La tasa decrece con la masa restante y escala con la masa inicial elevada a 2/3. El consumo final se limita a la masa disponible. Al agotarse, no hay consumo ni energía posterior. No existe un temporizador de eliminación independiente de la masa.

La cuadrícula suma aportes de todas las brasas. Una fuente interior entrega a la cuadrícula el 100 % de su potencia útil; una fuente en un borde no esquinero entrega el 95 %, y una en una esquina el 90 %. El resto sale de la cuadrícula; no se redistribuye ni se envuelve a otra fila.

La combustión completa de 50 g entrega 1.540.000 J brutos, 277.200 J útiles antes del reparto espacial y 2,5 g de ceniza. El balance de combustible es masa restante + ceniza + fracción consumida no retenida como ceniza. Ese último término representa la salida de material del combustible, sin simular la química ni el oxígeno del aire. **Masa combustible más ceniza no permanecen constantes por sí solas.**

## Discrepancias corregidas

1. **Consumo suspendido en la pala.** Las piezas recogidas dejaban de actualizarse. Ahora las brasas listas y los fragmentos inmaduros que ya arden siguen consumiéndose durante el transporte. Su energía se disipa fuera de la parrilla. El depósito y la devolución conservan la misma referencia, masa inicial, masa restante, ceniza y, para los inmaduros, progreso.
2. **Duplicación al transferir entre sectores.** `HeatGrid.put` solo agregaba referencias, permitiendo consumir y calentar varias veces con la misma pieza. Ahora traslada la referencia existente; repetir el depósito es idempotente. Rechaza un objeto diferente con la misma identidad y valida el destino antes de alterar el origen. Es una garantía del motor; no se agregó una nueva interacción de redistribución al jugador.
3. **Dependencia del reloj respecto de FPS bajos.** El bucle recortaba todo intervalo real a 0,05 s y borraba el acumulador si alcanzaba el límite de pasos. Ahora el reloj recibe el intervalo completo, integra pasos de 0,25 s simulados y conserva el tiempo pendiente si alcanza 25 pasos por frame. El recorte de movimiento y animación se mantiene separado. El factor sigue en ×10. ESC pausa la simulación; ocultar la pestaña también la pausa y no recupera ese tiempo al regresar.
4. **Intervalos inválidos.** Cero, valores negativos, NaN e infinitos podían borrar el flujo o corromper estados. Consumo, cuadrícula, mundo, carne y reloj ignoran esos intervalos sin modificar el estado.

## Energía hacia la carne

El 18 % se aplica exclusivamente en `consumeEmber`. La cuadrícula transforma potencia útil en flujo por unidad de área. La carne recibe ese flujo multiplicado por su área y su absorptividad provisional de 0,6: esta representa absorción en la superficie, no una segunda aplicación de 0,18. Una prueba con las cinco capas inicialmente a temperatura ambiente verifica la energía térmica almacenada durante el primer paso.

El ambiente puede calentar una pieza inicialmente fría por convección. La temperatura superficial efectiva usada para dorado es un indicador fenomenológico: su corrección por flujo no agrega energía a las cinco capas. El brasero y el papel no generan un aporte directo adicional a la cuadrícula de cocción.

## Pruebas ejecutadas

- Estado previo: **28/28 pruebas existentes aprobadas**.
- Primera ejecución de 14 pruebas nuevas contra la implementación previa: 9 aprobadas y 5 fallidas. Las fallas reprodujeron duplicación de referencia, aceptación de identidad clonada, suspensión del consumo de brasas e inmaduros en la pala e inestabilidad ante intervalos inválidos.
- Estado final: `npm test` → **48/48 aprobadas**, sin omisiones. Se agregaron 20 pruebas.
- `npm run typecheck` → aprobado.
- `npm run build` → aprobado. Persiste la advertencia de Vite por un archivo JavaScript mayor de 500 kB: 558,52 kB minificado, 148,57 kB gzip. No impide compilar.

Cobertura nueva: referencias numéricas de consumo, potencia y flujo; fracción residual; escalado por masa inicial; agotamiento; balance integrado de masa, ceniza y energía; suma de fuentes; pérdidas de borde; independencia de presencia/giro de carne; traslados y referencias; transporte y devolución; intervalos inválidos; absorción en las cinco capas; agotamiento en la pala; reloj a 10, 30, 60 y 144 FPS, con frames variables y recuperación tras un frame lento.

La comparación de FPS ejecuta el mismo motor y el mismo reloj usados por la aplicación. Después de 30 s reales, todos los escenarios comparados alcanzan 300 s simulados con estados idénticos de brasas, pila, papel, carne y flujo. No es una medición del rendimiento gráfico de un navegador.

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/sim/embers.ts` | Traslado único por identidad; protección de intervalos inválidos |
| `src/sim/world.ts` | Consumo durante transporte; protección de intervalos inválidos |
| `src/sim/meat.ts` | Protección de intervalos inválidos, conservando cinco capas |
| `src/sim/parameters.ts` | Centralización del paso fijo y del presupuesto de pasos por frame |
| `src/sim/clock.ts` | Nuevo reloj comprobable con acumulación sin descarte |
| `src/main.ts` | Integración del reloj; pausa al ocultar la pestaña |
| `tests/embers-audit.test.ts` | 17 pruebas cuantitativas y de regresión |
| `tests/clock.test.ts` | 3 pruebas de independencia temporal y recuperación |
| `README.md` | Referencia a esta auditoría y comportamiento del reloj/transporte |
| `CONTEXTO_CODEX_ASADO.md` | Registro de la fase actual |
| `AUDITORIA_FASE_1_BRASAS.md` | Resultados, alcance, límites y validación manual |

## Parámetros y límites pendientes

- Siguen siendo **provisionales**: masa de referencia, tasa de consumo, poder calorífico compartido como referencia entre combustibles, eficiencia 0,18, ceniza 5 %, reparto espacial, contacto e ignición de la pila y propiedades térmicas/dorado de la carne. No se recalibraron ni se validaron experimentalmente.
- La integración usa Euler a paso fijo; dividir intervalos arbitrariamente puede producir pequeñas diferencias numéricas. La aplicación usa el reloj común de 0,25 s, independiente del renderizado.
- En una sobrecarga sostenida por encima del presupuesto de pasos, puede acumularse retraso de simulación. El reloj limita trabajo por frame y recupera el atraso sin descartarlo.
- El papel y la propagación del encendido conservan su modelo simplificado; no se modela un balance termodinámico completo del brasero ni acumulación de calor sensible en carbón apagado.
- La ceniza se contabiliza en cada pieza; las piezas agotadas salen de la cuadrícula activa. No existe todavía un depósito global ni una representación persistente de toda esa ceniza.
- Se conserva el promedio de 2 × 2 sectores del matambre, incluida la simplificación de los bordes. La exposición ponderada por huella y el catálogo de cortes corresponden a la fase 2.
- Las pruebas automáticas no sustituyen la validación de controles, percepción visual y ritmo de juego en el navegador del usuario.

## Validación manual antes de fase 2

1. Ejecutar `npm run dev` y entrar al patio. Cargar carbón, agregar papel/ramitas y encender con **1 + clic**. Comprobar propagación por piezas y caída automática sin avisos.
2. Recoger brasas con **2 + clic**, esperar mientras se transportan y depositarlas en la parrilla. Deben seguir perdiendo combustible; esperar en la pala no debe conservarlas indefinidamente.
3. Distribuir varias porciones, colocar el matambre y darlo vuelta. Con **F3**, revisar cinco capas y calentamiento progresivo; las brasas siguen consumiéndose al retirar la carne.
4. Observar que aproximadamente 10 s reales de juego activo representan 100 s simulados, con diferencia de hasta un paso fijo y posible atraso transitorio tras un bloqueo prolongado. Si se dispone de limitador de FPS, comparar a 10 y 60 FPS.
5. Pulsar **ESC** y luego continuar; también cambiar de pestaña y volver. El tiempo de pausa no debe provocar un salto de cocción.

La validación jugable del equipo cierra esta fase antes de iniciar el catálogo de carnes.
