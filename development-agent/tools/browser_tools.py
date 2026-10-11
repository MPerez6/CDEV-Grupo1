import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CURRENT_DIR = Path(__file__).resolve().parent
SCREENSHOT_PATH = CURRENT_DIR.parent / "debug_screen.png"

def inspect_running_game(url: str = "http://localhost:5173") -> str:
    """Abre el juego web local, interactúa con el menú para entrar al juego 3D,
    captura advertencias/errores de consola y toma una captura de la parrilla."""
    
    console_errors = []
    
    try:
        with sync_playwright() as p:
            # Flags para evitar GPU stall y habilitar WebGL fluido en headless
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--use-gl=angle",
                    "--use-angle=default",
                    "--enable-webgl",
                    "--ignore-gpu-blocklist",
                    "--disable-gpu-watchdog"
                ]
            )
            page = browser.new_page(viewport={"width": 1280, "height": 720})

            # Filtrar advertencias benignas de ReadPixels y registrar errores reales
            def handle_console(msg):
                txt = msg.text
                if "ReadPixels" in txt:
                    return
                if msg.type in ["error", "warning"]:
                    console_errors.append(f"[{msg.type.upper()}] {txt}")

            page.on("console", handle_console)
            page.on("pageerror", lambda exc: console_errors.append(f"[UNCAUGHT EXCEPTION] {exc}"))

            # 1. Navegar a la app local
            page.goto(url, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)

            # 2. Hacer clic en el botón de inicio del menú si está presente
            # Busca botones comunes de inicio: 'Empezar', 'Prender el Fuego', 'Comenzar' o el primer button visible
            start_buttons = page.locator("button")
            if start_buttons.count() > 0:
                try:
                    # Intenta hacer clic en el botón de comenzar
                    start_buttons.first.click(timeout=3000)
                    print("[PLAYWRIGHT] Clic en botón de menú realizado.")
                except Exception as e:
                    print(f"[PLAYWRIGHT] No se pudo hacer clic en el botón: {e}")

            # 3. Esperar que el canvas 3D y Rapier completen la simulación
            page.wait_for_timeout(3500)

            # 4. Tomar screenshot de la parrilla ya en juego activo
            page.screenshot(path=str(SCREENSHOT_PATH))
            browser.close()

        err_report = "\n".join(console_errors) if console_errors else "Sin errores ni advertencias críticas en consola."
        return f"Captura tomada tras iniciar la partida en {SCREENSHOT_PATH}.\nReporte de consola:\n{err_report}"

    except Exception as e:
        return f"Error al inspeccionar la app web: {str(e)}. Verifica que 'npm run dev' esté corriendo en {url}."