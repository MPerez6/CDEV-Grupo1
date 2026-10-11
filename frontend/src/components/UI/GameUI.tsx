import React, { useEffect, useState } from 'react';
import { useAsadoStore, generateUniqueMeatId } from '../../store/useAsadoStore';

export const GameUI: React.FC = () => {
  const stage = useAsadoStore((state) => state.stage);
  const setStage = useAsadoStore((state) => state.setStage);
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const meats = useAsadoStore((state) => state.meats);
  const addMeat = useAsadoStore((state) => state.addMeat);

  // Estados del Fogón y Parrilla
  const fogonStage = useAsadoStore((state) => state.fogonStage);
  const fogonProgress = useAsadoStore((state) => state.fogonProgress);
  const fogonEmbersCount = useAsadoStore((state) => state.fogonEmbersCount);
  const carriedEmbersCount = useAsadoStore((state) => state.carriedEmbersCount);
  const rustLevel = useAsadoStore((state) => state.rustLevel);
  const isClean = useAsadoStore((state) => state.isClean);
  const colocarPapelYFosforo = useAsadoStore((state) => state.colocarPapelYFosforo);
  const encenderFogon = useAsadoStore((state) => state.encenderFogon);

  // Acomodo de cortes
  const placingMeatId = useAsadoStore((state) => state.placingMeatId);
  const startPlacingMeat = useAsadoStore((state) => state.startPlacingMeat);
  const cancelPlacingMeat = useAsadoStore((state) => state.cancelPlacingMeat);

  // Modal informativo opcional sin bloquear el Canvas 3D
  const [showLoreModal, setShowLoreModal] = useState(false);

  // Asegura que el juego inicie en estado interactivo 'playing' para visibilidad de la escena 3D y herramientas
  useEffect(() => {
    if (stage === 'menu') {
      setStage('playing');
    }
  }, [stage, setStage]);

  const handleAddNewMeat = () => {
    const cuts = ['Vacío Pampeano', 'Tira de Asado', 'Entraña Criolla', 'Bife de Chorizo'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    const newId = generateUniqueMeatId('corte');

    // Añade el corte y activa inmediatamente el modo de colocación con el cursor
    addMeat({
      id: newId,
      cut: randomCut,
      position: [0, 0.38, 0]
    });
    startPlacingMeat(newId);
  };

  const handleRearrangeMeat = () => {
    if (meats.length > 0) {
      const targetMeat = meats[meats.length - 1];
      startPlacingMeat(targetMeat.id);
    }
  };

  return (
    <div style={styles.hudContainer}>
      {/* Cabecera superior con estado */}
      <header style={styles.topBar}>
        <div style={styles.logoBadge}>
          <span style={{ fontSize: '18px' }}>🥩</span>
          <span style={styles.logoText}>Asador.js</span>
        </div>

        <div style={styles.infoBadge}>
          Cortes: <strong>{meats.length}</strong>
        </div>

        {/* Estado del Fogonero Criollo */}
        <div style={styles.fogonBadge}>
          {fogonStage === 'sin_fuego' && (
            <button style={styles.actionPill} onClick={colocarPapelYFosforo}>
              🪵 Colocar Papel y Fósforo
            </button>
          )}
          {fogonStage === 'con_papel' && (
            <button style={styles.actionPillHot} onClick={encenderFogon}>
              🔥 Encender Fogonero
            </button>
          )}
          {fogonStage === 'encendido' && (
            <span>🔥 Ardiendo: {Math.round(fogonProgress * 100)}%</span>
          )}
          {fogonStage === 'brasas_listas' && (
            <span>
              ✨ Brasas en fogón: <strong>{fogonEmbersCount}</strong>
              {carriedEmbersCount > 0 && ` | En pala: ${carriedEmbersCount}`}
            </span>
          )}
        </div>

        {/* Estado de limpieza de parrilla */}
        <div style={styles.infoBadge}>
          Fierros: <strong>{isClean ? 'Curados y Limpios' : `${Math.round((1 - rustLevel) * 100)}% Curado`}</strong>
        </div>

        {/* Botón para tirar nuevo corte sobre la parrilla */}
        <button
          style={styles.secondaryButton}
          onClick={handleAddNewMeat}
          title="Tirar otro corte sobre la parrilla"
        >
          ➕ Tirar Corte a los Fierros
        </button>

        {meats.length > 0 && !placingMeatId && (
          <button
            style={styles.rearrangeButton}
            onClick={handleRearrangeMeat}
            title="Acomodar la posición de la carne en los hierros"
          >
            ✋ Acomodar Corte
          </button>
        )}

        {placingMeatId && (
          <button
            style={styles.cancelPlacingButton}
            onClick={cancelPlacingMeat}
            title="Fijar corte en su posición actual"
          >
            ✓ Asentar Carne
          </button>
        )}

        <button
          style={styles.menuSmallButton}
          onClick={() => setShowLoreModal(!showLoreModal)}
          title="Ver tradición criolla"
        >
          ℹ️ Info
        </button>
      </header>

      {/* Modal flotante opcional de tradición criolla */}
      {showLoreModal && (
        <div style={styles.loreCard}>
          <div style={styles.badge}>TRADICIÓN CRIOLLA</div>
          <h2 style={{ fontSize: '20px', margin: '6px 0', color: '#ffcc88' }}>El Ritual del Asado</h2>
          <p style={{ fontSize: '13px', lineHeight: '1.4', color: '#e5dcd3', margin: '8px 0' }}>
            Encendé el fuego en el fogonero, esperá que la leña de quebracho se quiebre en brasas incandescentes y
            trasladalas con la pala bajo los hierros curados para asar los cortes a fuego pausado.
          </p>
          <button
            style={styles.closeModalButton}
            onClick={() => setShowLoreModal(false)}
          >
            Entendido, a los fierros
          </button>
        </div>
      )}

      {/* Cartel flotante durante el modo de colocación / acomodo de carne */}
      {placingMeatId && (
        <div style={styles.placingBanner}>
          🥩 <strong>UBICACIÓN DE CORTE:</strong> Mové el mouse sobre los hierros de la parrilla y hacé clic para asentarlo en el calor deseado.
        </div>
      )}

      {/* Cartel de ayuda contextual */}
      {!placingMeatId && (
        <div style={styles.tipBox}>
          {selectedTool === 'tenedor' && (
            <span>🍴 <strong>Tenedor:</strong> Clic en el corte para voltearlo. Clic derecho o Shift+clic para moverlo de lugar.</span>
          )}
          {selectedTool === 'pala' && (
            <span>🪵 <strong>Pala:</strong> Clic en el fogón para cargar brasas y clic bajo la parrilla para sembrarlas al fuego.</span>
          )}
          {selectedTool === 'atizador' && (
            <span>🦯 <strong>Atizador:</strong> Clic en el fogonero o bajo la parrilla para esparcir y avivar el colchón térmico.</span>
          )}
          {selectedTool === 'cepillo' && (
            <span>🧹 <strong>Cepillo Parrillero:</strong> Arrastrá sobre las varillas para desoxidar y curar los hierros.</span>
          )}
        </div>
      )}

      {/* Monitor de estado de los cortes sobre la parrilla */}
      <div style={styles.meatsStatusPanel}>
        <div style={styles.panelTitle}>🔥 Estado en los Fierros:</div>
        {meats.map((m) => {
          let statusLabel = 'Crudo';
          let statusColor = '#e74c3c';
          if (m.cookLevel >= 1.6) {
            statusLabel = 'Quemado / Carbón';
            statusColor = '#555555';
          } else if (m.cookLevel >= 1.2) {
            statusLabel = 'Bien Cocido';
            statusColor = '#d35400';
          } else if (m.cookLevel >= 0.8) {
            statusLabel = 'A Punto (Costra)';
            statusColor = '#27ae60';
          } else if (m.cookLevel >= 0.3) {
            statusLabel = 'Sellándose';
            statusColor = '#f39c12';
          }

          return (
            <div key={m.id} style={styles.meatRow}>
              <span style={{ fontWeight: 600 }}>{m.cut}</span>
              <span style={{ color: statusColor, fontWeight: 700 }}>
                {statusLabel} ({Math.round((m.cookLevel / 2.0) * 100)}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Selector de herramientas criollas en la parte inferior */}
      <div style={styles.toolbarWrapper}>
        <div style={styles.toolbar}>
          <button
            style={getToolButtonStyle(selectedTool === 'tenedor')}
            onClick={() => setSelectedTool('tenedor')}
          >
            <span style={styles.toolIcon}>🍴</span>
            <div style={styles.toolLabel}>Tenedor</div>
            <div style={styles.toolSub}>Pinchar & Voltear</div>
          </button>

          <button
            style={getToolButtonStyle(selectedTool === 'pala')}
            onClick={() => setSelectedTool('pala')}
          >
            <span style={styles.toolIcon}>🪵</span>
            <div style={styles.toolLabel}>Pala</div>
            <div style={styles.toolSub}>Acarrear Brasas</div>
          </button>

          <button
            style={getToolButtonStyle(selectedTool === 'atizador')}
            onClick={() => setSelectedTool('atizador')}
          >
            <span style={styles.toolIcon}>🦯</span>
            <div style={styles.toolLabel}>Atizador</div>
            <div style={styles.toolSub}>Esparcir Fuego</div>
          </button>

          <button
            style={getToolButtonStyle(selectedTool === 'cepillo')}
            onClick={() => setSelectedTool('cepillo')}
          >
            <span style={styles.toolIcon}>🧹</span>
            <div style={styles.toolLabel}>Cepillo</div>
            <div style={styles.toolSub}>Curar Fierros</div>
          </button>
        </div>
      </div>
    </div>
  );
};

const getToolButtonStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: isActive ? '#873600' : 'rgba(25, 18, 14, 0.75)',
  borderStyle: 'solid',
  borderWidth: '2px',
  borderColor: isActive ? '#e67e22' : '#4a2815',
  borderRadius: '12px',
  padding: '10px 18px',
  cursor: 'pointer',
  color: isActive ? '#ffffff' : '#c2b3a3',
  boxShadow: isActive ? '0 0 16px rgba(230, 126, 34, 0.4)' : 'none',
  transition: 'all 0.15s ease'
});

const styles: { [key: string]: React.CSSProperties } = {
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '18px 24px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#f5efe6'
  },
  topBar: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    backdropFilter: 'blur(8px)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5c331a',
    borderRadius: '14px',
    padding: '8px 16px',
    alignSelf: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '800',
    color: '#ff9436',
    fontSize: '16px'
  },
  logoText: {
    letterSpacing: '0.5px'
  },
  infoBadge: {
    fontSize: '13px',
    color: '#d4c5b9',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: '4px 10px',
    borderRadius: '8px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  fogonBadge: {
    fontSize: '13px',
    color: '#ffddaa',
    backgroundColor: 'rgba(100, 30, 10, 0.45)',
    padding: '4px 12px',
    borderRadius: '8px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(230, 90, 20, 0.3)'
  },
  actionPill: {
    backgroundColor: '#8b4513',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  actionPillHot: {
    backgroundColor: '#e65100',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(230, 81, 0, 0.7)'
  },
  secondaryButton: {
    backgroundColor: '#9c3d18',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  rearrangeButton: {
    backgroundColor: '#34495e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelPlacingButton: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(39, 174, 96, 0.6)'
  },
  menuSmallButton: {
    backgroundColor: 'transparent',
    color: '#b0a090',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5c331a',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  loreCard: {
    pointerEvents: 'auto',
    position: 'absolute',
    top: '75px',
    alignSelf: 'center',
    backgroundColor: 'rgba(25, 18, 14, 0.94)',
    border: '2px solid #8c4c23',
    borderRadius: '12px',
    padding: '16px 24px',
    maxWidth: '440px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#f39c12',
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  closeModalButton: {
    marginTop: '10px',
    backgroundColor: '#b34714',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  placingBanner: {
    pointerEvents: 'none',
    alignSelf: 'center',
    backgroundColor: 'rgba(211, 84, 0, 0.92)',
    color: '#ffffff',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    marginTop: '8px'
  },
  tipBox: {
    pointerEvents: 'none',
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 15, 12, 0.75)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '6px 18px',
    fontSize: '13px',
    color: '#d6c7b8',
    backdropFilter: 'blur(4px)',
    marginTop: '6px'
  },
  meatsStatusPanel: {
    pointerEvents: 'auto',
    position: 'absolute',
    left: '24px',
    bottom: '24px',
    backgroundColor: 'rgba(25, 18, 14, 0.88)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5c331a',
    borderRadius: '12px',
    padding: '12px 16px',
    minWidth: '220px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#ff9436',
    marginBottom: '8px',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: '4px'
  },
  meatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '3px 0'
  },
  toolbarWrapper: {
    pointerEvents: 'auto',
    alignSelf: 'center',
    marginTop: 'auto'
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(18, 12, 9, 0.88)',
    backdropFilter: 'blur(10px)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5c331a',
    borderRadius: '16px',
    padding: '10px 14px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
  },
  toolIcon: {
    fontSize: '22px',
    marginBottom: '4px'
  },
  toolLabel: {
    fontSize: '13px',
    fontWeight: '700'
  },
  toolSub: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '2px'
  }
};
