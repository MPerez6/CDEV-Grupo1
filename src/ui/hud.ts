import { HUD_TEMPLATE } from './template.ts';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { footprintCoverage } from '../sim/meatFootprint.ts';
import { TOOL_NAMES } from '../gameplay/tools.ts';
import type { InteractionTarget, TargetKind } from '../gameplay/targets.ts';
import { targetName } from './target-labels.ts';
import { describeMeat } from './cooking-card.ts';
import { MEAT_CATALOG } from '../sim/meatCatalog.ts';
import { CLIENT_SEATS, donenessShortLabel, estimateOrderTip } from '../ai/client-brain.ts';

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

  // Ficha de cocción: solo visible en modo entrenamiento (en modo clientes se evalúa a ojo como un asador experto).
  function renderMeatCard(world: SimulationWorld, target: InteractionTarget | null): void {
    const card = $('meat-card');
    if(world.clients.enabled) { card.hidden = true; return; }
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

  function renderOrdersPanel(world: SimulationWorld): void {
    const panel = $('orders-panel');
    if(!world.clients.enabled) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const cm = world.clients;
    const activeOrders = cm.clients.filter(c => c.state === 'esperando' || c.state === 'comiendo');
    const incomingCount = cm.clients.filter(c => c.state === 'entrando').length;
    const rowsHtml = activeOrders.length === 0
      ? `<p class="muted">${incomingCount > 0 ? 'Clientes caminando hacia la mesa...' : 'Esperando que lleguen clientes al patio...'}</p>`
      : `<ul class="order-list">${activeOrders.map(c => {
          const cutName = MEAT_CATALOG[c.order.kind].name;
          const pointName = donenessShortLabel(c.order.doneness, c.order.kind);
          const seatLabel = CLIENT_SEATS[c.seatIndex]?.sideLabel ?? `Silla ${c.seatIndex + 1}`;
          const pct = Math.round(c.patienceRatio * 100);
          let tone: string;
          let statusLabel: string;
          let rewardLine: string;
          if(c.state === 'comiendo') {
            const sign = c.lastScoreDelta >= 0 ? `+${c.lastScoreDelta}` : `${c.lastScoreDelta}`;
            const tipBadge = c.lastTipPesos > 0 ? `+$${c.lastTipPesos.toLocaleString('es-AR')}` : 'Sin propina ($0)';
            if(c.isAngry) {
              tone = 'over';
              statusLabel = c.reactionTitle ?? '😡 ¡Enojado!';
            } else if(c.reactionKind === 'queja-punto') {
              tone = 'progress';
              statusLabel = c.reactionTitle ?? '😒 Punto errado';
            } else {
              tone = 'ready';
              statusLabel = c.reactionTitle ?? '😋 ¡Comiendo!';
            }
            rewardLine = `<div class="order-reward"><span>Resultado:</span><b>${sign} pts · ${tipBadge}</b></div>`;
          } else {
            tone = pct > 50 ? 'ready' : pct > 25 ? 'progress' : 'over';
            statusLabel = pointName;
            const liveTip = estimateOrderTip(c.order.kind, c.patienceRatio);
            rewardLine = `<div class="order-reward"><span>Propina estimada:</span><b>+$${liveTip.toLocaleString('es-AR')}</b></div>`;
          }
          return `<li data-tone="${tone}">
            <div class="order-top"><strong>${c.profile.name}</strong><span>${seatLabel}</span></div>
            <div class="order-cut">${cutName} · <b>${statusLabel}</b></div>
            ${rewardLine}
            ${c.state === 'esperando' ? `<div class="meter"><i style="width:${pct}%"></i></div>` : ''}
          </li>`;
        }).join('')}</ul>`;

    const streakHtml = cm.streak >= 2 ? `<span class="streak-pill">🔥 Racha x${cm.streak}</span>` : '';
    const last = cm.lastDelivery;
    let lastHtml = '';
    if(last) {
      const sign = last.scoreDelta >= 0 ? `+${last.scoreDelta}` : `${last.scoreDelta}`;
      const lastTone = last.grade === 'excelente' || last.grade === 'bueno' ? 'ready' : last.grade === 'regular' ? 'progress' : 'over';
      const tipStr = last.tipPesos > 0 ? `+$${last.tipPesos.toLocaleString('es-AR')}` : '$0';
      lastHtml = `<div class="last-delivery" data-tone="${lastTone}">
        <div class="last-top"><span>Última: <b>${last.clientName}</b> (${last.cutName})</span><span>${last.shortTitle}</span></div>
        <div class="last-nums"><b>${sign} pts</b> · Propina: <b>${tipStr}</b></div>
      </div>`;
    }

    panel.innerHTML = `
      <header><strong>Comandas · Parrilla AsArt</strong><span>⭐ ${cm.score} pts</span></header>
      <div class="orders-rank"><span>${cm.rankTitle}</span>${streakHtml}</div>
      <div class="orders-stats">
        <span>Atendidos: <b>${cm.servedCount}</b>${cm.lostCount > 0 ? ` · Perdidos: <b class="bad-num">${cm.lostCount}</b>` : ''}</span>
        <span class="tips-total">Propinas: <b>$${cm.tipsPesos.toLocaleString('es-AR')}</b></span>
      </div>
      ${lastHtml}
      ${rowsHtml}`;
  }
  const toolSlotEls = Array.from(document.querySelectorAll<HTMLElement>('#tool-bar .tool-slot'));

  function formatTargetHtml(raw: string): string {
    return raw.replace(/\[([^\]]+)\]/g, '<kbd>$1</kbd>');
  }

  function update(world: SimulationWorld, state: HudState): void {
    const activeTool = state.activeTool;
    const minutes = Math.floor(world.simSeconds / 60);
    const seconds = Math.floor(world.simSeconds % 60);
    $('clock').textContent = `⏱ ${minutes}:${String(seconds).padStart(2, '0')} · x${CONFIG.timeScale}`;
    $('tool').textContent = `Herramienta: ${activeTool + 1} · ${TOOL_NAMES[activeTool]}`;

    const modeBadge = $('mode-badge');
    if(world.clients.enabled) {
      modeBadge.textContent = '🍽️ Modo Clientes';
      modeBadge.dataset.mode = 'clients';
    } else {
      modeBadge.textContent = '🎓 Entrenamiento';
      modeBadge.dataset.mode = 'training';
    }

    // Actualizar barra visual de herramientas (slots 1..4) y estado de carga en Pala y Pinza
    for(let i = 0; i < toolSlotEls.length; i++) {
      toolSlotEls[i].dataset.active = i === activeTool ? 'true' : 'false';
    }
    const shovelSub = $('slot-sub-1');
    if(world.carried) {
      shovelSub.textContent = world.carried.state === 'ready' ? '● Brasa roja' : '● Inmadura';
      shovelSub.dataset.loaded = 'true';
    } else {
      shovelSub.textContent = 'Vacía';
      shovelSub.dataset.loaded = 'false';
    }

    const tongsSub = $('slot-sub-2');
    const carriedMeat = world.carriedMeatId !== null ? world.meatById(world.carriedMeatId) : undefined;
    if(carriedMeat) {
      tongsSub.textContent = `● ${carriedMeat.definition.name}`;
      tongsSub.dataset.loaded = 'true';
    } else {
      tongsSub.textContent = 'Vacía';
      tongsSub.dataset.loaded = 'false';
    }

    $('slot-sub-0').textContent = world.brazier.lit ? 'Listo' : 'Encender';
    $('slot-sub-3').textContent = world.grill.emberCount > 0 ? 'Mover' : 'Golpear';

    // Estado rápido de fuego y brasas
    const trayReady = world.brazier.tray.filter(e => e.state === 'ready').length;
    const brazierPill = world.brazier.lit
      ? `<span class="status-pill lit">🔥 Brasero encendido (${world.brazier.occupiedSlots}/${world.brazier.capacitySlots})</span>`
      : `<span class="status-pill">🪵 Brasero apagado (${world.brazier.occupiedSlots}/${world.brazier.capacitySlots})</span>`;
    const trayPill = trayReady > 0
      ? `<span class="status-pill warn">✨ ${trayReady} brasa${trayReady > 1 ? 's' : ''} en mesada</span>`
      : '';
    const grillPill = `<span class="status-pill">♨️ Parrilla: ${world.grill.emberCount} brasa${world.grill.emberCount === 1 ? '' : 's'}</span>`;
    $('hud-status').innerHTML = `${brazierPill}${trayPill}${grillPill}`;

    const target = state.target;
    const kind = target?.kind as TargetKind | undefined;
    $('crosshair').dataset.active = kind ? 'true' : 'false';
    $('target').innerHTML = kind ? formatTargetHtml(targetName(kind, target?.index)) : '';
    if (world.message !== lastMsg) { lastMsg = world.message; flash(world.message); }
    renderMeatCard(world, target);
    renderOrdersPanel(world);
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
    onPlay(action: (mode?: 'training' | 'clients') => void): () => void {
      const onTraining = () => action('training');
      const onClients = () => action('clients');
      const onResume = () => action();
      $('play').addEventListener('click', onTraining);
      $('play-clients').addEventListener('click', onClients);
      $('resume').addEventListener('click', onResume);
      return () => {
        $('play').removeEventListener('click', onTraining);
        $('play-clients').removeEventListener('click', onClients);
        $('resume').removeEventListener('click', onResume);
        window.removeEventListener('keydown', onKey);
      };
    },
  };
}
