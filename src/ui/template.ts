export const HUD_TEMPLATE = `
  <div id="hud"><h2>ASADO · Prototipo 0.1</h2>
    <p id="clock"></p><p id="tool"></p><p id="hud-status" class="muted"></p></div>
  <div id="crosshair"></div><div id="target">Acercate a un objeto para interactuar.</div>
  <div id="message">Comenzá cargando combustible y papel/ramitas.</div>
  <div id="debug" hidden></div>
  <div id="reticle-help">F3: datos internos · ESC: pausa</div>
  <div id="overlay"><div id="panel">
    <h1>🔥 El asador — primera prueba</h1>
    <p>Prepará las brasas y cociná matambre, vacío, tira de asado, falda, chorizo y morcilla. Cada pieza conserva <strong>5 capas térmicas</strong> y su propio estado.</p>
    <ul><li><kbd>WASD</kbd> Caminar</li><li><kbd>Mouse</kbd> Mirar</li><li><kbd>E</kbd> Interactuar</li>
    <li><kbd>1</kbd> Encendedor</li><li><kbd>2</kbd> Pala</li><li><kbd>3</kbd> Pinza</li>
    <li><kbd>4</kbd> Atizador</li><li><kbd>Clic</kbd> Usar herramienta</li>
    <li><kbd>R</kbd> Dar vuelta / rodar</li><li><kbd>Q</kbd> Orientar 90°</li><li><kbd>F3</kbd> Ver cálculos</li></ul>
    <p class="muted">Los materiales están separados debajo de la mesada: leña gruesa, leña fina, carbón vegetal y papel/ramitas. Cargalos con E. Encendé el papel debajo del brasero izquierdo; las brasas listas caen sobre la mesada. Recogelas con la pala y llevalas a la parrilla derecha. Cuando quede espacio, podés reponer combustible: prende con el que siga caliente.</p>
    <p class="muted">Los cortes están en las tablas a la derecha. Con pinza (3), E para recoger; clic sobre la parrilla para colocar. R da vuelta los cortes y rueda media vuelta los embutidos. E sobre una tabla devuelve la pieza sostenida.</p>
    <button id="play">Entrar al patio</button>
  </div></div>
`;
