# Vacío cocinado — dos caras

22/10/2026. Continúa la muestra de vacío crudo; pendiente de aprobación visual del usuario.

- Cuero B: grasa dorada/ámbar, membrana contraída y tostado irregular según la primera foto.
- Fibras A: costra caoba y grasa caramelizada según la segunda foto.
- Atlas cocinado separado del crudo, conservando la distribución general de fibras y grasa. Cada cara mezcla crudo/cocinado con su propio dorado; el quemado añade manchas irregulares. El borde acompaña el dorado medio.
- Integrado en `src/game/vacio-visual.ts`, compartido por juego y muestra. No cambia masa, geometría, espesor, cinco capas, coeficientes ni matambre.
- `/vacio-preview.html` compara las dos caras, permite crudo/dorado/quemado, giro y vista de espesor. Los estados elegidos con botones son ejemplos visuales; no resultados de una cocción simulada.

Validación: `npm test` 74/74; `npm run typecheck` y `npm run build` aprobados. Revisión en navegador de crudo, dorado, quemado y giro: sin errores ni advertencias de consola. Persiste el aviso de build por bundle de Three.js mayor que 500 kB. No se realizó una nueva prueba completa de controles en primera persona.

Recurso y prompt: [vacio-cooked-sides-v1.md](src/assets/meat/vacio-cooked-sides-v1.md). Referencias conservadas en `docs/referencias/`. La calibración pendiente entre dorado y temperatura interna sigue fuera de este ajuste visual. Fase 3 sin iniciar.
