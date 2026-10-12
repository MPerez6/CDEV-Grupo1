import React, { useState } from 'react';
import { useAsadoStore, generateUniqueMeatId, AsadoTool } from '../../store/useAsadoStore';

export const GameUI: React.FC = () => {
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const meats = useAsadoStore((state) => state.meats);
  const addMeat = useAsadoStore((state) => state.addMeat);

  const fogonStage = useAsadoStore((state) => state.fogonStage);
  const fogonProgress = useAsadoStore((state) => state.fogonProgress);
  const fogonEmbersCount = useAsadoStore((state) => state.fogonEmbersCount);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const rustLevel = useAsadoStore((state) => state.rustLevel);
  const isClean = useAsadoStore((state) => state.isClean);
  const colocarPapelYFosforo = useAsadoStore((state) => state.colocarPapelYFosforo);
  const encenderFogon = useAsadoStore((state) => state.encenderFogon);

  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const startPlacingMeat = useAsadoStore((state) => state.startPlacingMeat);
  const cancelPlacingMeat = useAsadoStore((state) => state.cancelPlacingMeat);

  const [showLoreModal, setShowLoreModal] = useState(false);

  const handleAddNewMeat = () => {
    const cuts = ['Tira de Asado Criolla', 'Vacío Pampeano', 'Entraña Criolla', 'Bife de Costilla'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    const newId = generateUniqueMeatId('corte');

    addMeat({
      id: newId,
      cut: randomCut,
      position: [0, 0.44, 0]
    });
    startPlacingMeat(newId);
  };

  const toolsHud: { id: AsadoTool; keyHint: string; label: string; icon: string }[] = [
    { id: 'cepillo', keyHint: 'C / 1', label: 'Cepillo', icon: '🧹' },
    { id: 'pala', keyHint: 'P / 2', label: 'Pala', icon: '🪵' },
    { id: 'atizador', keyHint: 'A / 3', label: 'Atizador', icon: '🦯' },
    { id: 'tenedor', keyHint: 'T / 4', label: 'Tenedor', icon: '🍴' },
  ];

  return (
    <div style={styles.hudContainer}>
      {/* 1. GUÍA HUD DISCRETA SUPERIOR CON ATAJOS POR TECLADO (sin tapar la parrilla ni depender de clics) */}
      <header style={styles.topHudBar} aria-label="Controles del Asador">
        <div style={styles.keysGroup}>
          {toolsHud.map((t) => {
            const isActive = selectedTool === t.id;
            return (
              <div
                key={t.id}
                style={isActive ? styles.hudKeyItemActive : styles.hudKeyItem}
                onClick={() => setSelectedTool(t.id)}
                title={`Presiona [${t.keyHint}] para equipar ${t.label}`}
              >
                <span style={styles.keyBadge}>[{t.keyHint}]</span>
                <span style={styles.keyIcon}>{t.icon}</span>
                <span style={styles.keyName}>{t.label}</span>
                {t.id === 'pala' && carriedEmbersCount > 0 && (
                  <span style={styles.carriedBadge}>{carriedEmbersCount}</span>
                )}
              </div>
            );
          })}

          <div
            style={selectedTool === 'ninguna' ? styles.hudKeyItemActive : styles.hudKeyItem}
            onClick={() => setSelectedTool('ninguna')}
            title="Presiona [ESC] para desequipar herramienta"
          >
            <span style={styles.keyBadge}>[ESC]</span>
            <span style={styles.keyName}>Mano libre</span>
          </div>
        </div>

        {/* Separador fino */}
        <div style={styles.verticalDivider} />

        {/* Controles discretos en esquina superior */}
        <div style={styles.quickActionsGroup}>
          <button
            style={styles.pillBtn}
            onClick={handleAddNewMeat}
            title="Añadir otro corte a la parrilla"
          >
            + Corte
          </button>

          {placingMeatId && (
            <button
              style={styles.confirmPillBtn}
              onClick={cancelPlacingMeat}
              title="Asentar corte en su posición"
            >
              ✓ Asentar
            </button>
          )}

          <button
            style={styles.infoPillBtn}
            onClick={() => setShowLoreModal(!showLoreModal)}
            title="Tradición del asado criollo"
          >
            ℹ️
          </button>
        </div>
      </header>

      {/* 2. BARRA DE ESTADO SUTIL INFERIOR (Fuego, fierros y consejo contextual sin bloquear la escena) */}
      <div style={styles.bottomStatusBanner}>
        <div style={styles.statusChipsRow}>
          {fogonStage === 'sin_fuego' && (
            <button style={styles.fogonPillAction} onClick={colocarPapelYFosforo}>
              🪵 Iniciar Fogón (Papel y Fósforo)
            </button>
          )}

          {fogonStage === 'con_papel' && (
            <button style={styles.fogonPillHot} onClick={encenderFogon}>
              🔥 Encender Leña de Quebracho
            </button>
          )}

          {fogonStage === 'encendido' && (
            <div style={styles.guideBadge}>
              🔥 Leña ardiendo: <strong>{Math.round(fogonProgress * 100)}%</strong>
            </div>
          )}

          {fogonStage === 'brasas_listas' && (
            <div style={styles.guideBadge}>
              ✨ Brasas listas: <strong>{fogonEmbersCount}</strong>
              {carriedEmbersCount > 0 ? ` | En pala: ${carriedEmbersCount}` : ''}
            </div>
          )}

          <div style={styles.guideBadge}>
            Fierros: <strong>{isClean ? 'Curados' : `${Math.round((1 - rustLevel) * 100)}%`}</strong>
          </div>
        </div>

        {/* Tip contextual ultra discreto */}
        <div style={styles.subtextHint}>
          {placingMeatId ? (
            <span>🥩 <strong>Acomodar:</strong> Mové el puntero y hacé clic sobre la parrilla para asentar el corte.</span>
          ) : selectedTool === 'tenedor' ? (
            <span>🍴 <strong>Tenedor [T/4]:</strong> Clic en el corte para pinchar y voltear. Shift+clic para mover.</span>
          ) : selectedTool === 'pala' ? (
            <span>🪵 <strong>Pala [P/2]:</strong> Clic en el fogonero para tomar brasas y clic bajo los hierros para distribuirlas.</span>
          ) : selectedTool === 'atizador' ? (
            <span>🦯 <strong>Atizador [A/3]:</strong> Clic bajo la parrilla para esparcir y avivar el colchón de calor parejo.</span>
          ) : selectedTool === 'cepillo' ? (
            <span>🧹 <strong>Cepillo [C/1]:</strong> Arrastrá con el botón apretado sobre las varillas para curar los hierros.</span>
          ) : (
            <span>🖐️ <strong>Mano libre [ESC]:</strong> Usá C, P, A o T para empuñar tus herramientas criollas.</span>
          )}
        </div>
      </div>

      {/* 3. MONITOR LATERAL COMPACTO DE COCCIÓN */}
      {meats.length > 0 && (
        <aside style={styles.bottomMonitor}>
          <div style={styles.monitorHeader}>🔥 Punto de Cocción:</div>
          {meats.map((m) => {
            let label = 'Crudo';
            let color = '#e74c3c';
            if (m.cookLevel >= 1.6) {
              label = 'Quemado';
              color = '#7f8c8d';
            } else if (m.cookLevel >= 1.2) {
              label = 'Bien Cocido';
              color = '#e67e22';
            } else if (m.cookLevel >= 0.8) {
              label = 'A Punto (Costra)';
              color = '#2ecc71';
            } else if (m.cookLevel >= 0.3) {
              label = 'Sellándose';
              color = '#f1c40f';
            }
            return (
              <div key={m.id} style={styles.monitorRow}>
                <span style={{ color: '#d8c2b0' }}>{m.cut}:</span>
                <span style={{ color, fontWeight: 700, marginLeft: '6px' }}>
                  {label} ({Math.round((m.cookLevel / 2.0) * 100)}%)
                </span>
              </div>
            );
          })}
        </aside>
      )}

      {/* Modal flotante de tradición criolla */}
      {showLoreModal && (
        <div style={styles.loreCard}>
          <div style={styles.loreTitle}>TRADICIÓN DEL ASADO CRIOLLO</div>
          <p style={styles.loreBody}>
            El secreto de la carne argentina reside en la paciencia: primero encender la leña de quebracho
            en el brasero lateral, aguardar las brasas al rojo vivo, curar los fierros con papel de diario o cepillo
            y trasladar el calor suavemente bajo la parrilla para lograr la auténtica reacción de Maillard sin apurar el corte.
          </p>
          <button style={styles.closeLoreBtn} onClick={() => setShowLoreModal(false)}>
            Volver a los Fierros
          </button>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#f5efe6',
    boxSizing: 'border-box'
  },
  // Guía HUD superior translúcida y no intrusiva
  topHudBar: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(18, 12, 9, 0.78)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(138, 70, 30, 0.45)',
    borderRadius: '10px',
    padding: '4px 12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: 20
  },
  keysGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  hudKeyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(38, 24, 16, 0.65)',
    border: '1px solid rgba(80, 48, 30, 0.6)',
    color: '#d4c5b9',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease'
  },
  hudKeyItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: '#873600',
    border: '1px solid #f39c12',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: '0 0 8px rgba(243, 156, 18, 0.5)'
  },
  keyBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    color: '#f39c12',
    borderRadius: '4px',
    padding: '1px 4px',
    fontFamily: 'monospace',
    fontSize: '10px',
    fontWeight: 700
  },
  keyIcon: {
    fontSize: '12px'
  },
  keyName: {
    letterSpacing: '0.2px'
  },
  carriedBadge: {
    backgroundColor: '#e65100',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0 4px',
    fontSize: '9px',
    fontWeight: 800
  },
  verticalDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  quickActionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  pillBtn: {
    backgroundColor: '#9c3d18',
    color: '#ffffff',
    border: '1px solid #d35400',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  confirmPillBtn: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
    border: '1px solid #2ecc71',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  infoPillBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    padding: '3px 6px',
    color: '#ffcc88',
    cursor: 'pointer',
    fontSize: '11px'
  },
  bottomStatusBanner: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(18, 12, 9, 0.8)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(138, 70, 30, 0.35)',
    borderRadius: '8px',
    padding: '6px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    pointerEvents: 'auto',
    zIndex: 15
  },
  statusChipsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  fogonPillAction: {
    backgroundColor: '#b9770e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  fogonPillHot: {
    backgroundColor: '#c0392b',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 6px #e74c3c'
  },
  guideBadge: {
    backgroundColor: 'rgba(40, 24, 16, 0.6)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    color: '#d4c5b9'
  },
  subtextHint: {
    fontSize: '11px',
    color: '#d8c2b0',
    textAlign: 'center'
  },
  bottomMonitor: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'rgba(20, 14, 10, 0.85)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(138, 70, 30, 0.4)',
    borderRadius: '8px',
    padding: '8px 12px',
    minWidth: '180px',
    pointerEvents: 'auto',
    zIndex: 15
  },
  monitorHeader: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#f39c12',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  monitorRow: {
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0'
  },
  loreCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(24, 16, 12, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid #d35400',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
    pointerEvents: 'auto',
    zIndex: 30
  },
  loreTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#e67e22',
    letterSpacing: '0.8px',
    marginBottom: '10px',
    textAlign: 'center'
  },
  loreBody: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#ecf0f1',
    margin: '0 0 16px 0'
  },
  closeLoreBtn: {
    width: '100%',
    backgroundColor: '#873600',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
