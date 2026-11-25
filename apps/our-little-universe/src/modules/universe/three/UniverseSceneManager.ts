import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildSolarEnvironment, type SolarEnvironment } from './hologramTableBuilder';
import { buildPlanetAssembly, type PlanetAssembly } from './planetFactory';
import { readThemeTokensFor3D } from './themeTokenBridge';
import type { PlanetNodeSpec, UniverseSceneCallbacks, UniverseThemePalette3D } from './types';

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 10.2, 20.5);
const DEFAULT_TARGET_POS = new THREE.Vector3(0, 0.25, 0);

const IDLE_FPS_MS = 1000 / 50; // Smooth 50fps ceiling (cuts high-Hz GPU burn while staying silky)
const ACTIVE_FPS_MS = 1000 / 60;

/**
 * Low-Overhead Three.js WebGL Solar System Controller.
 * Eliminates heavy multi-pass postprocessing shaders, throttles idle FPS cleanly,
 * and auto-pauses when the tab is hidden or stage is scrolled off-screen.
 */
export class UniverseSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-99, -99);
  private pointerDownPos = { x: 0, y: 0 };

  private palette: UniverseThemePalette3D;
  private env: SolarEnvironment;
  private ambientLight: THREE.AmbientLight;
  private rimFill: THREE.HemisphereLight;
  private daylightFill: THREE.DirectionalLight;
  private planets: PlanetAssembly[] = [];
  private planetGroup = new THREE.Group();

  private callbacks: UniverseSceneCallbacks;
  private hoveredKey: string | null = null;
  private selectedKey: string | null = null;
  private autoRotateEnabled = true;
  private reducedMotion = false;
  private isInteracting = false;
  private isVisible = true;
  private lastRenderTime = 0;

  private camTransition: {
    active: boolean;
    endPos: THREE.Vector3;
    endTarget: THREE.Vector3;
  } = {
    active: false,
    endPos: DEFAULT_CAMERA_POS.clone(),
    endTarget: DEFAULT_TARGET_POS.clone(),
  };

  private animFrameId: number | null = null;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private disposed = false;

  constructor(
    container: HTMLElement,
    specs: PlanetNodeSpec[],
    callbacks: UniverseSceneCallbacks,
    reducedMotion = false
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.reducedMotion = reducedMotion;
    this.autoRotateEnabled = !reducedMotion;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    this.palette = readThemeTokensFor3D();
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 220);
    this.camera.position.copy(DEFAULT_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.palette.isDark ? 1.05 : 1.12;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Theme-Aware Space Lighting (prevents dark underside shadows in Light Mode)
    this.ambientLight = new THREE.AmbientLight(
      this.palette.isDark ? 0xdbeafe : 0xfff8f2,
      this.palette.isDark ? 0.36 : 0.95
    );
    this.scene.add(this.ambientLight);

    this.rimFill = new THREE.HemisphereLight(
      this.palette.isDark ? 0x93c5fd : 0xe0ecff,
      this.palette.isDark ? 0x0b0f19 : 0xf5e8ff,
      this.palette.isDark ? 0.26 : 0.8
    );
    this.scene.add(this.rimFill);

    this.daylightFill = new THREE.DirectionalLight(
      0xfff7ed,
      this.palette.isDark ? 0.22 : 0.78
    );
    this.daylightFill.position.set(6, 14, 18);
    this.scene.add(this.daylightFill);

    // Calm OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(DEFAULT_TARGET_POS);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 38;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.autoRotate = this.autoRotateEnabled;
    this.controls.autoRotateSpeed = 0.28;

    this.controls.addEventListener('start', () => {
      this.camTransition.active = false;
      this.isInteracting = true;
    });
    this.controls.addEventListener('end', () => {
      this.isInteracting = false;
    });

    // Build Solar Environment + Planets
    this.env = buildSolarEnvironment(specs, this.palette);
    this.scene.add(this.env.group);
    this.scene.add(this.planetGroup);

    this.syncPlanets(specs);

    // Interaction Listeners
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.isVisible = Boolean(entries[0]?.isIntersecting);
      },
      { threshold: 0.05 }
    );
    this.intersectionObserver.observe(this.container);

    this.animate(performance.now());
  }

  public syncPlanets(specs: PlanetNodeSpec[]): void {
    this.planets.forEach((p) => {
      this.planetGroup.remove(p.root);
      p.disposables.forEach((d) => d.dispose());
    });
    this.planets = [];

    specs.forEach((spec, idx) => {
      const assembly = buildPlanetAssembly(spec, idx * 0.9, this.palette);
      this.planets.push(assembly);
      this.planetGroup.add(assembly.root);
    });
  }

  public refreshTheme(): void {
    this.palette = readThemeTokensFor3D();
    const isDark = this.palette.isDark;

    this.renderer.toneMappingExposure = isDark ? 1.05 : 1.12;
    this.ambientLight.color.setHex(isDark ? 0xdbeafe : 0xfff8f2);
    this.ambientLight.intensity = isDark ? 0.36 : 0.95;

    this.rimFill.color.setHex(isDark ? 0x93c5fd : 0xe0ecff);
    this.rimFill.groundColor.setHex(isDark ? 0x0b0f19 : 0xf5e8ff);
    this.rimFill.intensity = isDark ? 0.26 : 0.8;

    this.daylightFill.intensity = isDark ? 0.22 : 0.78;

    this.env.updatePalette(this.palette);
    this.planets.forEach((p) => p.updatePalette(this.palette));
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotateEnabled = enabled && !this.reducedMotion;
    this.controls.autoRotate = this.autoRotateEnabled;
  }

  public zoomBy(scaleFactor: number): void {
    this.camTransition.active = false;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const nextDist = THREE.MathUtils.clamp(
      offset.length() * scaleFactor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    offset.setLength(nextDist);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  public resetCamera(): void {
    this.selectedKey = null;
    this.camTransition = {
      active: true,
      endPos: DEFAULT_CAMERA_POS.clone(),
      endTarget: DEFAULT_TARGET_POS.clone(),
    };
  }

  public focusPlanet(moduleKey: string): void {
    const targetPlanet = this.planets.find((p) => p.spec.moduleKey === moduleKey);
    if (!targetPlanet) return;

    this.selectedKey = moduleKey;
    const targetVec = new THREE.Vector3(
      targetPlanet.spec.position[0],
      targetPlanet.baseY,
      targetPlanet.spec.position[2]
    );
    const dir = targetVec.clone().setY(0).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);

    const endPos = targetVec
      .clone()
      .add(dir.multiplyScalar(4.8))
      .add(new THREE.Vector3(0, 2.2, 0));

    this.camTransition = {
      active: true,
      endPos,
      endTarget: targetVec,
    };
  }

  private handleVisibilityChange = (): void => {
    if (!document.hidden && !this.disposed) {
      this.clock.getDelta();
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 240);
    const height = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private pickPlanetModuleKey(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitMeshes = this.planets.map((p) => p.hitMesh);
    const intersects = this.raycaster.intersectObjects(hitMeshes, false);
    if (intersects.length > 0) {
      return (intersects[0].object.userData.moduleKey as string) || null;
    }
    return null;
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const nextHover = this.pickPlanetModuleKey(e.clientX, e.clientY);
    if (nextHover !== this.hoveredKey) {
      this.hoveredKey = nextHover;
      this.renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
      this.callbacks.onHoverPlanet?.(nextHover);
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isInteracting = true;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.isInteracting = false;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (dx * dx + dy * dy > 36) return;

    const clickedKey = this.pickPlanetModuleKey(e.clientX, e.clientY);
    if (!clickedKey) return;

    if (this.selectedKey === clickedKey) {
      this.callbacks.onEnterPlanet?.(clickedKey);
    } else {
      this.focusPlanet(clickedKey);
      this.callbacks.onSelectPlanet?.(clickedKey);
    }
  };

  private handlePointerLeave = (): void => {
    this.isInteracting = false;
    if (this.hoveredKey !== null) {
      this.hoveredKey = null;
      this.renderer.domElement.style.cursor = 'default';
      this.callbacks.onHoverPlanet?.(null);
    }
  };

  private animate = (nowMs: number): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    if (document.hidden || !this.isVisible) {
      return;
    }

    const minFrameMs =
      this.isInteracting || this.camTransition.active || this.hoveredKey !== null
        ? ACTIVE_FPS_MS
        : IDLE_FPS_MS;

    if (nowMs - this.lastRenderTime < minFrameMs) {
      return;
    }
    this.lastRenderTime = nowMs;

    const deltaSec = Math.min(this.clock.getDelta(), 0.12);
    const elapsed = this.clock.elapsedTime;
    const motionScale = this.reducedMotion ? 0 : 1;

    if (this.camTransition.active) {
      this.camera.position.lerp(this.camTransition.endPos, 0.08);
      this.controls.target.lerp(this.camTransition.endTarget, 0.095);
      if (this.camera.position.distanceTo(this.camTransition.endPos) < 0.06) {
        this.camTransition.active = false;
      }
    }

    // Graceful, silky rotation of Sun, spiral galaxy, heart-stars, and rocky asteroid belt
    this.env.sunMesh.rotation.y += deltaSec * 0.12 * motionScale;
    this.env.galaxyPoints.rotation.y = elapsed * 0.011 * motionScale;
    this.env.heartStarPoints.rotation.y = -elapsed * 0.008 * motionScale;
    this.env.asteroidCluster.rotation.y = elapsed * 0.025 * motionScale;

    this.env.updateMeteors(deltaSec, this.reducedMotion);

    // Smooth planet float & axial spin
    this.planets.forEach((p) => {
      const isHighlighted =
        this.hoveredKey === p.spec.moduleKey || this.selectedKey === p.spec.moduleKey;

      const bobOffset = Math.sin(elapsed * 0.72 + p.phaseOffset) * 0.08 * motionScale;
      const targetY = p.baseY + bobOffset + (isHighlighted ? 0.14 : 0);
      p.sphere.position.y = THREE.MathUtils.lerp(p.sphere.position.y, targetY, 0.12);
      p.hitMesh.position.y = p.sphere.position.y;
      p.labelSprite.position.y = p.sphere.position.y;

      if (p.saturnRing) {
        p.saturnRing.position.y = p.sphere.position.y;
        p.saturnRing.rotation.z = elapsed * 0.09 * motionScale;
      }

      p.sphere.rotation.y += deltaSec * 0.15 * motionScale;

      const targetScale = isHighlighted ? 1.12 : 1.0;
      const s = THREE.MathUtils.lerp(p.sphere.scale.x, targetScale, 0.12);
      p.sphere.scale.setScalar(s);
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.disposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);

    this.planets.forEach((p) => p.disposables.forEach((d) => d.dispose()));
    this.env.disposables.forEach((d) => d.dispose());

    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
