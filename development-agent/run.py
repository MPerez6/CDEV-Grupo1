from asador_harness import execute_objective

hito_3_demo_inspeccionada = (
    "Hito 3 - Demo Completa de Asado Simulator (Logs de Carga 3D, Animaciones de Utensilios y Físicas Calibradas):\n\n"
    "1. LOGS DETALLADOS DE IMPORTACIÓN 3D:\n"
    "   - En cada componente que cargue modelos GLB (Grill.tsx, MeatItemComponent.tsx, PlayerTools.tsx, Fogon.tsx):\n"
    "     a) Agrega console.log al montar el modelo mostrando: nombre del archivo, nodos encontrados, y dimensiones de la Bounding Box.\n"
    "     b) Envuelve la carga de useGLTF con manejo defensivo para que, si un .glb falla o la ruta no existe, "
    "haga un console.error explicativo y renderice una primitiva estilizada de fallback sin romper el Canvas de WebGL.\n\n"
    "2. CORRECCIÓN VISUAL Y ESCALAS DE CARNE Y PARRILLA:\n"
    "   - Los cortes de carne NO deben caerse entre los fierros ni verse diminutos o desproporcionados.\n"
    "   - Normaliza su escala con <Center> y ajusta el colisionador de Rapier (RigidBody type='dynamic' con cuboid bien dimensionado o compound collider).\n"
    "   - Implementa el plano horizontal invisible en la parrilla para permitir arrastrar y soltar la carne exactamente en la posición deseada.\n\n"
    "3. ANIMACIONES E INTERACTIVIDAD DE UTENSILIOS (PALA, ATIZADOR, TENEDOR):\n"
    "   - Las herramientas del asador en primera persona (PlayerTools.tsx) NO deben flotar rígidas ni estáticas.\n"
    "   - Implementa movimiento e interpolación fluida en useFrame (sway o balanceo suave al mover la cámara/mouse con THREE.MathUtils.lerp).\n"
    "   - Agrega animación de interacción o feedback visual:\n"
    "     * Tenedor: movimiento de estocada hacia adelante al hacer clic para pinchar/voltear la carne.\n"
    "     * Pala/Atizador: movimiento hacia abajo/empuje al interactuar con el fogón o trasladar brasas.\n\n"
    "4. CICLO DE FUEGO Y COCCIÓN CALIBRADA:\n"
    "   - La parrilla inicia sin brasas (embers = [] en useAsadoStore).\n"
    "   - El fogón genera brasas al quemar leña/carbón que el jugador traslada bajo la parrilla.\n"
    "   - La carne no se quema en segundos: aplica un factor de inercia térmica realista en el cookLevel.\n\n"
    "5. AMBIENTACIÓN PAMPEANA Y CÁMARA:\n"
    "   - Asegura la ambientación con Sky rústico, plano de pasto y límites angulares en OrbitControls (POV del asador).\n\n"
    "6. VERIFICACIÓN COMPLETA:\n"
    "   - Ejecuta run_tests (build sin errores de TypeScript).\n"
    "   - Al compilar, el harness abrirá la app en el navegador para capturar debug_screen.png y registrar los logs de consola.\n"
    "   - Revisa la captura: si los modelos se ven correctamente escalados, las herramientas tienen sus animaciones activas y no hay errores en consola, haz push al repositorio."
)

if __name__ == "__main__":
    # max_iterations=5 como límite máximo, terminará en cuanto la validación visual y de build aprueben
    execute_objective(objective=hito_3_demo_inspeccionada, max_iterations=5)