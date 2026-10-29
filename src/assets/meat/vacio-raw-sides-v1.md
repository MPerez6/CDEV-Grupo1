# Vacío crudo — atlas de ambas caras v1

Fecha: 22/10/2026.

- Herramienta: `image_gen.imagegen` integrada, mediante la habilidad imagegen.
- Recurso guardado: `src/assets/meat/vacio-raw-sides-v1.png` (3.399.612 bytes).
- Mitad izquierda: membrana/cuero, cara B. Mitad derecha: fibras y grasa, cara A.
- Referencias del usuario conservadas en `docs/referencias/vacio-cuero-crudo.png`, `vacio-fibras-crudo.png` y `vacio-espesor-crudo.png`.
- Las tres fotos son de crudo. La tercera orienta espesor y borde; no se reprodujo el enrollado de exhibición ni se generó un vacío cocinado.
- Color fotográfico generado a partir de referencias, con relieve aproximado en Three.js. No es fotogrametría ni un escaneo físico de materiales.
- El PNG se comparte entre instancias. Cada cara elige su mitad del atlas y conserva esa superficie al dar vuelta la pieza.

## Prompt final utilizado

```text
Use case: photorealistic-natural. Asset type: one production two-face RAW Argentine beef VACIO (flank cut) albedo texture atlas for a Three.js 3D model.
Reference roles: image 1 shows the raw membrane / silverskin side called "cuero"; image 2 shows the opposite raw exposed muscle side with irregular fat; image 3 provides thickness, cut-edge red muscle and thin surface fat context only. All images depict RAW meat. Do not generate cooked meat.
Create ONE 2:1 wide rectangular image with EXACTLY TWO equal square material panels directly adjacent. LEFT panel is membrane side; RIGHT panel is exposed muscle side. Both are orthographic uninterrupted close-up patches of meat filling every pixel edge to edge, no steak silhouette and no surroundings.
LEFT: broad thin bluish pearly grey, slightly translucent silverskin membrane over dark purple-red beef; fine natural wrinkles and collagen creases; red muscle visible through membrane especially in the upper/right two thirds. Irregular pale ivory-pink fatty patches mainly concentrated toward the lower-left edge. NOT a uniform white fat blanket. Natural subtle wetness, large continuous translucent membrane regions, as reference 1.
RIGHT: deep fresh crimson-red raw beef with clearly visible mostly lengthwise parallel muscle grain and subtle diagonal striations. Lean red muscle occupies most of the center and upper-right area. Irregular creamy ivory fat and delicate connective strands concentrated on the lower edge and lower-left area, smaller isolated seams elsewhere. Match reference 2. No grid-like marbling pattern and no excessive white webs like matambre.
Both panels represent opposite surfaces of the SAME cut. Keep broad anatomical scale, fine photographic pores and striations. Neutral soft scan illumination with minimal directional shading, no artificial shine, specular points, cast shadows, baked ambient occlusion, text, borders, logos, plates, trays, cutting boards, garnish, spices or utensils. Entire image consists solely of those two RAW surface textures.
```

