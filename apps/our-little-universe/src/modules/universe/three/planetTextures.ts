import * as THREE from 'three';
import { SOLAR_PLANET_APPEARANCES, SOLAR_SUN_PALETTE } from './solarCatalog';
import type { PlanetSurfaceStyle } from './types';

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let value = 0;
  let amp = 0.54;
  let freq = 1;
  for (let i = 0; i < 3; i++) {
    value += amp * smoothNoise(x * freq, y * freq, seed + i * 17);
    freq *= 2.15;
    amp *= 0.46;
  }
  return value;
}

const planetTextureCache = new Map<
  PlanetSurfaceStyle,
  { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }
>();

/**
 * Generates (and caches) organic astronomical planetary textures without zebra striping.
 * Keeping resolution at crisp 384x192 cuts initial CPU synthesis cost by 4x and keeps GPU lean.
 */
export function getOrCreateSolarPlanetTextures(style: PlanetSurfaceStyle): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const cached = planetTextureCache.get(style);
  if (cached) return cached;

  const width = 384;
  const height = 192;
  const appearance = SOLAR_PLANET_APPEARANCES[style];

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = width;
  mapCanvas.height = height;
  const ctx = mapCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  const c1 = new THREE.Color(appearance.primaryHex);
  const c2 = new THREE.Color(appearance.secondaryHex);
  const cDetail = new THREE.Color(appearance.detailHex);

  const imgData = ctx.createImageData(width, height);
  const bumpData = bCtx.createImageData(width, height);
  const seed = style.charCodeAt(0) * 19 + style.length * 13;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    const poleDist = Math.abs(v - 0.5) * 2;

    for (let px = 0; px < width; px++) {
      const u = px / width;
      const nx = Math.cos(u * Math.PI * 2) * 2.0 + 3.4;
      const ny = Math.sin(u * Math.PI * 2) * 2.0 + 3.4;
      const nz = v * 4.0;

      const base = fbm(nx + nz * 0.35, ny + nz * 0.3, seed);
      const detail = fbm(nx * 2.6 + 1.1, ny * 2.6 + nz * 1.3, seed + 47);

      const pixel = new THREE.Color();
      let elevation = base * 0.65 + detail * 0.35;

      if (appearance.kind === 'terrestrial') {
        if (poleDist > 0.87 - detail * 0.08) {
          pixel.copy(cDetail);
          elevation = 0.82;
        } else if (elevation > 0.51) {
          const landMix = Math.min(1, (elevation - 0.51) / 0.32);
          pixel.copy(c2).lerp(cDetail, landMix * 0.28);
        } else {
          const oceanDepth = elevation / 0.51;
          pixel.copy(c1).multiplyScalar(0.58 + oceanDepth * 0.5);
          elevation = 0.2;
        }
      } else if (appearance.kind === 'swirl_giant') {
        // Smooth domain-warped organic marble turbulence (zero horizontal zebra stripes)
        const swirl = fbm(nx + detail * 1.8, ny + base * 1.8 + nz * 0.45, seed + 83);
        const mix = Math.min(1, Math.max(0, base * 0.5 + swirl * 0.5));
        pixel.copy(c2).lerp(c1, mix);
        if (mix > 0.68) {
          pixel.lerp(cDetail, (mix - 0.68) * 1.35);
        }
        elevation = 0.35 + mix * 0.4;
      } else {
        const rocky = Math.min(1, Math.max(0, elevation));
        pixel.copy(c2).lerp(c1, rocky);
        if (rocky > 0.65) {
          pixel.lerp(cDetail, (rocky - 0.65) * 1.2);
        }
      }

      const idx = (py * width + px) * 4;
      imgData.data[idx] = Math.round(pixel.r * 255);
      imgData.data[idx + 1] = Math.round(pixel.g * 255);
      imgData.data[idx + 2] = Math.round(pixel.b * 255);
      imgData.data[idx + 3] = 255;

      const bumpByte = Math.round(Math.min(1, Math.max(0, elevation)) * 255);
      bumpData.data[idx] = bumpByte;
      bumpData.data[idx + 1] = bumpByte;
      bumpData.data[idx + 2] = bumpByte;
      bumpData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);

  if (appearance.kind === 'lunar' || appearance.kind === 'rocky') {
    const craterCount = appearance.kind === 'lunar' ? 46 : 32;
    for (let i = 0; i < craterCount; i++) {
      const cx = hash2D(i, 2, seed) * width;
      const cy = 14 + hash2D(i, 3, seed) * (height - 28);
      const cr = 2.5 + Math.pow(hash2D(i, 4, seed), 2) * 14;

      const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      bowl.addColorStop(0, 'rgba(0,0,0,0.34)');
      bowl.addColorStop(0.75, 'rgba(0,0,0,0.14)');
      bowl.addColorStop(0.92, 'rgba(255,255,255,0.22)');
      bowl.addColorStop(1, 'transparent');
      ctx.fillStyle = bowl;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();

      const bBowl = bCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      bBowl.addColorStop(0, 'rgba(18,18,18,0.65)');
      bBowl.addColorStop(0.9, 'rgba(240,240,240,0.6)');
      bBowl.addColorStop(1, 'transparent');
      bCtx.fillStyle = bBowl;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (appearance.kind === 'terrestrial' || appearance.kind === 'swirl_giant') {
    for (let i = 0; i < 14; i++) {
      const wx = hash2D(i, 9, seed) * width;
      const wy = 14 + hash2D(i, 10, seed) * (height - 28);
      const wr = 16 + hash2D(i, 11, seed) * 34;
      const wisp = ctx.createRadialGradient(wx, wy, 1, wx, wy, wr);
      wisp.addColorStop(0, 'rgba(255,255,255,0.2)');
      wisp.addColorStop(1, 'transparent');
      ctx.fillStyle = wisp;
      ctx.beginPath();
      ctx.ellipse(wx, wy, wr, wr * 0.34, 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(mapCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 2;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const pair = { map, bumpMap };
  planetTextureCache.set(style, pair);
  return pair;
}

let cachedSunTexture: THREE.CanvasTexture | null = null;

export function getOrCreateSunPhotosphereTexture(): THREE.CanvasTexture {
  if (cachedSunTexture) return cachedSunTexture;
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);

  const cCore = new THREE.Color(SOLAR_SUN_PALETTE.coreHex);
  const cMid = new THREE.Color(SOLAR_SUN_PALETTE.midHex);
  const cFlare = new THREE.Color(SOLAR_SUN_PALETTE.flareHex);

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const nx = Math.cos(u * Math.PI * 2) * 3.0 + 4.0;
      const ny = Math.sin(u * Math.PI * 2) * 3.0 + 4.0;
      const n = fbm(nx + v * 3.5, ny + v * 3.5, 91);

      const pixel = new THREE.Color();
      if (n < 0.44) {
        pixel.copy(cFlare).lerp(cMid, n / 0.44);
      } else {
        pixel.copy(cMid).lerp(cCore, (n - 0.44) / 0.56);
      }

      const idx = (py * width + px) * 4;
      img.data[idx] = Math.round(pixel.r * 255);
      img.data[idx + 1] = Math.round(pixel.g * 255);
      img.data[idx + 2] = Math.round(pixel.b * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  cachedSunTexture = new THREE.CanvasTexture(canvas);
  cachedSunTexture.wrapS = THREE.RepeatWrapping;
  cachedSunTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedSunTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedSunTexture;
}

export function createRealisticPlanetaryRingTexture(ringHex = '#d6c39c'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const col = new THREE.Color(ringHex);
  const hex = `#${col.getHexString()}`;

  for (let r = half * 0.46; r <= half * 0.94; r += 1.5) {
    const t = (r - half * 0.46) / (half * 0.48);
    const gap = Math.abs(t - 0.62) < 0.045 ? 0.08 : 1;
    const density = (0.3 + 0.45 * Math.sin(t * Math.PI * 7) * Math.sin(t * Math.PI)) * gap;
    ctx.strokeStyle = hex;
    ctx.globalAlpha = Math.max(0.05, Math.min(0.65, density));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(half, half, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let cachedGlowTexture: THREE.CanvasTexture | null = null;

export function getOrCreateSoftGlowTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.24, 'rgba(255, 255, 255, 0.58)');
  grad.addColorStop(0.58, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  cachedGlowTexture = new THREE.CanvasTexture(canvas);
  cachedGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedGlowTexture;
}

let cachedHeartTexture: THREE.CanvasTexture | null = null;

export function getOrCreateHeartStarTexture(): THREE.CanvasTexture {
  if (cachedHeartTexture) return cachedHeartTexture;
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const halo = ctx.createRadialGradient(size / 2, size / 2, 3, size / 2, size / 2, size / 2);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  halo.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2 + 3);
  const s = 1.42;
  ctx.beginPath();
  ctx.moveTo(0, 12 * s);
  ctx.bezierCurveTo(-18 * s, 2 * s, -22 * s, -14 * s, -10 * s, -16 * s);
  ctx.bezierCurveTo(-3 * s, -17 * s, 0, -10 * s, 0, -8 * s);
  ctx.bezierCurveTo(0, -10 * s, 3 * s, -17 * s, 10 * s, -16 * s);
  ctx.bezierCurveTo(22 * s, -14 * s, 18 * s, 2 * s, 0, 12 * s);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  cachedHeartTexture = new THREE.CanvasTexture(canvas);
  cachedHeartTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedHeartTexture;
}

export function createOnPlanetTitleTexture(
  title: string,
  isLocked: boolean
): THREE.CanvasTexture {
  const width = 384;
  const height = 84;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const label = title.slice(0, 22);
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp subtle dark outline keeps white on-planet text readable on bright Light Mode planets
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = isLocked ? 'rgba(15, 23, 42, 0.52)' : 'rgba(15, 23, 42, 0.72)';
  ctx.strokeText(label, width / 2, height / 2);

  ctx.shadowColor = 'rgba(15, 23, 42, 0.55)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = isLocked ? 'rgba(248, 250, 252, 0.76)' : '#ffffff';
  ctx.fillText(label, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
