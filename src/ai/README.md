# IA (NPCs)

Referente: Martín (AI Programmer).

Primer NPC del proyecto: el perro del patio. `dog-brain.ts` es la lógica pura (estados, destinos, reacciones) y se prueba sin Three.js; `dog.ts` arma el cuerpo low-poly, anima las poses y lo marca como seleccionable (`dog`: E lo acaricia).

Comportamiento:
- **echado** en su lugar, a la izquierda del asador; **atento** si te acercás (te mira y mueve la cola).
- Cada tanto sale a **olfatear** el patio y vuelve.
- Con carne en la parrilla se **sienta al costado** mirando el asado (aviso una sola vez).
- Si algo se quema, **ladra** (como mucho cada 20 s): es una pista para el jugador.
- **E** lo acaricia: se pone contento, mueve la cola y salen corazones.

Todos los recorridos pasan por el costado de la parrilla (`DOG_SPOTS.beg`), así no atraviesa muebles; la prueba `tests/dog.test.ts` lo verifica contra los límites del escenario. No tiene colisión con el jugador.

La misma estructura (estado + destino + eventos con mensaje) sirve de base para los clientes del Modo Clientes cuando el equipo lo defina. Nombre provisorio: `DOG_NAME` ("Pancho"), a definir por Narrativa.

Desde la raíz: `npm run dev`, `npm test`, `npm run typecheck` y `npm run build`.
