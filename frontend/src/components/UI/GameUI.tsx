import React from 'react';
import { useAsadoStore, generateUniqueMeatId } from '../../store/useAsadoStore';

export const GameUI: React.FC = () => {
  const stage = useAsadoStore((state) => state.stage);
  const setStage = useAsadoStore((state) => state.setStage);
  const selectedTool = useAsadoStore((state) => state.selectedTool);
  const setSelectedTool = useAsadoStore((state) => state.setSelectedTool);
  const meats = useAsadoStore((state) => state.meats);
  const addMeat = useAsadoStore((state) => state.addMeat);

  const handleStartGame = () => {
    // Si no hay carnes en la parrilla al comenzar, añadimos el primer corte con ID único
    if (meats.length === 0) {
      addMeat({
        id: generateUniqueMeatId('vacio'),
        cut: 'Vacío Pampeano',
        position: [0, 0.65, 0]
      });
    }
    setStage('playing');
  };

  const handleAddNewMeat = () => {
    const cuts = ['Vacío Pampeano', 'Tira de Asado', 'Entraña Fina', 'Bife de Chorizo'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    // Posición aleatoria sobre la parrilla
    const posX = (Math.random() - 0.5) * 1.8;
    const posZ = (Math.random() - 0.5) * 1.2;

    addMeat({
      id: generateUniqueMeatId('corte'),
      cut: randomCut,
      position: [posX, 0.75, posZ]
    });
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
            El fuego de quebracho está vivo en el fondo del quincho pampeano,
            el pampero sopla suave y los fierros reclaman la carne.
            Tomá el control de las brasas, empuñá los utensilios del asador y honrá el ritual.
          </p>

          <div style={styles.loreBox}>
            <span style={styles.loreIcon}>🥩</span>
            <div style={styles.loreText}>
              <strong>Mandamiento del Asador:</strong> El hueso primero al fuego, la paciencia como virtud
              y la sal parrillera antes de tirar el corte.
            </div>
          </div>

          <button
            style={styles.startButton}
            onClick={handleStartGame}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🔥 Empezar el Ritual del Asado
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
          Cortes al fuego: <strong>{meats.length}</strong>
        </div>

        <button
          style={styles.secondaryButton}
          onClick={handleAddNewMeat}
          title="Tirar otro corte sobre la parrilla"
        >
          ➕ Tirar Corte a los Fierros
        </button>

        <button
          style={styles.menuSmallButton}
          onClick={() => setStage('menu')}
          title="Volver a la portada"
        >
          Menú
        </button>
      </header>

      {/* Cartel de ayuda rápida */}
      <div style={styles.tipBox}>
        {selectedTool === 'tenedor' && (
          <span>🍴 <strong>Tenedor:</strong> Hacé click sobre el corte para pincharlo y darlo vuelta.</span>
        )}
        {selectedTool === 'pala' && (
          <span>🪵 <strong>Pala:</strong> Equipada para acarrear y acomodar brasas incandescentes.</span>
        )}
        {selectedTool === 'atizador' && (
          <span>🦯 <strong>Atizador:</strong> Equipado para quebrar leña y nivelar la corona de calor.</span>
        )}
      </div>

      {/* Selector de herramientas en la parte inferior */}
      <div style={styles.toolbarWrapper}>
        <div style={styles.toolbar}>
          <button
            style={{
              ...styles.toolButton,
              ...(selectedTool === 'tenedor' ? styles.toolButtonActive : {})
            }}
            onClick={() => setSelectedTool('tenedor')}
          >
            <span style={styles.toolIcon}>🍴</span>
            <div style={styles.toolLabel}>Tenedor</div>
            <div style={styles.toolSub}>Pinchar & Voltear</div>
          </button>

          <button
            style={{
              ...styles.toolButton,
              ...(selectedTool === 'pala' ? styles.toolButtonActive : {})
            }}
            onClick={() => setSelectedTool('pala')}
          >
            <span style={styles.toolIcon}>🪵</span>
            <div style={styles.toolLabel}>Pala</div>
            <div style={styles.toolSub}>Acarrear Brasas</div>
          </button>

          <button
            style={{
              ...styles.toolButton,
              ...(selectedTool === 'atizador' ? styles.toolButtonActive : {})
            }}
            onClick={() => setSelectedTool('atizador')}
          >
            <span style={styles.toolIcon}>🦯</span>
            <div style={styles.toolLabel}>Atizador</div>
            <div style={styles.toolSub}>Quebrar & Repartir</div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Estilos modernos y criollos
const styles: { [key: string]: React.CSSProperties } = {
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 10, 8, 0.78)',
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
    border: '2px solid #8c4c23',
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
    border: '1px solid rgba(243, 156, 18, 0.3)'
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
    borderLeft: '4px solid #f39c12',
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
    border: 'none',
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
    pointerEvents: 'auto'
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(25, 18, 14, 0.85)',
    border: '1px solid #7a3e1b',
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
    border: '1px solid #5a331a',
    padding: '8px 16px',
    borderRadius: '24px',
    color: '#e2d3c5',
    fontSize: '13px',
    backdropFilter: 'blur(4px)'
  },
  secondaryButton: {
    backgroundColor: '#9c4217',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '24px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  menuSmallButton: {
    backgroundColor: 'rgba(40, 30, 24, 0.8)',
    color: '#c2b3a3',
    border: '1px solid #553e30',
    padding: '8px 16px',
    borderRadius: '24px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  tipBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 10, 8, 0.85)',
    border: '1px solid rgba(243, 156, 18, 0.4)',
    color: '#ffeacc',
    padding: '10px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    backdropFilter: 'blur(4px)',
    pointerEvents: 'none',
    marginBottom: '8px'
  },
  toolbarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'auto'
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(22, 15, 11, 0.9)',
    border: '2px solid #6b3717',
    padding: '10px 14px',
    borderRadius: '16px',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
  },
  toolButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '12px',
    padding: '10px 18px',
    cursor: 'pointer',
    color: '#c2b3a3',
    transition: 'all 0.15s ease'
  },
  toolButtonActive: {
    backgroundColor: '#873600',
    borderColor: '#e67e22',
    color: '#ffffff',
    boxShadow: '0 0 16px rgba(230, 126, 34, 0.4)'
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
    opacity: 0.75,
    marginTop: '2px'
  }
};
