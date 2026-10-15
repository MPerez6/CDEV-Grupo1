import React, { useState } from 'react';
import { useAsadoStore, AsadoTool } from '../../store/useAsadoStore';

export const GameUI: React.FC = () => {
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const meats = useAsadoStore((state) => state.meats);
  const addNewRandomMeat = useAsadoStore((state) => state.addNewRandomMeat);
  const interactFogon = useAsadoStore((state) => state.interactFogon);

  const fogonStage = useAsadoStore((state) => state.fogonStage);
  const fogonProgress = useAsadoStore((state) => state.fogonProgress);
  const fogonEmbersCount = useAsadoStore((state) => state.fogonEmbersCount);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const rustLevel = useAsadoStore((state) => state.rustLevel);
  const isClean = useAsadoStore((state) => state.isClean);

  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const cancelPlacingMeat = useAsadoStore((state) => state.cancelPlacingMeat);

  const [showLoreModal, setShowLoreModal] = useState(false);

  interface KeyItem {
    key: string;
    label: string;
    icon: string;
    tool?: AsadoTool;
    action?: () => void;
    badge?: number;
  }

  const mainShortcuts: KeyItem[] = [
    {
      key: 'F',
      label: 'Fogón',
      icon: '🔥',
      action: interactFogon,
      badge: fogonStage === 'brasas_listas' ? fogonEmbersCount : undefined,
    },
    {
      key: 'C',
      label: 'Cepillo',
      icon: '🧹',
      tool: 'cepillo',
      action: () => setSelectedTool('cepillo'),
    },
    {
      key: 'P',
      label: 'Pala',
      icon: '🪵',
      tool: 'pala',
      action: () => setSelectedTool('pala'),
      badge: carriedEmbersCount > 0 ? carriedEmbersCount : undefined,
    },
    {
      key: 'A',
      label: 'Atizador',
      icon: '🦯',
      tool: 'atizador',
      action: () => setSelectedTool('atizador'),
    },
    {
      key: 'T',
      label: 'Tenedor',
      icon: '🍴',
      tool: 'tenedor',
      action: () => setSelectedTool('tenedor'),
    },
    {
      key: 'M',
      label: 'Carne',
      icon: '🥩',
      action: addNewRandomMeat,
    },
  ];

  return (
    <div style={styles.hudContainer}>
      {/* 1. BARRA COMPACTA SUPERIOR DE CONTROLES: [F] Fogón | [C] Cepillo | [P] Pala | [A] Atizador | [T] Tenedor | [M] Carne */}
      <header style={styles.topHudBar} aria-label="Controles del Asador">
        <div style={styles.keysGroup}>
          {mainShortcuts.map((item) => {
            const isActive = item.tool && selectedTool === item.tool;
            return (
              <div
                key={item.key}
                style={isActive ? styles.hudKeyItemActive : styles.hudKeyItem}
                onClick={item.action}
                title={`Presiona [${item.key}] para ${item.label}`}
              >
                <span style={styles.keyBadge}>[{item.key}]</span>
                <span style={styles.keyIcon}>{item.icon}</span>
                <span style={styles.keyName}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={styles.carriedBadge}>{item.badge}</span>
                )}
              </div>
            );
          })}

          {/* Opción Mano Libre [ESC] */}
          <div
            style={selectedTool === 'ninguna' ? styles.hudKeyItemActive : styles.hudKeyItem}
            onClick={() => setSelectedTool('ninguna')}
            title="Presiona [ESC] o [E] para mano libre"
          >
            <span style={styles.keyBadge}>[ESC]</span>
            <span style={styles.keyName}>Mano libre</span>
          </div>
        </div>

        {/* Separador fino */}
        <div style={styles.verticalDivider} />

        {/* Acciones contextuales secundarias */}
        <div style={styles.quickActionsGroup}>
          {placingMeatId && (
            <button
              style={styles.confirmPillBtn}
              onClick={cancelPlacingMeat}
              title="Asentar corte en la parrilla"
            >
              ✓ Asentar
            </button>
          )}

          <button
            style={styles.infoPillBtn}
            onClick={() => setShowLoreModal(!showLoreModal)}
            title="Tradición Criolla"
          >
            ℹ️
          </button>
        </div>
      </header>

      {/* 2. CONSEJOS DEL ASADOR Y ESTADO EN BARRA INFERIOR DESPEJADA */}
      <footer style={styles.bottomStatusBanner}>
        <div style={styles.statusChipsRow}>
          <div style={styles.guideBadge}>
            🔥 Fogón:{' '}
            <strong>
              {fogonStage === 'sin_fuego'
                ? 'Sin Fuego [F]'
                : fogonStage === 'con_papel'
                ? 'Papel Listo [F]'
                : fogonStage === 'encendido'
                ? `Ardiendo ${Math.round(fogonProgress * 100)}%`
                : `Brasas: ${fogonEmbersCount}`}
            </strong>
          </div>

          <div style={styles.guideBadge}>
            🧹 Fierros:{' '}
            <strong>
              {isClean ? 'Curados y Limpios' : `${Math.round((1 - rustLevel) * 100)}% Limpio`}
            </strong>
          </div>

          {carriedEmbersCount > 0 && (
            <div style={styles.guideBadgeHot}>
              🪵 En Pala: <strong>{carriedEmbersCount} brasas</strong>
            </div>
          )}
        </div>

        {/* Consejo contextual criollo */}
        <div style={styles.subtextHint}>
          {placingMeatId ? (
            <span>🥩 <strong>Acomodar:</strong> Mové el puntero y hacé clic sobre la parrilla para asentar el corte.</span>
          ) : selectedTool === 'tenedor' ? (
            <span>🍴 <strong>Tenedor [T]:</strong> Hacé clic en el corte para pinchar y dar vuelta. Shift+clic para mover.</span>
          ) : selectedTool === 'pala' ? (
            <span>🪵 <strong>Pala [P]:</strong> Clic en el fogón para cargar brasas y clic bajo los hierros para distribuirlas.</span>
          ) : selectedTool === 'atizador' ? (
            <span>🦯 <strong>Atizador [A]:</strong> Clic bajo la parrilla para desparramar brasas y lograr un calor parejo.</span>
          ) : selectedTool === 'cepillo' ? (
            <span>🧹 <strong>Cepillo [C]:</strong> Arrastrá con clic apretado sobre los hierros para curarlos antes de asar.</span>
          ) : (
            <span>🖐️ <strong>Mano libre [ESC]:</strong> Usá F, C, P, A, T o M para controlar el asado criollo.</span>
          )}
        </div>
      </footer>

      {/* 3. MONITOR DE COCCIÓN LATERAL COMPACTO */}
      {meats.length > 0 && (
        <aside style={styles.bottomMonitor}>
          <div style={styles.monitorHeader}>🥩 Punto de Cocción:</div>
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
            El secreto del asado argentino reside en la paciencia y el respeto al fuego:
            iniciar la leña en el fogonero lateral [F], curar los hierros con cepillo [C],
            acarrear brasas vivas bajo la parrilla [P], desparramarlas con el atizador [A]
            y dorar los cortes con tenedor [T] sin apurar la Reacción de Maillard.
          </p>
          <button style={styles.closeLoreBtn} onClick={() => setShowLoreModal(false)}>
            Volver a la Parrilla
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
  topHudBar: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(18, 12, 9, 0.82)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(138, 70, 30, 0.45)',
    borderRadius: '10px',
    padding: '5px 14px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
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
    padding: '0 5px',
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
  confirmPillBtn: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
    border: '1px solid #2ecc71',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  infoPillBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    padding: '3px 7px',
    color: '#ffcc88',
    cursor: 'pointer',
    fontSize: '11px'
  },
  bottomStatusBanner: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(18, 12, 9, 0.82)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(138, 70, 30, 0.35)',
    borderRadius: '8px',
    padding: '6px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    pointerEvents: 'auto',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    maxWidth: '90vw'
  },
  statusChipsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  guideBadge: {
    backgroundColor: 'rgba(38, 24, 16, 0.65)',
    border: '1px solid rgba(80, 48, 30, 0.5)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    color: '#d4c5b9'
  },
  guideBadgeHot: {
    backgroundColor: '#873600',
    border: '1px solid #f39c12',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    color: '#ffffff',
    fontWeight: 700
  },
  subtextHint: {
    fontSize: '11px',
    color: '#e0c9b6',
    textAlign: 'center'
  },
  bottomMonitor: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'rgba(18, 12, 9, 0.82)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(138, 70, 30, 0.35)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    pointerEvents: 'auto',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)'
  },
  monitorHeader: {
    fontWeight: 700,
    marginBottom: '4px',
    color: '#ffaa66',
    fontSize: '11px'
  },
  monitorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    lineHeight: '1.4'
  },
  loreCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#1b120c',
    border: '2px solid #b3541e',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '440px',
    color: '#f5efe6',
    pointerEvents: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
    zIndex: 50,
    textAlign: 'center'
  },
  loreTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#f39c12',
    marginBottom: '12px',
    letterSpacing: '0.5px'
  },
  loreBody: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#d4c5b9',
    marginBottom: '16px'
  },
  closeLoreBtn: {
    backgroundColor: '#873600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
