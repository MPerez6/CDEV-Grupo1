import * as THREE from 'three';
import type { DayCycle } from '../sim/daytime.ts';
import { sunAzimuth, sunHeight } from '../sim/daytime.ts';
import { LIGHTING_SETTINGS } from './lighting.ts';
import { PERGOLA } from '../level/layout.ts';

/** Colores del ciclo (día, hora dorada, noche, nublado). */
const SUN = { day: new THREE.Color(LIGHTING_SETTINGS.sunColor), golden: new THREE.Color(0xff9a55), moon: new THREE.Color(0x9fb4ff) };
const AMBIENT = { day: new THREE.Color(LIGHTING_SETTINGS.ambientColor), golden: new THREE.Color(0xffc9a0), night: new THREE.Color(0x5d6a9a) };
const HAZE = { day: new THREE.Color(0xc6e1f2), golden: new THREE.Color(0xf0b58a), night: new THREE.Color(0x0a0f20), overcast: new THREE.Color(0x9aa4ad) };
/** Emisivos de faroles y guirnaldas del escenario (se prenden de noche). */
const LAMP_EMISSIVES = new Set([0xffb85c, 0xffb84d, 0xffe2a8]);

type SkyApi = { applyDaylight(state: { sunDir: THREE.Vector3; golden: number; night: number; clouds: number; rain: number }): void };

/**
 * Aplica la hora y el clima a la escena: sol (o luna), luz ambiente, cielo, niebla, faroles
 * y la guirnalda de la pérgola. Solo lee `DayCycle`.
 */
export function createDayNight(scene: THREE.Scene, sun: THREE.DirectionalLight, ambient: THREE.AmbientLight, sky: SkyApi) {
  const lamps: { material: THREE.MeshStandardMaterial; base: number }[] = [];
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial | undefined;
    if(!mesh.isMesh || !material || !('emissive' in material) || Array.isArray(material)) return;
    if(LAMP_EMISSIVES.has(material.emissive.getHex()) && !lamps.some(l => l.material === material)) lamps.push({ material, base: material.emissiveIntensity });
  });
  // Guirnalda de la pérgola: ilumina la mesa de noche (sin sombras para no recargar).
  const pergolaLight = new THREE.PointLight(0xffc27a, 0, 9, 1.6);
  pergolaLight.position.set((PERGOLA.x0 + PERGOLA.x1) / 2, PERGOLA.height - 0.25, (PERGOLA.z0 + PERGOLA.z1) / 2);
  scene.add(pergolaLight);

  const sunDir = new THREE.Vector3();
  const color = new THREE.Color();
  const fog = scene.fog as THREE.Fog | null;
  const background = scene.background instanceof THREE.Color ? scene.background : null;

  return {
    pergolaLight,
    update(day: DayCycle): void {
      const light = day.light;
      const height = sunHeight(day.hour), az = sunAzimuth(day.hour);
      sunDir.set(az * 0.85, Math.max(0.04, height) * 1.35 + 0.02, 0.5).normalize();
      // De noche la luz direccional pasa a ser la luna, fría y tenue.
      const moon = light.night * (1 - day.clouds * 0.7) * 0.32;
      if(light.night > 0.5) sun.position.set(-az * 4, 9, 4);
      else sun.position.copy(sunDir).multiplyScalar(12);
      sun.intensity = LIGHTING_SETTINGS.sunIntensity * light.sun + moon;
      sun.color.copy(SUN.day).lerp(SUN.golden, light.golden).lerp(SUN.moon, light.night);
      ambient.intensity = LIGHTING_SETTINGS.ambientIntensity * light.ambient;
      ambient.color.copy(AMBIENT.day).lerp(AMBIENT.golden, light.golden * 0.7).lerp(AMBIENT.night, light.night);
      color.copy(HAZE.day).lerp(HAZE.golden, light.golden).lerp(HAZE.overcast, day.clouds * 0.7 * (1 - light.night)).lerp(HAZE.night, light.night);
      background?.copy(color);
      if(fog) {
        fog.color.copy(color);
        fog.near = 28 - day.rain * 14;
        fog.far = 105 - day.rain * 45;
      }
      sky.applyDaylight({ sunDir, golden: light.golden, night: light.night, clouds: day.clouds, rain: day.rain });
      // Faroles: apagados de día, se encienden al caer el sol.
      const lampsOn = Math.min(1, light.night * 1.3 + light.golden * 0.25);
      for(const lamp of lamps) lamp.material.emissiveIntensity = lamp.base * (0.12 + 0.95 * lampsOn);
      pergolaLight.intensity = 3.2 * lampsOn;
    },
  };
}
