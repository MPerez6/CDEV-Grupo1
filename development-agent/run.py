from asador_harness import execute_objective

hito_3_demo_completa = (
    "Hito 3 - Demo Completa de Asado Simulator (Fuego Inicial, Modelos GLB, Ubicación y Termodinámica):\n\n"
    "1. CONSULTA EXPERTA PREVIA (RAG):\n"
    "   - Antes de modificar componentes, consulta con consult_graphics_expert sobre patrones de:\n"
    "     a) 'Rapier kinematic translation drag drop plane raycasting'\n"
    "     b) 'useGLTF Center normalize scale'\n"
    "     c) 'Thermodynamics delta time throttling state'\n\n"
    "2. CICLO INICIAL DE BRASAS Y FOGÓN:\n"
    "   - En useAsadoStore.ts, el array inicial de 'embers' bajo la parrilla DEBE comenzar VACÍO ([]).\n"
    "   - La grilla térmica debe registrar 0 calor al inicio.\n"
    "   - El jugador debe iniciar el fuego en Fogon.tsx. Una vez encendido y quemada la leña, "
    "las brasas generadas quedan disponibles en el fogón para ser arrastradas o paleadas bajo la parrilla.\n\n"
    "3. IMPORTACIÓN, ESCALADO Y COLISIONADORES DE MODELOS GLB:\n"
    "   - Revisa los modelos en public/models con inspect_3d_models (ej. carne.glb, tira.glb, parrilla.glb).\n"
    "   - En MeatItemComponent.tsx, envuelve la escena importada con <Center> de @react-three/drei y aplica "
    "una escala normalizada visible y realista (por ejemplo, entre 0.25 y 0.4 para que un bife o tira tenga ~30-40 cm de largo).\n"
    "   - En @react-three/rapier, configura el RigidBody del corte con colliders='cuboid' de dimensiones adecuadas "
    "o usa un collider compuesto que impida físicamente que el corte se deslice entre las varillas de la parrilla.\n\n"
    "4. SISTEMA DE UBICACIÓN Y ACOMODO DE LA CARNE:\n"
    "   - Implementa mecánica para colocar o mover la carne: cuando se va a colocar un corte nuevo o se selecciona "
    "uno existente con el tenedor o la mano, usa un plano invisible horizontal a la altura de los hierros (y ≈ 0.35) "
    "con eventos onPointerMove/onPointerDown para que el corte siga el cursor y se pose exactamente en la parrilla al hacer clic.\n\n"
    "5. RECALIBRACIÓN TERMODINÁMICA Y REACCIÓN DE MAILLARD:\n"
    "   - En useAsadoStore.ts y MeatItemComponent.tsx, ajusta el ritmo de cocción para que NO se queme en segundos.\n"
    "   - Introduce inercia térmica: el 'cookLevel' (0.0 crudo -> 1.0 a punto -> 2.0 quemado) debe subir lentamente "
    "en función del delta de useFrame (ej. multiplicar por 0.0005 o 0.001 en lugar de valores altos directos).\n"
    "   - Si no hay brasas debajo (heat < 0.05), el corte no se cocina.\n"
    "   - El shader de Maillard debe transicionar gradualmente: rojo brillante -> marrón dorado/costra -> tostado -> carbón.\n\n"
    "6. COMPILACIÓN Y VERIFICACIÓN:\n"
    "   - Ejecuta run_tests (npm run build). Corrige cualquier error de tipos en TypeScript o props de R3F.\n"
    "   - Una vez que la compilación sea exitosa y la demo esté lista, haz push al repositorio."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_3_demo_completa, max_iterations=5)
    if exito:
        print("\n[OK] ¡Hito 3: Demo Completa de Asado Simulator implementada exitosamente!")
    else:
        print("\n[REVISAR] El harness finalizó con bloqueos o iteraciones pendientes.")