import React from 'react';
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

  const handleStartGame = () => {
    // Si no hay carnes en la parrilla al comenzar, añadimos el corte inicial
    if (meats.length === 0) {
      addMeat({
        id: 'corte-tira-base',
        cut: 'Tira de Asado Criolla',
        position: [0, 0.42, 0]
      });
    }
    setStage('playing');
  };

  const handleAddNewMeat = () => {
    const cuts = ['Vacío Pampeano', 'Tira de Asado', 'Entraña Criolla', 'Bife de Chorizo'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    const newId = generateUniqueMeatId('corte');

    // Añade el corte y activa inmediatamente el modo de colocación con el cursor
    addMeat({
      id: newId,
      cut: randomCut,
      position: [0, 0.42, 0]
    });
    startPlacingMeat(newId);
  };

  const handleRearrangeMeat = () => {
    if (meats.length > 0) {
      // Activa el acomodo del último corte o del corte existente
      const targetMeat = meats[meats.length - 1];
      startPlacingMeat(targetMeat.id);
    }
  };

  // 1. Portada del Menú Principal
  if (stage === 'menu') {
    return (
      <div style={styles.menuOverlay}>
        <div style={styles.menuCard}>
          <div style={styles.badge}>TRADICIÓN CRIOLLA</div>
          <h1 style={styles.menuTitle}>Asador.js</h1>
          <h2 style={styles.menuSubtitle}>El Ritual de las Brasas</h2>

          <div style={styles.divider} />

          <p style={styles.menuDescription}>
            El fogón espera tu fuego de quebracho. Encendé la leña, aguardá las brasas al rojo vivo,
            acarrealas con la pala bajo los hierros curados y asá los mejores cortes a fuego lento con auténtica reacción de Maillard.
          </p>

          <div style={styles.loreBox}>
            <span style={styles.loreIcon}>🥩</span>
            <div style={styles.loreText}>
              <strong>Mandamiento Parrillero:</strong> Sin brasas no hay cocción.
              Iniciá el fogón, paleá las brasas bajo la parrilla y acomodá el corte en su lugar justo.
            </div>
          </div>

          <button
            style={styles.startButton}
            onClick={handleStartGame}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🔥 Iniciar Ritual del Asado
          </button>
        </div>
      </div>
    );
  }

  // 2. HUD interactivo durante el asado
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
          onClick={() => setStage('menu')}
          title="Volver a la portada"
        >
          Menú
        </button>
      </header>

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
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 10, 8, 0.82)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  menuCard: {
    backgroundColor: '#1f1612',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#8c4c23',
    borderRadius: '16px',
    padding: '40px 48px',
    maxWidth: '560px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(230, 90, 20, 0.25)',
    color: '#f5efe6'
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#f39c12',
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    padding: '4px 12px',
    borderRadius: '20px',
    marginBottom: '14px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(243, 156, 18, 0.3)'
  },
  menuTitle: {
    fontSize: '44px',
    fontWeight: '900',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
    color: '#ffddaa',
    textShadow: '0 2px 10px rgba(255, 120, 40, 0.4)'
  },
  menuSubtitle: {
    fontSize: '20px',
    fontWeight: '400',
    color: '#d4a373',
    margin: '0 0 16px 0',
    fontStyle: 'italic'
  },
  divider: {
    width: '70px',
    height: '3px',
    backgroundColor: '#e65c00',
    margin: '0 auto 20px auto',
    borderRadius: '2px'
  },
  menuDescription: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#c9b7a7',
    marginBottom: '24px'
  },
  loreBox: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    backgroundColor: 'rgba(40, 25, 18, 0.8)',
    borderLeftStyle: 'solid',
    borderLeftWidth: '4px',
    borderLeftColor: '#f39c12',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '28px',
    gap: '12px'
  },
  loreIcon: {
    fontSize: '24px'
  },
  loreText: {
    fontSize: '13px',
    color: '#f1e3d3',
    lineHeight: '1.4'
  },
  startButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #d35400 0%, #b83b00 100%)',
    borderStyle: 'none',
    borderWidth: '0px',
    borderColor: 'transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(211, 84, 0, 0.45)',
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px'
  },
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    zIndex: 50
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    pointerEvents: 'auto'
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#7a3e1b',
    padding: '8px 16px',
    borderRadius: '24px',
    backdropFilter: 'blur(4px)'
  },
  logoText: {
    color: '#ffe5cc',
    fontWeight: '700',
    fontSize: '14px'
  },
  infoBadge: {
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5a3017',
    padding: '8px 14px',
    borderRadius: '20px',
    color: '#d6c2b0',
    fontSize: '13px',
    backdropFilter: 'blur(4px)'
  },
  fogonBadge: {
    backgroundColor: 'rgba(35, 20, 14, 0.9)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#a04000',
    padding: '6px 14px',
    borderRadius: '20px',
    color: '#ffddaa',
    fontSize: '13px',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  actionPill: {
    backgroundColor: '#7a3e1b',
    color: '#ffffff',
    borderStyle: 'none',
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  actionPillHot: {
    backgroundColor: '#d35400',
    color: '#ffffff',
    borderStyle: 'none',
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(211, 84, 0, 0.6)'
  },
  secondaryButton: {
    backgroundColor: 'rgba(40, 25, 18, 0.9)',
    color: '#ffbb77',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#a04000',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  rearrangeButton: {
    backgroundColor: 'rgba(50, 32, 20, 0.9)',
    color: '#ffcc66',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#e67e22',
    borderRadius: '20px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelPlacingButton: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
    borderStyle: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(39, 174, 96, 0.5)'
  },
  menuSmallButton: {
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    color: '#a89485',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#4a2815',
    borderRadius: '20px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  placingBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(211, 84, 0, 0.92)',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '30px',
    fontSize: '14px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(211, 84, 0, 0.4)',
    pointerEvents: 'auto',
    animation: 'pulse 1.5s infinite ease-in-out'
  },
  tipBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(25, 18, 14, 0.88)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#7a3e1b',
    padding: '10px 22px',
    borderRadius: '24px',
    color: '#f0e3d5',
    fontSize: '13px',
    backdropFilter: 'blur(4px)',
    maxWidth: '680px',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
  },
  meatsStatusPanel: {
    position: 'absolute',
    right: '20px',
    top: '75px',
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#7a3e1b',
    borderRadius: '12px',
    padding: '12px 16px',
    backdropFilter: 'blur(4px)',
    minWidth: '220px',
    pointerEvents: 'auto'
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffbb77',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  meatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#ece1d5',
    padding: '4px 0',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  toolbarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'auto',
    marginBottom: '10px'
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(20, 14, 10, 0.9)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#5a3017',
    padding: '8px 12px',
    borderRadius: '18px',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
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
    opacity: 0.8
  }
};
