import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Grill } from './components/Environment/Grill';
import { PampaEnvironment } from './components/Environment/PampaEnvironment';
import { Embers } from './components/FireSystem/Embers';
import { Fogon } from './components/FireSystem/Fogon';
import { MeatItemComponent } from './components/MeatItem/MeatItemComponent';
import { PlayerTools } from './components/Player/PlayerTools';
import { GameUI } from './components/UI/GameUI';
import { useAsadoStore } from './store/useAsadoStore';

const App: React.FC = () => {
  const meats = useAsadoStore((state) => state.meats);
  const addMeat = useAsadoStore((state) => state.addMeat);

  useEffect(() => {
    // Si la parrilla está vacía, aseguramos el corte inicial único
    if (meats.length === 0) {
      addMeat({
        id: 'corte-tira-base',
        cut: 'Tira de Asado Criolla',
        position: [0, 0.45, 0]
      });
    }
  }, [addMeat, meats.length]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Interfaz de usuario (portada de menú + selector de utensilios HUD) */}
      <GameUI />

      <Suspense fallback={null}>
        {/* Cámara POV parrillera: apuntando directamente a la parrilla */}
        <Canvas
          shadows
          camera={{ position: [0, 1.8, 2.8], fov: 50 }}
        >
          {/* Ambientación pampeana y físicas Rapier */}
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]}>
              <PampaEnvironment />
              <Grill />
              <Fogon />
              <Embers />

              {meats.map((meat) => (
                <MeatItemComponent key={meat.id} meat={meat} />
              ))}
            </Physics>

            {/* Utensilios interactivos en mano del asador */}
            <PlayerTools />
          </Suspense>

          {/* POV Parrillera: límites angulares y polares para que el jugador esté frente a la parrilla */}
          <OrbitControls
            makeDefault
            target={[0, 0.45, 0]}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.15}
            minDistance={1.2}
            maxDistance={4.2}
            enablePan={false}
          />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default App;
