from asador_harness import execute_objective

hito_brasas_pala_paisaje_pasto_y_cielo_abierto = (
    "OBJETIVO: Clúster de Brasas en la Pala, Paisaje Pampeano con Ceibo y Arboleda, Pasto Procedural y Cielo Abierto (Sin Techo):\n\n"
    "1. CLÚSTER DE 5 A 7 BRASAS INCANDESCENTES EN LA PALA (`src/components/Player/PlayerTools.tsx`):\n"
    "   - En el renderizado de la herramienta 'pala' (`selectedTool === 'pala'`), cuando `carriedEmbersCount > 0`, REEMPLAZA la brasa solitaria por un montículo/clúster realista de 5 a 7 modelos 3D pequeños de carbón.\n"
    "   - Utiliza `GlowingEmberModel` con `url={CARBON_URL}` para cada trozo, reduciendo su escala individual (`targetSize` aproximado entre 0.038 y 0.052).\n"
    "   - Distribuye las 5 a 7 brasas con ligeros offsets dentro de la concavidad de la cuchara de la pala (variaciones en X entre -0.04 y 0.04, en Z entre -0.03 y 0.03, y apiladas en Y entre 0.22 y 0.26).\n"
    "   - Asigna a cada brasa rotaciones arbitrarias y valores de `pulsePhase` desfasados (ej. `i * 0.9`) para que el pulso térmico titile de forma viva y desincronizada.\n"
    "   - Mantén la luz puntual cálida anclada (`color='#ff4500'`, intensidad 1.6, distancia 1.3) para bañar de brillo incandescente la cuchara de hierro.\n\n"
    "2. PAISAJE DE LLANURA: UN CEIBO DESTACADO Y ÁRBOLES LEJANOS (`src/components/Environment/PampaEnvironment.tsx`):\n"
    "   - Revisa `MODEL_REGISTRY.CEIBO` (`/models/ceibo.glb`) y `MODEL_REGISTRY.ARBOLES` (`/models/arboles.glb`) en `src/config/modelRegistry.ts`.\n"
    "   - CEIBO (Flor Nacional): Incorpora EXACTAMENTE UN ejemplar de `CEIBO.glb` en una ubicación lateral visible y destacada dentro del encuadre de la cámara (por ejemplo, x ~ -6.5, z ~ -2.5 o x ~ 5.5, z ~ -2.0, con `targetSize` ~ 4.5m a 5.0m apoyado en suelo y=0).\n"
    "   - ARBOLEDA DISTANTE DE LLANURA: Distribuye entre 5 y 8 ejemplares de `ARBOLES.glb` a lo lejos en el horizonte (profundidades Z entre -14m y -35m, dispersos en X entre -28m y +28m).\n"
    "   - Aplica variaciones de escala (`targetSize` entre 5.0m y 7.5m) y rotaciones en Y aleatorias para cada árbol lejano, logrando una panorámica de llanura y horizonte pampeano sin saturar el campo visual inmediato.\n\n"
    "3. PASTO PROCEDURAL VISIBLE (`src/components/Environment/PampaEnvironment.tsx` o `PampeanGrass.tsx`):\n"
    "   - ELIMINA el aspecto de suelo plano y liso agregando un sistema de pasto procedural pampeano denso y visible (pastizal / flechillar) mediante `InstancedMesh` para máximo rendimiento (60 FPS).\n"
    "   - Geometría: Utiliza un mechón/mata de pasto de bajo poligonaje (por ejemplo, 2 a 3 planos cruzados con `planeGeometry` de 0.15m x 0.35m o conos estirados).\n"
    "   - Distribución: Genera entre 800 y 1500 instancias dispersas en el terreno (radio de 1.8m a 20m), EXCLUYENDO el círculo central terroso/quemado bajo la parrilla (`x^2 + z^2 > 1.8^2`) para que la zona de asado se mantenga limpia.\n"
    "   - Material: Tonos de campo pampeano (verde oliva seco `#556832`, pajonal dorado `#7d7543` y verde gramilla `#46542b`), con ligera variación de escala y balanceo sutil si se desea en `useFrame`.\n\n"
    "4. ELIMINACIÓN DEL TECHO / CAMPANA OBSTRUCTIVA (`src/components/Environment/PampaEnvironment.tsx`):\n"
    "   - ELIMINA por completo el componente `ChimneyHood` (campana piramidal y dintel superior situado a y ~ 1.45m sobre la parrilla) que interrumpe y colisiona con la cámara al rotar con `OrbitControls`.\n"
    "   - Deja el espacio superior completamente abierto y despejado hacia el cielo pampeano (`Sky`), permitiendo contemplar el humo, el atardecer y el horizonte sin obstrucciones visuales desde cualquier ángulo.\n\n"
    "5. VERIFICACIÓN Y PUSH:\n"
    "   - Ejecuta `run_tests()` (`npm run build`) y confirma 0 errores de TypeScript y Vite.\n"
    "   - Ejecuta `inspect_running_game()` para validar visualmente la escena, los árboles en el horizonte, el pasto y las brasas en la pala.\n"
    "   - Envía los cambios al repositorio llamando a `push_to_repository` con mensaje conventional commit descriptivo (ej: 'feat(environment): add shovel ember cluster, ceibo, distant trees, procedural grass and open ceiling')."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_brasas_pala_paisaje_pasto_y_cielo_abierto, max_iterations=5)
    if exito:
        print("\n[OK] ¡Brasas en pala, Ceibo, horizonte de llanura, pastizal y cielo abierto integrados con éxito!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")
