import { HUD_TEMPLATE } from './template.ts';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { footprintCoverage } from '../sim/meatFootprint.ts';
import { TOOL_NAMES } from '../gameplay/tools.ts';
import type { InteractionTarget, TargetKind } from '../gameplay/targets.ts';
import { targetName } from './target-labels.ts';
import { describeMeat } from './cooking-card.ts';

export type HudState = { activeTool: number; target: InteractionTarget | null };

const CONTROLS_KEY = 'asado-controles-ocultos';
const MESSAGE_SECONDS = 6;

export function createHud(app: HTMLElement, initialMessage: string) {
  app.innerHTML = HUD_TEMPLATE;
  const $ = (id: string): HTMLElement => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Falta elemento ${id}`);
    return element;
  };
  let debugEnabled = false;
  let lastMsg = initialMessage;
  let started = false;
  let messageTimer = 0;

  // Mensajes: aparecen abajo y se van solos, para no tapar el juego.
  function flash(message: string): void {
    const el = $('message');
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => el.classList.remove('show'), MESSAGE_SECONDS * 1000);
  }
  flash(initialMessage);

  // Guía de controles en la esquina; H la oculta o la muestra (se recuerda entre partidas).
  let controlsHidden = false;
  try { controlsHidden = localStorage.getItem(CONTROLS_KEY) === '1'; } catch { /* sin almacenamiento */ }
  const applyControls = () => { $('controls').hidden = controlsHidden; $('controls-mini').hidden = !controlsHidden; };
  applyControls();
  const onKey = (e: KeyboardEvent) => {
    if(e.code !== 'KeyH' || e.repeat) return;
    controlsHidden = !controlsHidden;
    try { localStorage.setItem(CONTROLS_KEY, controlsHidden ? '1' : '0'); } catch { /* sin almacenamiento */ }
    applyControls();
  };
  window.addEventListener('keydown', onKey);

  // Menús: inicio, pausa lateral y hojas de ayuda / créditos.
  const overlay = $('overlay');
  const showView = (view: 'start' | 'pause') => { overlay.dataset.view = view; closeSheets(); };
  const closeSheets = () => { $('help').hidden = true; $('credits').hidden = true; };
  overlay.querySelectorAll<HTMLElement>('[data-open]').forEach(b => b.addEventListener('click', () => {
    closeSheets(); $(b.dataset.open as string).hidden = false;
  }));
  overlay.querySelectorAll<HTMLElement>('[data-close]').forEach(b => b.addEventListener('click', closeSheets));
  $('to-start').addEventListener('click', () => showView('start'));

  // Ficha de cocción: la carne apuntada o la que llevás en la pinza.
  function renderMeatCard(world: SimulationWorld, target: InteractionTarget | null): void {
    const card = $('meat-card');
    const carried = world.carriedMeatId !== null;
    const id = target?.kind === 'meat' && typeof target.meatId === 'number' ? target.meatId : world.carriedMeatId;
    const meat = id === null || id === undefined ? undefined : world.meatById(id);
    if(!meat) { card.hidden = true; return; }
    const c = describeMeat(meat, carried && id === world.carriedMeatId);
    card.hidden = false;
    card.dataset.tone = c.tone;
    card.innerHTML = `
      <header><strong>${c.name}</strong><span>${c.place}</span></header>
      <div class="doneness">${c.doneness}</div>
      <div class="meter"><i style="width:${Math.round(c.progress * 100)}%"></i></div>
      <p class="muted">${c.center}</p>
      <ul class="faces">${c.faces.map(f => `<li data-tone="${f.tone}"><span>${f.name}${f.down ? ' · abajo' : ''}</span><b>${f.label}</b></li>`).join('')}</ul>
      <p class="hint">${c.hint}</p>`;
  }
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
    $('target').textContent = kind ? targetName(kind, target?.index) : '';
    if (world.message !== lastMsg) { lastMsg = world.message; flash(world.message); }
    renderMeatCard(world, target);
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
    showMessage(message: string): void { lastMsg = message; flash(message); },
    toggleDebug(): void { debugEnabled = !debugEnabled; $('debug').hidden = !debugEnabled; },
    setPlaying(playing: boolean): void {
      if(playing) started = true;
      document.body.classList.toggle('playing', playing);
      overlay.style.display = playing ? 'none' : 'block';
      if(!playing) showView(started ? 'pause' : 'start');
    },
    onPlay(action: () => void): () => void {
      $('play').addEventListener('click', action);
      $('resume').addEventListener('click', action);
      return () => {
        $('play').removeEventListener('click', action);
        $('resume').removeEventListener('click', action);
        window.removeEventListener('keydown', onKey);
      };
    },
  };
}
