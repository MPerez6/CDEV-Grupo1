# Matambre — recurso visual v1

Fecha: 22/10/2026.

- Recurso del proyecto: `src/assets/meat/matambre-raw-cooked-v1.png` (3.694.094 bytes).
- Generación: herramienta integrada `image_gen.imagegen`, mediante la habilidad imagegen.
- Referencias del usuario conservadas en `docs/referencias/matambre-crudo.png` y `matambre-cocinado.png`.
- Atlas: mitad izquierda cruda y mitad derecha dorada. Se mezcla por cara en el material del modelo, sin recortar el archivo ni incluir la tabla o parrilla de las referencias.
- Color en sRGB; el relieve usa una lectura de datos de la misma imagen. Es un material aproximado, no un escaneo de propiedades físicas ni fotogrametría.
- El archivo se comparte entre instancias. La geometría, el brillo, las normales y el oscurecimiento final se generan o controlan en Three.js.

## Prompt final utilizado

```text
Use case: photorealistic-natural. Asset type: one production albedo texture atlas for a Three.js Argentine matambre 3D food model, not a finished food photograph.
Inputs: first reference image is raw Argentine matambre, second reference image is cooked matambre; use only meat surface information, omit boards, grill surroundings, logos and all text.
Create ONE wide rectangular atlas with exactly TWO equal square panels touching along the central vertical edge: LEFT = uncooked surface; RIGHT = the SAME surface fully grilled, spatially registered to the left. Each panel is an orthographic macro view of an uninterrupted patch of thin flank skin muscle filling every pixel edge to edge. No outline of a steak and no background in either panel.
Left: muted natural pink rose muscle fibers running mostly horizontally with slightly diagonal fine strands; irregular thin translucent ivory connective membranes and delicate branching white silverskin threads spread over pink meat, tiny pale fat seams, subtle moist texture. Match the first reference's delicate pink/ivory matambre, not a thick red steak and not white marbled steak.
Right: the same fiber layout and patches cooked golden amber, caramelized warm brown, small toasted speckles, ivory-to-gold rendered fat seams, softly uneven lightly charred toasted areas and very faint irregular diagonal grill contact, as in second reference. No massive black parallel stripes. Appetizing browned matambre, not burned black.
Lighting: neutral diffuse scan illumination, no directional highlights or shadows, no ambient occlusion baked into texture. Sharp realistic fine organic material detail, no drawn patterns, no stylization, no borders, labels, watermarks, utensils, visible grill bars, board or solid background. Entire 2:1 image is only the raw and cooked meat surface atlas.
```

