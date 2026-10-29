# Videojuego del asado — Contexto técnico para Codex

**Versión 0.2 · 17 de octubre de 2026 · Proyecto universitario**

> MENSAJE PRINCIPAL A CODEX: continuar el prototipo existente. NO rehacerlo desde cero, NO reducir las cinco capas térmicas y NO esperar a cerrar todas las mecánicas para escribir código.

Este documento consolida lo conversado sobre el juego, las aclaraciones originales y una inspección directa del código del prototipo 0.1. Distingue lo CONFIRMADO de lo PROPUESTO, PROVISIONAL y PENDIENTE.

### Organización modular — 29/10/2026

- El usuario autorizó dividir el proyecto por sistemas según los roles compartidos. Implementados nueve módulos: `src/core`, `sim`, `gameplay`, `level`, `art`, `lighting`, `effects`, `audio`, `ui`. Cada uno tiene un README. Muestras en `src/previews`, recursos conservados en `src/assets`.
- `src/main.ts` sólo arranca la aplicación. `core/application.ts` compone sistemas y posee el avance del reloj; `core/scene.ts` compone la escena. Controles y acciones extraídos a `gameplay`; HTML/CSS y diagnóstico a `ui`; chisporroteo a `audio`; luces de patio/fuego/muestras a `lighting`; llamas y brasas visuales a `effects`; modelos a `art`; entorno a `level`.
- Las acciones reciben objetivos semánticos, sin cámara/DOM. Audio recibe flujo y pausa; iluminación recibe estado simple del fuego. No se incorporó bus de eventos ni dependencias nuevas.
- Los siete archivos TypeScript de `sim/` y los seis archivos de `assets/` se conservaron byte por byte, comprobados por SHA-256. Se mantienen cinco capas, ×10, reglas y materiales aprobados.
- Validación: 76/76 pruebas (incluye dos regresiones de integración entrada → acciones → simulación), TypeScript y build aprobados; 41 módulos TS sin ciclos de ejecución. Partida inicial, F3 y muestras de matambre/vacío comprobados en navegador sin errores/advertencias de consola. No se repitió una partida completa con captura del mouse ni una evaluación auditiva; sí se conservaron sus conexiones y los parámetros de audio. Persiste advertencia de bundle >500 kB.
- Guía vigente: [ARQUITECTURA_MODULAR.md](ARQUITECTURA_MODULAR.md). Mapa de rutas anteriores y actuales incluido para interpretar informes históricos. Resultados y respaldo: [MODULARIZACION_2026_10_29.md](MODULARIZACION_2026_10_29.md). Heladera y calibración térmica pendientes, sin cambios en esta tarea.

### Vacío cocinado con dos caras — 22/10/2026

- Recibidas las dos referencias cocinadas: primera foto = cuero B dorado/amarillo, segunda = fibras A con costra marrón oscura. Se conservaron en `docs/referencias/vacio-cuero-cocinado.png` y `vacio-fibras-cocinado.png`.
- Nuevo atlas `src/assets/meat/vacio-cooked-sides-v1.png`, registrado sobre el crudo: izquierda B, derecha A. Transición independiente por cara a partir de `brown`, carbonización irregular a partir de `burn`; ambas superficies siguen su cara al girar.
- Muestra `/vacio-preview.html` ampliada a crudo/dorado/quemado. Son estados ilustrativos, no una validación del punto interno de cocción. Se conserva el modelo térmico y el matambre aprobado.
- Validación: 74/74 pruebas, TypeScript y build aprobados; revisión visual de crudo, dorado, quemado y giro sin errores de consola. Permanece el aviso de bundle mayor que 500 kB.
- Pendientes: aprobación visual del usuario, otros cortes y calibración térmica ya identificada. Heladera sin iniciar. Informe: [FASE_2_1_VACIO_COCINADO.md](FASE_2_1_VACIO_COCINADO.md).

### Vacío crudo con dos caras — 22/10/2026

- El usuario aprobó el aspecto del matambre y aportó tres fotos de vacío crudo: cara con membrana/cuero, cara de fibras/grasa y vista de espesor. Confirmó que ambos lados son distintos y que el vacío es considerablemente más grueso que el matambre.
- Modelo integrado con dos superficies fotográficas independientes: A = fibras/grasa, B = membrana/cuero. Al iniciar, la cara B queda arriba; al dar vuelta se ve la A. Atlas local `src/assets/meat/vacio-raw-sides-v1.png`, con prompt y referencias conservados.
- Se sustituyó el bloque plano con cubierta blanca uniforme por un volumen irregular, redondeado y más grueso, con músculo rojo en el borde y franja superficial fina. Se conservan masa, espesor térmico, cinco capas y coeficientes. El contorno y su exposición se mantienen vinculados al catálogo.
- Muestra orbital `/vacio-preview.html`: ambas caras del crudo, vista de espesor y giro. Se comparte infraestructura de geometría y escenario de muestras con el matambre aprobado.
- Estado de esa entrega: el cocinado era provisional. Actualizado posteriormente con las dos fotografías cocinadas, según la sección anterior. No se inició heladera.
- Validación y archivos: [FASE_2_1_VACIO_CRUDO.md](FASE_2_1_VACIO_CRUDO.md).

### Fase 2.1 — muestra visual de matambre · 22/10/2026

- El usuario pidió mejorar el reconocimiento visual antes de la heladera y eligió un acabado cercano al fotorrealismo. Aportó foto de matambre crudo y cocinado. Se trabaja primero en esta muestra para validar el acabado antes de extenderlo al resto.
- Nuevo atlas local generado con imagegen a partir de esas referencias: `src/assets/meat/matambre-raw-cooked-v1.png`. Referencias, procedencia y prompt conservados en el proyecto.
- Matambre con contorno cóncavo y faldón, malla cerrada con relieve y borde fino, material físico con mezcla crudo/dorado y quemado irregular independiente por cara. Misma masa, espesor, cinco capas y fórmulas térmicas.
- Se amplió el cálculo geométrico de huella/ocupación a polígonos cóncavos mediante triangulación; permite conservar la forma visible en el cálculo de exposición, sin rellenar el recorte con calor o colisión.
- Muestra de material en `/matambre-preview.html`, separada de la partida, con estados de ejemplo y cámara orbital. El juego usa el mismo recurso y los estados reales de la simulación.
- El usuario aprobó esta muestra visual. Pendientes: mejora equivalente de los otros cortes y calibración térmica del equilibrio entre dorado y punto interno detectada después de fase 2. No se inició heladera.
- Informe de validación: [FASE_2_1_MATAMBRE.md](FASE_2_1_MATAMBRE.md).

### Nuevos cortes — fase 2 · 20/10/2026

- Fase 1 aceptada por el usuario para avanzar. Fase 2 implementada: matambre, vacío, tira de asado, falda, chorizo y morcilla. Validación jugable del equipo pendiente; fase 3 sin iniciar.
- Catálogo en `src/sim/meatCatalog.ts`, con masa, espesor/diámetro, propiedades efectivas y objetivos configurables. Rangos recomendados de flujo sin recorte del calor real. Todos los coeficientes nuevos son PROVISIONALES.
- Cinco capas planas de cara A a B para los cortes; cinco volúmenes radiales de envoltura a centro para los embutidos. Caras A/B independientes para dorado, quemado y deterioro de envoltura. R rueda media vuelta los embutidos.
- Morcilla precocida: objetivo de recalentamiento PENDIENTE (`target: null`), sin asignar una temperatura universal de seguridad. Objetivos de las otras carnes son configuraciones de jugabilidad.
- Varias instancias independientes en `world.meats`; se conserva `world.meat` como alias del matambre original. La exposición reemplaza el antiguo promedio 2 × 2 por intersecciones del contorno con todos los sectores cubiertos, incluyendo giro y reflexión al dar vuelta.
- Mesa ampliada PROVISIONAL a la derecha, con siete piezas: seis tipos y un segundo vacío. Esta presentación permite validar la fase 2 sin anticipar la heladera. No hay nombres flotantes por producto.
- Con pinza: E recoge, clic coloca, R da vuelta/rueda, Q orienta 90°, E sobre una tabla devuelve a su lugar. Colisiones de contornos evitan superposición y salida de la parrilla. Rechazar una colocación conserva la pieza sostenida.
- Validación automática: 70/70 pruebas y TypeScript aprobados; ver resultado final de compilación y revisión visual en [FASE_2_CORTES.md](FASE_2_CORTES.md).

### Auditoría de brasas — fase 1 · 20/10/2026

- Implementada y verificada automáticamente; validación jugable del equipo pendiente antes de fase 2. No se incorporaron nuevos cortes ni heladera.
- Fórmulas y coeficientes térmicos conservados: referencia de 50 g, 1,2 g/min iniciales, 616 W brutos, 110,88 W útiles; sector de 0,0225 m², 80 % propio y 5 % por vecino, con pérdida exterior.
- Corregidos el consumo suspendido en la pala, la duplicación de una misma brasa entre sectores y el descarte de tiempo con FPS bajos. Paso fijo centralizado de 0,25 s, factor ×10 y hasta 25 pasos por frame conservando lo pendiente. ESC y pestaña oculta pausan.
- Protección ante intervalos inválidos. Se conservan identidad, masa, ceniza y progreso en traslados; se mantienen cinco capas en la carne.
- `npm test`: 48/48; `npm run typecheck` y `npm run build`: aprobados. Persiste advertencia por tamaño del bundle. Parámetros aún PROVISIONALES, sin validación experimental.
- Detalles y procedimiento de validación: [AUDITORIA_FASE_1_BRASAS.md](AUDITORIA_FASE_1_BRASAS.md).

### Actualización confirmada e implementada — 18/10/2026

- Velocidad global reducida de ×20 a ×10 para probar jugabilidad. Cada porción simulada de brasas se ve como 18–22 fragmentos irregulares cercanos, tanto al caer del brasero como debajo de la parrilla. Evitar discos achatados; mantener masa y energía por porción, sin multiplicarlas por el número de fragmentos dibujados. Dispersión y caída son visuales, con su velocidad normal.
- Encendido progresivo por piezas, según posición y exposición al papel y a combustible caliente vecino. Las piezas inferiores maduran y caen antes; las superiores se acomodan sin perder progreso ni masa. El brasero tiene capacidad limitada y admite reposición cuando queda espacio. El carbón o leña nuevos empiezan fríos y pueden prender con las piezas calientes restantes sin volver a usar papel. No usar un fuego global que caliente toda la carga simultáneamente. Discretización inicial PROVISIONAL: 12 espacios en tres niveles, un espacio por carbón/leña fina y dos por leña gruesa, con coeficientes de contacto centralizados en `src/sim/parameters.ts`.
- Referencia de asador de mampostería: campana y ladrillos interiores; mesada común con brasero a la izquierda y parrilla fija a la derecha, sin caños superiores. Materiales debajo, separados en leña gruesa, leña fina, carbón vegetal y una caja con papel/ramitas. El brasero está elevado y las brasas caen sobre la mesada refractaria bajo la canasta, por encima del depósito. Esto reemplaza la ubicación anterior sobre el piso del patio.
- Brasero abierto de varillas de hierro en V y con patas; combustible dentro, papel/ramitas debajo.
- El papel se consume y deja de producir llama; el combustible que prendió continúa por su cuenta. La leña da llama dentro de la canasta; el carbón pasa a brasa roja. Sin una fuente encendida no progresa el calentamiento.
- Las brasas listas caen automáticamente justo debajo del brasero, sobre su superficie de apoyo, sin bandeja negra ni avisos automáticos. Se conserva el golpe opcional y la devolución de inmaduros.
- La masa residual y la ceniza se conservan al desprender, recoger y devolver fragmentos; las brasas también se consumen sobre el piso.
- Duración del papel por carga: 300 segundos simulados (30 reales a ×10), PROVISIONAL. Los umbrales de encendido y el paso interno están en `src/sim/parameters.ts`. No son parámetros experimentalmente validados.
- Esta actualización reemplaza las descripciones históricas de llama inferior permanente, bandeja delantera y caída por intervalos. El resto del documento conserva el contexto de la versión 0.1.


## 01. Instrucciones operativas para Codex

1. Abrir la carpeta local del proyecto y leer AGENTS.md, README.md, package.json y los archivos de src/sim antes de modificar nada.
2. Confirmar el estado real de la aplicación; ejecutar npm test, npm run typecheck y npm run build, sin afirmar éxito hasta ver la salida.
3. Proponer e implementar cambios pequeños y verificables, respetando siempre las decisiones CONFIRMADAS.
4. Cambiar coeficientes en src/sim/parameters.ts cuando sea posible, sin dispersar números mágicos.
5. Mantener la simulación separada del renderizado 3D y del control del personaje.
6. Añadir pruebas cuando se modifique consumo de combustible, transferencia térmica, giro de carne o conservación de estados.
7. Informar qué archivos cambió, qué comandos ejecutó, qué falló y qué valores siguen siendo provisionales.

> Prioridad actual: ejecutar y validar la versión 0.1 en la computadora del usuario; después corregir y mejorar la secuencia jugable encender → extraer brasas → distribuir → cocinar matambre.


## 02. Visión general del juego

Simulador 3D de asado argentino en primera persona. El jugador controla a un asador, prepara el fuego en un brasero izquierdo, obtiene brasas, las distribuye bajo una parrilla fija y cocina carnes utilizando señales visuales y auditivas. La física se calcula internamente: no se muestran temperaturas y porcentajes de manera habitual al jugador.

| Aspecto | Decisión vigente |
| --- | --- |
| Tecnologías | Three.js + TypeScript + Vite; entorno 3D web. El profesor recomendó Three.js. |
| Perspectiva | Primera persona con WASD y mouse. |
| Prioridad | Jugabilidad del asado y prototipo ejecutable, antes que escenarios grandes y clientes. |
| Método de trabajo | Iteraciones breves: programar → ejecutar → probar → corregir. |
| Fidelidad técnica | Conservar cinco capas térmicas por carne. Coeficientes físicos son calibrables. |
| Agente | Codex ayuda a implementar; el equipo decide reglas y revisa resultados. |


## 03. Jerarquía de decisiones y cambios históricos

CONFIRMADO = decisión expresa del equipo en la conversación o documento original. PROPUESTO = diseño de implementación todavía revisable. PROVISIONAL = valor numérico de ensayo. PENDIENTE = no definido; no bloquear la programación por ello.

- La parrilla NO es regulable: se descartaron altura variable y manivela. Brasero a la izquierda.
- El clima, el viento y la humedad del combustible se asumen óptimos; no desarrollar meteorología.
- Los trozos negros con partes rojas que caen al golpear el brasero DEBEN volver al brasero; no se dejan debajo.
- Se eligió mantener la simulación de CINCO CAPAS de carne, incluso después de conversar sobre una simplificación. No cambiar a un único porcentaje de cocción.
- El usuario quiere comenzar a programar ahora: lo no acordado se implementa con valores provisorios claramente centralizados, y se valida en el juego.

## 04. Mecánicas confirmadas: fuego, brasero y parrilla


### 4.1. Encendido con carbón

1. Colocar carbón vegetal seco dentro del brasero izquierdo.
2. Colocar papel de diario o ramitas secas pequeñas debajo del brasero.
3. Encender ese material inferior; la llama transmite calor al carbón.
4. Esperar a que parte del carbón se vuelva brasa rojo vivo.
5. Las brasas listas caen espontáneamente o se desprenden al golpear el brasero.
6. Recoger las brasas rojas con pala y trasladarlas bajo la parrilla.


### 4.2. Encendido con leña

1. Poner leña pequeña dentro del brasero y papel/ramitas debajo.
2. Encender el material inicial; cuando la leña pequeña sostiene el fuego, agregar piezas progresivamente mayores.
3. La leña genera brasas listas. Retirarlas igual que con carbón.


### 4.3. Extracción y mantenimiento

- Una brasa lista se reconoce por rojo vivo; parte cae por su cuenta.
- El jugador puede golpear el brasero para desprender más. Si empiezan a caer fragmentos negros/rojos, debe dejar de golpear.
- Los fragmentos inmaduros se levantan con pala, vuelven al brasero y conservan su progreso de encendido.
- Las brasas colocadas bajo la parrilla pierden masa, generan calor, terminan produciendo ceniza y requieren reposición.
- El jugador estima la intensidad por el chisporroteo y aspecto de la carne; también mira si las brasas se agotaron. Una capa blanca superficial no implica necesariamente brasa fría.
- No hay termómetro visible ni barra de duración de brasas en el HUD final; F3 es diagnóstico de desarrollo.

## 05. Mecánicas confirmadas: carne y cocción

- Se conserva un modelo térmico interno de cinco capas por cada corte de carne.
- Las dos caras acumulan dorado y quemado independientes. Dar vuelta conserva temperaturas, dorado y tiempo ya transcurrido.
- El calor de las brasas calienta primero el exterior y progresa hacia el interior; la carne puede quemarse por fuera y seguir insuficientemente cocida dentro.
- Como referencia sensorial de «cocida» se eligió exterior ligeramente dorado y, al cortarla, ausencia de jugos rojizos pronunciados; eso no reemplaza el cálculo de temperatura interna ni criterios de inocuidad.
- La carne puede secarse por exceso de cocción; el nivel de quemado no se revierte al girarla.
- El tiempo para cocinar no es un contador fijo por corte: debe surgir de brasas, transferencia de calor, espesor y propiedades del alimento.
- Primera carne de trabajo: matambre vacuno. Luego ampliar a vacío, tira de asado/costilla, falda, chorizo, morcilla y otros.

## 06. Modos de juego y contenido posterior


### 6.1. Entrenamiento — confirmado

El jugador asa libremente, sin clientes ni penalización por demorarse. Aprende cortes y manejo del fuego. El tiempo de la simulación física sigue avanzando mientras juega.


### 6.2. Clientes — confirmado como objetivo, no implementado

Un cliente solicita un corte y punto de cocción; la exigencia varía. Puede venir con familia y pedir cortes diferentes por integrante (ejemplo: costilla, matambre y falda). El jugador debe buscarlos en heladera y reconocerlos visualmente, no solo por etiquetas. Hay reacciones humorísticas ante pedidos mal cocidos; perder un cliente por corte incorrecto o demasiada espera.


### 6.3. Pendientes de modo clientes

- Stock de heladera limitado o ilimitado.
- Número de clientes insatisfechos para provocar despido y si todas las faltas pesan igual.
- Duración de jornada, sistema de recompensa/progresión, puntos de cocción por corte y tolerancia de clientes.
> No agregar heladera, clientes, guardado ni sistema de jornadas hasta tener una instrucción concreta. No bloquear la demo por estas decisiones.


## 07. Estado real del proyecto al 17/10/2026

La carpeta local Windows indicada por el usuario es:

```text
C:\Users\lucia\Desktop\UTN\5to\creatividad y desarrollo\asado-prototipo-v01
```

El usuario ejecutó npm install y posteriormente npm run dev desde la carpeta correcta. Informó que Vite v7.3.7 inició y mostró http://localhost:5173/. Eso confirma que el servidor de desarrollo arranca; NO confirma que ya se haya inspeccionado visualmente toda la escena ni que las interacciones funcionen.

El primer intento de npm run dev devolvió “Missing script: dev”, aparentemente por ejecutar el comando en una carpeta distinta. Ese error quedó resuelto al iniciar Vite correctamente.

npm install informó 21 vulnerabilidades (9 moderadas, 11 altas, 1 crítica); no se ha revisado todavía el resultado detallado de npm audit. No ejecutar npm audit fix --force sin revisar cambios incompatibles.


### 7.1. Tecnología y comandos

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

package.json declara Three.js ^0.180.0, TypeScript ^5.9.0, Vite ^7.1.0, @types/three ^0.180.0 y Node >=22.12.0. El servidor observado utilizó Vite 7.3.7; no confundir versión instalada con rango declarado.


### 7.2. Archivos principales inspeccionados

| Archivo | Función existente |
| --- | --- |
| src/main.ts | Controles primera persona, interacciones, F3, sonido provisional, movimiento y bucle de simulación fija. |
| src/game/scene.ts | Escena Three.js, parrilla fija, brasero, suministros y matambre de geometría provisional. |
| src/sim/parameters.ts | Parámetros físicos y de jugabilidad; principal lugar para calibración. |
| src/sim/embers.ts | Encendido simplificado; desprendimiento, devolución, consumo de masa y cuadrícula térmica. |
| src/sim/meat.ts | Matambre con cinco capas, conducción 1D, dos caras, dorado/quemado y jugosidad. |
| src/sim/world.ts | Integra brasero, cuadrícula térmica y carne. |
| tests/simulation.test.ts | Siete casos automatizados sobre brasas, transferencia y matambre. |
| AGENTS.md / README.md | Instrucciones al agente y guía de ejecución/controles. |


### 7.3. Qué está implementado y qué no

| Implementado en v0.1 | Limitación / próxima mejora |
| --- | --- |
| Primera persona + WASD, mouse y colisiones simples | No hay sistema completo de cuerpos rígidos ni manos animadas. |
| Carga de carbón y leña mediante E en cajas | La carga va directamente al brasero; no existe aún transporte físico completo desde cada caja. |
| Encender bajo el brasero con herramienta 1 | El encendido usa progreso simplificado por pieza, no combustión física detallada de llama. |
| Golpear, caída de brasas y devolución con pala | Desprendimientos definidos por reglas temporales; falta refinamiento visual y de balance. |
| Malla de calor 6×4 y consumo de brasas | Malla física interna vs. escena 3D visual simplificada; sin geometría de carbón individual avanzada. |
| Matambre con cinco capas y dos caras | Un solo corte; sin variedad de espesores, huesos, clientes ni heladera. |
| Audio sintético de chisporroteo y debug F3 | Sonido y representación visual de prueba; no son la versión final. |


## 08. Controles disponibles en el prototipo

| Control | Acción actual |
| --- | --- |
| W / A / S / D + mouse | Mover al personaje / mirar alrededor. |
| E | Interactuar con cajas de combustible y matambre; con pinza recoger carne. |
| 1 + clic | Encendedor sobre la zona de ignición debajo del brasero. |
| 2 + clic | Pala: recoger fragmentos caídos; depositar brasas en parrilla o devolver inmaduros. |
| 3 + clic | Pinza: colocar matambre transportado sobre un sector. |
| 4 + clic | Atizador: golpear brasero. |
| R con pinza mirando la carne | Dar vuelta el matambre colocado. |
| F3 | Mostrar/ocultar temperaturas y valores internos. |
| Esc | Liberar mouse/pausar al desbloquear los controles. |


## 09. Modelo de brasas: implementación actual y valores provisionales

La masa combustible m (g) disminuye por integración temporal. Una brasa no se apaga por un cronómetro predefinido; cuando ya no tiene masa combustible, deja de liberar nueva energía. El valor de duración ~50 min es una referencia resultante del modelo, no un temporizador independiente.

```text
r = 1.2 * (m0 / 50)^(2/3) * (0.7 + 0.3*m/m0)   [g/min]
consumo_g = min(m, r * dt_seg / 60)
m_nueva = max(0, m - consumo_g)
E = (consumo_g / 1000) * 30_800_000             [J]
P_util = (E / dt_seg) * 0.18                      [W]
```

La energía útil es distribuida en la cuadrícula: 80 % al sector de origen, 5 % a cada vecino directo existente. Fuera del borde, esa parte se pierde. Después se expresa como flujo W/m² dividiendo por el área de la celda. Las brasas se consumen aunque no haya carne encima.

| Parámetro | Valor actual | Carácter |
| --- | --- | --- |
| Masa estándar de brasa | 50 g | Provisional |
| Consumo inicial de referencia | 1,2 g/min | Provisional |
| Poder calorífico de carbón | 30,8 MJ/kg | Referencia aproximada |
| Aprovechamiento útil | 18 % | Provisional |
| Ceniza | 5 % de masa consumida | Provisional |
| Cuadrícula | 6 × 4; 24 sectores | Provisional |
| Dimensión física de cálculo | 90 × 60 cm | Provisional |
| Reparto a sector propio/vecinos | 80 % / 5 % cada uno | Provisional |
| Carbón: calentamiento | 13 min simulados | Provisional EN CÓDIGO |
| Leña chica: calentamiento | 10 min simulados | Provisional EN CÓDIGO |
| Leña grande: calentamiento | 18 min simulados | Provisional EN CÓDIGO |

Observación: los tiempos 13/10/18 min del código son concretos y reemplazan solamente a efectos de prototipo las franjas exploratorias más amplias del diseño. No son parámetros físicos validados.


## 10. Modelo térmico del matambre: conservar cinco capas

El matambre se representa con cinco capas unidimensionales a lo largo del espesor. En cada paso temporal, el programa calcula el calor recibido desde las brasas, pérdidas al aire, conducción entre capas y una evaporación simplificada. Cada capa actualiza su temperatura, y el estado del centro se toma de la capa 3.

```text
Flujo entre capas vecinas: P = (k * A / dx) * (T_i - T_(i+1))
Para cada capa: delta_T = energia_neta_J / (masa_capa_kg * calor_especifico)
Temperatura superficial efectiva para dorado: T_sup = T_capa_externa + q_in * 0.025
```

La última ecuación de temperatura superficial NO es una ley física: es un ajuste fenomenológico todavía sin validar. Mantenerla identificada como aproximación o sustituirla por una alternativa fundamentada y comprobable.

| Parámetro | Valor actual | Carácter |
| --- | --- | --- |
| Masa matambre | 1,5 kg | Provisional |
| Espesor | 1,5 cm | Provisional |
| Temperatura inicial | 5 °C | Provisional |
| Ambiente | 25 °C | Provisional |
| Densidad | 1.070 kg/m³ | Aprox.; recalibrable |
| Calor específico | 3.800 J/(kg·°C) | Aprox.; recalibrable |
| Conductividad | 0,48 W/(m·°C) | Aprox.; recalibrable |
| Absorción efectiva | 0,60 | Provisional |
| Convección superficial | 12 W/(m²·K) | Provisional |
| Número de capas | 5 | CONFIRMADO |
| Centro objetivo | 68–74 °C | Provisional, para primer matambre |
| Dorado óptimo por cara | 30–60/100 | Provisional |

Las dos caras se registran como A y B; cara inferior recibe flujo mayor; se puede invertir orientación sin borrar estados. El índice de dorado aumenta por tiempo y temperatura superficial efectiva y se ralentiza por factor de secado. El quemado se incrementa con calor excesivo y no se revierte. Juiciness = 0–100 es un índice de juego, no la masa de agua medida.

Criterio de éxito actual en código: centro entre 68–74 °C, ambas caras con dorado 30–60, quemado <10 en ambas y jugosidad >35. Son condiciones de prototipo; la apariencia y el color del jugo al cortar NO son prueba de inocuidad.


### 10.1. Tiempo simulado

timeScale = 10: por 1 segundo real transcurren 10 segundos simulados cuando la cámara está bloqueada en modo juego. Se redujo desde ×20 tras la prueba de jugabilidad del usuario. El bucle de actualización térmica conserva dt = 0,25 segundos simulados por paso.


## 11. Pruebas existentes y criterios de aceptación

El repositorio contiene SIETE pruebas automatizadas. La presencia de siete casos está verificada inspeccionando tests/simulation.test.ts; su ejecución debe confirmarse en el equipo local mediante npm test.

1. Una brasa encendida pierde masa, crea ceniza y genera potencia positiva.
2. Una brasa de masa cero no emite potencia por combustión ni adquiere masa negativa.
3. Golpear no crea combustible y permite devolver fragmentos aún inmaduros al brasero.
4. Una celda caliente entrega flujo al sector propio y vecinos.
5. Cinco capas de matambre guardan temperaturas diferentes; girar conserva sus valores.
6. Una carne sin brasas no se calienta por encima del ambiente de forma instantánea.
7. Una distribución de brasas moderada puede alcanzar la ventana de cocción definida para prototipo.

Agregar, conforme evolucionemos: balance de masa al transferir fragmentos, manejo de acumuladores de caída, variación del flujo por celdas, continuidad de calor al girar la carne, estabilidad numérica con distintos FPS y limitaciones del índice de dorado.


## 12. Próxima tarea para Codex — ejecutar, observar, mejorar


### Fase A — Validación inmediata, sin cambios de diseño

1. Inspeccionar los archivos reales, abrir la escena en localhost y reportar errores visibles o de consola. No asumir que funciona porque Vite inició.
2. Ejecutar npm test, npm run typecheck, npm run build y registrar salidas.
3. Probar secuencia: carbón → papel/ramitas → encender → caída → golpe → devolución de inmaduros → pala → distribuir brasas → pinza → colocar matambre → girar → F3.
4. Corregir fallos mínimos de interacción, orientación, clics, colisiones o UI antes de agregar contenido.


### Fase B — Mejorar el primer ciclo jugable

- Mejorar la manipulación perceptible de combustible, pala y carne sin exigir física corporal avanzada.
- Hacer que los cambios de color en carbón/brasa/carne coincidan con sus estados internos y que el audio comunique el calor.
- Verificar que el centro del matambre y las caras se comporten de manera coherente con el flujo recibido; calibrar coeficientes centralizados sin abandonar cinco capas.
- Asegurar que el cambio de escena/render no modifique el resultado físico.

### Fase C — Después de estabilizar el ciclo

- Agregar configuraciones por corte (vacío, costilla, falda, chorizo, morcilla), reutilizando el mismo motor, con parámetros específicos y seguridad de cada alimento.
- Luego, implementar heladera, modo entrenamiento/cliente, órdenes múltiples y reacciones humorísticas.

## 13. Lista de decisiones pendientes — no bloqueantes

| Pendiente | Tratamiento por ahora |
| --- | --- |
| Dimensiones visuales definitivas / distancia brasa-carne | Usar la escena actual; centralizar calibración. |
| Coeficientes térmicos y duración de brasas | Mantener provisionales, ajustar tras pruebas. |
| Tiempo global ×10 y pausa | Probar esta velocidad más lenta tras la prueba a ×20. |
| Cómo retirar ceniza agotada | No requiere definición para v0.1. |
| Corte de prueba para inspeccionar interior | Idea opcional, aún no obligatoria. |
| Otros cortes, espesores, grasa, hueso | Desarrollar cuando el matambre sea funcional. |
| Stock de heladera | Sin decidir. |
| Puntos de cocción por cliente | Sin decidir; primer matambre usa punto de prueba. |
| Errores para despido y puntos por jornada | Sin decidir; idea de despedir es tentativa. |
| Personajes, animaciones, arte definitivo, sonido real | Trabajo posterior a núcleo jugable. |


## 14. Prompt listo para iniciar una sesión con Codex

```text
Actuá como agente principal de programación para el proyecto universitario de simulador de asado argentino en primera persona. Leé primero AGENTS.md, README.md, CONTEXTO_CODEX_ASADO.md, package.json y los archivos existentes en src/ y tests/. No reinicies el proyecto: continuá sobre la versión 0.1 que ya existe en esta carpeta.

Restricciones obligatorias: Three.js + TypeScript + Vite; brasero a la izquierda; parrilla fija sin manivela; clima y combustibles secos; extracción de brasas rojo vivo y devolución de fragmentos inmaduros al brasero; conservación de masa al trasladar brasas; matambre con exactamente cinco capas térmicas, dos caras y estados independientes. La mayoría de valores físicos son PROVISIONALES y deben concentrarse en src/sim/parameters.ts. No los presentes como validados. No agregues clientes ni heladera en esta primera tarea.

Primera tarea: inspeccioná el código y ejecutá npm test, npm run typecheck y npm run build; después identificá los problemas que impedirían completar en primera persona el ciclo encender → formar brasas → golpear → devolver fragmentos inmaduros → distribuir brasas → poner y girar matambre → comprobar las cinco temperaturas con F3. Corregí en cambios pequeños lo que puedas demostrar y añadí pruebas cuando cambies lógica del simulador. Informá archivos modificados, pruebas ejecutadas, limitaciones y siguiente mejora concreta. No hagas cambios masivos sin necesidad.
```


## 15. Documentos y autoridad de las fuentes

- Documento original: aclaraciones_juego_asado.docx — modos de juego, clientes, heladera, errores y despido tentativo.
- Documento previo: Diseno_videojuego_asado_documento_maestro_v01.docx — diseño consolidado del fuego y cocción, con fórmulas y parámetros exploratorios.
- Repositorio inspeccionado: asado-prototipo-v01 — su código/README/AGENTS.md definen lo que realmente está implementado hoy.
- Conversaciones posteriores: el usuario confirmó primera persona, Three.js como opción recomendada por su profesor, mantener 5 capas y empezar a programar sin esperar más definiciones.
Regla de precedencia: para el funcionamiento deseado, una decisión confirmada posterior del usuario prevalece sobre propuestas antiguas. Para describir el estado de implementación, el código real prevalece sobre descripciones previas. Si diseño y código discrepan, informar la diferencia antes de corregirla.


---
**Fin del documento de traspaso.**
