import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const PampeanGrass: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 1200;

  // Geometría de bajo poligonaje: 3 planos verticales cruzados con tope cónico para forma de mata natural
  const tuftGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const w = 0.15;
    const h = 0.35;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
    let vertOffset = 0;

    angles.forEach((ang) => {
      const cosA = Math.cos(ang) * (w / 2);
      const sinA = Math.sin(ang) * (w / 2);
      const nx = -Math.sin(ang);
      const nz = Math.cos(ang);

      // v0: inferior izquierda
      positions.push(-cosA, 0, -sinA);
      normals.push(nx, 0.2, nz);
      uvs.push(0, 0);

      // v1: inferior derecha
      positions.push(cosA, 0, sinA);
      normals.push(nx, 0.2, nz);
      uvs.push(1, 0);

      // v2: superior derecha (estrechada al 65%)
      positions.push(cosA * 0.65, h, sinA * 0.65);
      normals.push(nx, 0.2, nz);
      uvs.push(1, 1);

      // v3: superior izquierda (estrechada al 65%)
      positions.push(-cosA * 0.65, h, -sinA * 0.65);
      normals.push(nx, 0.2, nz);
      uvs.push(0, 1);

      indices.push(
        vertOffset, vertOffset + 1, vertOffset + 2,
        vertOffset, vertOffset + 2, vertOffset + 3
      );

      vertOffset += 4;
    });

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }, []);

  // Material pampeano con balanceo sutil por viento inyectado en el vertex shader
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Viento pampeano orgánico que mece la punta del pasto proporcional a la altura Y
        vec4 wPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float sway = sin(uTime * 2.2 + wPos.x * 0.75 + wPos.z * 0.55) * 0.055 * (position.y / 0.35);
        transformed.x += sway;
        transformed.z += sway * 0.6;
        `
      );
      mat.userData.shader = shader;
    };

    return mat;
  }, []);

  // Generación determinista de 1200 instancias distribuidas en el campo pampeano
  const instancesData = useMemo(() => {
    const list: { pos: [number, number, number]; rotY: number; scale: [number, number, number]; color: THREE.Color }[] = [];

    const pampeanPalette = [
      new THREE.Color('#556832'), // Verde oliva seco
      new THREE.Color('#7d7543'), // Pajonal dorado
      new THREE.Color('#46542b'), // Verde gramilla
      new THREE.Color('#646e38'), // Pastizal mixto
      new THREE.Color('#8a7f49'), // Flechillar seco pampeano
    ];

    let seed = 739391;
    const pseudoRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    let attempts = 0;
    while (list.length < count && attempts < 8000) {
      attempts++;
      // Distribución cuadrática para mayor densidad en las cercanías visibles (radio 1.9m a 20m)
      const r = 1.9 + Math.sqrt(pseudoRand()) * 18.1;
      const theta = pseudoRand() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      // Exclusión estricta de la zona central de asado (x^2 + z^2 > 1.8^2)
      if (x * x + z * z < 1.9 * 1.9) continue;

      // Exclusión de la zona de la mesa rústica
      if (x > 0.45 && x < 1.45 && z > -0.55 && z < 0.65) continue;
      // Exclusión del nicho de la leñera
      if (x > -1.75 && x < -0.95 && z > -0.75 && z < -0.15) continue;
      // Exclusión del área del quincho / pared trasera
      if (z > -4.5 && z < -3.9 && x > -7.2 && x < 7.2) continue;

      const rotY = pseudoRand() * Math.PI * 2;
      const scaleX = 0.8 + pseudoRand() * 0.45;
      const scaleY = 0.75 + pseudoRand() * 0.6;
      const scaleZ = 0.8 + pseudoRand() * 0.45;

      const baseColor = pampeanPalette[Math.floor(pseudoRand() * pampeanPalette.length)].clone();
      // Leve variación cromática orgánica por mata
      baseColor.offsetHSL(
        (pseudoRand() - 0.5) * 0.04,
        (pseudoRand() - 0.5) * 0.08,
        (pseudoRand() - 0.5) * 0.06
      );

      list.push({
        pos: [x, 0, z],
        rotY,
        scale: [scaleX, scaleY, scaleZ],
        color: baseColor,
      });
    }

    return list;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    instancesData.forEach((inst, i) => {
      dummy.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);
      dummy.rotation.set(0, inst.rotY, 0);
      dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, inst.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [instancesData, dummy]);

  useFrame(({ clock }) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[tuftGeometry, material, instancesData.length]}
      castShadow
      receiveShadow
    />
  );
};
