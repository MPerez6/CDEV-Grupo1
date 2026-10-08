import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Grill } from './components/Environment/Grill';
import { Embers } from './components/FireSystem/Embers';
import { MeatItemComponent } from './components/MeatItem/MeatItemComponent';
import { useAsadoStore } from './store/useAsadoStore';

const App: React.FC = () => {
  const addMeat = useAsadoStore(state => state.addMeat);
  const meats = useAsadoStore(state => state.meats);

  useEffect(() => {
    // Add a test meat item to the grill
    if (meats.length === 0) {
      addMeat({
        id: 'test-meat-1',
        cut: 'Vacio',
        position: [0, 0.45, 0] // slightly above the grill (y=0.3)
      });
    }
  }, [addMeat, meats.length]);

  return (
    <Canvas camera={{ position: [0, 3, 5], fov: 50 }}>
      <color attach="background" args={['#1a1a1a']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      <Grill />
      <Embers />
      
      {meats.map(meat => (
        <MeatItemComponent key={meat.id} meat={meat} />
      ))}
      
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default App;
