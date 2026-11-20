import * as THREE from 'three';

export const WORLD_UNIT = 1 / 32; // 32px = 1.0 Three.js unit (hero 32x56 = 1.0 x 1.75 units)

export function worldX(x: number): number {
  return x * WORLD_UNIT;
}

export function worldY(y: number): number {
  return -y * WORLD_UNIT;
}

let cachedSoftwareWebGL: boolean | null = null;

export function detectSoftwareWebGL(): boolean {
  if (cachedSoftwareWebGL !== null) return cachedSoftwareWebGL;
  if (typeof document === 'undefined') return true;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) {
      cachedSoftwareWebGL = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareWebGL = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareWebGL;
  } catch {
    cachedSoftwareWebGL = true;
    return true;
  }
}

let sharedToonGradient: THREE.DataTexture | null = null;

export function getToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  // 4 crisp cel-shading steps (shadow, mid-dark, mid-light, highlight)
  const bands = new Uint8Array([
    82, 82, 82, 255,
    145, 145, 145, 255,
    210, 210, 210, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(bands, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedToonGradient = tex;
  return tex;
}

export function makeToonMaterial(
  color: THREE.ColorRepresentation,
  options: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
    map?: THREE.Texture | null;
  } = {}
): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    map: options.map ?? null,
  });
}

const outlineMaterials = new Map<string, THREE.MeshBasicMaterial>();

export function getOutlineMaterial(color = '#070913'): THREE.MeshBasicMaterial {
  let mat = outlineMaterials.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
    });
    outlineMaterials.set(color, mat);
  }
  return mat;
}

export function addCelOutline(
  mesh: THREE.Mesh,
  thickness = 1.07,
  color = '#070913'
): THREE.Mesh {
  const outline = new THREE.Mesh(mesh.geometry, getOutlineMaterial(color));
  outline.scale.setScalar(thickness);
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.userData.isOutline = true;
  mesh.add(outline);
  return outline;
}

export type ProceduralTextureKind =
  | 'asphalt'
  | 'bricks'
  | 'metal'
  | 'pipe'
  | 'conveyor'
  | 'crate'
  | 'windows'
  | 'shadow';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getProceduralTexture(
  kind: ProceduralTextureKind,
  baseColor = '#1e293b',
  accentColor = '#38bdf8',
  maxAnisotropy = 4
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${kind}:${baseColor}:${accentColor}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = kind === 'windows' ? 128 : kind === 'shadow' ? 64 : 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (kind === 'asphalt') {
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = baseColor;
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        if (((x + y) >> 2) % 2 === 0) ctx.fillRect(x, y, 4, 4);
      }
    }
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 19) % size, (i * 29) % size, 2, 2);
    }
    ctx.fillStyle = accentColor;
    ctx.fillRect(8, 28, 20, 4);
    ctx.fillRect(40, 28, 16, 4);
  } else if (kind === 'bricks') {
    ctx.fillStyle = '#090b13';
    ctx.fillRect(0, 0, size, size);
    const rows = 4;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : size / 4;
      for (let c = -1; c < 3; c++) {
        const bx = c * (size / 2) + offset;
        const by = r * rowH;
        ctx.fillStyle = baseColor;
        ctx.fillRect(bx + 1, by + 1, size / 2 - 3, rowH - 3);
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.22)';
        ctx.fillRect(bx + 1, by + 1, size / 2 - 3, rowH - 3);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(bx + 1, by + 1, size / 2 - 3, 2);
        ctx.fillStyle = accentColor;
        ctx.fillRect(bx + 3, by + 2, 4, 2);
      }
    }
  } else if (kind === 'metal') {
    ctx.fillStyle = '#1b2234';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 6, size, size - 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, size, 8);
    ctx.fillRect(0, size - 8, size, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(size, size - 8);
    ctx.moveTo(size, 8);
    ctx.lineTo(0, size - 8);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    for (const rx of [6, size - 8]) {
      for (const ry of [12, size - 14]) {
        ctx.fillRect(rx, ry, 4, 4);
      }
    }
  } else if (kind === 'pipe') {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.28, accentColor);
    g.addColorStop(0.55, '#475569');
    g.addColorStop(1, '#090d16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(size / 2 - 2, 0, 4, size);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(size / 2 - 4, 4, 2, size - 8);
  } else if (kind === 'conveyor') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 4, size, size - 8);
    ctx.fillStyle = accentColor;
    for (let x = 4; x < size; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x + 10, size / 2);
      ctx.lineTo(x, size - 12);
      ctx.lineTo(x + 6, size - 12);
      ctx.lineTo(x + 16, size / 2);
      ctx.lineTo(x + 6, 12);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'crate') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(8, 8, size - 16, size - 16);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(size - 6, size - 6);
    ctx.moveTo(size - 6, 6);
    ctx.lineTo(6, size - 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(8, 8, size - 16, 4);
  } else if (kind === 'windows') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    for (let y = 8; y < size - 8; y += 16) {
      for (let x = 8; x < size - 8; x += 16) {
        const hash = (x * 7 + y * 13) % 11;
        ctx.fillStyle = hash < 3 ? accentColor : hash < 6 ? '#0f172a' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y, 8, 10);
      }
    }
  } else if (kind === 'shadow') {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.32)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = kind === 'shadow' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = kind === 'shadow' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function disposeMaterialTree(obj: THREE.Object3D): void {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),skeletons=new Set<THREE.Skeleton>();
  obj.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if(mesh.isSkinnedMesh&&mesh.skeleton&&!skeletons.has(mesh.skeleton)){
      skeletons.add(mesh.skeleton);mesh.skeleton.dispose();
    }
    if (mesh.geometry && !mesh.userData.sharedGeometry&&!geometries.has(mesh.geometry)) {
      geometries.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    if (mesh.material && !mesh.userData.isOutline) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m.userData?.sharedMaterial&&!materials.has(m)){materials.add(m);m.dispose();}
      }
    }
  });
}
