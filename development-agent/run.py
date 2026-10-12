from asador_harness import execute_objective

hito_3_jugabilidad_y_teclado = (
    "Hito 3 (Revisión) - Jugabilidad Inmersiva con Teclado, Estabilidad de Carne/Tenedor y Auditoría GLB:\n\n"
    "1. CONTROLES POR TECLADO (REEMPLAZO DE BOTONES):\n"
    "   - En src/components/Player/PlayerTools.tsx o mediante un hook useKeyboardControls en App.tsx:\n"
    "     * 'C': Equipar Cepillo/Papel de diario para curar y limpiar la parrilla.\n"
    "     * 'P': Equipar Pala para tomar y trasladar brasas desde el fogón.\n"
    "     * 'A': Equipar Atizador para acomodar leña y brasas vivas.\n"
    "     * 'T': Equipar Tenedor para pinchar y voltear la carne.\n"
    "     * '1', '2', '3', '4' como atajos numéricos equivalentes y 'Escape' para desequipar herramienta.\n"
    "   - En src/components/UI/GameUI.tsx, actualiza la interfaz superior para que sea solo una guía HUD "
    "discreta mostrando las teclas asignadas (ej. '[C] Cepillo  [P] Pala  [A] Atizador  [T] Tenedor') "
    "sin tapar la parrilla ni depender de clics en botones.\n\n"
    "2. CORRECCIÓN CRÍTICA DE LA CARNE Y EL TENEDOR (NO MÁS DESAPARICIONES):\n"
    "   - En MeatItemComponent.tsx y useAsadoStore.ts:\n"
    "     a) Investiga por qué desaparece al pincharla. Asegúrate de que la acción del tenedor no borre el id, "
    "no establezca scale/position en NaN y no aplique impulsos físicos extremos en Rapier.\n"
    "     b) Si se rota o voltea el corte (flip), resetea las velocidades lineales y angulares del RigidBody "
    "(setLinvel({x:0, y:0, z:0}), setAngvel({x:0, y:0, z:0})) para que no salga despedido al infinito.\n"
    "     c) Aumenta la escala de la carne: debe tener un tamaño visible y contundente (~0.4 - 0.5) "
    "y un colisionador cuboid proporcional que impida que se cuele entre las varillas de la parrilla.\n\n"
    "3. CARGA FORZADA DE MODELOS GLB Y REGISTRO EN LOG:\n"
    "   - Fuerza la carga de los modelos GLB disponibles en public/models (parrilla, corte, pala, atizador, tenedor).\n"
    "   - Crea src/utils/modelLogger.ts. En cada componente con useGLTF, inspecciona y registra:\n"
    "     * Nombre del archivo solicitado.\n"
    "     * Si cargó con éxito o falló.\n"
    "     * Nodos, cantidad de mallas y dimensiones calculadas del BoundingBox.\n"
    "   - Guarda o actualiza un registro en 'frontend/public/3d_models_audit.log' con los resultados y posibles errores.\n"
    "   - Si un modelo falla, provee un fallback rústico sin colapsar el Canvas de WebGL.\n\n"
    "4. VERIFICACIÓN Y TEST RUN:\n"
    "   - Ejecuta run_tests (npm run build). Corrige cualquier error de TypeScript o hooks.\n"
    "   - Al compilar con éxito, el harness correrá la inspección de Playwright verificando que los atajos respondan, "
    "la captura muestre la carne de buen tamaño y el log de modelos quede generado. Luego haz push al repositorio."
)

if __name__ == "__main__":
    execute_objective(objective=hito_3_jugabilidad_y_teclado, max_iterations=5)