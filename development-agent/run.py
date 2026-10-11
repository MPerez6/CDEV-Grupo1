from asador_harness import execute_objective

hito_3_inspeccionado_logs = (
    "Hito 3 - Demo Asado Simulator con Diagnóstico de Modelos 3D y UI Despejada:\n\n"
    "1. SISTEMA DE LOGS Y DIAGNÓSTICO DE MODELOS 3D:\n"
    "   - Crea o actualiza 'src/utils/modelLogger.ts'. Cada vez que un componente intente cargar un modelo\n"
    "     con useGLTF, debe capturar: ruta del archivo, éxito o error, cantidad de nodos/mallas y el BoundingBox.\n"
    "   - Si useGLTF falla o el modelo no existe en public/models/, captura el error con try/catch o ErrorBoundary,\n"
    "     regístralo con console.error y dibuja una geometría de fallback visible (ej. caja o cilindro rústico) para no congelar el Canvas.\n"
    "   - Genera un archivo estático o script de registro en 'frontend/public/models_audit.json' detallando el estado de cada modelo GLB.\n\n"
    "2. REORGANIZACIÓN DE LA UI NARRATIVA (GUÍA ARRIBA Y VISTA DESPEJADA):\n"
    "   - En 'src/components/UI/GameUI.tsx':\n"
    "     a) Ubica la barra de herramientas y botones arriba en el centro (top: 16px, left: 50%, transform: translateX(-50%)).\n"
    "     b) Ubica los mensajes de guía, estado del fuego y consejos del asador DIRECTAMENTE DEBAJO de los botones (top: 75px),\n"
    "        con un ancho controlado (max-width: 480px) y fondo semi-transparente para que NUNCA tapen la parrilla ni las brasas.\n"
    "     c) Corrige cualquier conflicto de estilos eliminando la mezcla de 'border' con 'borderColor'.\n\n"
    "3. CORRECCIÓN DE CORTES DE CARNE Y ESCALAS GLB:\n"
    "   - En 'src/components/MeatItem/MeatItemComponent.tsx':\n"
    "     a) Clona la escena si se reutiliza el mismo modelo: const clone = useMemo(() => scene.clone(), [scene]).\n"
    "     b) Usa <Center> de @react-three/drei y normaliza la escala (scale={0.3} aprox) para que el corte no caiga entre los hierros.\n"
    "     c) Asegúrate de que el colisionador de Rapier (RigidBody type='dynamic') use un cuboid de dimensiones reales del corte.\n"
    "     d) Implementa el plano horizontal invisible en la parrilla para permitir arrastrar y soltar la carne exactamente donde apunte el cursor.\n\n"
    "4. CICLO DE FUEGO Y RITUAL INICIAL:\n"
    "   - En 'useAsadoStore.ts', la parrilla DEBE iniciar limpia y sin brasas (embers: []).\n"
    "   - El jugador debe encender el fogón (Fogon.tsx), esperar que se formen las brasas y trasladarlas con la pala debajo de la parrilla.\n"
    "   - Calibra el ritmo de cocción para que el cookLevel aumente lentamente con inercia térmica realista y no se queme en segundos.\n\n"
    "5. VERIFICACIÓN Y VALIDACIÓN:\n"
    "   - Ejecuta run_tests (npm run build). Resuelve cualquier error de TypeScript.\n"
    "   - Al compilar con éxito, el harness abrirá la app en el navegador (entrando al juego con clic en menú), capturará debug_screen.png y revisará los logs.\n"
    "   - Si se visualiza la parrilla, el fogón, la carne con escala correcta y la UI despejada, haz push al repositorio."
)

if __name__ == "__main__":
    execute_objective(objective=hito_3_inspeccionado_logs, max_iterations=5)