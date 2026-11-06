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

/** Hoja con alfa para las enredaderas y la parra (verde con nervadura). */
export function leafTexture(): THREE.CanvasTexture {
  return canvasTexture('leaf', 128, 128, 51, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    // Hoja de vid simplificada: cinco lóbulos.
    for(let i = 0;i <= 60;i++) {
      const t = (i / 60) * Math.PI * 2;
      const lobes = 1 + 0.28 * Math.cos(5 * t);
      const rad = 50 * lobes;
      const px = w / 2 + Math.cos(t) * rad, py = h / 2 + Math.sin(t) * rad * 0.92;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 3;
    for(let i = 0;i < 5;i++) {
      const t = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(t) * 46, h / 2 + Math.sin(t) * 44);
      ctx.stroke();
    }
  }, false);
}
