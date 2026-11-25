import * as THREE from 'three';
import {
  getOrCreateHeartStarTexture,
  getOrCreateSoftGlowTexture,
  getOrCreateSunPhotosphereTexture,
} from './planetTextures';
import { SOLAR_SUN_PALETTE } from './solarCatalog';
import { cssColorToThree } from './themeTokenBridge';
import type { PlanetNodeSpec, UniverseThemePalette3D } from './types';

interface MeteorParticle {
  group: THREE.Group;
  trailMat: THREE.MeshBasicMaterial;
  headMat: THREE.MeshBasicMaterial;
  velocity: THREE.Vector3;
  active: boolean;
  age: number;
  maxAge: number;
  cooldown: number;
}

export interface SolarEnvironment {
  group: THREE.Group;
  sunMesh: THREE.Mesh;
  sunLight: THREE.PointLight;
  galaxyPoints: THREE.Points;
  heartStarPoints: THREE.Points;
  asteroidCluster: THREE.Group;
  updateMeteors: (deltaSec: number, reducedMotion: boolean) => void;
  updatePalette: (palette: UniverseThemePalette3D) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds the realistic deep-space Solar System environment with full Light Mode & Dark Mode harmony:
 * - Warm golden Sun with blending-aware corona halos
 * - Widely spaced elliptical planetary orbit tracks
 * - 1800-point starfield & 140 heart-shaped stars adapting contrast/blending per Light/Dark mode
 * - Periodic shooting meteors streaking cleanly in both Light & Dark modes
 */
export function buildSolarEnvironment(
  specs: PlanetNodeSpec[],
  palette: UniverseThemePalette3D
): SolarEnvironment {
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  const accentColor = cssColorToThree(palette.accent);
  const purpleColor = cssColorToThree(palette.purple);
  const sunCoreColor = new THREE.Color(SOLAR_SUN_PALETTE.coreHex);
  const sunMidColor = new THREE.Color(SOLAR_SUN_PALETTE.midHex);
  const sunLightColor = new THREE.Color(SOLAR_SUN_PALETTE.lightHex);

  // 1. Golden Burning Sun Core + Mode-Aware Solar Corona
  const sunTex = getOrCreateSunPhotosphereTexture();
  const glowTex = getOrCreateSoftGlowTexture();

  const sunGeo = new THREE.SphereGeometry(0.95, 36, 28);
  const sunMat = new THREE.MeshStandardMaterial({
    map: sunTex,
    emissive: sunMidColor,
    emissiveMap: sunTex,
    emissiveIntensity: palette.isDark ? 0.92 : 0.78,
    roughness: 0.45,
    metalness: 0,
  });
  disposables.push(sunGeo, sunMat);

  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.set(0, 0.25, 0);
  group.add(sunMesh);

  const sunHaloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: sunCoreColor,
    transparent: true,
    opacity: palette.isDark ? 0.74 : 0.48,
    blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  const sunOuterHaloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: sunMidColor,
    transparent: true,
    opacity: palette.isDark ? 0.34 : 0.22,
    blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  disposables.push(sunHaloMat, sunOuterHaloMat);

  const sunHalo = new THREE.Sprite(sunHaloMat);
  sunHalo.position.copy(sunMesh.position);
  sunHalo.scale.set(3.5, 3.5, 1);
  group.add(sunHalo);

  const sunOuterHalo = new THREE.Sprite(sunOuterHaloMat);
  sunOuterHalo.position.copy(sunMesh.position);
  sunOuterHalo.scale.set(5.4, 5.4, 1);
  group.add(sunOuterHalo);

  const sunLight = new THREE.PointLight(sunLightColor, 3.8, 95, 0.55);
  sunLight.position.copy(sunMesh.position);
  group.add(sunLight);

  // 2. Wide Elliptical Orbit Tracks
  const orbitMaterials: THREE.LineBasicMaterial[] = [];
  const seenRadii: number[] = [];
  specs.forEach((spec) => {
    const r = Math.hypot(spec.position[0], spec.position[2]);
    if (r < 1.8 || seenRadii.some((existing) => Math.abs(existing - r) < 0.45)) {
      return;
    }
    seenRadii.push(r);

    const pts: THREE.Vector3[] = [];
    const segs = 84;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, spec.position[1] * 0.25, Math.sin(a) * r));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.isDark ? '#94a3b8' : '#475569'),
      transparent: true,
      opacity: palette.isDark ? 0.14 : 0.26,
    });
    orbitMaterials.push(orbitMat);
    disposables.push(orbitGeo, orbitMat);
    group.add(new THREE.Line(orbitGeo, orbitMat));
  });

  // 3. Starfield & Distant Spiral Galaxy (Adaptive Dark/Light colors & blending)
  const starCount = 1800;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const starSeeds = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    starSeeds[i] = Math.random();
    if (i < 750) {
      const arm = i % 3;
      const radius = 3.5 + Math.pow(Math.random(), 0.75) * 30;
      const spin = radius * 0.28 + (arm * (Math.PI * 2)) / 3;
      const scatter = (Math.random() - 0.5) * (1.2 + radius * 0.08);
      positions[i3] = Math.cos(spin) * radius + scatter;
      positions[i3 + 1] = (Math.random() - 0.5) * 1.3;
      positions[i3 + 2] = Math.sin(spin) * radius + scatter;
    } else {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 24 + Math.random() * 38;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi);
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
  }

  const galaxyGeo = new THREE.BufferGeometry();
  galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  galaxyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const galaxyMat = new THREE.PointsMaterial({
    size: 0.18,
    map: glowTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  disposables.push(galaxyGeo, galaxyMat);

  const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
  galaxyPoints.position.set(-8, 7, -24);
  galaxyPoints.rotation.x = 0.46;
  galaxyPoints.rotation.z = -0.24;
  group.add(galaxyPoints);

  // 4. Scattered Heart-Shaped Stars
  const heartStarTex = getOrCreateHeartStarTexture();
  const heartCount = 140;
  const hPos = new Float32Array(heartCount * 3);
  const hCol = new Float32Array(heartCount * 3);
  for (let i = 0; i < heartCount; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 13 + Math.random() * 32;
    hPos[i3] = r * Math.sin(phi) * Math.cos(theta);
    hPos[i3 + 1] = Math.abs(r * Math.cos(phi)) - 1.5;
    hPos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }

  const heartGeo = new THREE.BufferGeometry();
  heartGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  heartGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));

  const heartMat = new THREE.PointsMaterial({
    size: 0.46,
    map: heartStarTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  disposables.push(heartGeo, heartMat);

  const heartStarPoints = new THREE.Points(heartGeo, heartMat);
  group.add(heartStarPoints);

  // 5. Realistic Rocky Asteroid Belt
  const asteroidCluster = new THREE.Group();
  const rockGeo = new THREE.DodecahedronGeometry(0.065, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8c857d'),
    roughness: 0.92,
    metalness: 0.08,
  });
  disposables.push(rockGeo, rockMat);

  for (let i = 0; i < 32; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const angle = (i / 32) * Math.PI * 2;
    const rad = 5.4 + (i % 4) * 0.2;
    rock.position.set(
      Math.cos(angle) * rad,
      ((i % 5) - 2) * 0.09,
      Math.sin(angle) * rad
    );
    const scale = 0.5 + ((i * 11) % 10) * 0.08;
    rock.scale.set(scale * 1.25, scale * 0.8, scale);
    rock.rotation.set(i * 0.7, i * 1.1, i * 0.4);
    asteroidCluster.add(rock);
  }
  group.add(asteroidCluster);

  // 6. Periodic Meteors / Shooting Stars
  const meteors: MeteorParticle[] = [];
  const trailGeo = new THREE.ConeGeometry(0.036, 2.5, 6);
  trailGeo.rotateX(Math.PI / 2);
  trailGeo.translate(0, 0, -1.25);
  const headGeo = new THREE.SphereGeometry(0.058, 6, 6);
  disposables.push(trailGeo, headGeo);

  for (let i = 0; i < 4; i++) {
    const meteorGroup = new THREE.Group();
    const trailMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.isDark ? '#ffeed1' : '#d97706'),
      transparent: true,
      opacity: 0,
      blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    const headMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.isDark ? '#ffffff' : palette.accent),
      transparent: true,
      opacity: 0,
      blending: palette.isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    disposables.push(trailMat, headMat);

    meteorGroup.add(new THREE.Mesh(trailGeo, trailMat), new THREE.Mesh(headGeo, headMat));
    meteorGroup.visible = false;
    group.add(meteorGroup);

    meteors.push({
      group: meteorGroup,
      trailMat,
      headMat,
      velocity: new THREE.Vector3(),
      active: false,
      age: 0,
      maxAge: 1.6,
      cooldown: 1.5 + i * 2.4,
    });
  }

  const updateMeteors = (deltaSec: number, reducedMotion: boolean) => {
    if (reducedMotion) return;
    for (const m of meteors) {
      if (!m.active) {
        m.cooldown -= deltaSec;
        if (m.cooldown <= 0) {
          m.active = true;
          m.age = 0;
          m.maxAge = 1.3 + Math.random() * 0.8;
          const side = Math.random() > 0.5 ? 1 : -1;
          m.group.position.set(
            side * (14 + Math.random() * 12),
            6 + Math.random() * 8,
            -12 - Math.random() * 16
          );
          m.velocity.set(
            -side * (10 + Math.random() * 6),
            -(3.2 + Math.random() * 2.8),
            (Math.random() - 0.3) * 4
          );
          m.group.lookAt(m.group.position.clone().add(m.velocity));
          m.group.visible = true;
        }
      } else {
        m.age += deltaSec;
        if (m.age >= m.maxAge) {
          m.active = false;
          m.group.visible = false;
          m.cooldown = 3.0 + Math.random() * 5.0;
          continue;
        }
        m.group.position.addScaledVector(m.velocity, deltaSec);
        const progress = m.age / m.maxAge;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        m.trailMat.opacity = Math.max(0, alpha * 0.72);
        m.headMat.opacity = Math.max(0, alpha * 0.95);
      }
    }
  };

  const applyThemeColors = (next: UniverseThemePalette3D) => {
    const nextAccent = cssColorToThree(next.accent);
    const nextPurple = cssColorToThree(next.purple);
    const nextInfo = cssColorToThree(next.info);
    const nextWarning = cssColorToThree(next.warning);
    const isDark = next.isDark;

    sunMat.emissiveIntensity = isDark ? 0.92 : 1.08;

    sunHaloMat.color.set(isDark ? SOLAR_SUN_PALETTE.coreHex : SOLAR_SUN_PALETTE.midHex);
    sunHaloMat.opacity = isDark ? 0.74 : 0.66;
    sunHaloMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    sunHaloMat.needsUpdate = true;

    sunOuterHaloMat.color.set(isDark ? SOLAR_SUN_PALETTE.midHex : SOLAR_SUN_PALETTE.flareHex);
    sunOuterHaloMat.opacity = isDark ? 0.34 : 0.28;
    sunOuterHaloMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    sunOuterHaloMat.needsUpdate = true;

    // Theme-harmonized orbital tracks (gentle amethyst-slate in Light, luminous mist in Dark)
    const lightOrbitTint = cssColorToThree(next.textSecondary).lerp(nextPurple, 0.32);
    orbitMaterials.forEach((mat) => {
      if (isDark) {
        mat.color.set('#94a3b8');
        mat.opacity = 0.16;
      } else {
        mat.color.copy(lightOrbitTint);
        mat.opacity = 0.24;
      }
    });

    // Update Starfield & Galaxy Contrast (twinkling celestial jewels in Light instead of grey soot)
    galaxyMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    galaxyMat.size = isDark ? 0.18 : 0.14;
    galaxyMat.opacity = isDark ? 0.88 : 0.68;
    galaxyMat.needsUpdate = true;

    const starColorAttr = galaxyGeo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < starCount; i++) {
      const s = starSeeds[i];
      if (isDark) {
        if (i < 750) {
          const mix = new THREE.Color('#9fb7d9').lerp(
            i % 3 === 0 ? new THREE.Color('#ffe4b5') : nextPurple,
            s * 0.45
          );
          starColorAttr.setXYZ(i, mix.r, mix.g, mix.b);
        } else {
          starColorAttr.setXYZ(i, s > 0.7 ? 1.0 : 0.88, 0.92, s < 0.3 ? 1.0 : 0.94);
        }
      } else {
        const jewelBase =
          i % 3 === 0 ? nextAccent.clone() : i % 3 === 1 ? nextInfo.clone() : nextPurple.clone();
        const mix = jewelBase.lerp(nextWarning, s * 0.25);
        starColorAttr.setXYZ(i, mix.r, mix.g, mix.b);
      }
    }
    starColorAttr.needsUpdate = true;

    // Update Heart-Stars
    heartMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    heartMat.size = isDark ? 0.46 : 0.42;
    heartMat.opacity = isDark ? 0.86 : 0.78;
    heartMat.needsUpdate = true;

    const heartColorAttr = heartGeo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < heartCount; i++) {
      const tint = isDark
        ? new THREE.Color('#fff5f7').lerp(nextAccent, 0.45 + ((i * 7) % 10) * 0.04)
        : nextAccent.clone().lerp(nextPurple, ((i * 7) % 10) * 0.045);
      heartColorAttr.setXYZ(i, tint.r, tint.g, tint.b);
    }
    heartColorAttr.needsUpdate = true;

    // Update Asteroid Belt tone (warm sunlit sandstone in Light Mode)
    rockMat.color.set(isDark ? '#8c857d' : '#a88c72');
    rockMat.emissive.set(isDark ? '#000000' : '#785a40');
    rockMat.emissiveIntensity = isDark ? 0 : 0.22;

    // Update Meteor Contrast
    meteors.forEach((m) => {
      m.trailMat.color.set(isDark ? '#ffeed1' : SOLAR_SUN_PALETTE.midHex);
      m.trailMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.trailMat.needsUpdate = true;
      m.headMat.color.set(isDark ? '#ffffff' : nextAccent);
      m.headMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.headMat.needsUpdate = true;
    });
  };

  // Initial sync for Light vs Dark mode
  applyThemeColors(palette);

  return {
    group,
    sunMesh,
    sunLight,
    galaxyPoints,
    heartStarPoints,
    asteroidCluster,
    updateMeteors,
    updatePalette: applyThemeColors,
    disposables,
  };
}
