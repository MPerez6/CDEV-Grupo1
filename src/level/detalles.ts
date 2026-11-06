import * as THREE from 'three';
import { paperTexture } from './textures.ts';

/**
 * Narrativa del entorno (propuesta): objetos en la pared del fondo que cuentan la historia sin texto en pantalla.
 * El delantal del tío, el almanaque de la parrilla de pueblo donde va a trabajar el protagonista (Modo Clientes)
 * y la nota del tío. Nombres provisorios ("Don Ramón", "Ruta 9"): los define Narrativa.
 */
export const STORY_PLACEHOLDERS = { dueno: 'Don Ramón', parrilla: 'PARRILLA DON RAMÓN', ruta: 'Ruta 9 km 712', firma: 'el tío' };

const WALL_Z = -7.035; // cara interior de la medianera del fondo

function plane(scene: THREE.Scene, w: number, h: number, map: THREE.Texture, pos: [number, number, number], tilt = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.9, transparent: true, alphaTest: 0.05 }));
  m.position.set(...pos);
  m.rotation.z = tilt;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function nail(scene: THREE.Scene, x: number, y: number): void {
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.4 }));
  n.rotation.x = Math.PI / 2;
  n.position.set(x, y, WALL_Z + 0.025);
  scene.add(n);
}

export function createDetalles(scene: THREE.Scene): void {
  // Delantal del tío colgado de un clavo.
  const apron = paperTexture('apron', 256, 384, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#23324a';
    ctx.beginPath();
    ctx.moveTo(w * 0.32, 0); ctx.lineTo(w * 0.68, 0); ctx.lineTo(w * 0.7, h * 0.28);
    ctx.quadraticCurveTo(w * 0.98, h * 0.3, w * 0.94, h * 0.98); ctx.lineTo(w * 0.06, h * 0.98);
    ctx.quadraticCurveTo(w * 0.02, h * 0.3, w * 0.3, h * 0.28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d9d2c2'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w * 0.32, 0); ctx.quadraticCurveTo(w * 0.5, -h * 0.1, w * 0.68, 0); ctx.stroke();
    ctx.fillStyle = '#1a263a';
    ctx.fillRect(w * 0.25, h * 0.58, w * 0.5, h * 0.17);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EL TÍO', w / 2, h * 0.45);
    ctx.font = '19px Georgia, serif';
    ctx.fillText('maestro parrillero', w / 2, h * 0.52);
    ctx.fillStyle = 'rgba(80,50,30,0.35)';
    for(let i = 0;i < 9;i++) { ctx.beginPath(); ctx.arc(w * (0.25 + (i * 37 % 50) / 100), h * (0.66 + (i * 13 % 30) / 100), 6 + i % 3 * 4, 0, Math.PI * 2); ctx.fill(); }
  });
  nail(scene, 2.75, 2.12);
  plane(scene, 0.5, 0.75, apron, [2.75, 1.72, WALL_Z + 0.012], 0.03);

  // Almanaque de la parrilla de pueblo, con el sábado marcado.
  const calendar = paperTexture('almanaque', 320, 448, (ctx, w, h) => {
    ctx.fillStyle = '#f6f0e1'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8f1d1d'; ctx.fillRect(0, 0, w, 120);
    ctx.fillStyle = '#fff4dc'; ctx.textAlign = 'center';
    ctx.font = 'bold 30px Georgia, serif'; ctx.fillText(STORY_PLACEHOLDERS.parrilla, w / 2, 48, w - 20);
    ctx.font = '17px system-ui'; ctx.fillText('Atención al público · ' + STORY_PLACEHOLDERS.ruta, w / 2, 78, w - 20);
    ctx.font = 'italic 16px Georgia, serif'; ctx.fillText('“Asado, achuras y buena atención”', w / 2, 104, w - 20);
    ctx.fillStyle = '#2b2b2b'; ctx.font = 'bold 24px system-ui'; ctx.fillText('NOVIEMBRE 2026', w / 2, 158);
    const cols = ['D', 'L', 'M', 'M', 'J', 'V', 'S'], cw = (w - 30) / 7;
    ctx.font = 'bold 16px system-ui';
    cols.forEach((c, i) => { ctx.fillStyle = i === 0 ? '#a32020' : '#444'; ctx.fillText(c, 15 + cw * i + cw / 2, 188); });
    // 1/11/2026 cae domingo.
    ctx.font = '18px system-ui';
    for(let d = 1;d <= 30;d++) {
      const idx = d - 1, col = idx % 7, row = Math.floor(idx / 7);
      const cx = 15 + cw * col + cw / 2, cy = 222 + row * 42;
      ctx.fillStyle = col === 0 ? '#a32020' : '#2b2b2b';
      ctx.fillText(String(d), cx, cy);
      if(d === 7) {
        ctx.strokeStyle = '#c0261f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, cy - 6, 17, 15, -0.2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#c0261f'; ctx.font = 'italic bold 15px "Segoe Print", "Comic Sans MS", cursive';
        ctx.fillText('¡arranco!', cx - 4, cy + 20);
        ctx.font = '18px system-ui';
      }
    }
  });
  nail(scene, 3.8, 2.13);
  plane(scene, 0.44, 0.62, calendar, [3.8, 1.8, WALL_Z + 0.01], -0.02);

  // Nota del tío pegada con cinta.
  const note = paperTexture('nota-tio', 384, 280, (ctx, w, h) => {
    ctx.fillStyle = '#fbf3c8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,120,180,0.35)'; ctx.lineWidth = 1.5;
    for(let y = 56;y < h;y += 34) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(w - 14, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(220,220,200,0.75)';
    ctx.fillRect(w / 2 - 50, -6, 100, 26);
    ctx.fillStyle = '#1f2f6b'; ctx.textAlign = 'left';
    ctx.font = '25px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    const lines = [`Pibe: ya hablé con ${STORY_PLACEHOLDERS.dueno}.`, 'El sábado arrancás en la parrilla.', 'Practicá acá el finde, que el fuego', 'no se aprende en YouTube.', `                       — ${STORY_PLACEHOLDERS.firma}`];
    lines.forEach((l, i) => ctx.fillText(l, 18, 50 + i * 34, w - 30));
  });
  plane(scene, 0.46, 0.34, note, [4.75, 1.5, WALL_Z + 0.01], 0.05);
}
