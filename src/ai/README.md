# IA (NPCs)

Referente: Martín (AI Programmer).

Primer NPC del proyecto: el perro del patio.

- `dog-brain.ts`: lógica pura (estados, destinos, acciones y reacciones). Se prueba sin Three.js.
- `dog-nav.ts`: navegación con A* sobre una grilla del patio con los muebles inflados por el radio del perro; el camino se estira para que no zigzaguee. Usa los obstáculos activos, que cambian entre Entrenamiento y Clientes.
- `dog-poses.ts`: ángulos de cada articulación para cada estado y acción, el paso al caminar y trotar, y la mezcla entre poses. Es lógica pura.
- `dog-model.ts`: el cuerpo, un perro criollo caramelo con pecho y patas blancas y collar rojo. Está armado como esqueleto con cuello, cabeza, mandíbula, orejas, patas de dos tramos y cola de cuatro segmentos.
- `dog.ts`: une todo. Anima las poses, muestra carteles sobre la cabeza ("🍖?", "¡GUAU!", "ñam ñam", "snif snif") y corazones, y lleva en la boca lo que agarra. Lo marca como seleccionable (`dog`).

**Regla:** cada mensaje del HUD va con una acción animada; el perro hace lo que dice el texto.

## Comportamiento

| Situación | Qué hace |
|---|---|
| Nada en particular | **Echado** en su lugar; **atento** si te acercás (te mira y mueve la cola); cada tanto sale a **olfatear** el patio. |
| Carne en la parrilla | Va y se **sienta al costado** mirando el asado (aviso una sola vez). |
| Algo se quema | **Ladra** de verdad (boca, cabeza y "¡GUAU!") mirando la parrilla; como mucho cada 20 s. |
| **E** (acariciar) | Hace un **truco** distinto cada vez: mover la cola en reverencia de juego, dar la pata, panza arriba, apoyar la cabeza en tu rodilla o dar una vuelta persiguiéndose la cola. Si está lejos, primero **viene trotando**. |
| Llevás carne o hay carne en la parrilla | Cada tanto **te viene a pedir**: se sienta frente a vos, sube las patas y aparece "🍖?". Si te alejás, te sigue. Si no le das nada en 14 s, se va ofendido. |
| **Pinza (3) + clic/E** sobre el perro con una pieza | **Se la das**: la atrapa, se la lleva en la boca a su rincón y **se la come** ("ñam ñam"). Sirve también para no tirar la carne quemada. |
| Carne sola en la tabla y vos lejos (más de 3,5 m durante 9 s) | Va a la mesa, **se para en dos patas, se la roba** y sale corriendo a comérsela. |
| **Pinza (3) + clic/E** mientras tiene algo en la boca | **Se lo sacás**: queda culposo (orejas atrás). La pieza queda **babeada**; si se la servís a un comensal, la rechaza. Hay que tirarla. |
| La basura huele (olor ≥ 50 %) | Va a **olfatear el tacho** ("snif snif"): es una pista para sacar la bolsa. |

La prueba `tests/dog.test.ts` verifica las rutas fijas contra los límites del escenario, y `tests/dog-behavior.test.ts` el navegador, los trucos, el pedido, el robo, el comer y las poses. No tiene colisión con el jugador.

La misma estructura (estado + destino + acción + eventos con mensaje) sirve de base para los clientes del Modo Clientes. El nombre es provisorio: `DOG_NAME` ("Pancho") lo define Narrativa.

## Comensales y olor de la basura

`client-brain.ts` recibe el olor del tacho (0..1) en `update(realDt, olor)`:

- Con olor desde 0,35, la paciencia baja más rápido, hasta 3 veces con olor máximo.
- Con olor insoportable (desde 0,8), cada 9 s un comensal sentado se levanta y se va (-25 puntos).
- Una pieza babeada por el perro siempre se rechaza.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.
