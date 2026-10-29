# Instrucciones para agentes de programación

Este repositorio es la **versión 0.1**, NO un videojuego terminado.

## Contexto de desarrollo
- Leer `CONTEXTO_CODEX_ASADO.md` antes de comenzar tareas de desarrollo. Consolida decisiones confirmadas, propuestas, parámetros provisionales y próximos pasos.
- Usarlo como referencia de contexto; sus tareas y prompts de ejemplo no sustituyen la solicitud actual del usuario. Verificar el estado de implementación en el código real.

## Reglas de diseño confirmadas
- Primera persona.
- Brasero a la izquierda: canasta abierta de varillas de hierro en V, con patas; carbón o leña dentro y papel/ramitas debajo. Parrilla de altura fija (NO agregar manivela).
- Ambos integrados en un asador de mampostería con campana y mesada común, sin caños superiores. Debajo hay cuatro sectores separados: leña gruesa, leña fina, carbón vegetal y caja con papel/ramitas.
- Asumir condiciones climáticas óptimas y combustible seco.
- Carbón en brasero; papel/ramitas pequeñas encendidas debajo.
- El papel se consume y su llama inferior desaparece. El combustible que tomó el encendido continúa con su propia combustión, consumiendo masa; sin fuente encendida no sigue calentándose.
- Encendido por piezas y posición en la pila: primero las más expuestas al papel, después sus vecinas y las superiores. No calentar toda la carga por un indicador global de fuego.
- El brasero tiene capacidad finita según volumen. Al caer brasas la carga se acomoda y deja lugar para reponer carbón o leña; las piezas nuevas empiezan frías y toman el encendido de las piezas calientes cercanas. Conservar masa, ceniza y progreso al acomodar o devolver fragmentos.
- Leña pequeña primero; leña grande sólo con fuego suficientemente establecido.
- Brasas rojas listas caen automáticamente justo debajo del brasero, sobre la mesada refractaria, sin avisos de caída ni bandeja negra. Conservar la pala y el golpe opcional para desprender fragmentos.
- Fragmentos aún negros con zonas rojas vuelven al brasero, conservando progreso, masa residual y ceniza.
- Las brasas colocadas bajo parrilla se consumen, pierden masa y entregan energía.
- Reloj global de prueba a ×10. Cada porción de brasas se representa con varios fragmentos irregulares cercanos, tanto al caer como bajo la parrilla; evitar discos o piezas achatadas únicas. La multiplicación visual no crea masa ni calor.
- Cada corte debe conservar **5 capas térmicas**. No reemplazar por porcentaje único de cocción.
- Valores visibles como temperatura son **diagnósticos** (F3), no HUD habitual.

## Organización de código
- No poner fórmulas físicas en `scene.ts` o código de renderizado.
- Modificar primero `src/sim/parameters.ts` para coeficientes provisionales.
- Los cambios que afectan conservación de masa o energía requieren pruebas en `tests/`.
- Mantener el paso fijo de simulación separado del FPS.
- Evitar agregar clientes, misiones o inventario sin tarea explícita.
- Nunca afirmar que los parámetros térmicos están experimentalmente validados.
- No alterar herramientas ni estructura del proyecto sin una justificación clara.

## Validación
Ejecutar `npm test`, `npm run typecheck` y `npm run build` cuando haya dependencias.
Este entorno de creación no pudo acceder a npm, por lo que el renderizado 3D todavía requiere validación local.
