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
  'Mirá la ficha de la derecha: cuando dora abajo, dalo vuelta con <kbd>R</kbd>. Cuando está a punto, sacalo.',
];

const KEYS = [
  ['WASD', 'moverse'], ['Mouse', 'mirar'], ['E', 'interactuar'], ['Clic', 'usar herramienta'],
  ['1', 'encendedor'], ['2', 'pala'], ['3', 'pinza'], ['4', 'atizador'],
  ['R', 'dar vuelta'], ['Q', 'girar 90°'], ['F3', 'datos'], ['ESC', 'pausa'],
];

const helpHtml = `
  <ol class="steps">${STEPS.map(s => `<li>${s}</li>`).join('')}</ol>
  <div class="keygrid">${KEYS.map(([k, d]) => `<span><kbd>${k}</kbd> ${d}</span>`).join('')}</div>`;

export const HUD_TEMPLATE = `
  <div id="hud"><h2>ASADO · Prototipo 0.1</h2>
    <p id="clock"></p><p id="tool"></p><p id="hud-status" class="muted"></p></div>
  <div id="crosshair"></div><div id="target">Acercate a un objeto para interactuar.</div>
  <div id="message">Comenzá cargando combustible y papel/ramitas.</div>
  <aside id="meat-card" hidden></aside>
  <div id="debug" hidden></div>
  <aside id="controls">
    <div class="controls-head"><strong>Controles</strong><span><kbd>H</kbd> ocultar</span></div>
    <div class="keygrid compact">${KEYS.map(([k, d]) => `<span><kbd>${k}</kbd> ${d}</span>`).join('')}</div>
  </aside>
  <div id="controls-mini" hidden><kbd>H</kbd> controles</div>

  <div id="overlay" data-view="start">
    <section id="start-menu" class="menu">
      <div class="brand"><span class="flame">🔥</span><h1>AsArt</h1><p>Simulador de asado argentino</p></div>
      <nav>
        <button id="play" class="primary">Modo Entrenamiento</button>
        <button class="soon" disabled>Modo Clientes <small>próximamente</small></button>
        <button class="ghost" data-open="help">Cómo se juega</button>
        <button class="ghost" data-open="credits">Créditos</button>
      </nav>
      <p class="tagline">Practicá sin miedo a quemar la carne: acá nadie te mira.</p>
    </section>
    <section id="pause-menu" class="menu side">
      <h2>Pausa</h2>
      <p class="muted">El fuego sigue donde lo dejaste.</p>
      <nav>
        <button id="resume" class="primary">Seguir asando</button>
        <button class="ghost" data-open="help">Cómo se juega</button>
        <button class="ghost" id="to-start">Volver al inicio</button>
      </nav>
    </section>
    <section id="help" class="sheet" hidden><h3>Cómo se juega</h3>${helpHtml}<button class="ghost" data-close>Cerrar</button></section>
    <section id="credits" class="sheet" hidden><h3>Créditos · Grupo 01</h3>
      <p class="muted">Creatividad y Desarrollo de Entornos Virtuales · UTN FRC · 5K1</p>
      <ul class="credits">${CREDITS.map(([n, r]) => `<li><strong>${n}</strong><span>${r}</span></li>`).join('')}</ul>
      <button class="ghost" data-close>Cerrar</button></section>
  </div>
`;
