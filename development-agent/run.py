from asador_harness import execute_objective

corregir_modelos_fantasmas = (
    "Corrección de Carga de Modelos y Fallback Procedural:\n\n"
    "1. AUDITORÍA INICIAL:\n"
    "   - Ejecuta inspect_3d_models() para conocer la lista REAL y exacta de modelos en public/models.\n"
    "   - NUNCA intentes cargar 'fogonero_criollo.glb' ni ningún otro modelo que no esté en esa lista.\n\n"
    "2. FOGÓN PROCEDURAL (Fogon.tsx):\n"
    "   - En Fogon.tsx, elimina cualquier llamada a useGLTF con archivos inexistentes.\n"
    "   - Modela el fogonero de forma procedural con R3F: un aro o canasto de barrotes de hierro cilíndricos oscuros, "
    "leños cruzados (cilindros con textura/color madera rústica) y la base refractaria donde caerán las brasas.\n\n"
    "3. COMPONENTES CON MODELOS REALES:\n"
    "   - Para la parrilla y la carne, usa ÚNICAMENTE los archivos .glb que inspect_3d_models haya confirmado que existen.\n"
    "   - Si existe un modelo para la carne, escálalo adecuadamente (scale={0.4} a {0.5}) con <Center> para que tenga buen porte.\n"
    "   - Si un modelo no existe, constrúyelo con primitivas nativas limpias.\n\n"
    "4. VERIFICACIÓN:\n"
    "   - Ejecuta run_tests() para confirmar que el build compile.\n"
    "   - Verifica con inspect_running_game que la consola esté libre del error de Unexpected token '<' y haz push."
)

if __name__ == "__main__":
    execute_objective(objective=corregir_modelos_fantasmas, max_iterations=4)