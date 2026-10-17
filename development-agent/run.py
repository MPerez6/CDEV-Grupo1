from asador_harness import execute_objective

hito_recarga_fogon_y_pasto_artistico = (
    "OBJETIVO: Recarga Continua de Brasas en Pala/Fogón (Ciclo de Carbón) y Enriquecimiento Visual del Pasto Pampeano a 60 FPS:\n\n"
    "1. CICLO COMPLETO DEL FOGÓN: AGREGAR CARBÓN/LEÑA CUANDO SE AGOTEN LAS BRASAS (`src/store/useAsadoStore.ts`, `src/components/FireSystem/Fogon.tsx` y `src/components/UI/GameUI.tsx`):\n"
    "   - Diagnóstico: Actualmente, cuando `fogonEmbersCount` llega a 0 en la etapa `brasas_listas`, el fogón queda inerte. El asador no puede volver a alimentarlo ni generar nuevas brasas.\n"
    "   - En `useAsadoStore.ts`:\n"
    "     * Añade la acción `recargarCarbonFogon: () => void` (o permite que `interactFogon()` la ejecute automáticamente cuando `fogonStage === 'brasas_listas' && fogonEmbersCount === 0`).\n"
    "     * Al alimentar el fogón vacío: reinicia el ciclo de combustión pasando a `fogonStage = 'encendido'` con `fogonProgress = 0.25`, activando las llamas para quemar el nuevo carbón y generar una nueva tanda de 35 a 45 brasas vivas.\n"
    "   - En `Fogon.tsx`:\n"
    "     * Cuando `fogonEmbersCount === 0`, el clic sobre el fogón o la tecla [F] debe disparar la recarga de carbón.\n"
    "     * Actualiza el texto flotante 3D sobre el fogonero: si no quedan brasas, debe invitar al jugador con: '[F] Agregar Carbón / Leña'.\n"
    "   - En `GameUI.tsx`:\n"
    "     * En la barra de estado inferior y el banner de consejos, cuando `fogonEmbersCount === 0`, muestra: '🪵 Fogón: Sin Brasas [F] Agregar Carbón'.\n\n"
    "2. RECARGA FLUIDA Y CÍCLICA DE BRASAS EN LA PALA (`src/store/useAsadoStore.ts`, `src/components/Player/PlayerTools.tsx` y `Fogon.tsx`):\n"
    "   - Asegura que el ciclo de pala sea 100% continuo e ilimitado: Cargar en fogón ➔ Volcar bajo parrilla ➔ Volver al fogón ➔ Recargar.\n"
    "   - En `useAsadoStore.ts` (`tomarBrasasDelFogon`):\n"
    "     * Valida que siempre que haya brasas en el fogón (`fogonEmbersCount > 0`), el jugador pueda recargar su pala hasta un tope de 6 a 8 brasas (`carriedEmbersCount = Math.min(8, carriedEmbersCount + toTake)`).\n"
    "   - En `PlayerTools.tsx`:\n"
    "     * Confirma que el clúster de 5 a 7 brasas 3D incandescentes (`GlowingEmberModel`) reaparezca visiblemente en la concavidad de la pala cada vez que `carriedEmbersCount > 0`, y se limpie en cuanto se vuelcan bajo la parrilla (`carriedEmbersCount === 0`).\n\n"
    "3. MEJORA VISUAL DEL PASTO PAMPEANO SIN AFECTAR RENDIMIENTO (`src/components/Environment/PampeanGrass.tsx`):\n"
    "   - Eleva la fidelidad estética del pasto manteniendo un único `InstancedMesh` para garantizar 60 FPS estables en un solo draw call:\n"
    "     * Gradiente Vertical y Falsa Oclusión (Vertex Colors): Enriquecer la geometría del pasto asignando color o gradiente por vértice: base oscura terrosa y sombría (`#231c12` / `#2e2617`) para dar profundidad y contacto con la tierra, zona media en verde gramilla/oliva (`#4b5c2a` / `#5e6e33`), y puntas iluminadas en amarillo paja dorada (`#9c8e52` / `#b5a25b`) al atardecer pampeano.\n"
    "     * Silueta de Mata Criolla (Paja Brava / Flechillar): Modela una mata tupida con forma de penacho o cúpula convexa (base de 0.45m a 0.60m y curvatura natural en abanico), eliminando la apariencia de planos rectos artificiales.\n"
    "     * Distribución en Manchones Orgánicos: Agrupa las instancias en manchones/islotes densos con pequeños claros intermedios en lugar de un ruido uniforme, respetando estrictamente la zona de exclusión (`Math.hypot(x, z) >= 4.8m`) para que el piso de madera y el asador queden limpios.\n"
    "     * Balanceo por Viento en GPU: Mantén el cálculo de viento en el vertex shader (`mat.onBeforeCompile`) proporcional a la altura `position.y` sin costo en CPU.\n"
    "     * Mantén `castShadow={false}` y `receiveShadow={true}` con 900 a 1300 instancias para máxima fluidez.\n\n"
    "4. VERIFICACIÓN Y PUSH:\n"
    "   - Ejecuta `run_tests()` (`npm run build`) para verificar 0 errores de TypeScript y Vite.\n"
    "   - Ejecuta `inspect_running_game()` para validar visualmente la recarga de carbón en el fogón, la recarga repetida de la pala y el nuevo pastizal pampeano con volumen y gradientes a 60 FPS.\n"
    "   - Envía los cambios al repositorio con `push_to_repository` (ej: 'feat(fire): add infinite coal reload cycle to fogon and shovel; feat(grass): enrich tussock silhouette and vertex color gradients at 60 FPS')."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_recarga_fogon_y_pasto_artistico, max_iterations=5)
    if exito:
        print("\n[OK] ¡Ciclo continuo de carbón, recarga de pala y pastizal volumétrico integrados con éxito!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")
