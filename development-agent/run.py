from asador_harness import execute_objective

objetivo_fuego_y_limpieza = (
    "Objetivo Final - Estabilidad Visual y Ritual del Fuego Completo (Hitos 1.1, 1.2 y 1.3):\n\n"
    "1. CORRECCIÓN DE ESTILOS Y KEYS:\n"
    "   - En src/components/UI/GameUI.tsx, elimina la mezcla de 'border' y 'borderColor'. Usa propiedades separadas (borderStyle: 'solid', borderWidth: '2px', borderColor: ...) en todos los botones y divs interactivos para eliminar la advertencia de React.\n"
    "   - Asegura que useAsadoStore inicialice al menos un corte de prueba visible con id único (ej. 'corte-tira-base') en position={[0, 0.45, 0]}.\n\n"
    "2. VISIBILIDAD DE MODELOS GLB Y ESCENARIO:\n"
    "   - Revisa los modelos en public/models usando inspect_3d_models. Al renderizarlos en Grill.tsx o MeatItemComponent.tsx, envuélvelos con <Center> de @react-three/drei y asegúrate de que tengan una escala visible adecuada (ej. scale={0.3} o similar).\n"
    "   - Verifica que los modelos se rendericen correctamente sin importar el 'stage' del juego, o que al presionar 'Empezar' en GameUI la cámara apunte directamente a la parrilla.\n\n"
    "3. HITO 1.1: FOGÓN Y ENCENDIDO:\n"
    "   - Crea src/components/FireSystem/Fogon.tsx ubicado al costado de la parrilla (ej. x: -1.2, z: 0).\n"
    "   - Incluye leña/carbón interactivo. El jugador hace clic para colocar papel de diario y fósforos.\n"
    "   - Al encender, activa un sistema de partículas de llamas tempranas que simula el colapso paulatino de los leños en brasas vivas tras un temporizador.\n\n"
    "4. HITO 1.2: COLCHÓN DE BRASAS Y DISTRIBUCIÓN:\n"
    "   - Cuando el jugador tenga seleccionada la herramienta 'pala' o 'atizador' (desde PlayerTools o GameUI), hacer clic en el fogón genera/toma brasas y hacer clic debajo de la parrilla las distribuye como InstancedMesh.\n"
    "   - En useAsadoStore.ts, modela una grilla térmica 2D (X, Z) que acumule calor según la densidad y posición de las brasas activas, aplicando disipación paulatina con el paso del tiempo.\n\n"
    "5. HITO 1.3: LIMPIEZA DE LA PARRILLA:\n"
    "   - En src/components/Environment/Grill.tsx, agrega un estado 'isClean' (o 'rustLevel' de 1.0 a 0.0) en el store.\n"
    "   - El jugador puede seleccionar papel de diario/cepillo. Al hacer clic o arrastrar sobre los hierros calientes, reproduce partículas de ceniza/óxido desprendiéndose y transiciona el material de oxidado/sucio a curado/limpio.\n\n"
    "6. VERIFICACIÓN Y PUSH:\n"
    "   - Ejecuta run_tests (npm run build). Resuelve cualquier error de TypeScript o rutas rotas. Al compilar exitosamente, haz push al repositorio."
)

if __name__ == "__main__":
    exito = execute_objective(objective=objetivo_fuego_y_limpieza, max_iterations=5)
    if exito:
        print("\n[OK] ¡Ritual del fuego, encendido, distribución y limpieza completados con éxito!")
    else:
        print("\n[REVISAR] El harness se detuvo por errores o iteraciones pendientes.")