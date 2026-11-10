import * as THREE from 'three';

/** Texturas procedurales del patio (canvas). Sin archivos externos: cada una se genera una sola vez. */

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

/** Generador pseudoaleatorio con semilla, para que el patio salga igual en cada carga. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(key: string, w: number, h: number, seed: number, paint: Painter, repeat = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if(hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if(ctx) paint(ctx, w, h, seeded(seed));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if(repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** Copia con su propio repeat (las texturas cacheadas no se modifican). */
export function tiled(tex: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

/** Medianera de ladrillo común con algo de revoque descascarado. 1 tile = 3,2 m × 1,5 m (BRICK_TILE). */
export const BRICK_TILE = { w: 3.2, h: 1.5 };
export function brickTexture(): THREE.CanvasTexture {
  return canvasTexture('brick', 1024, 480, 11, (ctx, w, h, r) => {
    ctx.fillStyle = '#8f8476';
    ctx.fillRect(0, 0, w, h);
    const bw = 80, bh = 21, gap = 3;
    for(let row = 0;row * bh < h;row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for(let x = -bw;x < w + bw;x += bw) {
        const tone = r();
        const base = [168 + tone * 40, 84 + tone * 26, 56 + tone * 18].map(v => Math.round(v));
        ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        ctx.fillRect(x + offset + gap / 2, row * bh + gap / 2, bw - gap, bh - gap);
        // Variación dentro del ladrillo.
        for(let k = 0;k < 6;k++) {
          ctx.fillStyle = `rgba(${r() < 0.5 ? '60,30,20' : '230,170,130'},${0.08 + r() * 0.1})`;
          ctx.fillRect(x + offset + r() * bw, row * bh + r() * bh, 3 + r() * 10, 2 + r() * 4);
        }
      }
    }
    // Restos de revoque: pocos, chicos y desparejos (no "manchas de vaca").
    for(let p = 0;p < 3;p++) {
      const cx = r() * w, cy = r() * h * 0.8;
      for(let k = 0;k < 7;k++) {
        const bx = cx + (r() - 0.5) * 70, by = cy + (r() - 0.5) * 40, rad = 6 + r() * 20;
        ctx.fillStyle = `rgba(${196 + r() * 14},${188 + r() * 12},${170 + r() * 12},${0.55 + r() * 0.3})`;
        ctx.beginPath();
        for(let a = 0;a <= 14;a++) {
          const ang = (a / 14) * Math.PI * 2, rr = rad * (0.5 + r() * 0.6);
          const px = bx + Math.cos(ang) * rr, py = by + Math.sin(ang) * rr * 0.6;
          a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    // Humedad / suciedad en la parte baja del tile.
    const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    grad.addColorStop(0, 'rgba(40,35,25,0)');
    grad.addColorStop(1, 'rgba(40,35,25,0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Revoque pintado de la casa (color crema gastado). */
export function plasterTexture(): THREE.CanvasTexture {
  return canvasTexture('plaster', 256, 256, 23, (ctx, w, h, r) => {
    ctx.fillStyle = '#e2d6bd';
    ctx.fillRect(0, 0, w, h);
    for(let i = 0;i < 900;i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '120,105,80' : '255,250,235'},${0.04 + r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4);
    }
  });
}

/** Mantel de hule a cuadros rojo y blanco. */
export function huleTexture(): THREE.CanvasTexture {
  return canvasTexture('hule', 256, 256, 5, (ctx, w, h) => {
    const n = 8, s = w / n;
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(196,36,40,0.55)';
    for(let i = 0;i < n;i += 2) {
      ctx.fillRect(i * s, 0, s, h);
      ctx.fillRect(0, i * s, w, s);
    }
  });
}

/** Chapa ondulada pintada de verde, con algo de óxido. */
export function chapaTexture(): THREE.CanvasTexture {
  return canvasTexture('chapa', 256, 256, 31, (ctx, w, h, r) => {
    for(let x = 0;x < w;x++) {
      const k = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 8);
      const v = 70 + k * 45;
      ctx.fillStyle = `rgb(${Math.round(v * 0.45)},${Math.round(v)},${Math.round(v * 0.6)})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for(let i = 0;i < 40;i++) {
      ctx.fillStyle = `rgba(140,70,30,${0.15 + r() * 0.3})`;
      ctx.fillRect(r() * w, h * (0.75 + r() * 0.25), 2 + r() * 8, 3 + r() * 20);
    }
  });
}

/** Baldosa calcárea (dibujo en estrella) para el rincón de la mesa. 1 tile = 0,4 m. */
export function calcareoTexture(): THREE.CanvasTexture {
  return canvasTexture('calcareo', 256, 256, 41, (ctx, w, h, r) => {
    ctx.fillStyle = '#cfc6b4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#93594a';
    ctx.beginPath();
    for(let i = 0;i < 16;i++) {
      const ang = (i / 16) * Math.PI * 2, rad = i % 2 ? 46 : 112;
      const px = w / 2 + Math.cos(ang) * rad, py = h / 2 + Math.sin(ang) * rad;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#56686a';
    for(const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#cfc6b4';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,60,50,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    for(let i = 0;i < 500;i++) {
      ctx.fillStyle = `rgba(60,50,40,${r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

/** Carteles de papel con texto (almanaque, nota). */
export function paperTexture(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  return canvasTexture(key, w, h, 3, ctx => paint(ctx, w, h), false);
}

/** Hoja de parra (Vitis vinifera) detallada: 5 lóbulos aserrados, seno basal y nervaduras palmadas. */
export function leafTexture(): THREE.CanvasTexture {
  return canvasTexture('leaf', 256, 256, 51, (ctx, w, h, r) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.54;

    // Silueta de hoja de vid con 5 lóbulos profundos y borde dentado (aserrado)
    ctx.save();
    ctx.beginPath();
    const steps = 180;
    for(let i = 0; i <= steps; i++) {
      const u = i / steps;
      const t = u * Math.PI * 2 - Math.PI / 2; // empieza arriba (ápice)
      const angleFromTop = t + Math.PI / 2; // 0..2pi

      // Seno peciolar profundo en la base (alrededor de pi)
      const basalSinus = Math.exp(-Math.pow((angleFromTop - Math.PI) / 0.28, 2));
      // 5 lóbulos principales con senos laterales marcados
      const fiveLobes = 0.78 + 0.26 * Math.cos(5 * angleFromTop) - 0.12 * Math.cos(10 * angleFromTop);
      // Dientes finos del margen de la hoja de parra
      const teeth = (1 - basalSinus * 0.9) * (0.045 * Math.sin(36 * angleFromTop) + 0.02 * Math.cos(72 * angleFromTop));

      const radius = 104 * Math.max(0.14, fiveLobes * (1 - basalSinus * 0.72) + teeth);
      const px = cx + Math.cos(t) * radius * 0.96;
      const py = cy + Math.sin(t) * radius;
      if(i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Gradiente base claro (se multiplica con instanceColor en Three.js)
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 110);
    grad.addColorStop(0, '#f2f7dc');
    grad.addColorStop(0.65, '#d5e4be');
    grad.addColorStop(1, '#a9c090');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.clip();

    // Variación celular suave en la lámina foliar
    for(let i = 0; i < 160; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,220,0.07)' : 'rgba(40,65,30,0.08)';
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 4 + r() * 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nervaduras principales palmadas (5 venas que nacen de la base peciolar)
    const veinAngles = [-Math.PI / 2, -Math.PI / 2 - 0.68, -Math.PI / 2 + 0.68, -Math.PI / 2 - 1.38, -Math.PI / 2 + 1.38];
    const veinLengths = [102, 92, 92, 74, 74];
    for(let v = 0; v < veinAngles.length; v++) {
      const ang = veinAngles[v];
      const len = veinLengths[v];
      const ex = cx + Math.cos(ang) * len;
      const ey = cy + Math.sin(ang) * len;

      // Sombra junto a la nervadura para dar relieve
      ctx.strokeStyle = 'rgba(35,55,25,0.28)';
      ctx.lineWidth = v === 0 ? 4.5 : 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 3);
      ctx.quadraticCurveTo((cx + ex) * 0.5 + 3, (cy + ey) * 0.5 + 2, ex, ey);
      ctx.stroke();

      // Nervadura clara amarillenta
      ctx.strokeStyle = 'rgba(238,248,195,0.75)';
      ctx.lineWidth = v === 0 ? 2.6 : 2.0;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.quadraticCurveTo((cx + ex) * 0.5 + 2, (cy + ey) * 0.5, ex, ey);
      ctx.stroke();

      // Nervaduras secundarias ramificadas
      for(let s = 1; s <= 4; s++) {
        const frac = s / 5;
        const bx = cx + Math.cos(ang) * len * frac;
        const by = cy + Math.sin(ang) * len * frac;
        for(const side of [-1, 1]) {
          const subAng = ang + side * 0.62;
          const subLen = (1 - frac * 0.55) * 32;
          ctx.strokeStyle = 'rgba(225,240,185,0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(subAng) * subLen, by + Math.sin(subAng) * subLen);
          ctx.stroke();
        }
      }
    }

    // Borde oscuro sutil
    ctx.strokeStyle = 'rgba(45,65,30,0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }, false);
}

/** Ramillete de hojas ovaladas para la copa del árbol y arbustos. */
export function treeFoliageTexture(): THREE.CanvasTexture {
  return canvasTexture('tree-foliage', 256, 256, 73, (ctx, w, h, r) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    // Ramillete de 9 hojas elípticas superpuestas con nervadura central
    const count = 11;
    for(let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.35;
      const dist = 24 + r() * 44;
      const lx = cx + Math.cos(ang) * dist;
      const ly = cy + Math.sin(ang) * dist;
      const lw = 38 + r() * 16;
      const lh = 20 + r() * 9;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang + (r() - 0.5) * 0.4);

      const grad = ctx.createLinearGradient(-lw, 0, lw, 0);
      grad.addColorStop(0, '#bed69c');
      grad.addColorStop(0.5, '#e8f4ce');
      grad.addColorStop(1, '#abc686');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(-lw, 0);
      ctx.quadraticCurveTo(0, -lh, lw, 0);
      ctx.quadraticCurveTo(0, lh, -lw, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(40,65,25,0.32)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(240,250,200,0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-lw * 0.85, 0);
      ctx.lineTo(lw * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    }
  }, false);
}

/** Corteza rugosa para el tronco de la parra, los sarmientos y el árbol del patio. */
export function barkTexture(): THREE.CanvasTexture {
  return canvasTexture('bark', 256, 256, 89, (ctx, w, h, r) => {
    ctx.fillStyle = '#5c4634';
    ctx.fillRect(0, 0, w, h);
    for(let x = 0; x < w; x += 3) {
      const shade = 0.78 + 0.22 * Math.sin(x * 0.24) + (r() - 0.5) * 0.18;
      ctx.fillStyle = `rgb(${Math.round(92 * shade)},${Math.round(70 * shade)},${Math.round(52 * shade)})`;
      ctx.fillRect(x, 0, 3, h);
    }
    // Surcos verticales de corteza y líquenes sutiles
    for(let i = 0; i < 140; i++) {
      ctx.fillStyle = r() < 0.7 ? 'rgba(28,18,12,0.35)' : 'rgba(135,125,98,0.18)';
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 18 + r() * 48);
    }
  });
}

/** Piso de lajas / baldosones de patio con juntas y desgaste natural. */
export function patioSlabTexture(): THREE.CanvasTexture {
  return canvasTexture('patio-slab', 512, 512, 97, (ctx, w, h, r) => {
    ctx.fillStyle = '#8b8579';
    ctx.fillRect(0, 0, w, h);
    const cols = 4, rows = 4;
    const cw = w / cols, ch = h / rows;
    for(let ry = 0; ry < rows; ry++) {
      for(let rx = 0; rx < cols; rx++) {
        const tone = (r() - 0.5) * 18;
        ctx.fillStyle = `rgb(${Math.round(156 + tone)},${Math.round(149 + tone)},${Math.round(136 + tone)})`;
        ctx.fillRect(rx * cw + 3, ry * ch + 3, cw - 6, ch - 6);
        for(let k = 0; k < 45; k++) {
          ctx.fillStyle = r() < 0.5 ? 'rgba(65,58,48,0.07)' : 'rgba(225,218,202,0.07)';
          ctx.fillRect(rx * cw + r() * cw, ry * ch + r() * ch, 3 + r() * 10, 3 + r() * 10);
        }
      }
    }
    ctx.strokeStyle = 'rgba(58,53,45,0.55)';
    ctx.lineWidth = 4;
    for(let i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * ch); ctx.lineTo(w, i * ch); ctx.stroke();
    }
  });
}

/** Tablones de madera rústica para la mesa de preparación. */
export function woodPlankTexture(): THREE.CanvasTexture {
  return canvasTexture('wood-plank', 512, 512, 113, (ctx, w, h, r) => {
    ctx.fillStyle = '#734b2e';
    ctx.fillRect(0, 0, w, h);
    const planks = 6;
    const ph = h / planks;
    for(let p = 0; p < planks; p++) {
      const y0 = p * ph;
      const baseShift = (r() - 0.5) * 18;
      for(let y = 0; y < ph; y++) {
        const wave = Math.sin((y / ph) * Math.PI * 3 + r() * 0.8) * 8;
        const R = Math.round(118 + baseShift + wave);
        const G = Math.round(76 + baseShift * 0.7 + wave * 0.6);
        const B = Math.round(46 + baseShift * 0.5 + wave * 0.4);
        ctx.fillStyle = `rgb(${R},${G},${B})`;
        ctx.fillRect(0, y0 + y, w, 1);
      }
      // Nudos suaves y vetas longitudinales
      for(let k = 0; k < 18; k++) {
        ctx.fillStyle = r() < 0.6 ? 'rgba(42,24,12,0.12)' : 'rgba(175,126,84,0.10)';
        ctx.fillRect(r() * w, y0 + r() * (ph - 4), 24 + r() * 90, 1 + r() * 3);
      }
      // Junta entre tablones
      ctx.fillStyle = 'rgba(30,18,10,0.65)';
      ctx.fillRect(0, y0, w, 3);
    }
  });
}

/** Tabla de madera para asado con veta fina y canaleta perimetral para jugos. */
export function cuttingBoardTexture(): THREE.CanvasTexture {
  return canvasTexture('cutting-board', 512, 320, 127, (ctx, w, h, r) => {
    ctx.fillStyle = '#bc8e5b';
    ctx.fillRect(0, 0, w, h);
    for(let y = 0; y < h; y += 2) {
      const v = Math.sin(y * 0.14) * 7 + (r() - 0.5) * 6;
      ctx.fillStyle = `rgb(${Math.round(190 + v)},${Math.round(142 + v * 0.8)},${Math.round(90 + v * 0.5)})`;
      ctx.fillRect(0, y, w, 2);
    }
    for(let i = 0; i < 60; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(95,62,32,0.10)' : 'rgba(235,195,140,0.12)';
      ctx.fillRect(r() * w, r() * h, 30 + r() * 110, 2 + r() * 3);
    }
    // Canaleta perimetral tallada en la tabla
    const margin = 22;
    ctx.strokeStyle = 'rgba(105,68,36,0.55)';
    ctx.lineWidth = 7;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    ctx.strokeStyle = 'rgba(235,198,148,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin + 3, margin + 3, w - (margin + 3) * 2, h - (margin + 3) * 2);
  }, false);
}
