import { CONFIG } from './parameters.ts';

/** Acumula tiempo real y ejecuta física a paso fijo, independientemente del renderizado. */
export class FixedStepClock {
  private pendingSimSeconds = 0;

  advance(realSeconds: number, tick: (simSeconds: number) => void): number {
    if (!Number.isFinite(realSeconds) || realSeconds <= 0) return 0;
    this.pendingSimSeconds += realSeconds * CONFIG.timeScale;
    let steps = 0;
    const dt = CONFIG.simulationStepSeconds;
    // Tolerancia solo para redondeo al sumar los intervalos de los frames.
    const epsilon = 1e-10;
    while (this.pendingSimSeconds + epsilon >= dt && steps < CONFIG.simulationMaxStepsPerFrame) {
      tick(dt);
      this.pendingSimSeconds = Math.max(0, this.pendingSimSeconds - dt);
      steps++;
    }
    // Si un frame tarda mucho, conservar lo pendiente para los siguientes, sin borrar tiempo.
    return steps;
  }
}
