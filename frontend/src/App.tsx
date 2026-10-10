import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Grill } from './components/Environment/Grill';
import { Embers } from './components/FireSystem/Embers';
import { MeatItemComponent } from './components/MeatItem/MeatItemComponent';
import { useAsadoStore } from './store/useAsadoStore';

const App: React.FC = () => {
  const addMeat = useAsadoStore((state) => state.addMeat);
  const meats = useAsadoStore((state) => state.meats);

  useEffect(() => {
    // Añade el corte inicial de prueba sobre la parrilla
    if (meats.length === 0) {
      addMeat({
        id: 'test-meat-1',
        cut: 'Vacio',
        position: [0, 0.65, 0] // Cae suavemente con Rapier y reposa sobre la parrilla a y=0.3
      });
    }
  }, [addMeat, meats.length]);

  return (
    <Suspense fallback={null}>
      <Canvas camera={{ position: [0, 3, 5], fov: 50 }}>
        <color attach="background" args={['#1a1a1a']} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />

        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Grill />
            <Embers />

            {meats.map((meat) => (
              <MeatItemComponent key={meat.id} meat={meat} />
            ))}
          </Physics>
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </Suspense>
  );
};

export default App;
