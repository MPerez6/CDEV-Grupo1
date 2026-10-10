from asador_harness import execute_objective

hito_narrativo_y_herramientas = (
    "Hito 2 (Extendido) - Narrativa, Utensilios y Ambientación Pampeana:\n"
    "1. ERROR CRÍTICO DE KEYS: Revisa useAsadoStore.ts y App.tsx. Asegúrate de que no haya elementos en 'meats' con keys repetidas como 'test-meat-1'. Cada corte debe tener un id único.\n"
    "2. NARRATIVA Y MENÚ: Crea src/components/UI/GameUI.tsx montado sobre el canvas con Html de drei o superpuesto en DOM. Si stage === 'menu', muestra la portada 'Asador.js: El Ritual de las Brasas' con un botón para empezar. Agrega selector de herramientas (Pala, Atizador, Tenedor).\n"
    "3. CÁMARA POV PARRILLERA: En App.tsx, configura OrbitControls con límites angulares (minAzimuthAngle y maxAzimuthAngle) y límite polar para que el jugador esté frente a la parrilla como un asador real, sin rotar 360 grados al vacío.\n"
    "4. AMBIENTACIÓN PAMPEANA: Crea src/components/Environment/PampaEnvironment.tsx. Elimina el fondo gris neutro. Agrega el componente Sky de @react-three/drei con luz dorada de atardecer, un plano de suelo amplio con color de pasto pampeano y sombras suaves, y una pared o alambrado rústico de fondo.\n"
    "5. UTENSILIOS INTERACTIVOS: Crea src/components/Player/PlayerTools.tsx. Si existen en /models/ (revisa con inspect_3d_models), carga los modelos GLB de pala, atizador y tenedor; si no, modela primitivas rústicas metálicas con mango de madera. El tenedor debe permitir pinchar y voltear la carne (flipMeat) al hacer click sobre el corte.\n"
    "6. FÍSICAS RAPIER: Mantén la integración de Physics de @react-three/rapier con la parrilla fija (fixed) y la carne dinámica (dynamic).\n"
    "7. VERIFICACIÓN: Ejecuta run_tests (npm run build). Resuelve cualquier conflicto de tipos en TypeScript. Cuando compile sin errores, haz push al repositorio."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_narrativo_y_herramientas, max_iterations=4)
    if exito:
        print("\n[OK] ¡Hito 2 completado con narrativa, herramientas y ambientación pampeana!")
    else:
        print("\n[REVISAR] El harness finalizó con bloqueos o iteraciones pendientes.")