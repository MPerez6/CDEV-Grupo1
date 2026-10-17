import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const PampeanGrass: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 750;

  // Mata achaparrada de paja brava / flechillar con volumen perimetral y base ensanchada
  const tussockGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertOffset = 0;

    // 1. Cinco planos radiales abombados en abanico (0° a 144°) para volumen perimetral 360°
    const bladesAngles = [0, (Math.PI / 5), (2 * Math.PI / 5), (3 * Math.PI / 5), (4 * Math.PI / 5)];

    bladesAngles.forEach((ang) => {
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const perpX = -sinA;
      const perpZ = cosA;

      // Dimensiones de perfil achaparrado con base ancha
      const wBase = 0.44; // Ancho base en el suelo (0.44m)
      const wMid = 0.58;  // Vientre abombado de la mata (0.58m)
      const wTop = 0.34;  // Estrechamiento corona (0.34m)

      const y0 = 0.0;
      const y1 = 0.18;
      const y2 = 0.36;
      const y3 = 0.45; // Puntas flechillar

      // v0: base izquierda
      positions.push(-cosA * (wBase * 0.5), y0, -sinA * (wBase * 0.5));
      normals.push(perpX, 0.25, perpZ);
      uvs.push(0.0, 0.0);

      // v1: base derecha
      positions.push(cosA * (wBase * 0.5), y0, sinA * (wBase * 0.5));
      normals.push(perpX, 0.25, perpZ);
      uvs.push(1.0, 0.0);

      // v2: vientre izquierdo
      positions.push(-cosA * (wMid * 0.5), y1, -sinA * (wMid * 0.5));
      normals.push(perpX, 0.35, perpZ);
      uvs.push(0.0, 0.4);

      // v3: vientre derecho
      positions.push(cosA * (wMid * 0.5), y1, sinA * (wMid * 0.5));
      normals.push(perpX, 0.35, perpZ);
      uvs.push(1.0, 0.4);

      // v4: corona izquierda
      positions.push(-cosA * (wTop * 0.5), y2, -sinA * (wTop * 0.5));
      normals.push(perpX, 0.5, perpZ);
      uvs.push(0.15, 0.8);

      // v5: corona derecha
      positions.push(cosA * (wTop * 0.5), y2, sinA * (wTop * 0.5));
      normals.push(perpX, 0.5, perpZ);
      uvs.push(0.85, 0.8);

      // v6: punta del penacho
      positions.push(0, y3, 0);
      normals.push(perpX, 0.9, perpZ);
      uvs.push(0.5, 1.0);

      // Caras inferiores del abombamiento (v0, v1, v3) y (v0, v3, v2)
      indices.push(
        vertOffset, vertOffset + 1, vertOffset + 3,
        vertOffset, vertOffset + 3, vertOffset + 2
      );

      // Caras intermedias (v2, v3, v5) y (v2, v5, v4)
      indices.push(
        vertOffset + 2, vertOffset + 3, vertOffset + 5,
        vertOffset + 2, vertOffset + 5, vertOffset + 4
      );

      // Cara superior triangular hacia la punta (v4, v5, v6)
      indices.push(
        vertOffset + 4, vertOffset + 5, vertOffset + 6
      );

      vertOffset += 7;
    });

    // 2. Núcleo central bajo cónico (8 segmentos) para masa sólida en la raíz
    const coreRadius = 0.22;
    const coreHeight = 0.26;
    const coreSegments = 8;
    const apexIndex = vertOffset;

    // Vértice cúspide del cono
    positions.push(0, coreHeight, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    vertOffset++;

    for (let s = 0; s < coreSegments; s++) {
      const theta = (s / coreSegments) * Math.PI * 2;
      const px = Math.cos(theta) * coreRadius;
      const pz = Math.sin(theta) * coreRadius;

      positions.push(px, 0, pz);
      normals.push(px, 0.3, pz);
      uvs.push(0.5 + px, 0.5 + pz);
    }

    for (let s = 0; s < coreSegments; s++) {
      const curr = apexIndex + 1 + s;
      const next = apexIndex + 1 + ((s + 1) % coreSegments);
      indices.push(apexIndex, curr, next);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, []);

  // Material pampeano con balanceo orgánico por viento
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.04,
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
        // Viento pampeano que mece los penachos suavemente según altura Y
        vec4 wPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float sway = sin(uTime * 1.9 + wPos.x * 0.35 + wPos.z * 0.25) * 0.04 * clamp(position.y / 0.42, 0.0, 1.0);
        transformed.x += sway;
        transformed.z += sway * 0.6;
        `
      );
      mat.userData.shader = shader;
    };

    return mat;
  }, []);

  // Distribución de matas agrupadas orgánicamente en el plano medio y lejano (radio 4.8m a 26m)
  const instancesData = useMemo(() => {
    const list: { pos: [number, number, number]; rotY: number; scale: [number, number, number]; color: THREE.Color }[] = [];

    // Paleta de colores secos de campo requerida
    const pampeanPalette = [
      new THREE.Color('#7d7543'), // Pajonal tostado
      new THREE.Color('#556832'), // Verde oliva
      new THREE.Color('#8a7f49'), // Flechillar seco
    ];

    let seed = 918273;
    const pseudoRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Pre-generar 20 centros de cluster de matas en la pampa distante
    const clusterCenters: { x: number; z: number }[] = [];
    for (let c = 0; c < 20; c++) {
      const cr = 6.0 + pseudoRand() * 18.0;
      const cTheta = pseudoRand() * Math.PI * 2;
      clusterCenters.push({
        x: Math.cos(cTheta) * cr,
        z: Math.sin(cTheta) * cr,
      });
    }

    let attempts = 0;
    while (list.length < count && attempts < 9000) {
      attempts++;

      let x = 0;
      let z = 0;

      // 65% agrupadas en matas / clusters pampeanos, 35% dispersas orgánicamente
      if (pseudoRand() < 0.65) {
        const center = clusterCenters[Math.floor(pseudoRand() * clusterCenters.length)];
        const clusterOffsetR = Math.sqrt(pseudoRand()) * 2.8;
        const clusterOffsetTheta = pseudoRand() * Math.PI * 2;
        x = center.x + Math.cos(clusterOffsetTheta) * clusterOffsetR;
        z = center.z + Math.sin(clusterOffsetTheta) * clusterOffsetR;
      } else {
        const r = 4.8 + Math.sqrt(pseudoRand()) * 21.2; // de 4.8m a 26m
        const theta = pseudoRand() * Math.PI * 2;
        x = Math.cos(theta) * r;
        z = Math.sin(theta) * r;
      }

      // Zona de exclusión estricta central: NINGUNA mata a menos de 4.8m del centro
      const distFromCenter = Math.hypot(x, z);
      if (distFromCenter < 4.8 || distFromCenter > 26.5) {
        continue;
      }

      // Exclusión del área de la pared trasera del quincho
      if (z > -4.6 && z < -3.7 && Math.abs(x) < 7.5) {
        continue;
      }

      const rotY = pseudoRand() * Math.PI * 2;
      // Escala achaparrada con ancho entre 0.40m y 0.65m y altura entre 0.35m y 0.50m
      const sBase = 0.9 + pseudoRand() * 0.45;
      const scaleX = sBase * (0.95 + pseudoRand() * 0.15);
      const scaleY = 0.85 + pseudoRand() * 0.32;
      const scaleZ = sBase * (0.95 + pseudoRand() * 0.15);

      const baseColor = pampeanPalette[Math.floor(pseudoRand() * pampeanPalette.length)].clone();
      // Leve variación cromática orgánica por mata
      baseColor.offsetHSL(
        (pseudoRand() - 0.5) * 0.035,
        (pseudoRand() - 0.5) * 0.07,
        (pseudoRand() - 0.5) * 0.05
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
      args={[tussockGeometry, material, instancesData.length]}
      castShadow
      receiveShadow
    />
  );
};
