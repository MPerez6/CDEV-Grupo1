/**
 * Navegación del perro por el patio: A* sobre una grilla con los muebles inflados por el radio del perro,
 * y después se "estira" el camino (solo quedan las esquinas necesarias). Lógica pura, sin Three.js.
 */
export type Vec2 = { x: number; z: number };
export type NavObstacle = { x0: number; x1: number; z0: number; z1: number };

/** Límites caminables del patio (los mismos que el jugador, un poco adentro de las paredes). */
export const PATIO_LIMITS = { x0: -7.3, x1: 7.3, z0: -6.4, z1: 4.4 } as const;
const CELL = 0.2;
const DOG_RADIUS = 0.3;

const COLS = Math.round((PATIO_LIMITS.x1 - PATIO_LIMITS.x0) / CELL) + 1;
const ROWS = Math.round((PATIO_LIMITS.z1 - PATIO_LIMITS.z0) / CELL) + 1;
const toX = (c: number) => PATIO_LIMITS.x0 + c * CELL;
const toZ = (r: number) => PATIO_LIMITS.z0 + r * CELL;
const colOf = (x: number) => Math.max(0, Math.min(COLS - 1, Math.round((x - PATIO_LIMITS.x0) / CELL)));
const rowOf = (z: number) => Math.max(0, Math.min(ROWS - 1, Math.round((z - PATIO_LIMITS.z0) / CELL)));

/** ¿El perro (con su radio) choca con algo parado en (x, z)? */
export function dogBlocked(x: number, z: number, obstacles: readonly NavObstacle[], radius = DOG_RADIUS): boolean {
  if(x < PATIO_LIMITS.x0 || x > PATIO_LIMITS.x1 || z < PATIO_LIMITS.z0 || z > PATIO_LIMITS.z1) return true;
  return obstacles.some(o => x > o.x0 - radius && x < o.x1 + radius && z > o.z0 - radius && z < o.z1 + radius);
}

/** Tramo recto libre (muestreado cada 5 cm). */
export function segmentClear(a: Vec2, b: Vec2, obstacles: readonly NavObstacle[]): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
  for(let i = 0;i <= steps;i++) {
    const t = i / steps;
    if(dogBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, obstacles)) return false;
  }
  return true;
}

/** Punto libre más cercano a `p` (para destinos pegados a un mueble, como el jugador junto a la mesa). */
export function nearestFree(p: Vec2, obstacles: readonly NavObstacle[]): Vec2 | null {
  if(!dogBlocked(p.x, p.z, obstacles)) return { ...p };
  for(let ring = 1;ring < 30;ring++) {
    let best: Vec2 | null = null, bestD = Infinity;
    for(let i = 0;i < 16;i++) {
      const a = i / 16 * Math.PI * 2, q = { x: p.x + Math.cos(a) * ring * CELL, z: p.z + Math.sin(a) * ring * CELL };
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if(!dogBlocked(q.x, q.z, obstacles) && d < bestD) { best = q; bestD = d; }
    }
    if(best) return best;
  }
  return null;
}

/**
 * Camino de `from` a `to` esquivando obstáculos. Devuelve los puntos de paso (sin incluir `from`),
 * o `null` si no hay forma de llegar.
 */
export function findPath(from: Vec2, to: Vec2, obstacles: readonly NavObstacle[]): Vec2[] | null {
  const goal = nearestFree(to, obstacles);
  if(!goal) return null;
  if(segmentClear(from, goal, obstacles)) return [goal];
  const start = nearestFree(from, obstacles) ?? from;
  const sc = colOf(start.x), sr = rowOf(start.z), gc = colOf(goal.x), gr = rowOf(goal.z);
  const n = COLS * ROWS, startId = sr * COLS + sc, goalId = gr * COLS + gc;
  const g = new Float64Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const blocked = (id: number) => dogBlocked(toX(id % COLS), toZ(Math.floor(id / COLS)), obstacles);
  const h = (id: number) => Math.hypot(id % COLS - gc, Math.floor(id / COLS) - gr);
  const open = new MinHeap();
  open.push(startId, h(startId));
  g[startId] = 0;
  while(open.size) {
    const cur = open.pop();
    if(cur === goalId) break;
    if(closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % COLS, cr = Math.floor(cur / COLS);
    for(let dr = -1;dr <= 1;dr++) for(let dc = -1;dc <= 1;dc++) {
      if(!dr && !dc) continue;
      const nc = cc + dc, nr = cr + dr;
      if(nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const id = nr * COLS + nc;
      if(closed[id] || (id !== goalId && blocked(id))) continue;
      // En diagonal no se cortan esquinas: las dos celdas laterales tienen que estar libres.
      if(dr && dc && (blocked(cr * COLS + nc) || blocked(nr * COLS + cc))) continue;
      const cost = g[cur] + (dr && dc ? Math.SQRT2 : 1);
      if(cost < g[id]) { g[id] = cost; came[id] = cur; open.push(id, cost + h(id)); }
    }
  }
  if(came[goalId] < 0 && goalId !== startId) return null;
  const cells: Vec2[] = [];
  for(let id = goalId;id !== startId && id >= 0;id = came[id]) cells.unshift({ x: toX(id % COLS), z: toZ(Math.floor(id / COLS)) });
  cells[cells.length - 1] = goal;
  return smooth(from, cells, obstacles);
}

/** Montículo binario mínimo de ids por prioridad. */
class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size(): number { return this.ids.length; }
  push(id: number, key: number): void {
    this.ids.push(id); this.keys.push(key);
    let i = this.ids.length - 1;
    while(i > 0) {
      const p = (i - 1) >> 1;
      if(this.keys[p] <= this.keys[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): number {
    const top = this.ids[0];
    const lastId = this.ids.pop() as number, lastKey = this.keys.pop() as number;
    if(this.ids.length) {
      this.ids[0] = lastId; this.keys[0] = lastKey;
      let i = 0;
      for(;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if(l < this.ids.length && this.keys[l] < this.keys[m]) m = l;
        if(r < this.ids.length && this.keys[r] < this.keys[m]) m = r;
        if(m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}

/** Saca los puntos intermedios que se pueden saltear en línea recta. */
function smooth(from: Vec2, cells: Vec2[], obstacles: readonly NavObstacle[]): Vec2[] {
  const out: Vec2[] = [];
  let anchor = from, i = 0;
  while(i < cells.length) {
    let j = cells.length - 1;
    while(j > i && !segmentClear(anchor, cells[j], obstacles)) j--;
    out.push(cells[j]);
    anchor = cells[j];
    i = j + 1;
  }
  return out;
}
