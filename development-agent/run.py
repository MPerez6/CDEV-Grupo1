from asador_harness import execute_objective

hito_parrilla_procedural_y_modelos_glb = (
    "OBJETIVO MAESTRO - Parrilla Procedural Estable + Modelos GLB en Cortes/Props y Controles por Teclado:\n\n"
    "FASE 1: AUDITORÍA ESTRICTA DE ASSETS 3D (PROHIBIDO ALUCINAR RUTAS)\n"
    "1. Ejecuta OBLIGATORIAMENTE `inspect_3d_models()` como primer paso para conocer la lista real de archivos .glb en `frontend/public/models/`.\n"
    "2. Consulta `consult_graphics_expert('useGLTF Center clone traverse bounding box scale')`.\n"
    "3. Crea o actualiza `src/utils/modelLogger.ts` para registrar en consola y en `window.__ASADO_MODEL_AUDIT__` los modelos .glb cargados y sus dimensiones.\n\n"
    "FASE 2: BLINDAJE DE LA PARRILLA PROCEDURAL (`src/components/Environment/Grill.tsx`)\n"
    "1. REGLA CRÍTICA: La parrilla (`Grill.tsx`) y el fogonero (`Fogon.tsx`) DEBEN mantenerse generados de forma PROCEDURAL con primitivas de Three.js.\n"
    "   - NO reemplaces la parrilla por un archivo .glb para no romper el positioning ni las coordenadas de apoyo de la carne.\n"
    "   - Mantén intacta la superficie de apoyo de los fierros y el `<RigidBody type='fixed'>` con su `<CuboidCollider>` plano y continuo para que los cortes apoyen con precisión.\n"
    "   - Asegura que la mecánica de limpieza/curado de los fierros procedurales (cambio de oxidado a limpio al usar el cepillo con tecla 'C') funcione visualmente.\n\n"
   "FASE 3: COMPONENTE UNIVERSAL AUTO-ESCALABLE Y SEPARACIÓN DE PACKS GLB (`src/components/Common/GLBModel.tsx`)\n"
    "1. Crea `GLBModel.tsx` usando `useGLTF` y `<Center>` de `@react-three/drei`.\n"
    "2. SOPORTE PARA MULTI-OBJETOS EN UN MISMO GLB (CASO PALA Y ATIZADOR JUNTOS):\n"
    "   - La pala y el atizador están contenidos dentro del MISMO archivo .glb en `public/models/`.\n"
    "   - Revisa la salida de `inspect_3d_models()` para ver los nodos/mallas de ese archivo.\n"
    "   - En `GLBModel.tsx`, agrega soporte para extraer un sub-objeto específico mediante:\n"
    "     a) Nombre de nodo/malla (`nodeFilter`: string).\n"
    "     b) Índice de malla o grupo (`partIndex`: number) si hay múltiples meshes.\n"
    "     c) Partición espacial (`spatialHalf`: 'first' | 'second') que separe por coordenadas de BoundingBox o filtre los vértices de la geometría si ambos utensilios fueron exportados en una sola malla combinada.\n"
    "   - Una vez aislado el utensilio (la pala cuando presiona 'P', o el atizador cuando presiona 'A'), envuélvelo en `<Center>` y auto-escálalo (`targetSize={0.65}`) para que quede centrado en la mano del jugador sin mostrar la otra herramienta flotando al lado.\n"
    "1. Ajusta el tamaño de los cortes de carne para que sean grandes y bien visibles sobre los fierros procedurales (~0.35m a 0.42m para tiras/vacío, ~0.16m para chorizos).\n"
    "2. Usa un `<CuboidCollider>` proporcional en el `<RigidBody type='dynamic'>` para que repose firme sobre la cota Y de la parrilla procedural sin colarse a las brasas.\n"
    "3. Corrige el bug de desaparición al usar el tenedor (`flipMeat` o reposicionamiento):\n"
    "   - Nunca cambies ni elimines el `id` del corte.\n"
    "   - Al voltear o soltar el corte, resetea velocidades en Rapier (`setLinvel({x:0, y:0, z:0}, true)`, `setAngvel({x:0, y:0, z:0}, true)`) y fija su altura justo encima de los fierros procedurales.\n"
    "4. Mantén el plano horizontal invisible sobre la parrilla procedural para arrastrar y acomodar la carne en cualquier sector (X, Z) de los fierros.\n\n"
    "FASE 5: CONTROLES POR TECLADO Y HUD DESPEJADO (`GameUI.tsx` y `PlayerTools.tsx`)\n"
    "1. Implementa los atajos de teclado globales (`keydown`):\n"
    "   - `C`: Cepillo / Papel de diario (curar y limpiar fierros procedurales).\n"
    "   - `P`: Pala (llevar brasas del fogón debajo de la parrilla).\n"
    "   - `A`: Atizador (desparramar brasas).\n"
    "   - `T`: Tenedor (pinchar, mover y dar vuelta la carne).\n"
    "   - `F`: Encender fogón / agregar leña.\n"
    "   - `M`: Agregar corte de carne a la parrilla.\n"
    "   - `Escape` / `E`: Desequipar herramienta.\n"
    "2. En `GameUI.tsx`, muestra arriba una barra compacta con las teclas (`[F] Fogón | [C] Cepillo | [P] Pala | [A] Atizador | [T] Tenedor | [M] Carne`) y debajo los consejos del asador, sin tapar la parrilla.\n\n"
    "FASE 6: VERIFICACIÓN Y PUSH\n"
    "1. Ejecuta `run_tests()` (`npm run build`) y resuelve cualquier error de TypeScript.\n"
    "2. Verifica con `inspect_running_game` que no haya errores de consola y haz push con `push_to_repository`."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_parrilla_procedural_y_modelos_glb, max_iterations=5)
    if exito:
        print("\n[OK] ¡Parrilla procedural blindada, modelos GLB y controles por teclado listos!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")