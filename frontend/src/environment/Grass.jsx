import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GRASS_COUNT = 50000;
const GRASS_WIDTH = 0.1;
const GRASS_HEIGHT = 1.0;
const PATCH_SIZE = 40;

export default function Grass() {
  const materialRef = useRef();

  // Create geometry once
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRASS_WIDTH, GRASS_HEIGHT, 1, 4);
    geo.translate(0, GRASS_HEIGHT / 2, 0); // Origin at the bottom
    return geo;
  }, []);

  // Compute instance matrices once
  const [matrices, colors] = useMemo(() => {
    const m = new Float32Array(GRASS_COUNT * 16);
    // Not using instanced colors in this version, but keeping it simple. We rely on the shader for color.
    const dummy = new THREE.Object3D();

    for (let i = 0; i < GRASS_COUNT; i++) {
      const x = (Math.random() - 0.5) * PATCH_SIZE;
      const z = (Math.random() - 0.5) * PATCH_SIZE;
      const rotY = Math.random() * Math.PI * 2;
      const scaleY = 0.5 + Math.random() * 0.8;

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, scaleY, 1);
      dummy.updateMatrix();

      dummy.matrix.toArray(m, i * 16);
    }
    return [m, null];
  }, []);

  // Shader customization
  const onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };
    shader.defines = shader.defines || {};
    shader.defines.USE_UV = ''; // Force USE_UV to ensure 'uv' attribute is provided

    // Add variables
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float time;
      `
    );

    // Modify vertex positions based on wind
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
      #endif
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif

      // Wind effect based on world position
      vec3 instancePosition = vec3(0.0);
      #ifdef USE_INSTANCING
        instancePosition = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #endif

      float windForce = sin(instancePosition.x * 0.5 + time) * cos(instancePosition.z * 0.5 + time) * 0.15;
      float swayMultiplier = pow(vUv.y, 2.0); // vUv is provided by Three.js when USE_UV is defined

      mvPosition.x += windForce * swayMultiplier * 2.0;
      mvPosition.z += windForce * swayMultiplier * 2.0;

      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `
    );

    // Color gradient from bottom to top
    shader.fragmentShader = shader.fragmentShader.replace(
      /#include <color_fragment>/,
      `
      #include <color_fragment>
      vec3 bottomColor = vec3(0.12, 0.25, 0.05); // Dark green
      vec3 topColor = vec3(0.4, 0.7, 0.1);       // Light green

      // Mix color based on UV y (height)
      vec3 grassColor = mix(bottomColor, topColor, vUv.y);

      diffuseColor.rgb = grassColor;
      `
    );

    // Store shader in userData to update uniforms later
    if (materialRef.current) {
        materialRef.current.userData.shader = shader;
    }
  };

  // Animate wind
  useFrame(({ clock }) => {
    if (materialRef.current?.userData?.shader) {
      materialRef.current.userData.shader.uniforms.time.value = clock.getElapsedTime() * 2.0;
    }
  });

  return (
    <instancedMesh
      args={[geometry, null, GRASS_COUNT]}
      castShadow
      receiveShadow
    >
      <instancedBufferAttribute
        attach="instanceMatrix"
        array={matrices}
        itemSize={16}
        count={GRASS_COUNT}
      />
      <meshStandardMaterial
        ref={materialRef}
        color={0xffffff}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
}
