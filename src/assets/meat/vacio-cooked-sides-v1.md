# Vacío cocinado — atlas de ambas caras v1

Fecha: 22/10/2026. Herramienta integrada `image_gen.imagegen`, habilidad imagegen; modo generación con referencias, sin CLI.

- Recurso final: `src/assets/meat/vacio-cooked-sides-v1.png` (3.981.878 bytes).
- Original generado: `C:/Users/lucia/.codex/generated_images/01a14cbb-556e-7bf2-acf1-229d23d42d48/exec-e105cc96-9ed7-4d19-b774-bf753abaa269.png`.
- Izquierda: cuero B. Derecha: fibras A. Mismo orden que el atlas crudo, usado como referencia anatómica para reducir cambios de patrón durante la mezcla.
- Referencias del usuario: `docs/referencias/vacio-cuero-cocinado.png` (primera foto), `vacio-fibras-cocinado.png` (segunda foto). Tercera entrada: atlas crudo existente.
- Apariencia generada a partir de fotografías; no fotogrametría ni escaneo físico. El material físico y el relieve aproximado se resuelven en Three.js. Archivo nuevo, sin reemplazar el crudo ni el matambre.

## Prompt final

```text
Use case: photorealistic-natural. Asset type: production COOKED Argentine beef VACIO two-sided albedo texture atlas for an existing Three.js meat model.
Reference roles: image 1 is the user's COOKED membrane / cuero side, golden yellow rendered fat with toasted brown mottling. Image 2 is the opposite COOKED muscle side, rich dark mahogany caramelized meat and amber fat seams. Image 3 is the existing RAW two-face atlas, a supporting anatomical registration reference: preserve the broad placement of wrinkles, muscle grain and fat when cooking these surfaces; do not copy its raw colors.
Create ONE 2:1 wide rectangular image with EXACTLY TWO equal square material panels directly adjacent. LEFT is cooked membrane B; RIGHT is cooked exposed muscle A. Orthographic uninterrupted close-up surface textures filling every pixel edge to edge. No steak outline and no surroundings.
LEFT: golden honey-yellow rendered fat and contracted leathery membrane with broad irregular wrinkles matching the raw atlas; ochre toasted areas and scattered dark brown grill-contact patches, some cream-gold fat in lower left, darker caramel in upper right. Recognizably the first cooked photo, not raw silverskin, not white fat, not uniformly black. Small irregular char flecks only.
RIGHT: deep rich mahogany roast beef crust, reddish-brown and dark caramel, directional muscle fibers visible through cooked surface. Amber rendered fat seams concentrated toward lower-left/edge matching raw anatomy, smaller seams elsewhere. Irregular dark seared patches, fine pores, slight natural moist appearance, not a glossy plastic glaze. Match photo 2. No sauce.
Both panels should look like opposite sides of the same cooked vacio, with clear color and texture differences between the sides. Neutral diffuse scan illumination, no strong baked highlights or shadows because real-time rendering supplies lighting. Keep texture crisp and photographic at fine and medium scales.
Avoid: grill bars, strong artificial parallel black stripes, meat silhouette, cutting board, background, plates, knives, fork, tongs, hands, flames, garnish, pepper, salt crystals, text, borders, watermark, logos. Entire rectangle solely cooked meat material.
```
