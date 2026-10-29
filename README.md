# El asador — prototipo técnico 0.1

**Prototipo de videojuego de asado argentino en primera persona** con **Three.js + TypeScript + Vite**.

Proyecto integrador del Grupo 1 de **Creatividad y Desarrollo de Entornos Virtuales**. [Documento de diseño del proyecto (SDD)](https://docs.google.com/document/d/1GbEH0rROyApu9ctND5c7Ve0V3s5hRTtGMRxR29JUnEo).

**Organización modular — 29/10/2026:** el código se divide en base técnica (`core`), simulación (`sim`), jugabilidad (`gameplay`), escenario (`level`), modelos/materiales (`art`), iluminación (`lighting`), efectos (`effects`), sonido (`audio`) e interfaz (`ui`). Cada módulo tiene un README. Consultá [ARQUITECTURA_MODULAR.md](ARQUITECTURA_MODULAR.md) para responsabilidades sugeridas del equipo, contratos, archivos a editar y pruebas. El punto de entrada sigue siendo `src/main.ts`; los comandos y las URL de las muestras se conservan. Validación en [MODULARIZACION_2026_10_29.md](MODULARIZACION_2026_10_29.md).

Es un **prototipo de entrenamiento** para comprobar encendido, brasas y cocción de **matambre, vacío, tira de asado, falda, chorizo y morcilla**, con cinco capas térmicas y estado independiente por pieza. No es todavía un juego terminado. No contiene clientes, heladera, modelos definitivos ni guardado de partida.

**Muestra visual del matambre — 22/10/2026:** nueva silueta basada en las fotos del equipo, volumen con bordes afinados, fibras y membranas visibles, transición a dorado y carbonización por cara. Para revisar el material de cerca, con el servidor iniciado abrí `/matambre-preview.html`: permite comparar crudo/dorado, cambiar a quemado, mirar la otra cara y orbitar con el mouse. Los botones de esa muestra son estados visuales de ejemplo, separados de la partida. El matambre del juego utiliza el mismo modelo, conducido por su estado térmico real. Detalle y recurso generado en [FASE_2_1_MATAMBRE.md](FASE_2_1_MATAMBRE.md).

**Vacío crudo y cocinado — 22/10/2026:** dos caras diferenciadas según las fotos del usuario: membrana/cuero en B y fibras con grasa irregular en A. Al dorarse, B pasa a cuero dorado con grasa ámbar y A a costra de músculo más oscura. Cada cara usa su propio estado de dorado y quemado, conservado al girar. El volumen es más grueso que el matambre; se conservan 1,8 kg, 3,5 cm de espesor térmico y cinco capas. Abrí `/vacio-preview.html` para comparar las dos caras con muestras de crudo/dorado/quemado, girar y ver el espesor. El juego utiliza el mismo material con estados reales. Ver [FASE_2_1_VACIO_COCINADO.md](FASE_2_1_VACIO_COCINADO.md).

## Ejecutar

Requiere Node.js 22.12 o superior y conexión a internet durante la primera instalación de dependencias.

```bash
git clone https://github.com/MPerez6/CDEV-Grupo1.git
cd CDEV-Grupo1
npm ci
npm run dev
```

Si ya clonaste el repositorio, ejecutá `npm ci` y `npm run dev` desde su carpeta. El archivo `package-lock.json` fija las versiones de dependencias para el equipo.

Abrí la dirección local que muestra Vite (habitualmente `http://localhost:5173/`).

Para comprobar los cálculos base:

```bash
npm test
npm run typecheck
npm run build
```

## Controles

| Tecla | Acción |
| --- | --- |
| WASD / mouse | Moverse / mirar |
| E | Interactuar (agregar carbón/leña/papel, levantar carne) |
| 1 / clic | Encendedor: mirar debajo del brasero |
| 2 / clic | Pala: tomar brasas caídas y depositar sobre sectores |
| 3 / clic | Pinza: colocar la pieza sostenida en un sector disponible |
| 4 / clic | Atizador: golpear el brasero cuando haya brasas listas |
| R | Dar vuelta el corte / rodar media vuelta el embutido, mirándolo con la pinza |
| Q | Orientar 90° la pieza sostenida o apuntada en la parrilla, con pinza |
| F3 | Ver temperaturas y datos internos |
| ESC | Pausar y liberar el mouse |

## Procedimiento de prueba

1. Apuntá al sector de **CARBÓN VEGETAL** debajo de la mesada y pulsá **E** (cada acción agrega tres trozos). O usá **LEÑA FINA** y después **LEÑA GRUESA**, en los huecos inferiores separados.
2. Apuntá a la caja de **PAPEL / RAMITAS** en el cuarto hueco inferior y pulsá **E**.
3. Equipá **1**, apuntá al papel debajo de la canasta y hacé clic izquierdo.
4. El papel se consume; si el combustible tomó el encendido, continúa ardiendo dentro de la canasta. Esperá a que se vuelva rojo: las brasas listas caen automáticamente sobre la mesada refractaria, justo debajo, sin avisos.
5. Opcional: equipá **4** y hacé clic sobre el brasero para golpearlo. Si cae carbón negro/rojo, devolvelo al brasero.
6. Equipá **2**, apuntá a las brasas sobre la mesada bajo la canasta y hacé clic para cargar la pala. Si son brasas listas, clic sobre un sector de parrilla para dispersarlas. Si es un fragmento inmaduro, clic sobre el brasero para devolverlo.
7. Repetí para distribuir brasas en varios sectores de cocción.
8. Equipá **3**, acercate a una carne sobre las tablas de la derecha y presioná **E** para levantarla. Hay seis tipos de producto y un segundo vacío para probar piezas iguales.
9. Apuntá a un sector de parrilla y hacé clic para colocarla. **Q** cambia su orientación. Si no cabe o se superpone, permanece en la pinza.
10. Apuntá a la pieza y presioná **R** para darla vuelta o rodarla media vuelta si es un embutido. **E** permite retirarla; con la pieza sostenida, **E** sobre una tabla la devuelve a su lugar original.
11. Colocá varias carnes y alejate: continúan calentándose. Con **F3**, apuntá a una pieza para revisar sus capas, caras y exposición; el panel también lista los centros de todas las piezas.

**Nota de controles:** la primera versión simplifica el transporte de combustible desde los huecos inferiores: E lo incorpora directamente al brasero. Las herramientas y la carne sí utilizan acciones explícitas.

**Asador:** estructura de mampostería con ladrillos interiores y campana, sin caños ni regulación superior. Brasero a la izquierda y parrilla fija a la derecha sobre una mesada común; debajo, cuatro huecos separados para leña gruesa, leña fina, carbón vegetal y una caja con papel/ramitas.

**Brasero:** canasta abierta de varillas de hierro en V, con patas. El carbón y los troncos se ven dentro; el papel y las ramitas aparecen debajo al agregarlos. Al encender, las llamas nacen abajo y alcanzan el combustible a través de las varillas. El papel tiene duración limitada y desaparece al agotarse. La madera encendida mantiene llamas dentro de la canasta; el carbón evoluciona principalmente hacia el rojo vivo. Las brasas maduras caen directamente debajo, sobre la mesada, sin bandeja ni mensajes automáticos. Se consumen también fuera de la canasta y conservan su masa residual al pasarlas a la parrilla. La combustión sigue usando el modelo simplificado provisional.

**Encendido provisional:** cada carga de papel/ramitas dura 300 segundos simulados (30 segundos reales a ×10). Si no logra prender el combustible, se apaga: agregar papel nuevo permite reintentar. La leña grande sola no sostiene el fuego inicial; comenzar con leña pequeña. Los tiempos y umbrales están centralizados en `src/sim/parameters.ts` y requieren calibración de jugabilidad.

**Aspecto de las brasas:** cada porción se dibuja con 18–22 fragmentos angulosos de tamaños y orientaciones diferentes, con superficies carbonizadas, zonas rojas y ceniza. Al caer se separan ligeramente y, al depositarlos bajo la parrilla, forman grupos dispersos cercanos, sin discos achatados ni cuadrados de color. Es una mejora visual: cada porción conserva su masa y energía simuladas; dibujar más fragmentos no genera más combustible. El reloj está en ×10; las animaciones mantienen su velocidad normal.

**Auditoría de brasas — fase 1:** consumo, potencia y reparto térmico comprobados con pruebas cuantitativas. Las brasas también se consumen durante el transporte en la pala. El reloj usa pasos fijos de 0,25 s simulados y conserva el tiempo pendiente ante frames lentos; ESC y ocultar la pestaña pausan la partida. Resultados, correcciones y validación manual en [AUDITORIA_FASE_1_BRASAS.md](AUDITORIA_FASE_1_BRASAS.md). La fase 2 queda pendiente de validación del equipo.

**Cortes — fase 2 implementada:** catálogo configurable y varias piezas simultáneas. Los cortes planos usan cinco capas de una cara a otra; chorizo y morcilla usan cinco volúmenes radiales desde la envoltura hasta el centro. El calor se pondera por el área real de cada contorno que cubre cada sector; no hay recorte por el rango recomendado. La mesa ampliada es una solución provisional de prueba antes de la heladera. Informe, parámetros y límites en [FASE_2_CORTES.md](FASE_2_CORTES.md). La fase 3 queda pendiente de validación del equipo.

**Carga y reposición:** cada pieza ocupa un lugar en una pila de capacidad limitada. El calor del papel alcanza principalmente las piezas inferiores; las encendidas transmiten calor a sus vecinas y a las de arriba. Cada pieza madura en su propio momento y cae todavía con masa combustible. La pila se acomoda, abre espacio y permite agregar carbón o leña nuevos con E en el depósito. La carga nueva empieza fría y prende con el combustible caliente próximo, sin volver a usar papel mientras ese encendido se sostenga. Si no cabe toda una tanda, se agregan solo las piezas que entran. Si no cabe un fragmento devuelto, permanece en la pala.

La pila actual usa 12 espacios repartidos en tres niveles; carbón y leña fina ocupan uno por pieza, leña gruesa dos. Es una discretización **provisional** de volumen y contacto, no una simulación validada de combustión ni de cuerpos rígidos. El color también progresa desde la parte inferior de cada pieza hacia la superior. Capacidad, exposición y coeficientes de propagación se ajustan en `src/sim/parameters.ts`. F3 muestra la ocupación y el progreso por pieza para calibrar.

## Estructura

- `src/sim/parameters.ts`: constantes provisionales del motor.
- `src/sim/embers.ts`: encendido simplificado, desprendimiento y consumo de brasas, cuadrícula 6×4.
- `src/sim/meat.ts`: modelo 1D de **cinco capas térmicas**, caras independientes, dorado, humedad y quemado.
- `src/sim/meatCatalog.ts`: configuración provisional de los seis productos y coeficientes de superficie.
- `src/sim/meatFootprint.ts`: contornos, intersección por área y pesos térmicos.
- `src/sim/world.ts`: integración de los dos modelos.
- `src/sim/clock.ts`: reloj de paso fijo independiente del renderizado, con recuperación de tiempo pendiente.
- `src/core/`: arranque, renderizador, composición de escena y ciclo de actualización.
- `src/gameplay/`: primera persona, selección, herramientas, acciones y controles.
- `src/level/`: patio, asador, parrilla, mesas, suministros y distribución.
- `src/art/`: modelos, geometrías, texturas y materiales de los cortes y combustible.
- `src/lighting/`: iluminación del patio, del fuego y de las muestras.
- `src/effects/`: llamas, fragmentos visuales de brasas y animación de caída/dispersión.
- `src/audio/`: chisporroteo sintético, volumen y pausa del sonido.
- `src/ui/`: HTML, estilos, menú, HUD, mensajes y diagnóstico F3.
- `src/previews/`: muestras orbitales de matambre y vacío.
- `src/assets/`: recursos gráficos y documentación de su procedencia.
- `src/main.ts`: punto de entrada que conecta la aplicación y sus estilos.
- `tests/`: pruebas automáticas de la simulación.

## Decisiones que sí están acordadas

- Cámara de primera persona.
- Brasero a la izquierda y **parrilla de altura fija**.
- Condiciones óptimas: combustible seco, clima y viento adecuados.
- Carbón en el brasero, papel o ramitas pequeñas debajo para encenderlo.
- Con leña, comenzar por piezas pequeñas y añadir piezas grandes cuando el fuego mejore.
- Brasas maduras color rojo vivo: algunas caen solas; golpear desprende otras.
- Si caen fragmentos negros con partes rojas, se devuelven al brasero.
- El jugador traslada las brasas listas debajo de la parrilla.
- Temperatura/dorado no se enseñan en la interfaz habitual: F3 los revela **solo para depuración**.
- Cada corte usa **cinco capas térmicas**: no se abandona ese modelo.

## Parámetros PROVISIONALES (pendientes de calibración)

| Valor | Estado |
| --- | --- |
| Velocidad de reloj ×10 | Prueba de jugabilidad actual |
| Parrilla 90×60 cm virtuales / cuadrícula de 24 sectores | Provisional |
| Porción de brasas de referencia 50 g | Provisional |
| Tasa de consumo inicial de 1,2 g/min | Provisional |
| Poder calorífico del carbón usado como referencia: 30,8 MJ/kg | Referencia, sujeto al combustible concreto |
| Aprovechamiento térmico del 18 % | Provisional |
| Reparto 80 % sector + 5 % por cada vecino | Provisional |
| Humedad evaporada y ecuaciones de dorado/quemado | Provisional |
| Matambre de 1,5 kg, espesor uniforme de 1,5 cm | Provisional |
| Propiedades térmicas constantes y objetivo de centro 68–74 °C | Provisional |
| Tiempos de encendido de carbón/leña | Provisional |

**Precisión:** aunque las cinco capas se calculan mediante conducción de energía, la temperatura superficial efectiva, la evaporación y los coeficientes de dorado son aproximaciones de prototipo. No hay validación experimental. El color del jugo al cortar no sustituye las temperaturas internas ni criterios reales de inocuidad.

## Qué falta para convertirlo en videojuego completo

1. Refinar agarre y manipulación física de objetos; colisiones detalladas.
2. Calibrar tiempos y valores térmicos mirando el resultado en pantalla.
3. Refinar modelos de los seis productos y calibrar sus propiedades térmicas particulares.
4. Crear heladera y reconocimiento visual de cortes.
5. Incorporar sistema de clientes, pedidos múltiples, puntos solicitados y reacciones.
6. Jornada, errores, progresión, ambientación, guardado y pruebas de jugabilidad.

No hace falta cerrar ninguno de estos puntos para empezar a programar. El objetivo del prototipo es **poder probar primero**.
