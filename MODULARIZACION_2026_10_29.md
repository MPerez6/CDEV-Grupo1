# Separación del proyecto en módulos

29/10/2026. Solicitada y autorizada por el usuario para distribuir trabajo entre los roles del equipo.

## Resultado

Nueve módulos funcionales: `core`, `sim`, `gameplay`, `level`, `art`, `lighting`, `effects`, `audio` y `ui`. Muestras en `previews`, texturas en `assets`. Guía completa y tabla de responsabilidades sugeridas en [ARQUITECTURA_MODULAR.md](ARQUITECTURA_MODULAR.md); cada carpeta incluye instrucciones breves.

- El archivo principal pasa de 314 líneas aproximadamente a seis líneas de arranque. La composición de la partida está en `core/application.ts`; la escena delega a módulos especializados.
- Se separan construcción de modelos, llamas, caída/dispersión de brasas e iluminación del brasero. La selección conserva los volúmenes y sus identificadores.
- Jugabilidad recibe objetivos con tipo/índice/ID; la selección por cámara es un adaptador separado. La interfaz recibe mensajes por callback y mantiene HTML, CSS y F3 en su carpeta.
- Audio conserva el chisporroteo sintético y expone sus parámetros; iluminación centraliza patio, fuego y muestras. Ninguno recalcula combustión o cocción.
- Se actualizaron importaciones, las dos entradas HTML de muestras y las pruebas afectadas. Sin dependencias nuevas ni cambios en comandos de desarrollo.

## Validación

| Comprobación | Resultado |
| --- | --- |
| Línea base antes de extraer | 74 pruebas, TypeScript y build aprobados |
| Pruebas finales | 76/76 aprobadas |
| Regresiones nuevas | Entrada/acciones/encendido y pausa; pinza/orientación/colocación/giro/devolución, incluyendo limpieza de listeners |
| TypeScript | Aprobado tras corregir la extracción de plantilla HTML |
| Build | Aprobado, 51 módulos transformados |
| Conservación de archivos | SHA-256 idéntico en siete fuentes de simulación y seis recursos/documentos de assets |
| Dependencias | 41 archivos TS, sin ciclos de importación de ejecución; sin dependencias visuales en simulación |
| Navegador | Partida inicial, menú, F3 y muestras de matambre/vacío renderizan sin errores ni advertencias de consola |

Persiste la advertencia de Vite por bundle mayor que 500 kB, ya existente antes de esta tarea. No se repitió una partida completa con captura del mouse ni una evaluación auditiva. Los estados térmicos y las interacciones principales están cubiertos por pruebas; el audio conserva su síntesis y su conexión a inicio/pausa. La organización no equivale a una nueva calibración térmica.

Captura del arranque: `C:/Users/lucia/Documents/ChatGPT/simulador-asado/proyecto-modular-2026-10-29.jpg`.

## Respaldo

El proyecto de trabajo no contiene un repositorio Git. Antes de modificarlo se copiaron fuentes, pruebas, HTML y documentación afectada a:

`C:/Users/lucia/Documents/ChatGPT/simulador-asado/respaldos/modularizacion-2026-10-29/`

El respaldo incluye `preservados.json` con las huellas de simulación y assets. Los scripts de extracción y comprobación utilizados permanecen en la carpeta de trabajo `simulador-asado`, fuera del código del juego. No son necesarios para ejecutar el proyecto ni deben volver a ejecutarse como parte del arranque.

No se añadieron NPCs, heladera ni efectos o sonidos nuevos. La revisión del equilibrio entre dorado y temperatura interna continúa pendiente.
