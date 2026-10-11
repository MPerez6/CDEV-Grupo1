import React, { useState } from 'react';
import { useAsadoStore, generateUniqueMeatId, AsadoTool } from '../../store/useAsadoStore';

export const GameUI: React.FC = () => {
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

  // Modal informativo opcional sin tapar el Canvas 3D
  const [showLoreModal, setShowLoreModal] = useState(false);

  const handleAddNewMeat = () => {
    const cuts = ['Vacío Pampeano', 'Tira de Asado', 'Entraña Criolla', 'Bife de Chorizo'];
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)];
    const newId = generateUniqueMeatId('corte');

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

  const tools: { id: AsadoTool; icon: string; name: string }[] = [
    { id: 'tenedor', icon: '🍴', name: 'Tenedor' },
    { id: 'pala', icon: '🪵', name: 'Pala' },
    { id: 'atizador', icon: '🦯', name: 'Atizador' },
    { id: 'cepillo', icon: '🧹', name: 'Cepillo' },
  ];

  return (
    <div style={styles.hudContainer}>
      {/* 1. BARRA DE HERRAMIENTAS Y ACCIONES ARRIBA EN EL CENTRO (top: 16px, left: 50%, transform: translateX(-50%)) */}
      <div style={styles.topToolbar}>
        {/* Selector de Utensilios */}
        <div style={styles.toolsGroup}>
          {tools.map((t) => {
            const isActive = selectedTool === t.id;
            return (
              <button
                key={t.id}
                style={isActive ? styles.toolBtnActive : styles.toolBtn}
                onClick={() => setSelectedTool(t.id)}
                title={`Seleccionar ${t.name}`}
              >
                <span style={{ fontSize: '15px' }}>{t.icon}</span>
                <span style={styles.toolBtnText}>{t.name}</span>
                {t.id === 'pala' && carriedEmbersCount > 0 && (
                  <span style={styles.badgeCount}>{carriedEmbersCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div style={styles.verticalDivider} />

        {/* Acciones principales sobre la parrilla */}
        <button
          style={styles.actionBtn}
          onClick={handleAddNewMeat}
          title="Tirar otro corte sobre la parrilla"
        >
          ➕ Tirar Corte
        </button>

        {meats.length > 0 && !placingMeatId && (
          <button
            style={styles.subActionBtn}
            onClick={handleRearrangeMeat}
            title="Acomodar la posición del corte"
          >
            ✋ Acomodar
          </button>
        )}

        {placingMeatId && (
          <button
            style={styles.confirmBtn}
            onClick={cancelPlacingMeat}
            title="Asentar carne en la posición elegida"
          >
            ✓ Asentar
          </button>
        )}

        <button
          style={styles.iconBtn}
          onClick={() => setShowLoreModal(!showLoreModal)}
          title="Ver tradición del asado"
        >
          ℹ️
        </button>
      </div>

      {/* 2. MENSAJES DE GUÍA, ESTADO DEL FUEGO Y CONSEJOS DIRECTAMENTE DEBAJO (top: 75px, max-width: 480px) */}
      <div style={styles.narrativeGuidePanel}>
        {/* Fila compacta de estado del fuego y fierros */}
        <div style={styles.guideStatusRow}>
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
              ✨ Brasas en fogón: <strong>{fogonEmbersCount}</strong>
              {carriedEmbersCount > 0 ? ` | En pala: ${carriedEmbersCount}` : ''}
            </div>
          )}

          <div style={styles.guideBadge}>
            Fierros: <strong>{isClean ? 'Curados' : `${Math.round((1 - rustLevel) * 100)}%`}</strong>
          </div>
        </div>

        {/* Consejo contextual breve según herramienta o acción */}
        <div style={styles.guideText}>
          {placingMeatId ? (
            <span>🥩 <strong>Ubicación:</strong> Mové el puntero sobre los hierros y hacé clic para asentar el corte.</span>
          ) : selectedTool === 'tenedor' ? (
            <span>🍴 <strong>Tenedor:</strong> Clic en el corte para pinchar y voltearlo. Click secundario para reubicar.</span>
          ) : selectedTool === 'pala' ? (
            <span>🪵 <strong>Pala:</strong> Clic en el fogonero para cargar brasas vivas y clic bajo la parrilla para sembrarlas.</span>
          ) : selectedTool === 'atizador' ? (
            <span>🦯 <strong>Atizador:</strong> Clic bajo la parrilla para esparcir y avivar el colchón de calor parejo.</span>
          ) : (
            <span>🧹 <strong>Cepillo:</strong> Arrastrá con el botón presionado sobre las varillas para curar los hierros.</span>
          )}
        </div>
      </div>

      {/* Monitor compacto de cocción lateral discreto (abajo a la izquierda) */}
      {meats.length > 0 && (
        <div style={styles.bottomMonitor}>
          <div style={styles.monitorHeader}>🔥 Estado de Cocción:</div>
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
        </div>
      )}

      {/* Modal flotante de tradición criolla */}
      {showLoreModal && (
        <div style={styles.loreCard}>
          <div style={styles.loreTitle}>TRADICIÓN DEL ASADO CRIOLLO</div>
          <p style={styles.loreBody}>
            El secreto de la carne argentina reside en la paciencia: primero encender la leña de quebracho
            en el fogón lateral, aguardar las brasas al rojo vivo, curar los fierros y trasladar el calor
            suavemente bajo la parrilla para lograr la auténtica reacción de Maillard sin apurar el corte.
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
  // Barra de herramientas superior centrada (top: 16px, left: 50%, transform: translateX(-50%))
  topToolbar: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(25, 18, 14, 0.88)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #5c331a',
    borderRadius: '12px',
    padding: '6px 14px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
    zIndex: 20
  },
  toolsGroup: {
    display: 'flex',
    gap: '6px'
  },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(40, 26, 18, 0.8)',
    border: '1px solid #4a2815',
    borderRadius: '8px',
    padding: '6px 10px',
    color: '#d4c5b9',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative'
  },
  toolBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: '#873600',
    border: '1px solid #e67e22',
    borderRadius: '8px',
    padding: '6px 10px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(230, 126, 34, 0.45)',
    position: 'relative'
  },
  toolBtnText: {
    letterSpacing: '0.3px'
  },
  badgeCount: {
    backgroundColor: '#e65100',
    color: '#fff',
    borderRadius: '10px',
    padding: '1px 5px',
    fontSize: '10px',
    fontWeight: 800,
    marginLeft: '2px'
  },
  verticalDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: '0 4px'
  },
  actionBtn: {
    backgroundColor: '#9c3d18',
    color: '#ffffff',
    border: '1px solid #d35400',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  subActionBtn: {
    backgroundColor: 'rgba(50, 32, 22, 0.85)',
    color: '#ffcc99',
    border: '1px solid #7c4826',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  confirmBtn: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
    border: '1px solid #2ecc71',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  iconBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '6px 9px',
    color: '#ffcc88',
    cursor: 'pointer',
    fontSize: '13px'
  },
  // Panel narrativo directamente debajo de los botones (top: 75px, left: 50%, transform: translateX(-50%))
  narrativeGuidePanel: {
    position: 'absolute',
    top: '75px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '480px',
    backgroundColor: 'rgba(20, 14, 10, 0.82)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(138, 70, 30, 0.35)',
    borderRadius: '10px',
    padding: '8px 14px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    zIndex: 15
  },
  guideStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '6px'
  },
  guideBadge: {
    fontSize: '11px',
    color: '#ffddaa',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '3px 8px'
  },
  fogonPillAction: {
    backgroundColor: '#8b4513',
    color: '#ffffff',
    border: '1px solid #a0522d',
    borderRadius: '6px',
    padding: '3px 9px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  fogonPillHot: {
    backgroundColor: '#d35400',
    color: '#ffffff',
    border: '1px solid #e67e22',
    borderRadius: '6px',
    padding: '3px 9px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  guideText: {
    fontSize: '12px',
    lineHeight: '1.35',
    color: '#e0d5cb',
    textAlign: 'center'
  },
  // Monitor inferior compacto
  bottomMonitor: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'rgba(20, 14, 10, 0.85)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(100, 50, 20, 0.4)',
    borderRadius: '10px',
    padding: '8px 14px',
    pointerEvents: 'auto',
    maxWidth: '280px'
  },
  monitorHeader: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#ff9944',
    marginBottom: '4px',
    letterSpacing: '0.4px'
  },
  monitorRow: {
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2px'
  },
  // Modal de tradición criolla
  loreCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(25, 18, 14, 0.95)',
    border: '1px solid #8e44ad',
    borderRadius: '14px',
    padding: '24px',
    maxWidth: '420px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
    pointerEvents: 'auto',
    textAlign: 'center',
    zIndex: 30
  },
  loreTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#ff9436',
    letterSpacing: '1px',
    marginBottom: '8px'
  },
  loreBody: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#e5dcd3',
    margin: '12px 0'
  },
  closeLoreBtn: {
    backgroundColor: '#873600',
    color: '#ffffff',
    border: '1px solid #d35400',
    borderRadius: '8px',
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
