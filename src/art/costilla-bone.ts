import * as THREE from 'three';
import type { MeatModel } from '../sim/meat.ts';
import { createMeatUniforms, injectMeatCommon, withMeatEnvironment } from './meat-shading.ts';

/** Colores del hueso (sRGB): marfil crudo, marfil tostado y punta asada. */
export const BONE_COLORS = { raw: 0xece2cb, toasted: 0xcfae7c, tip: 0x5a3519, marrowRaw: 0x983e35, marrowCooked: 0x4e2418 } as const;

const TOASTED = new THREE.Color(BONE_COLORS.toasted), TIP = new THREE.Color(BONE_COLORS.tip);
const MARROW_COOKED = new THREE.Color(BONE_COLORS.marrowCooked), CHARRED = new THREE.Color(0x17100b);

export type CostillaBoneMaterials = {
  bone: THREE.MeshPhysicalMaterial; cap: THREE.MeshPhysicalMaterial; marrow: THREE.MeshStandardMaterial;
  update: (meat: MeatModel) => void;
};

/** Cocción (0..1) y quemado (0..1) que usa el hueso: promedio de ambas caras. */
export function boneHeat(meat: MeatModel): { cook: number; burn: number } {
  const layerAvg = (meat.layersC[0] + meat.layersC[4]) * 0.5;
  const thermal = THREE.MathUtils.clamp((layerAvg - 28) / 50, 0, 1);
  return {
    cook: THREE.MathUtils.clamp(Math.max((meat.brown.a + meat.brown.b) / 90, thermal * 0.6), 0, 1),
    burn: THREE.MathUtils.clamp(Math.max(meat.burn.a, meat.burn.b) / 100, 0, 1),
  };
}

/**
 * El hueso no se dora como la carne: queda marfil, apenas tostado y con motas,
 * y solo las puntas aserradas se asan y se carbonizan.
 */
export function createCostillaBoneMaterials(ribHalfLength: number): CostillaBoneMaterials {
  const bone = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name: 'costilla-bone-cortex', color: 0xffffff, roughness: 0.5, metalness: 0,
    clearcoat: 0.12, clearcoatRoughness: 0.5,
  }), 0.35);
  const cap = withMeatEnvironment(new THREE.MeshPhysicalMaterial({
    name: 'costilla-bone-cap', color: BONE_COLORS.raw, roughness: 0.62, metalness: 0,
    clearcoat: 0.08, clearcoatRoughness: 0.55,
  }), 0.3);
  const marrow = new THREE.MeshStandardMaterial({ name: 'costilla-bone-marrow', color: BONE_COLORS.marrowRaw, roughness: 0.86 });
  const cook = { value: 0 }, burn = { value: 0 }, uniforms = createMeatUniforms();
  const color = (hex: number): string => `vec3(${new THREE.Color(hex).toArray().map(c => c.toFixed(4)).join(', ')})`;

  bone.onBeforeCompile = shader => {
    shader.uniforms.boneCook = cook; shader.uniforms.boneBurn = burn;
    injectMeatCommon(shader, uniforms);
    shader.fragmentShader = 'uniform float boneCook;\nuniform float boneBurn;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        // Puntas aserradas: lo único del hueso que se asa de verdad
        float boneTip = smoothstep(${(ribHalfLength * 0.62).toFixed(5)}, ${(ribHalfLength * 0.97).toFixed(5)}, abs(vMtLocal.z));
        float speck = smoothstep(0.62, 0.9, mtNoise(vMtLocal.xz * 520.0)) * boneCook;
        vec3 boneCol = mix(${color(BONE_COLORS.raw)}, ${color(BONE_COLORS.toasted)}, boneCook * 0.85);
        boneCol = mix(boneCol, boneCol * vec3(0.62, 0.48, 0.36), speck * 0.45);
        boneCol = mix(boneCol, ${color(BONE_COLORS.tip)}, boneTip * boneCook * (0.65 + mtNoise(vMtLocal.xz * 300.0) * 0.35));
        // Restos de membrana dorada pegados al hueso
        boneCol = mix(boneCol, mtMaillard(0.55), smoothstep(0.55, 0.8, mtNoise(vMtLocal.xz * vec2(160.0, 40.0))) * boneCook * 0.55);
        boneCol = mtBurnt(boneCol, vMtLocal.xz * 1.4, boneBurn * (0.85 + boneTip * 0.5));
        diffuseColor.rgb *= boneCol;
      `)
      .replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, mtChar);
      `);
  };
  bone.customProgramCacheKey = () => `costilla-bone-${ribHalfLength.toFixed(4)}-v1`;

  return {
    bone, cap, marrow,
    update(meat) {
      const heat = boneHeat(meat);
      cook.value = heat.cook; burn.value = heat.burn;
      bone.roughness = 0.5 + heat.cook * 0.08;
      cap.color.set(BONE_COLORS.raw)
        .lerp(TOASTED, heat.cook * 0.7)
        .lerp(TIP, heat.cook * 0.6)
        .lerp(CHARRED, Math.min(1, heat.burn * 1.3));
      marrow.color.set(BONE_COLORS.marrowRaw)
        .lerp(MARROW_COOKED, heat.cook)
        .lerp(CHARRED, heat.burn);
    },
  };
}
