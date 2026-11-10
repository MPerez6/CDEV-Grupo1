/** Créditos del Grupo 01 (según el SDD). */
export const CREDITS: ReadonlyArray<[string, string]> = [
  ['Alessandro González', 'Dirección creativa, técnica y narrativa'],
  ['Luciano Ludueña', 'Producción, game design y gameplay'],
  ['Manuel Pérez', 'Lead y engine programmer'],
  ['Martín Carrizo', 'IA (NPCs) e interfaz'],
  ['Emily Baolino', 'Level design, UX e interfaz'],
  ['Gonzalo Gudiño', 'Game design, level design y worldbuilding'],
  ['Valentino Bongiorno', 'Dirección de arte y technical artist'],
  ['Tiziana Altamirano', 'Dirección de audio y sonido'],
];

const STEPS = [
  'Cargá carbón o leña con <kbd>E</kbd> en los huecos de abajo de la mesada, y después el papel con ramitas.',
  'Con el encendedor <kbd>1</kbd>, hacé clic sobre el papel que está debajo del brasero.',
  'Esperá: las brasas listas caen solas a la mesada. Con el atizador <kbd>4</kbd> podés golpear el brasero.',
  'Con la pala <kbd>2</kbd>, recogé las brasas y repartilas debajo de la parrilla.',
  'Con la pinza <kbd>3</kbd>, agarrá un corte de la mesa con <kbd>E</kbd> y apoyalo en la parrilla con un clic.',
  'Cuando dora la cara inferior, dalo vuelta con <kbd>R</kbd>. En Modo Clientes servilo en el plato con la pinza.',
];

const KEYS = [
  ['WASD', 'moverse'], ['Mouse', 'mirar'], ['E', 'interactuar'], ['Clic', 'usar herramienta'],
  ['1', 'encendedor'], ['2', 'pala'], ['3', 'pinza'], ['4', 'atizador'],
  ['R', 'dar vuelta'], ['Q', 'girar 90°'], ['F3', 'diagnóstico'], ['ESC', 'pausa'],
];

const TOOL_SLOTS = [
  { key: '1', icon: '🔥', name: 'Encendedor' },
  { key: '2', icon: '🥄', name: 'Pala' },
  { key: '3', icon: '🥢', name: 'Pinza' },
  { key: '4', icon: '🦯', name: 'Atizador' },
];

const helpHtml = `
  <ol class="steps">${STEPS.map(s => `<li>${s}</li>`).join('')}</ol>
  <div class="keygrid">${KEYS.map(([k, d]) => `<span><kbd>${k}</kbd> ${d}</span>`).join('')}</div>`;

export const HUD_TEMPLATE = `
  <div id="hud">
    <div class="hud-top">
      <div class="hud-brand">
        <span class="hud-flame">🔥</span>
        <strong>AsArt</strong>
        <span id="mode-badge" class="mode-pill">Entrenamiento</span>
      </div>
      <span id="clock" class="clock-pill">0:00 · x4</span>
    </div>
    <div id="tool-bar" class="tool-bar">
      ${TOOL_SLOTS.map((t, idx) => `
        <div class="tool-slot" data-slot="${idx}">
          <span class="slot-key">${t.key}</span>
          <span class="slot-icon">${t.icon}</span>
          <span class="slot-name">${t.name}</span>
          <small class="slot-sub" id="slot-sub-${idx}"></small>
        </div>
      `).join('')}
    </div>
    <p id="tool" class="sr-only"></p>
    <div id="hud-status" class="hud-status"></div>
  </div>
  <aside id="orders-panel" hidden></aside>
  <div id="crosshair"></div>
  <div id="target">Acercate a un objeto para interactuar.</div>
  <div id="message">Comenzá cargando combustible y papel/ramitas.</div>
  <aside id="meat-card" hidden></aside>
  <div id="debug" hidden></div>
  <aside id="controls">
    <div class="controls-head"><strong>Atajos rápidos</strong><span><kbd>H</kbd> ocultar</span></div>
    <div class="keygrid compact">${KEYS.map(([k, d]) => `<span><kbd>${k}</kbd> ${d}</span>`).join('')}</div>
  </aside>
  <div id="controls-mini" hidden><kbd>H</kbd> Controles</div>

  <div id="overlay" data-view="start">
    <section id="start-menu" class="menu">
      <div class="brand">
        <div class="brand-badge">SIMULADOR DE PARRILLA ARGENTINA</div>
        <h1><span class="flame">🔥</span> AsArt</h1>
        <p>El arte del fuego, las brasas y el punto justo</p>
      </div>
      <nav>
        <button id="play-clients" class="primary mode-btn">
          <span class="btn-title">🍽️ Modo Clientes · Parrilla AsArt</span>
          <small class="btn-desc">Atendé las mesas del patio, cociná a ojo y ganá propinas</small>
        </button>
        <button id="play" class="ghost mode-btn">
          <span class="btn-title">🎓 Modo Entrenamiento</span>
          <small class="btn-desc">Practicá con guía de temperatura y consejos paso a paso</small>
        </button>
        <div class="menu-row">
          <button class="ghost" data-open="help">📖 Cómo se juega</button>
          <button class="ghost" data-open="credits">👥 Créditos</button>
        </div>
      </nav>
      <p class="tagline">Domá el brasero, distribuí las brasas y sacá cada corte en su punto exacto.</p>
    </section>
    <section id="pause-menu" class="menu side">
      <div class="brand-badge">JUEGO EN PAUSA</div>
      <h2>Descanso del Asador</h2>
      <p class="muted">El fuego y los comensales te esperan donde los dejaste.</p>
      <nav>
        <button id="resume" class="primary">🔥 Seguir asando</button>
        <button class="ghost" data-open="help">📖 Cómo se juega</button>
        <button class="ghost" id="to-start">🏠 Volver al menú principal</button>
      </nav>
    </section>
    <section id="help" class="sheet" hidden>
      <header class="sheet-head"><h3>📖 Guía del Parrillero</h3><button class="icon-close" data-close>✕</button></header>
      ${helpHtml}
      <button class="ghost" data-close>Entendido</button>
    </section>
    <section id="credits" class="sheet" hidden>
      <header class="sheet-head"><h3>👥 Créditos · Grupo 01</h3><button class="icon-close" data-close>✕</button></header>
      <p class="muted">Creatividad y Desarrollo de Entornos Virtuales · UTN FRC · 5K1</p>
      <ul class="credits">${CREDITS.map(([n, r]) => `<li><strong>${n}</strong><span>${r}</span></li>`).join('')}</ul>
      <button class="ghost" data-close>Cerrar</button>
    </section>
  </div>
`;
