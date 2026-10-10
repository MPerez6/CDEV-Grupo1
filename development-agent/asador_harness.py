"""
asador_harness.py - Loop principal y lógica del diagrama
"""

from google import genai
from dotenv import load_dotenv
from google.genai import types
from tools.fs_tools import read_file, write_file, list_directory
from tools.verification_tools import run_tests
from tools.assets_tools import inspect_3d_models
from tools.git_tools import push_to_repository

# Carga las variables definidas en el archivo .env en os.environ
load_dotenv()

# Lista consolidada de tools para la API de Gemini
ALL_TOOLS = [
    read_file,
    write_file,
    list_directory,
    run_tests,
    inspect_3d_models,
    push_to_repository
]

SYSTEM_PROMPT = """
Eres Asador.js, Desarrollador Senior de Software 3D especializado en React Three Fiber, Three.js, Rapier y Zustand.
Tu misión es desarrollar de forma iterativa y autónoma el simulador de Asado Argentino.

Reglas de Operación:
1. Inspección previa: Antes de tocar código, inspecciona directorios y lee los archivos relacionados.
2. Modularidad: Separa estrictamente el estado (Zustand), los shaders (GLSL), la escena (R3F) y la UI (HTML/Drei).
3. Fidelidad parrillera: Aplica las reglas del asado argentino (el hueso primero al fuego, la sal parrillera antes de tirar el corte, el control del calor mediante la distancia de brasas).
4. No asumas que el código compila: Siempre espera la respuesta de verificación antes de dar por cerrada una tarea.
5. Commits limpios: Usa mensajes descriptivos en español siguiendo convención Conventional Commits (feat, fix, refactor).
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

        # 3. ¿Pasa las verificaciones?[cite: 1]
        if verification.startswith("SUCCESS"):
            print("[HARNESS] ✓ Las verificaciones pasaron sin errores.")
            
            # Revisar el resultado y evaluar si el objetivo se cumplió[cite: 1]
      # Revisar el resultado y evaluar si el objetivo se cumplió
            eval_prompt = (
                "El build pasó con éxito. Revisa tus cambios.\n"
                "¿Consideras que el objetivo propuesto está CUMPLIDO o requieres más cambios?\n"
                "- Si está CUMPLIDO: ejecuta push_to_repository y responde con 'OBJETIVO_CUMPLIDO'.\n"
                "- Si NO: indica 'OBJETIVO_INCOMPLETO' y continúa editando."
            )
            eval_res = chat.send_message(eval_prompt)

            # 1. Extracción segura del texto y detección de tool calls
            eval_text = eval_res.text or ""
            called_tools = [fc.name for fc in eval_res.function_calls] if eval_res.function_calls else []

            if eval_text:
                print(f"[EVALUACIÓN]: {eval_text}")
            elif called_tools:
                print(f"[EVALUACIÓN]: El agente invocó herramientas: {', '.join(called_tools)}")
            else:
                print("[EVALUACIÓN]: Respuesta vacía sin llamadas.")

            # 2. Verificación robusta: se considera cumplido si dice la palabra clave O si llamó a push_to_repository
            cumplido = "OBJETIVO_CUMPLIDO" in eval_text or "push_to_repository" in called_tools

            if cumplido:
                print(f"[HARNESS] Proceso finalizado. Cambios enviados al repositorio.")
                return True
            else:
                prompt = "Continúa con la siguiente parte del objetivo y edita el código."
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