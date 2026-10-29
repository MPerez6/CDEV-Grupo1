import * as THREE from 'three';
import { CONFIG } from '../sim/parameters.ts';
import type { SimulationWorld } from '../sim/world.ts';
import { isFuelBurning, type FuelPiece, type DroppedPiece } from '../sim/embers.ts';
import { createBrazierModel } from '../art/brazier-model.ts';
import { createFuelModel } from '../art/fuel-model.ts';
import { createFireLighting } from '../lighting/lighting.ts';
import { createFuelFlames } from './fuel-flames.ts';
import { createEmberScatter, type EmberScatter } from './ember-scatter.ts';

export function createBrazier(scene: THREE.Scene, clickable: THREE.Object3D[], placement?: Parameters<typeof createBrazierModel>[2]) {
  const { root, groundTarget, paper, paperMaterial, brazierContents, trayContents } = createBrazierModel(scene, clickable, placement);
  // Las llamas nacen en el papel y atraviesan las varillas hacia el combustible.
  const flames: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>[] = [];
  for(let i = 0;i < 7;i++) {
    const height = i === 0 ? 0.84 : 0.50 + (i % 3) * 0.09;
    const geometry = new THREE.ConeGeometry(i === 0 ? 0.14 : 0.075, height, 7);
    geometry.translate(0, height / 2, 0); // Escalar mantiene la base sobre el papel.
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xffb52c : 0xff641e, transparent: true, opacity: 0.65,
      depthWrite: false, side: THREE.DoubleSide,
    }));
    const angle = i * 2.4;
    mesh.position.set(i ? Math.cos(angle) * 0.21 : 0, 0.19, i ? Math.sin(angle) * 0.12 : 0);
    root.add(mesh);
    flames.push(mesh);
  }
  const flame = flames[0];
  flame.name = 'tinder-fire';
  const lighting = createFireLighting(root);

  type FuelVisual = ReturnType<typeof makeFuel>;
  const fuelVisuals = new Map<number, FuelVisual>();
  function makeFuel(piece: FuelPiece) {
    const { group, materials } = createFuelModel(piece);
    const fire = createFuelFlames(piece);
    group.add(fire); brazierContents.add(group);
    return { group, materials, fire };
  }
  function disposeGroup(group: THREE.Group): void {
    const materials = new Set<THREE.Material>();
    group.traverse(object => {
      if(object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
      }
    });
    materials.forEach(m => m.dispose());
    group.removeFromParent();
  }
  type GroundVisual = { cluster: EmberScatter; fallFrom?: THREE.Vector3; droppedAt: number };
  const groundVisuals = new Map<number, GroundVisual>();
  const fallOrigins = new Map<number, THREE.Vector3>();
  const hotColor = new THREE.Color(0xe34b21);
  const coldCoal = new THREE.Color(0x242426);
  const bark = new THREE.Color(0x60412a);
  const endGrain = new THREE.Color(0xad7946);
  let previousSimSeconds = 0;
  const fuelPosition = new THREE.Vector3();
  function updateVisuals(world: SimulationWorld, elapsedReal: number): void {
    const settling = 1 - Math.exp(-18 * Math.max(0, world.simSeconds - previousSimSeconds) / CONFIG.timeScale);
    previousSimSeconds = world.simSeconds;
    const ids = new Set(world.brazier.fuel.map(f => f.id));
    for(const [id, visual] of fuelVisuals) {
      if(!ids.has(id)) {
        if(world.brazier.tray.some(p => p.id === id)) fallOrigins.set(id, visual.group.position.clone());
        disposeGroup(visual.group);
        fuelVisuals.delete(id);
      }
    }
    // Capas apoyadas en el fondo; la canasta se ensancha hacia arriba.
    for(const piece of world.brazier.fuel) {
      let visual = fuelVisuals.get(piece.id);
      const fresh = !visual;
      if(!visual) { visual = makeFuel(piece); fuelVisuals.set(piece.id, visual); }
      const slotsPerLayer = CONFIG.brazierPileColumns * CONFIG.brazierPileRows;
      const layer = Math.floor(piece.slot / slotsPerLayer);
      const cell = piece.slot % slotsPerLayer;
      const row = Math.floor(cell / CONFIG.brazierPileColumns);
      const column = cell % CONFIG.brazierPileColumns;
      fuelPosition.set(piece.kind === 'large-wood' ? 0 : (column - 0.5) * 0.49,
        0.88 + layer * 0.19, (row === 0 ? 1 : -1) * (0.10 + layer * 0.085));
      if(fresh) visual.group.position.copy(fuelPosition);
      else visual.group.position.lerp(fuelPosition, settling);
      visual.group.rotation.y = piece.kind === 'charcoal' ? 0 : (layer % 2 ? 0.06 : -0.06);
      // El rojo llega con la maduración; la leña primero se carboniza.
      const glow = Math.max(0, (piece.progress - 0.25) / 0.75);
      visual.materials.forEach((material, index) => {
        const band = index === 4 ? 1.5 : index;
        const localGlow = Math.max(0, Math.min(1, (piece.progress - 0.15 - band * 0.14) / (0.85 - band * 0.14)));
        material.color.copy(piece.kind === 'charcoal' ? coldCoal : index === 4 ? endGrain : bark);
        if(piece.kind !== 'charcoal') material.color.lerp(coldCoal, Math.min(1, piece.progress * 1.6));
        material.color.lerp(hotColor, localGlow);
        material.emissive.setHex(0xff3d09);
        material.emissiveIntensity = localGlow * 0.85;
      });
      const burning = isFuelBurning(piece);
      // La madera da llama; el carbón maduro se ve principalmente al rojo vivo.
      visual.fire.visible = burning && piece.progress < 1;
      const strength = piece.kind === 'charcoal' ? Math.max(0, 1 - glow) : Math.max(0.08, 1 - glow * glow);
      visual.fire.scale.set(1, strength * (0.85 + Math.sin(elapsedReal * 10 + piece.id) * 0.15), 1);
      visual.fire.rotation.z = Math.sin(elapsedReal * 7 + piece.id) * 0.08;
    }
    const groundIds = new Set(world.brazier.tray.map(p => p.id));
    for(const [id, visual] of groundVisuals) {
      if(!groundIds.has(id)) { visual.cluster.dispose(); groundVisuals.delete(id); }
    }
    world.brazier.tray.forEach((piece: DroppedPiece) => {
      let visual = groundVisuals.get(piece.id);
      if(!visual) {
        const cluster = createEmberScatter(piece.id, {
          spreadX: piece.state === 'ready' ? 0.17 : 0.09,
          spreadZ: piece.state === 'ready' ? 0.14 : 0.08,
          size: piece.state === 'ready' ? 0.042 : 0.055,
          count: piece.state === 'ready' ? 18 + piece.id % 5 : 3,
        });
        trayContents.add(cluster.group);
        const origin = fallOrigins.get(piece.id);
        // Mantener la x del combustible: caída vertical, sin desviar a una bandeja.
        const end = new THREE.Vector3(origin?.x ?? Math.sin(piece.id * 2.4) * 0.34, 0.01,
          origin?.z ?? Math.cos(piece.id * 2.4) * 0.25);
        // Pequeña dispersión sobre el piso para distinguir fragmentos superpuestos.
        end.z += Math.sin(piece.id * 3.1) * 0.05;
        cluster.group.position.copy(end);
        const fallFrom = origin ? origin.clone().sub(trayContents.position).sub(end) : undefined;
        visual = { cluster, fallFrom, droppedAt: world.simSeconds };
        groundVisuals.set(piece.id, visual);
        fallOrigins.delete(piece.id);
      }
      const t = Math.min(1, Math.max(0, (world.simSeconds - visual.droppedAt) / (CONFIG.timeScale * 0.55)));
      const ember = piece.state === 'ready' ? piece.ember : piece.fuel.ember;
      visual.cluster.update(ember, elapsedReal, {
        heat: piece.state === 'ready' ? 1 : piece.fuel.progress * 0.4,
        fallFrom: visual.fallFrom,
        fallProgress: t,
      });
    });
    groundTarget.userData.enabled = world.brazier.tray.some(p => (p.state === 'immature' ? p.fuel.ember : p.ember).massG > 0);
    const tinder = world.brazier.tinderFraction;
    paper.visible = world.brazier.tinder > 0 || world.brazier.tinderBurning;
    paper.scale.setScalar(world.brazier.tinderBurning ? 0.30 + 0.70 * Math.sqrt(tinder) : 0.95);
    paperMaterial.color.setHex(0x403b34).lerp(new THREE.Color(0xd7ccb1), world.brazier.tinderBurning ? tinder : 1);
    flames.forEach((mesh, i) => {
      mesh.visible = world.brazier.tinderBurning;
      const fade = Math.min(1, tinder * 4);
      mesh.scale.set(fade * (1 + Math.sin(elapsedReal * 9 + i) * 0.12), fade * (0.83 + Math.sin(elapsedReal * 11 + i * 2) * 0.17), fade);
      mesh.rotation.z = Math.sin(elapsedReal * 7 + i) * 0.10;
    });
    lighting.update(world.brazier, elapsedReal);
  }
  return { brazierContents, trayContents, flame, fireLight: lighting.light, updateVisuals };
}
