"""
asador_harness.py - Loop principal y lógica del diagrama
"""

from google import genai
from dotenv import load_dotenv
from google.genai import types
from tools.fs_tools import read_file, write_file, list_directory
from tools.verification_tools import run_tests
from tools.assets_tools import inspect_3d_models
from tools.package_tools import inspect_dependencies
from tools.rag_tools import consult_graphics_expert
from tools.git_tools import push_to_repository
from pathlib import Path
from tools.browser_tools import inspect_running_game
from PIL import Image

# Carga las variables definidas en el archivo .env en os.environ
load_dotenv()

# Lista consolidada de tools para la API de Gemini
ALL_TOOLS = [
    read_file,
    write_file,
    list_directory,
    run_tests,
    inspect_3d_models,
    inspect_dependencies,
    consult_graphics_expert,
    push_to_repository
]

SYSTEM_PROMPT = """
Eres Asador.js, Desarrollador Senior de Software 3D especializado en React Three Fiber, Three.js, Rapier y Zustand.
Tu misión es desarrollar de forma iterativa y autónoma el simulador de Asado Argentino.

Reglas de Operación:
1. Consulta técnica previa: Ante cualquier duda sobre cómo instanciar componentes R3F, configurar colisionadores de Rapier, cargar modelos GLTF o escribir shaders GLSL, ejecuta la herramienta `consult_graphics_expert` antes de modificar el código.
2. Verificación de compilación: Toda modificación debe compilar limpiamente con run_tests antes de finalizar.
3. Inspección previa: Antes de tocar código, inspecciona directorios y lee los archivos relacionados.
4. Modularidad: Separa estrictamente el estado (Zustand), los shaders (GLSL), la escena (R3F) y la UI (HTML/Drei).
5. Fidelidad parrillera: Aplica las reglas del asado argentino (el hueso primero al fuego, la sal parrillera antes de tirar el corte, el control del calor mediante la distancia de brasas).
6. No asumas que el código compila: Siempre espera la respuesta de verificación antes de dar por cerrada una tarea.
7. Commits limpios: Usa mensajes descriptivos en español siguiendo convención Conventional Commits (feat, fix, refactor).

REGLA ESTRICTA DE MODELOS 3D:
- ESTÁ PROHIBIDO adivinar o inventar nombres de archivos .glb o .gltf (como 'fogonero_criollo.glb').
- Antes de escribir cualquier useGLTF(), DEBES ejecutar obligatoriamente `inspect_3d_models()`.
- SOLO puedes llamar a useGLTF con rutas que hayan aparecido explícitamente en el resultado de inspect_3d_models.
- Si para un elemento (ej. fogón, pala, leña) no existe un modelo .glb en la lista, DEBES crearlo de forma procedural usando primitivas nativas de Three.js (mesh, cylinderGeometry, boxGeometry, etc.) SIN llamar a useGLTF.
"""

def execute_objective(objective: str, max_iterations: int = 5, model_id: str = "gemini-3.8-flash"):
    client = genai.Client(vertexai=True)
    chat = client.chats.create(
        model=model_id,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=ALL_TOOLS,
            temperature=0.15,
        )
    )

    print(f"\n[HARNESS] Iniciando Objetivo: {objective}")
    
    # 1. Objetivo del proyecto -> Inspeccionar repositorio -> Planificar siguiente cambio[cite: 1]
    prompt = (
        f"Objetivo actual: {objective}.\n"
        "1. Inspecciona el repositorio y los assets disponibles.\n"
        "2. Planifica los cambios necesarios.\n"
        "3. Edita los archivos correspondientes usando write_file."
    )

    for iteration in range(1, max_iterations + 1):
        print(f"\n==========================================")
        print(f"[HARNESS] Iteración {iteration} / {max_iterations}")
        print(f"==========================================")

        response = chat.send_message(prompt)
        # Obtener el contenido textual si existe, o el nombre de las tools invocadas
        text_output = ""
        if response.text:
            text_output = response.text
        elif response.function_calls:
            calls = [fc.name for fc in response.function_calls]
            text_output = f"[Llamada a herramientas: {', '.join(calls)}]"
        else:
            text_output = "[Operación sin texto]"

        print(f"[AGENTE]: {text_output}\n")

        # 2. Ejecutar lint, tests y build[cite: 1]
        print("[HARNESS] Ejecutando verificación de build...")
        verification = run_tests()

        # 3. ¿Pasa las verificaciones?
        if verification.startswith("SUCCESS"):
            print("[HARNESS] ✓ Las verificaciones de build pasaron sin errores.")
            
            # --- VERIFICACIÓN VISUAL Y DE COMPORTAMIENTO ---
            print("[HARNESS] Ejecutando inspección del navegador en vivo...")
            browser_feedback = inspect_running_game("http://localhost:5173")
            print(f"[REPORTE NAVEGADOR]:\n{browser_feedback}\n")

            screenshot_path = Path("debug_screen.png")

            # Armamos el prompt multimodal con chequeos visuales y de animación
            eval_instructions = (
                "El build compiló con éxito y se inspeccionó la app web en tiempo real.\n"
                f"Reporte de consola y runtime:\n{browser_feedback}\n\n"
                "CRITERIOS DE ACEPTACIÓN VISUAL Y FUNCIONAL:\n"
                "1. Escala y modelos: ¿Los cortes y la parrilla son visibles y tienen escala realista?\n"
                "2. Consola: ¿Hay advertencias de keys duplicadas, buffers de Three.js o errores de físicas?\n"
                "3. Herramientas y Animaciones: Revisa si los utensilios (pala, atizador, tenedor) "
                "tienen interactividad o animaciones activas (ej. interpolación al moverse, oscilación rústica "
                "en primera persona o feedback al usarlos con useFrame/GSAP). Si los utensilios son estáticos o flotan rígidos sin animación, reporta 'OBJETIVO_INCOMPLETO'.\n"
                "4. Fogón y brasas: ¿El estado inicial no tiene brasas saturando la parrilla?\n\n"
                "EVALUACIÓN:\n"
                "- Si cumple todos los criterios: llama a push_to_repository y responde 'OBJETIVO_CUMPLIDO'.\n"
                "- Si falta animación, los modelos no se ven o hay errores: detalla exactamente qué archivos "
                "debes modificar, responde 'OBJETIVO_INCOMPLETO' y planifica la corrección."
            )

            eval_contents = [eval_instructions]

            # Inyección de la captura de pantalla para visión multimodal
            if screenshot_path.exists():
                try:
                    img = Image.open(screenshot_path)
                    eval_contents.append(img)
                    print("[HARNESS] Captura de pantalla (debug_screen.png) adjuntada para análisis visual.")
                except Exception as e:
                    print(f"[HARNESS] Advertencia: No se pudo cargar la imagen para visión: {e}")

            eval_res = chat.send_message(eval_contents)

            # 1. Extracción segura del texto y detección de tool calls
            eval_text = eval_res.text or ""
            called_tools = [fc.name for fc in eval_res.function_calls] if eval_res.function_calls else []

            if eval_text:
                print(f"[EVALUACIÓN]: {eval_text}")
            elif called_tools:
                print(f"[EVALUACIÓN]: El agente invocó herramientas: {', '.join(called_tools)}")
            else:
                print("[EVALUACIÓN]: Respuesta vacía sin llamadas.")

            # 2. Verificación de cierre
            cumplido = "OBJETIVO_CUMPLIDO" in eval_text or "push_to_repository" in called_tools

            if cumplido:
                print(f"[HARNESS] Proceso finalizado. Cambios enviados al repositorio.")
                return True
            else:
                # El agente detectó fallos visuales o falta de animaciones
                prompt = (
                    f"El análisis visual o funcional detectó problemas:\n{eval_text}\n"
                    "Corrige el código implementando las animaciones/escalas faltantes usando write_file."
                )
        else:
            # No pasa las verificaciones -> Analizar errores y logs[cite: 1]
            print("[HARNESS] ✗ Fallo en las verificaciones.")
            
            # ¿Quedan iteraciones?[cite: 1]
            if iteration >= max_iterations:
                print("[HARNESS] ALERTA: Iteraciones agotadas. Informando bloqueo y estado actual.[cite: 1]")
                print(f"Detalle del error:\n{verification}")
                return False
            
            print("[HARNESS] Quedan iteraciones disponibles. Enviando reporte de error al agente...[cite: 1]")
            prompt = (
                f"El build falló con el siguiente trace de error:\n{verification}\n"
                "Analiza el error de sintaxis/tipos y corrígelo editando los archivos afectados."
            )
    
    return False