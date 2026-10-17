from asador_harness import execute_objective

hito_optimizacion_brasas_y_matas_pasto = (
    "OBJETIVO: Optimización Crítica de Performance en Brasas Bajo Parrilla y Rediseño de Pasto Pampeano en Matas Lejanas:\n\n"
    "1. DIAGNÓSTICO Y CORRECCIÓN CRÍTICA DE PERFORMANCE EN BRASAS (`src/components/FireSystem/Embers.tsx` y `GlowingEmberModel.tsx`):\n"
    "   - Causa raíz del lag: En `Embers.tsx`, cada brasa con `ember.temperature > 0.35` instancia su propio `pointLight`. Al haber 10-20 brasas, Three.js calcula 10 a 20 luces dinámicas simultáneas en forward rendering, colapsando el framerate. Además, cada brasa procedural genera su propio `ShaderMaterial` con ruido 3D por fragmento y 3-4 geometrías independientes con `castShadow` y `receiveShadow` activos.\n"
    "   - CORRECCIÓN EN `Embers.tsx`:\n"
    "     * ELIMINA el `pointLight` individual dentro de `SingleEmber`.\n"
    "     * En su lugar, coloca UNA SOLA luz puntual consolidada en el componente contenedor `Embers` (`<pointLight position={[0, 0.08, 0]} color='#ff4500' distance={1.8} decay={2} />`), cuya intensidad se regule suavemente según la cantidad y temperatura promedio de las brasas activas (ej. `Math.min(2.0, totalTemp * 0.25)`).\n"
    "   - CORRECCIÓN EN `GlowingEmberModel.tsx` (`ProceduralGlowingEmber`):\n"
    "     * Desactiva `castShadow` y `receiveShadow` en las piezas de brasa procedural bajo la parrilla (están a nivel del suelo z/y ~ 0.01 sobre ladrillo refractario, por lo que las sombras propias no se aprecian y saturan el GPU).\n"
    "     * Comparte una única instancia de `ShaderMaterial` (o utiliza `MeshStandardMaterial` con `emissive` anaranjado vivo dinámico) en lugar de recrear nuevos materiales y llamadas a shader pesados con cada trozo.\n\n"
    "2. REDISEÑO DEL PASTO PAMPEANO EN MATAS Y DISTANCIAMIENTO DEL PISO (`src/components/Environment/PampeanGrass.tsx` y `PampaEnvironment.tsx`):\n"
    "   - Causa del problema: El suelo circular terroso/madera alrededor de la parrilla mide radio r = 3.2m (`circleGeometry args={[3.2, 32]}`), pero `PampeanGrass.tsx` tenía un radio de exclusión de sólo 1.9m, generando briznas finas invadiendo el piso y la visual del asador.\n"
    "   - CORRECCIÓN DE ZONA (Alejar del piso de madera/asador):\n"
    "     * Amplía la zona de exclusión central: NINGUNA mata de pasto debe generarse a menos de 4.8m del centro (`Math.hypot(x, z) < 4.8` o `x^2 + z^2 < 4.8^2`).\n"
    "     * Asegura que todo el círculo del piso (r = 3.2m), la mesada lateral rústica y la zona de la leñera queden completamente despejados y limpios de pasto.\n"
    "   - CORRECCIÓN DE FORMA (Matas / Tussocks en lugar de pasto individual fino):\n"
    "     * Rediseña la geometría en `PampeanGrass.tsx`: en vez de tiras verticales delgadas, modela una 'mata' o penacho pampeano con volumen y base ensanchada (forma de mata achaparrada de 0.40m a 0.65m de ancho y 0.35m a 0.50m de alto, con volumen perimetral simulando paja brava / flechillar criollo).\n"
    "     * Distribuye las matas agrupadas orgánicamente en el plano medio y lejano (radio de 4.8m a 26m).\n"
    "     * Mantén la paleta de colores secos de campo (pajonal tostado `#7d7543`, verde oliva `#556832` y flechillar seco `#8a7f49`) con `InstancedMesh` para garantizar 60 FPS estables.\n\n"
    "3. VERIFICACIÓN Y PUSH:\n"
    "   - Ejecuta `run_tests()` (`npm run build`) y confirma 0 errores de TypeScript y compilación de Vite.\n"
    "   - Ejecuta `inspect_running_game()` para validar visualmente la fluidez de FPS con las brasas encendidas y las matas de pasto en la distancia sin invadir el piso.\n"
    "   - Envía los cambios al repositorio con `push_to_repository` (ej: 'perf(embers): consolidate point lights and optimize procedural ember shader; feat(grass): redesign as distant pampean tussocks')."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_optimizacion_brasas_y_matas_pasto, max_iterations=5)
    if exito:
        print("\n[OK] ¡Performance de brasas optimizada a 60 FPS y pasto rediseñado en matas lejanas!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")
