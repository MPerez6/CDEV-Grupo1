export type Obstacle = Readonly<{ x0: number; x1: number; z0: number; z1: number }>;
// Colisiones simples con las estructuras grandes; no hay cuerpos rígidos.
export function isPlayerBlocked(x: number, z: number, obstacles: readonly Obstacle[]): boolean {
  if(x < -7.5 || x > 7.5 || z < -6.6 || z > 4.6) return true;
  const radius = 0.25;
  return obstacles.some(w => x > w.x0 - radius && x < w.x1 + radius && z > w.z0 - radius && z < w.z1 + radius);
}
