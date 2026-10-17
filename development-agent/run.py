from asador_harness import execute_objective

hito_carbon_fogonero_pala_y_background = (
    "OBJETIVO MAESTRO - Integración de 'carbon.glb' y 'carbon_fogonero.glb' con Transición a Glowing Ember Material, Corrección de Pala y Background Criollo:\n\n"
    "FASE 1: AUDITORÍA DE ASSETS 3D EN PUBLIC/MODELS\n"
    "1. Ejecuta OBLIGATORIAMENTE `inspect_3d_models()` para verificar las dimensiones, nodos y materiales de:\n"
    "   - `/models/carbon.glb` (carbón individual para la pala y debajo de la parrilla)\n"
    "   - `/models/carbon_fogonero.glb` (lecho/pila de carbón del fogonero)\n"
    "   - `/models/cuchillo_en_madera.glb` y `/models/botella_de_vino_vieja.glb`\n"
    "   - Y el resto de modelos presentes en `frontend/public/models/`.\n"
    "2. Registra todas estas rutas exactas en `src/config/modelRegistry.ts`.\n\n"
    "FASE 2: COMPONENTE `GlowingEmberModel.tsx` CON TRANSICIÓN DE CARBÓN APAGADO A BRASA COCINADA\n"
    "1. Crea `src/components/Common/GlowingEmberModel.tsx` que reciba `url`, `targetSize`, `positionOffset`, `rotationOffset`, `burnProgress` (0.0 a 1.0) y `pulsePhase`.\n"
    "2. Comportamiento del material (`MeshStandardMaterial` clonado):\n"
    "   - Cuando `burnProgress === 0` (carbón crudo/apagado): conserva su aspecto oscuro original con `emissiveIntensity = 0`.\n"
    "   - A medida que `burnProgress` avanza hacia `1.0` (carbón ya cocinado / hecho brasa): cambia al **Glowing Ember Material** (`emissive: new THREE.Color('#ff3800')`, usando `emissiveMap` o grietas incandescentes en `onBeforeCompile`) y anima `emissiveIntensity` en `useFrame` con un pulso térmico realista (`1.45 + Math.sin(t * 3.4) * 0.4`).\n\n"
    "FASE 3: FOGONERO CON `/models/carbon_fogonero.glb` (`src/components/FireSystem/Fogon.tsx`)\n"
    "1. En `Fogon.tsx`, elimina las esferas o dodecaedros viejos que representaban las brasas debajo del fogonero.\n"
    "2. Renderiza `/models/carbon_fogonero.glb` mediante `GlowingEmberModel` ubicado en la base/interior del fogonero.\n"
    "3. Conecta su prop `burnProgress` al estado del fogón:\n"
    "   - Si el fogón está apagado y aún no hay brasas hechas (`!isLit && availableEmbers === 0`), `burnProgress = 0.0` (se ve como carbón apagado).\n"
    "   - Mientras el fuego está prendido cocinando el carbón, `burnProgress` sube progresivamente.\n"
    "   - Cuando el carbón ya está cocinado (`availableEmbers > 0`), `burnProgress = 1.0` para que todo `carbon_fogonero.glb` luzca con el Glowing Ember Material encendido al rojo vivo.\n\n"
    "FASE 4: CORRECCIÓN TOTAL DE LA PALA Y USO DE `/models/carbon.glb` (`PlayerTools.tsx` y `Grill.tsx`)\n"
    "1. En `src/components/Player/PlayerTools.tsx`:\n"
    "   - Elimina por completo los 6 `<dodecahedronGeometry>` naranjas que salían flotando a la derecha de la pala.\n"
    "   - Corrige la rotación de la pala para que la hoja metálica apunte hacia adelante (boca abierta lejos del jugador, parte trasera unida al mango) y el atizador tenga el mango hacia el jugador.\n"
    "   - Cuando la pala tiene brasas cargadas (`shovelHasEmbers === true`), renderiza `/models/carbon.glb` usando `GlowingEmberModel` con `burnProgress={1.0}` (brasa encendida) anclado EXACTAMENTE adentro de la cuchara de la pala (`x = 0` centrado en la hoja, nunca desplazado hacia un costado), junto con un `<pointLight color='#ff4500' intensity={1.5} distance={1.2} />`.\n"
    "2. En `src/components/Environment/Grill.tsx` (y sistema de brasas bajo la parrilla):\n"
    "   - Mantén los fierros de la parrilla 100% procedurales con su `<CuboidCollider>` fijo para no romper el positioning de la carne.\n"
    "   - Cada brasa depositada bajo la parrilla debe renderizar `/models/carbon.glb` con `GlowingEmberModel` (`burnProgress={1.0}` modulado por su calor actual `heat`), ubicándose exactamente en el `e.point` donde hizo clic el jugador.\n\n"
    "FASE 5: DECORACIÓN COMPLETA DEL BACKGROUND CON CUCHILLO EN MADERA Y BOTELLA DE VINO\n"
    "1. Crea o actualiza el background pampeano (muro de ladrillo criollo, campana/chimenea, vigas de quebracho, leñera e `InstancedMesh` de postes y árboles).\n"
    "2. En la mesada rústica al costado derecho de la parrilla, coloca `/models/cuchillo_en_madera.glb` (`targetSize={0.44}`) y `/models/botella_de_vino_vieja.glb` (`targetSize={0.35}`) apoyados con precisión sobre la tabla superior.\n\n"
    "FASE 6: VERIFICACIÓN DE BUILD, INSPECCIÓN EN NAVEGADOR Y PUSH\n"
    "1. Ejecuta `run_tests()` (`npm run build`) y corrige cualquier error de TypeScript.\n"
    "2. Ejecuta `inspect_running_game()` para verificar visualmente la escena sin errores de consola y haz push con `push_to_repository`."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_carbon_fogonero_pala_y_background, max_iterations=5)
    if exito:
        print("\n[OK] ¡carbon.glb, carbon_fogonero.glb con transición térmica, pala corregida y background listos!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")