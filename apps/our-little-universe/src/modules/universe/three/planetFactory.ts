import * as THREE from 'three';
import {
  createOnPlanetTitleTexture,
  createRealisticPlanetaryRingTexture,
  getOrCreateSolarPlanetTextures,
} from './planetTextures';
import { SOLAR_PLANET_APPEARANCES } from './solarCatalog';
import type { PlanetNodeSpec, UniverseThemePalette3D } from './types';

export interface PlanetAssembly {
  spec: PlanetNodeSpec;
  root: THREE.Group;
  sphere: THREE.Mesh;
  saturnRing?: THREE.Mesh;
  labelSprite: THREE.Sprite;
  hitMesh: THREE.Mesh;
  baseY: number;
  phaseOffset: number;
  updatePalette: (palette: UniverseThemePalette3D) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds a realistic astronomical 3D planet sphere with cached procedural textures,
 * optional Saturn icy ring (on designated single world), crisp star-free title on planet,
 * and adaptive Light/Dark Mode surface illumination so planets stay vibrant on light skies.
 */
export function buildPlanetAssembly(
  spec: PlanetNodeSpec,
  phaseOffset: number,
  palette: UniverseThemePalette3D
): PlanetAssembly {
  const disposables: Array<{ dispose: () => void }> = [];
  const root = new THREE.Group();
  const [px, py, pz] = spec.position;
  root.position.set(px, 0, pz);

  const appearance = SOLAR_PLANET_APPEARANCES[spec.surfaceStyle];
  const primaryColor = new THREE.Color(appearance.primaryHex);

  // Cached solar textures are shared safely across updates (not disposed per rebuild)
  const { map, bumpMap } = getOrCreateSolarPlanetTextures(spec.surfaceStyle);

  const sphereGeo = new THREE.SphereGeometry(spec.radius, 40, 28);
  const sphereMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.055,
    emissive: primaryColor,
    emissiveMap: map,
    emissiveIntensity: palette.isDark ? 0.08 : 0.34,
    roughness: appearance.kind === 'terrestrial' ? 0.58 : 0.72,
    metalness: 0.02,
  });
  disposables.push(sphereGeo, sphereMat);

  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.y = py;
  sphere.userData.moduleKey = spec.moduleKey;
  root.add(sphere);

  let saturnRing: THREE.Mesh | undefined;
  let ringMat: THREE.MeshStandardMaterial | undefined;
  if (spec.hasRing) {
    const ringTex = createRealisticPlanetaryRingTexture(appearance.ringHex || '#d89f60');
    const ringGeo = new THREE.RingGeometry(spec.radius * 1.34, spec.radius * 2.2, 64);
    ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      emissive: new THREE.Color(appearance.ringHex || '#d89f60'),
      emissiveIntensity: palette.isDark ? 0.14 : 0.36,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: spec.canEnter ? (palette.isDark ? 0.88 : 0.94) : 0.5,
      roughness: 0.75,
      depthWrite: false,
    });
    disposables.push(ringTex, ringGeo, ringMat);

    saturnRing = new THREE.Mesh(ringGeo, ringMat);
    saturnRing.position.y = py;
    saturnRing.rotation.x = Math.PI * 0.4;
    saturnRing.rotation.y = 0.28;
    root.add(saturnRing);
  }

  const labelTex = createOnPlanetTitleTexture(spec.title, !spec.canEnter);
  disposables.push(labelTex);

  const spriteMat = new THREE.SpriteMaterial({
    map: labelTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: spec.canEnter ? 0.96 : 0.68,
  });
  disposables.push(spriteMat);

  const labelSprite = new THREE.Sprite(spriteMat);
  labelSprite.position.set(0, py, 0);
  labelSprite.scale.set(spec.radius * 2.45, spec.radius * 0.54, 1);
  labelSprite.renderOrder = 25;
  root.add(labelSprite);

  const hitGeo = new THREE.SphereGeometry(spec.radius * 1.38, 12, 10);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  disposables.push(hitGeo, hitMat);

  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = py;
  hitMesh.userData.moduleKey = spec.moduleKey;
  root.add(hitMesh);

  const updatePalette = (next: UniverseThemePalette3D) => {
    sphereMat.emissiveIntensity = next.isDark ? 0.08 : 0.34;
    if (ringMat) {
      ringMat.emissiveIntensity = next.isDark ? 0.14 : 0.36;
      ringMat.opacity = spec.canEnter ? (next.isDark ? 0.88 : 0.94) : 0.5;
    }
  };

  return {
    spec,
    root,
    sphere,
    saturnRing,
    labelSprite,
    hitMesh,
    baseY: py,
    phaseOffset,
    updatePalette,
    disposables,
  };
}
