from asador_harness import execute_objective

hito_tabla_glb_y_brasas_procedurales = (
    "OBJETIVO: Integración de modelo 3D 'Tabla.glb', Calibración de Utensilios de Mesada y Brasas Procedurales Bajo la Parrilla:\n\n"
    "1. AUDITORÍA Y REGISTRO DEL MODELO 'Tabla.glb' EN MODEL REGISTRY:\n"
    "   - Ejecuta obligatoriamente `inspect_3d_models()` para inspeccionar `/models/Tabla.glb` (dimensiones, bounding box, nodos y materiales).\n"
    "   - Registra `/models/Tabla.glb` en `src/config/modelRegistry.ts` bajo la clave `TABLA` con su metadata correspondiente (url: '/models/Tabla.glb', defaultTargetSize: ~1.1m a 1.2m).\n\n"
    "2. REEMPLAZO DE LA MESADA PROCEDURAL POR 'Tabla.glb' (`src/components/Environment/PampaEnvironment.tsx`):\n"
    "   - En el componente `MesadaRustica` (o sección de la mesada lateral en `PampaEnvironment.tsx`), ELIMINA la estructura procedural previa (patas de quebracho, travesaños y tapa superior generadas con `boxGeometry` de Three.js).\n"
    "   - En su lugar, renderiza el modelo GLB real `/models/Tabla.glb` utilizando `SafeGLTF` y `GLBModel` (referenciado desde `MODEL_REGISTRY.TABLA.url`).\n"
    "   - Ubica la mesa a la derecha de la parrilla (x ~ 0.95, z ~ 0.05), con una escala realista (targetSize aproximado entre 1.0m y 1.2m) apoyada firmemente a nivel del suelo (y = 0).\n\n"
    "3. CALIBRACIÓN DE ALTURA Y ORIENTACIÓN DE UTENSILIOS SOBRE LA TABLA:\n"
    "   - Determina la altura Y exacta de la superficie superior de `Tabla.glb`.\n"
    "   - Ajusta los elementos apoyados sobre la tabla para que queden perfectamente alineados sin flotar ni incrustarse:\n"
    "     a) `cuchillo_en_madera.glb`: Debe quedar apoyado con su base/bloque de madera descansando exactamente sobre la tabla (`y = alturaSuperficieTabla + offset`).\n"
    "     b) `botella_de_vino_vieja.glb`: Debe quedar parada verticalmente sobre la tabla (ajusta su `rotation` si el modelo original viene acostado horizontalmente, ej. `rotation={[-Math.PI / 2, 0, 0]}` o `[0, 0, 0]` según corresponda a los ejes de su geometría) y con su base apoyada en la superficie de la mesa.\n\n"
    "4. BRASAS PROCEDURALES MEJORADAS BAJO LA PARRILLA (`GlowingEmberModel.tsx` y `Grill.tsx`):\n"
    "   - REGLA ESTRICTA: Las brasas debajo de la parrilla (`Grill.tsx`) DEBEN ser generadas PROCEDURALMENTE y TIENEN PROHIBIDO cargar modelos 3D `.glb` de carbón repetidos.\n"
    "   - `GlowingEmberModel.tsx`: Soporta prop `procedural?: boolean`. Cuando es true, genera un clúster orgánico de 3 a 4 trozos de brasa de quebracho (`DodecahedronGeometry` achatados con deformación pseudo-aleatoria según `seed`).\n"
    "   - Shader/Material: Corteza oscura de carbón (`#1a1412`) y ceniza grisácea (`#4a4442`) en caras superiores (`vLocalNormal.y > 0.2`), con incandescencia roja/naranja (`#b81400` a `#ff4500`) concentrada en fisuras/base y pulso suave térmico en `useFrame`.\n"
    "   - En `Grill.tsx`, atenúa el `pointLight` rojo para dar iluminación cálida parrillera (`#ff5511`, intensidad moderada) sin saturar el suelo de rojo neón.\n"
    "   - En `Fogon.tsx` mantén `/models/carbon_fogonero.glb` y en `PlayerTools.tsx` mantén `/models/carbon.glb` en la pala.\n\n"
    "5. VERIFICACIÓN Y PUSH:\n"
    "   - Ejecuta `run_tests()` (`npm run build`) y verifica que compile con 0 errores de TypeScript y Vite.\n"
    "   - Ejecuta `inspect_running_game()` para validar visualmente la escena.\n"
    "   - Haz commit y push al repositorio con `push_to_repository`."
)

if __name__ == "__main__":
    exito = execute_objective(objective=hito_tabla_glb_y_brasas_procedurales, max_iterations=5)
    if exito:
        print("\n[OK] ¡Modelo Tabla.glb integrado, utensilios calibrados y brasas procedurales listas!")
    else:
        print("\n[REVISAR] El harness finalizó con iteraciones pendientes.")