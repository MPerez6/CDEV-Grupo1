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
  const placingMeatId = useAsadoStore((state) => state.placingMeatId);

  useEffect(() => {
    if (meats.length === 0) {
      addMeat({
        id: 'corte-tira-base',
        cut: 'Vacío Pampeano',
        position: [0, 0.42, 0]
      });
    }
  }, [addMeat, meats.length]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Interfaz de usuario (barra compacta superior [F][C][P][A][T][M] y estado inferior) */}
      <GameUI />

      {/* Canvas 3D principal */}
      <Canvas
        shadows
        camera={{ position: [0, 1.15, 1.45], fov: 46 }}
      >
        <Suspense fallback={null}>
          {/* Ambientación pampeana y físicas Rapier */}
          <Physics gravity={[0, -9.81, 0]}>
            <PampaEnvironment />
            <Grill />
            <Fogon />
            <Embers />

            {meats.map((meat) => (
              <MeatItemComponent key={meat.id} meat={meat} />
            ))}
          </Physics>

          {/* Utensilios interactivos en primera persona con animaciones de balanceo y acción */}
          <PlayerTools />
        </Suspense>

        {/* POV Parrillera: al acomodar cortes se deshabilita para evitar rotación involuntaria */}
        <OrbitControls
          makeDefault
          enabled={!placingMeatId}
          target={[0, 0.38, 0]}
          minAzimuthAngle={-Math.PI / 3}
          maxAzimuthAngle={Math.PI / 3}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={0.8}
          maxDistance={3.2}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
};

export default App;
