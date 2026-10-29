import { HUD_TEMPLATE } from './template.ts';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { footprintCoverage } from '../sim/meatFootprint.ts';
import { TOOL_NAMES } from '../gameplay/tools.ts';
import type { InteractionTarget, TargetKind } from '../gameplay/targets.ts';
import { targetName } from './target-labels.ts';

export type HudState = { activeTool: number; target: InteractionTarget | null };

export function createHud(app: HTMLElement, initialMessage: string) {
  app.innerHTML = HUD_TEMPLATE;
  const $ = (id: string): HTMLElement => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Falta elemento ${id}`);
    return element;
  };
  let debugEnabled = false;
  let lastMsg = initialMessage;
  function update(world: SimulationWorld, state: HudState): void {
    const activeTool = state.activeTool;
    const minutes = Math.floor(world.simSeconds / 60);
    const seconds = Math.floor(world.simSeconds % 60);
    $('clock').textContent = `Tiempo simulado: ${minutes}:${String(seconds).padStart(2, '0')} · x${CONFIG.timeScale}`;
    $('tool').textContent = `Herramienta: ${activeTool + 1} · ${TOOL_NAMES[activeTool]}`;
    const held = world.carried ? world.carried.state === 'ready' ? 'Brasas rojas' : 'Fragmento inmaduro' : 'Nada';
    $('hud-status').textContent = `En la pala: ${held} · Pinza: ${world.carriedMeatId === null ? 'vacía' : 'con una pieza'}`;
    const target = state.target;
    const kind = target?.kind as TargetKind | undefined;
    $('target').textContent = kind ? targetName(kind, target?.index) : 'Acercate y apuntá a un objeto para interactuar.';
    if (world.message !== lastMsg) { lastMsg = world.message; $('message').textContent = world.message; }
    if (debugEnabled) {
      const focusId = target?.meatId ?? world.carriedMeatId;
      const focus = typeof focusId === 'number' ? world.meatById(focusId) ?? world.meat : world.meat;
      $('debug').textContent = [
        'DIAGNÓSTICO · F3 para ocultar',
        `${focus.definition.name} #${focus.id} · ${focus.definition.massKg} kg · ${focus.definition.thicknessM * 100} cm`,
        `Capas ${focus.definition.geometry === 'cylinder' ? 'envoltura → centro' : 'cara A → B'}: ${focus.layersC.map(n => n.toFixed(1)).join(' / ')} °C`,
        `Centro: ${focus.centerC.toFixed(1)} °C · flujo: ${world.meatFluxWm2(focus).toFixed(0)} W/m²`,
        `Dorado A/B: ${focus.brown.a.toFixed(1)} / ${focus.brown.b.toFixed(1)}`,
        `Quemado A/B: ${focus.burn.a.toFixed(1)} / ${focus.burn.b.toFixed(1)}`,
        `Envoltura A/B: ${focus.casingDamage.a.toFixed(1)} / ${focus.casingDamage.b.toFixed(1)}`,
        `Jugosidad: ${focus.juiciness.toFixed(1)}% · cara inferior: ${focus.faceDown}`,
        `Estado: ${focus.state} · objetivo: ${focus.definition.target === null ? 'PENDIENTE' : focus.objectiveAchieved ? 'SÍ' : 'NO'}`,
        `Sectores cubiertos: ${focus.onGrill ? footprintCoverage(focus).map(c => `${c.index + 1}:${Math.round(c.weight * 100)}%`).join(' ') : 'fuera de parrilla'}`,
        ...world.meats.map(m => `#${m.id} ${m.definition.name}: ${m.centerC.toFixed(1)} °C · ${m.location}`),
        `Porciones de brasas activas: ${world.grill.emberCount}`,
        `Fragmentos bajo el brasero: ${world.brazier.tray.length}`,
        `Papel restante: ${world.brazier.tinderSecondsRemaining.toFixed(1)} s simulados`,
        `Carga del brasero: ${world.brazier.occupiedSlots}/${world.brazier.capacitySlots} espacios`,
        `Encendido por pieza: ${world.brazier.fuel.map(f => `${f.slot}:${Math.round(f.progress * 100)}%`).join(' / ')}`,
        `Pérdida por combustión + calor: modelo PROVISIONAL`,
      ].join('\n');
    }
  }
  return { update,
    showMessage(message: string): void { lastMsg = message; $('message').textContent = message; },
    toggleDebug(): void { debugEnabled = !debugEnabled; $('debug').hidden = !debugEnabled; },
    setPlaying(playing: boolean): void { $('overlay').style.display = playing ? 'none' : 'grid'; },
    onPlay(action: () => void): () => void {
      $('play').addEventListener('click', action);
      return () => $('play').removeEventListener('click', action);
    },
  };
}
