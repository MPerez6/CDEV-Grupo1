"""
run.py - Script de disparo por objetivo
"""

from asador_harness import execute_objective

hito_1 = (
    "Hito 1 - Termodinámica y Brasas Dinámicas: "
    "Revisar el código existente en frontend/src/. "
    "Actualizar useAsadoStore.ts para soportar EmberData, decayThermalSystem y getHeatAtPosition. "
    "Modificar Embers.tsx para actualizar el InstancedMesh según las brasas vivas en el store. "
    "Conectar MeatItemComponent.tsx para que consulte el calor térmico en su posición X/Z "
    "y soporte la interacción de voltear el corte con onClick. "
    "Verificar que npm run build compile sin errores."
)

execute_objective(objective=hito_1, max_iterations=4)