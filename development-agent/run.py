from asador_harness import execute_objective

hito_2_glb = (
    "Hito 2 - Integración de Modelos GLB en public/models y Físicas Rapier:\n"
    "1. Inspecciona los modelos 3D disponibles en la carpeta public/models usando inspect_3d_models.\n"
    "2. En App.tsx, envuelve la escena y el canvas dentro de <Suspense fallback={null}> y <Physics gravity={[0, -9.81, 0]}> de @react-three/rapier.\n"
    "3. En src/components/Environment/Grill.tsx, reemplaza o complementa la parrilla procedimental cargando el modelo GLB correspondiente usando useGLTF('/models/...') o envuelve la parrilla existente con un <RigidBody type='fixed' colliders='trimesh'> para que sirva de superficie de apoyo estática.\n"
    "4. En src/components/MeatItem/MeatItemComponent.tsx, carga el modelo 3D GLB del corte de carne usando useGLTF('/models/...'). Si el modelo tiene mallas, aplica el material o shader de Maillard. Envuelve el corte dentro de un <RigidBody type='dynamic' colliders='cuboid'> con fricción 0.8 y restitución 0.1 para que colisione y repose sobre la parrilla.\n"
    "5. Aplica preload de los modelos cargados (ej. useGLTF.preload('/models/...')) para optimizar el rendimiento y evitar micro-stutters.\n"
    "6. Resuelve cualquier error de tipado o posibles 'undefined' en TypeScript.\n"
    "7. Ejecuta la verificación con run_tests. Una vez que pase sin errores y el objetivo esté completo, haz push al repositorio."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_2_glb, max_iterations=4)
    if exito:
        print("\n[OK] ¡Hito 2 completado exitosamente con modelos GLB y físicas!")
    else:
        print("\n[REVISAR] El harness finalizó con bloqueos o iteraciones agotadas.")