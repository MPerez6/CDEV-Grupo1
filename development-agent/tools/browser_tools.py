import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CURRENT_DIR = Path(__file__).resolve().parent
SCREENSHOT_PATH = CURRENT_DIR.parent / "debug_screen.png"

def inspect_running_game(url: str = "http://127.0.0.1:5173") -> str:
    """Abre el juego web local, interactúa con el menú para entrar al juego 3D,
    captura advertencias/errores de consola y toma una captura de la parrilla."""
    
    console_errors = []
    
    try:
        with sync_playwright() as p:
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

            def handle_console(msg):
                txt = msg.text
                if "ReadPixels" in txt:
                    return
                if msg.type in ["error", "warning"]:
                    console_errors.append(f"[{msg.type.upper()}] {txt}")

            page.on("console", handle_console)
            page.on("pageerror", lambda exc: console_errors.append(f"[UNCAUGHT EXCEPTION] {exc}"))

            # 1. Navegación usando 'domcontentloaded' (evita colgarse por los WebSockets de Vite HMR)
            # Timeout aumentado a 30s
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                # Fallback si 127.0.0.1 falla, reintentar con localhost
                alt_url = "http://localhost:5173" if "127.0.0.1" in url else "http://127.0.0.1:5173"
                page.goto(alt_url, wait_until="domcontentloaded", timeout=30000)

            # Esperar a que el Canvas WebGL monte en el DOM
            page.wait_for_timeout(2000)

            # 2. Hacer clic en el botón de comenzar si está el menú presente
            start_buttons = page.locator("button")
            if start_buttons.count() > 0:
                try:
                    start_buttons.first.click(timeout=3000)
                    print("[PLAYWRIGHT] Clic en botón de menú realizado.")
                except Exception as e:
                    print(f"[PLAYWRIGHT] Botón no clickeable o menú omitido: {e}")

            # 3. Esperar que Rapier y R3F rendericen los modelos
            page.wait_for_timeout(3500)

            # 4. Tomar screenshot
            page.screenshot(path=str(SCREENSHOT_PATH))
            browser.close()

        err_report = "\n".join(console_errors) if console_errors else "Sin errores ni advertencias críticas en consola."
        return f"Captura tomada exitosamente en {SCREENSHOT_PATH}.\nReporte de consola:\n{err_report}"

    except Exception as e:
        return f"Error al inspeccionar la app web: {str(e)}. Verifica que Vite esté corriendo y respondiendo peticiones."