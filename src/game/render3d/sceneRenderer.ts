import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {loadRenModel,createRenModelInstance} from './renModel';
import type {
  BossRuntime,
  CeilingPipe,
  CharacterId,
  DestructibleProp,
  Enemy,
  PickupItem,
  Platform,
  StagePalette,
} from '../types';
import type { HeroPose } from '../heroAnimation';
import {
  WORLD_UNIT,
  detectSoftwareWebGL,
  disposeMaterialTree,
  getProceduralTexture,
  makeToonMaterial,
  worldX,
  worldY,
} from './materials';
import {
  HumanoidRigParts,
  buildBossRig3D,
  buildEnemyRig3D,
  buildHeroRig3D,
  updateBossRig3D,
  updateEnemyRig3D,
  updateHeroRig3D,
} from './characterRig3d';
import {
  DebrisShard3D,
  PlatformVisual3D,
  PropVisual3D,
  buildCeilingPipe3D,
  buildPickupMesh3D,
  buildPlatform3D,
  buildProp3D,
  propColorForDebris,
} from './worldGeometry3d';

export interface RenderBullet3D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  isWindBlade?: boolean;
  reflectable?: boolean;
}

export interface RenderParticle3D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface RenderState3D {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  stageId: number;
  substageId: string;
  palette: StagePalette;
  cameraX: number;
  cameraY: number;
  shakeAmount: number;
  sectorOffsetX: number;
  sectorDirection?: 'forward' | 'backward' | null;
  tickCount: number;
  tickAlpha?: number;
  dt: number;
  campaignMode: boolean;
  checkpointId: string;
  checkpoints: { id: string; x: number; y: number }[];
  exits: { id: string; x: number; y: number; w: number; h: number }[];
  explorationNodes: { id: string; x: number; y: number; w: number; h: number }[];
  activatedNodes: Set<string>;
  platforms: Platform[];
  ceilingPipes: CeilingPipe[];
  props: DestructibleProp[];
  pickups: PickupItem[];
  enemies: Enemy[];
  thrownEnemies: { x: number; y: number; w: number; h: number }[];
  boss: BossRuntime;
  bullets: RenderBullet3D[];
  particles: RenderParticle3D[];
  mayaWell: { x: number; y: number; timer: number; radius: number } | null;
  leonFlameZone: { x: number; y: number; w: number; timer: number } | null;
  lowCeilingActive: boolean;
  lowCeilingKind: 'gantry' | 'sweeper';
  lowCeilingX: number;
  player: {
    characterId: CharacterId;
    pose: HeroPose;
    frame?: number;
    nextFrame?: number;
    frameAlpha?: number;
    elapsedTicks?: number;
    idleTicks?: number;
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    onWall: -1 | 0 | 1;
    grounded: boolean;
    isDashing: boolean;
    isSliding: boolean;
    isFlying: boolean;
    slashing: boolean;
    slashTimer: number;
    comboStep: number;
    invulnTimer: number;
    gstTimer: number;
    atkTimer: number;
    flameTimer: number;
    stunTimer: number;
    hp: number;
  };
  slashRange: number;
  accentColor: string;
  trailColor: string;
  lightningAlpha: number;
}

const _tmpVec = new THREE.Vector3();

export class WorldRenderer3D {
  public readonly isSoftwareGl: boolean;
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private bgGroup = new THREE.Group();
  private farTowers: { mesh: THREE.Mesh; baseOffset: number }[] = [];
  private midTowers: { mesh: THREE.Mesh; baseOffset: number }[] = [];

  private worldGroup = new THREE.Group();
  private actorsGroup = new THREE.Group();
  private fxGroup = new THREE.Group();

  private currentAreaSignature = '';
  private currentPaletteKey = '';
  private lastPlatformsRef: Platform[] | null = null;
  private lastPropsRef: DestructibleProp[] | null = null;

  private platformVisuals: PlatformVisual3D[] = [];
  private propVisuals: PropVisual3D[] = [];
  private checkpointFlags = new Map<string, THREE.Mesh>();
  private nodeIndicators = new Map<string, THREE.Mesh>();

  private heroRigs = new Map<CharacterId, HumanoidRigParts>();
  private heroShadow: THREE.Mesh;
  private heroSlashArc: THREE.Mesh;
  private heroFlightHalo: THREE.Mesh;

  private enemyRigs = new Map<number, { rig: HumanoidRigParts; type: Enemy['type']; hpBar: THREE.Mesh; stunRing: THREE.Group }>();
  private bossEntry: { id: string; rig: HumanoidRigParts; twinRig?: HumanoidRigParts; daggers: THREE.Group; shieldMesh: THREE.Mesh } | null = null;

  private pickupMeshes: THREE.Group[] = [];
  private bulletMeshes: THREE.Mesh[] = [];
  private thrownMeshes: THREE.Mesh[] = [];
  private particleMeshes: THREE.Mesh[] = [];
  private weatherPoints: THREE.Points | null = null;
  private weatherPositions: Float32Array | null = null;
  private debrisShards: DebrisShard3D[] = [];

  private mayaWellGroup: THREE.Group;
  private leonFlameMesh: THREE.Mesh;
  private hazardGantryGroup: THREE.Group;
  private hazardSweeperGroup: THREE.Group;

  private maxAnisotropy: number;
  private disposed = false;
  private pendingTimerId: number | null = null;
  private pendingRafId: number | null = null;

  // Shared unit geometries for pooled dynamic FX
  private sharedBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  private sharedSphereGeo = new THREE.SphereGeometry(0.5, 8, 6);
  private sharedBladeGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 12, Math.PI * 0.9);
  private sharedDebrisGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  private sharedShadowGeo = new THREE.PlaneGeometry(1.3, 0.45);
  private sharedShadowMat: THREE.MeshBasicMaterial;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#070510');
    this.scene.fog = new THREE.Fog('#120a24', 28, 72);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    const w = Math.max(1, container.clientWidth || window.innerWidth || 1280);
    const h = Math.max(1, container.clientHeight || window.innerHeight || 720);
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.5, 160);
    this.renderer.setSize(w, h, false);

    // 3-Point Studio / Urban Lighting Rig
    this.hemiLight = new THREE.HemisphereLight('#93c5fd', '#1e1b4b', 0.9);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#fff7ed', 1.65);
    this.keyLight.position.set(8, 16, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 48;
      const d = 16;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight('#38bdf8', 0.85);
    this.rimLight.position.set(-10, 6, -10);
    this.scene.add(this.rimLight);

    // Sky Backdrop Gradient Shader Plane (always pinned far behind world)
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#090418') },
        bottomColor: { value: new THREE.Color('#1d1035') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, clamp(vUv.y, 0.0, 1.0)), 1.0);
        }
      `,
      depthWrite: false,
      fog: false,
    });
    this.skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), this.skyMat);
    this.skyMesh.position.set(0, 0, -45);
    this.scene.add(this.skyMesh);

    this.scene.add(this.bgGroup);
    this.scene.add(this.worldGroup);
    this.scene.add(this.actorsGroup);
    this.scene.add(this.fxGroup);

    // Hero shared overlays (contact shadow, slash crescent, Maya flight halo)
    const shadowTex = getProceduralTexture('shadow', '#000', '#000', 1);
    this.sharedShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.heroShadow = new THREE.Mesh(this.sharedShadowGeo, this.sharedShadowMat);
    this.heroShadow.rotation.x = -Math.PI / 2;
    this.actorsGroup.add(this.heroShadow);

    this.heroSlashArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.14, 6, 16, Math.PI * 0.92),
      new THREE.MeshBasicMaterial({
        color: '#00f0ff',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    this.heroSlashArc.visible = false;
    this.fxGroup.add(this.heroSlashArc);

    this.heroFlightHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.045, 6, 18),
      new THREE.MeshBasicMaterial({
        color: '#00f0ff',
        transparent: true,
        opacity: 0.8,
      })
    );
    this.heroFlightHalo.visible = false;
    this.fxGroup.add(this.heroFlightHalo);

    // Partner Zones
    this.mayaWellGroup = new THREE.Group();
    const wellCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.4 })
    );
    this.mayaWellGroup.add(wellCore);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.1 + i * 0.85, 0.05, 6, 20),
        new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.65 })
      );
      this.mayaWellGroup.add(ring);
    }
    this.mayaWellGroup.visible = false;
    this.fxGroup.add(this.mayaWellGroup);

    this.leonFlameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.6, 2.2),
      new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.72 })
    );
    this.leonFlameMesh.visible = false;
    this.fxGroup.add(this.leonFlameMesh);

    // Stage 2 Monorail 3D Hazards
    this.hazardGantryGroup = this.buildHazardGantry();
    this.hazardGantryGroup.visible = false;
    this.fxGroup.add(this.hazardGantryGroup);

    this.hazardSweeperGroup = this.buildHazardSweeper();
    this.hazardSweeperGroup.visible = false;
    this.fxGroup.add(this.hazardSweeperGroup);

    // Prebuild hero rigs so switching heroes is instant
    for (const heroId of ['ren', 'maya', 'leon'] as const) {
      const rig = buildHeroRig3D(heroId);
      rig.root.visible = false;
      this.actorsGroup.add(rig.root);
      this.heroRigs.set(heroId, rig);
    }

    void loadRenModel().then(ready=>{
      if(!ready||this.disposed)return;
      const rig=createRenModelInstance();if(!rig)return;
      const previous=this.heroRigs.get('ren');
      if(previous){this.actorsGroup.remove(previous.root);disposeMaterialTree(previous.root);}
      rig.root.visible=false;this.actorsGroup.add(rig.root);this.heroRigs.set('ren',rig);
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildHazardGantry(): THREE.Group {
    const g = new THREE.Group();
    const wU = 130 * WORLD_UNIT;
    const hU = 110 * WORLD_UNIT;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, 2.8),
      makeToonMaterial('#facc15', { emissive: '#eab308', emissiveIntensity: 0.35 })
    );
    g.add(body);
    const darkMat = makeToonMaterial('#09090b');
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, hU * 0.85, 2.88), darkMat);
      stripe.position.x = i * 0.72;
      g.add(stripe);
    }
    const strutMat = makeToonMaterial('#334155');
    for (const sx of [-1.1, 1.1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8, 1.8), strutMat);
      strut.position.set(sx, hU / 2 + 4, 0);
      g.add(strut);
    }
    return g;
  }

  private buildHazardSweeper(): THREE.Group {
    const g = new THREE.Group();
    const wU = 78 * WORLD_UNIT;
    const hU = 38 * WORLD_UNIT;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(wU, hU, 2.5), makeToonMaterial('#18181b'));
    g.add(hull);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(wU + 0.1, 0.24, 2.6),
      makeToonMaterial('#dc2626', { emissive: '#ef4444', emissiveIntensity: 0.7 })
    );
    blade.position.y = hU * 0.25;
    g.add(blade);
    return g;
  }

  resize(width: number, height: number): void {
    if (this.disposed) return;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private rebuildSkyline(pal: StagePalette): void {
    const key = `${pal.skyTop}|${pal.skyBottom}|${pal.cityFar}|${pal.cityMid}|${pal.accentNeon}|${pal.secondaryNeon}|${pal.weather}`;
    if (key === this.currentPaletteKey) return;
    this.currentPaletteKey = key;

    this.skyMat.uniforms.topColor.value.set(pal.skyTop);
    this.skyMat.uniforms.bottomColor.value.set(pal.skyBottom);
    this.scene.background = new THREE.Color(pal.skyBottom);
    this.scene.fog = new THREE.Fog(pal.skyBottom, 28, 76);

    // Clear old city towers
    while (this.bgGroup.children.length > 0) {
      const c = this.bgGroup.children[0];
      this.bgGroup.remove(c);
      disposeMaterialTree(c);
    }
    this.farTowers = [];
    this.midTowers = [];

    const farTex = getProceduralTexture('windows', pal.cityFar, pal.accentNeon, this.maxAnisotropy);
    const midTex = getProceduralTexture('windows', pal.cityMid, pal.secondaryNeon, this.maxAnisotropy);
    const farMat = makeToonMaterial('#ffffff', { map: farTex });
    const midMat = makeToonMaterial('#ffffff', { map: midTex });

    for (let i = 0; i < 16; i++) {
      const bw = 4.6 + (i % 3) * 1.4;
      const bh = 10 + ((i * 7) % 14);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 4.0), farMat);
      mesh.position.set(0, -14 + bh / 2, -22 - (i % 2) * 3);
      this.bgGroup.add(mesh);
      this.farTowers.push({ mesh, baseOffset: i * 6.8 });
    }

    for (let i = 0; i < 14; i++) {
      const bw = 5.4 + (i % 2) * 1.8;
      const bh = 7.5 + ((i * 5) % 10);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 3.6), midMat);
      mesh.position.set(0, -14 + bh / 2, -10.5 - (i % 2) * 2.2);
      this.bgGroup.add(mesh);
      this.midTowers.push({ mesh, baseOffset: i * 8.2 });
    }

    // Weather points pool
    if (this.weatherPoints) {
      this.bgGroup.remove(this.weatherPoints);
      this.weatherPoints.geometry.dispose();
      (this.weatherPoints.material as THREE.Material).dispose();
      this.weatherPoints = null;
      this.weatherPositions = null;
    }
    if (pal.weather !== 'none' && pal.weather !== 'searchlights') {
      const count = 90;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 36;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = -2 - Math.random() * 14;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const wColor =
        pal.weather === 'sakura'
          ? '#f9a8d4'
          : pal.weather === 'spores'
            ? '#4ade80'
            : pal.weather === 'speedlines'
              ? '#fb923c'
              : pal.weather === 'stars'
                ? '#e0e7ff'
                : '#93c5fd';
      const mat = new THREE.PointsMaterial({
        color: wColor,
        size: pal.weather === 'stars' ? 0.14 : 0.22,
        transparent: true,
        opacity: 0.78,
      });
      this.weatherPositions = positions;
      this.weatherPoints = new THREE.Points(geo, mat);
      this.bgGroup.add(this.weatherPoints);
    }
  }

  private rebuildArea(state: RenderState3D): void {
    const sig = `${state.stageId}:${state.substageId}:${state.platforms.length}:${state.props.length}:${state.ceilingPipes.length}:${state.campaignMode}`;
    if (
      sig === this.currentAreaSignature &&
      this.lastPlatformsRef === state.platforms &&
      this.lastPropsRef === state.props
    ) {
      return;
    }
    this.currentAreaSignature = sig;
    this.lastPlatformsRef = state.platforms;
    this.lastPropsRef = state.props;

    // Clear old world meshes
    while (this.worldGroup.children.length > 0) {
      const c = this.worldGroup.children[0];
      this.worldGroup.remove(c);
      disposeMaterialTree(c);
    }
    this.platformVisuals = [];
    this.propVisuals = [];
    this.checkpointFlags.clear();
    this.nodeIndicators.clear();

    // Clear debris shards from previous sector
    for (const d of this.debrisShards) {
      this.fxGroup.remove(d.mesh);
      (d.mesh.material as THREE.Material).dispose();
    }
    this.debrisShards = [];

    // Platforms & Walls
    for (const plat of state.platforms) {
      const pv = buildPlatform3D(plat, state.palette, state.stageId, this.maxAnisotropy);
      this.worldGroup.add(pv.group);
      this.platformVisuals.push(pv);
    }

    // Ceiling Pipes
    for (const cp of state.ceilingPipes) {
      const pipe = buildCeilingPipe3D(cp, state.palette.pipeColor, this.maxAnisotropy);
      this.worldGroup.add(pipe);
    }

    // Destructible Props (crates, vending machines, cars, pillars, terminals, chests)
    for (const pr of state.props) {
      const pv = buildProp3D(pr, this.maxAnisotropy);
      this.worldGroup.add(pv.group);
      this.propVisuals.push(pv);
    }

    // Checkpoints
    if (state.campaignMode) {
      for (const cp of state.checkpoints) {
        const g = new THREE.Group();
        g.position.set(worldX(cp.x + 16), worldY(cp.y + 54), -0.4);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6),
          makeToonMaterial('#64748b')
        );
        pole.position.y = 0.7;
        g.add(pole);
        const flagMat = makeToonMaterial('#64748b', { emissive: '#64748b', emissiveIntensity: 0.4 });
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.08), flagMat);
        flag.position.set(0.3, 1.24, 0);
        g.add(flag);
        this.worldGroup.add(g);
        this.checkpointFlags.set(cp.id, flag);
      }

      for (const ex of state.exits) {
        const g = new THREE.Group();
        const wU = ex.w * WORLD_UNIT;
        const hU = ex.h * WORLD_UNIT;
        g.position.set(worldX(ex.x + ex.w / 2), worldY(ex.y + ex.h / 2), -0.35);
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(wU, hU, 0.45),
          makeToonMaterial('#083344', { emissive: '#06b6d4', emissiveIntensity: 0.35 })
        );
        g.add(back);
        const frameMat = makeToonMaterial('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.85 });
        for (const xSide of [-wU / 2, wU / 2]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, hU + 0.14, 0.6), frameMat);
          post.position.x = xSide;
          g.add(post);
        }
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(wU + 0.24, 0.16, 0.62), frameMat);
        lintel.position.y = hU / 2;
        g.add(lintel);
        this.worldGroup.add(g);
      }
    }

    // Exploration Nodes
    for (const node of state.explorationNodes) {
      const g = new THREE.Group();
      const wU = node.w * WORLD_UNIT;
      const hU = node.h * WORLD_UNIT;
      g.position.set(worldX(node.x + node.w / 2), worldY(node.y + node.h / 2), -0.3);
      const body = new THREE.Mesh(new THREE.BoxGeometry(wU, hU, 0.7), makeToonMaterial('#0f172a'));
      g.add(body);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(wU * 0.72, hU * 0.4, 0.76),
        makeToonMaterial('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.9 })
      );
      screen.position.y = hU * 0.15;
      g.add(screen);
      this.worldGroup.add(g);
      this.nodeIndicators.set(node.id, screen);
    }
  }

  private spawnPropDebris(pr: DestructibleProp): void {
    const color = propColorForDebris(pr.kind);
    const cx = worldX(pr.x + pr.w / 2);
    const cy = worldY(pr.y + pr.h / 2);
    const count = pr.kind === 'car' ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const mat = makeToonMaterial(color);
      const mesh = new THREE.Mesh(this.sharedDebrisGeo, mat);
      const scale = 0.65 + Math.random() * 0.85;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        cx + (Math.random() - 0.5) * pr.w * WORLD_UNIT * 0.7,
        cy + (Math.random() - 0.5) * pr.h * WORLD_UNIT * 0.6,
        (Math.random() - 0.5) * 0.6
      );
      this.fxGroup.add(mesh);
      this.debrisShards.push({
        mesh,
        vx: (Math.random() - 0.5) * 7.5,
        vy: 3.5 + Math.random() * 5.5,
        vz: (Math.random() - 0.5) * 6.5,
        rx: (Math.random() - 0.5) * 12,
        ry: (Math.random() - 0.5) * 12,
        rz: (Math.random() - 0.5) * 12,
        life: 0.95,
      });
    }
  }

  private syncPoolMeshes(
    pool: THREE.Mesh[],
    needed: number,
    geo: THREE.BufferGeometry
  ): void {
    while (pool.length < needed) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1 })
      );
      this.fxGroup.add(m);
      pool.push(m);
    }
    for (let i = 0; i < pool.length; i++) {
      pool[i].visible = i < needed;
    }
  }

  render(state: RenderState3D): void {
    if (this.disposed) return;

    this.rebuildSkyline(state.palette);
    this.rebuildArea(state);

    // Camera setup: exact Z=0 alignment with logical 540px viewport height
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const viewHUnits = state.viewportHeight * WORLD_UNIT;
    const camZ = viewHUnits / 2 / Math.tan(fovRad / 2);

    const shakeX = (Math.random() - 0.5) * state.shakeAmount * WORLD_UNIT;
    const shakeY = (Math.random() - 0.5) * state.shakeAmount * WORLD_UNIT;
    const renderCamX = state.cameraX + state.sectorOffsetX;
    const camCenterX = worldX(renderCamX + state.viewportWidth / 2) + shakeX;
    const camCenterY = worldY(state.cameraY + state.viewportHeight / 2) + shakeY;

    this.camera.position.set(camCenterX, camCenterY, camZ);
    const yawTilt =
      state.sectorOffsetX !== 0
        ? Math.sign(state.sectorOffsetX) * -0.025
        : state.player.isDashing
          ? -state.player.facing * 0.015
          : 0;
    this.camera.lookAt(camCenterX + yawTilt * 8, camCenterY, 0);

    // Keep sky plane and directional shadow box centered around camera
    this.skyMesh.position.set(camCenterX, camCenterY, -46);
    this.keyLight.position.set(camCenterX + 8, camCenterY + 14, 15);
    this.keyLight.target.position.set(camCenterX, camCenterY, 0);
    this.keyLight.target.updateMatrixWorld();

    // Update Parallax 3D City Towers seamlessly around camCenterX
    const farSpan = this.farTowers.length * 6.8;
    for (const t of this.farTowers) {
      const parallaxX = renderCamX * WORLD_UNIT * 0.28;
      const rel = (((t.baseOffset - parallaxX) % farSpan) + farSpan) % farSpan - farSpan / 2;
      t.mesh.position.x = camCenterX + rel;
      t.mesh.position.y = camCenterY - 9.5 + (t.mesh.geometry as THREE.BoxGeometry).parameters.height / 2;
    }
    const midSpan = this.midTowers.length * 8.2;
    for (const t of this.midTowers) {
      const parallaxX = renderCamX * WORLD_UNIT * 0.52;
      const rel = (((t.baseOffset - parallaxX) % midSpan) + midSpan) % midSpan - midSpan / 2;
      t.mesh.position.x = camCenterX + rel;
      t.mesh.position.y = camCenterY - 10 + (t.mesh.geometry as THREE.BoxGeometry).parameters.height / 2;
    }

    // Update Weather 3D points
    if (this.weatherPoints && this.weatherPositions) {
      this.weatherPoints.position.set(camCenterX, camCenterY, 0);
      const pos = this.weatherPositions;
      const wType = state.palette.weather;
      for (let i = 0; i < pos.length; i += 3) {
        if (wType === 'rain' || wType === 'storm') {
          pos[i] -= 0.14;
          pos[i + 1] -= 0.42;
        } else if (wType === 'speedlines') {
          pos[i] -= 0.75;
        } else if (wType === 'sakura') {
          pos[i] -= 0.08;
          pos[i + 1] -= 0.09;
        } else if (wType === 'spores') {
          pos[i + 1] += 0.04;
          pos[i] += Math.sin(state.tickCount * 0.04 + i) * 0.02;
        }
        if (pos[i] < -18) pos[i] += 36;
        if (pos[i] > 18) pos[i] -= 36;
        if (pos[i + 1] < -10) pos[i + 1] += 20;
        if (pos[i + 1] > 10) pos[i + 1] -= 20;
      }
      this.weatherPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Sync Dynamic Platforms (moving, crumbling, broken gates, conveyors, lasers, acid)
    for (const pv of this.platformVisuals) {
      const p = pv.source;
      pv.group.visible = !p.broken;
      if (p.broken) continue;
      const jitterX = p.type === 'crumble' && (p.crumbleTimer ?? 0) > 0 ? (Math.random() - 0.5) * 0.14 : 0;
      pv.group.position.set(
        worldX(p.x + p.w / 2) + jitterX,
        worldY(p.y + p.h / 2),
        0
      );
      if (pv.conveyorTex) {
        pv.conveyorTex.offset.x -= (p.conveyorSpeed ?? 1) * 0.015;
      }
      if (pv.laserBeamMesh) {
        const active = Math.floor(state.tickCount / 75) % 2 === 0;
        const mat = pv.laserBeamMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = active ? 0.92 : 0.15;
        pv.laserBeamMesh.scale.set(active ? 1 : 0.35, 1, active ? 1 : 0.35);
      }
      if (pv.acidMesh) {
        pv.acidMesh.position.y = (p.h * WORLD_UNIT) / 2 - 0.08 + Math.sin(state.tickCount * 0.12) * 0.06;
      }
    }

    // Sync Destructible Props + Spawn 3D Shatter Debris on Break!
    for (const prv of this.propVisuals) {
      const pr = prv.source;
      if (pr.broken && !prv.wasBroken) {
        prv.wasBroken = true;
        this.spawnPropDebris(pr);
      }
      prv.group.visible = !pr.broken;
      if (!pr.broken && prv.starMesh) {
        prv.starMesh.rotation.y += state.dt * 2.6;
        prv.starMesh.position.y = pr.h * WORLD_UNIT + 0.36 + Math.sin(state.tickCount * 0.1) * 0.08;
      }
    }

    // Checkpoints & Exploration Nodes State
    for (const [id, flag] of this.checkpointFlags) {
      const active = id === state.checkpointId;
      const mat = flag.material as THREE.MeshToonMaterial;
      mat.color.set(active ? '#facc15' : '#64748b');
      mat.emissive.set(active ? '#eab308' : '#334155');
      mat.emissiveIntensity = active ? 0.95 : 0.25;
    }
    for (const [id, screen] of this.nodeIndicators) {
      const active = state.activatedNodes.has(id);
      const mat = screen.material as THREE.MeshToonMaterial;
      mat.color.set(active ? '#4ade80' : '#22d3ee');
      mat.emissive.set(active ? '#22c55e' : '#06b6d4');
    }

    // Update Hero 3D Rig
    const animTick = state.tickCount + (state.tickAlpha ?? 0);
    const pl = state.player;
    for (const [id, rig] of this.heroRigs) {
      rig.root.visible = id === pl.characterId;
    }
    const activeHero = this.heroRigs.get(pl.characterId);
    if (activeHero) {
      activeHero.root.position.set(worldX(pl.x + pl.w / 2), worldY(pl.y + pl.h), 0);
      updateHeroRig3D(activeHero, { ...pl, tickCount: animTick }, state.dt);

      // Contact shadow beneath feet (fades smoothly during Ren stealth or Maya meditation levitation)
      const stealthFade = activeHero.stealthOpacity ?? 1;
      const medFade = pl.characterId === 'maya' ? 1 - (activeHero.meditationFactor ?? 0) * 0.45 : 1;
      this.heroShadow.position.set(worldX(pl.x + pl.w / 2), worldY(pl.y + pl.h) + 0.02, 0);
      this.heroShadow.visible = pl.grounded;
      this.sharedShadowMat.opacity = (pl.grounded ? 0.48 : 0.15) * stealthFade * medFade;

      // 3D Psychic Slash Arc
      this.heroSlashArc.visible = pl.slashing;
      if (pl.slashing) {
        const rangeU = state.slashRange * WORLD_UNIT * 0.72;
        this.heroSlashArc.scale.setScalar(rangeU / 1.4);
        this.heroSlashArc.position.set(
          worldX(pl.facing === 1 ? pl.x + pl.w : pl.x),
          worldY(pl.y + pl.h / 2),
          0.35
        );
        this.heroSlashArc.rotation.set(
          0,
          pl.facing === 1 ? 0 : Math.PI,
          -Math.PI * 0.45 + pl.comboStep * 0.35
        );
        const sMat = this.heroSlashArc.material as THREE.MeshBasicMaterial;
        sMat.color.set(pl.atkTimer > 0 ? '#ef4444' : state.accentColor);
      }

      // Maya Flight Halo
      const mayaMed = pl.characterId === 'maya' ? (activeHero.meditationFactor ?? 0) : 0;
      this.heroFlightHalo.visible = pl.isFlying || mayaMed > 0.2;
      if (this.heroFlightHalo.visible) {
        const medLiftPx = mayaMed * 16;
        this.heroFlightHalo.position.set(worldX(pl.x + pl.w / 2), worldY(pl.y + pl.h / 2 - medLiftPx), -0.2);
        this.heroFlightHalo.rotation.z = state.tickCount * (pl.isFlying ? 0.06 : 0.025);
        this.heroFlightHalo.scale.setScalar(
          pl.isFlying
            ? 1 + Math.sin(state.tickCount * 0.28) * 0.1
            : 0.72 + mayaMed * 0.35 + Math.sin(state.tickCount * 0.08) * 0.05
        );
      }
    }

    // Update Enemies (Keyed by enemy.id)
    const activeEnemyIds = new Set<number>();
    for (const en of state.enemies) {
      activeEnemyIds.add(en.id);
      let entry = this.enemyRigs.get(en.id);
      if (!entry || entry.type !== en.type) {
        if (entry) {
          this.actorsGroup.remove(entry.rig.root);
          disposeMaterialTree(entry.rig.root);
        }
        const rig = buildEnemyRig3D(en);
        const hpBar = new THREE.Mesh(
          new THREE.BoxGeometry(en.w * WORLD_UNIT, 0.1, 0.08),
          new THREE.MeshBasicMaterial({ color: '#ff007f' })
        );
        hpBar.position.y = en.h * WORLD_UNIT + 0.28;
        rig.root.add(hpBar);

        const stunRing = new THREE.Group();
        stunRing.position.y = en.h * WORLD_UNIT + 0.46;
        for (let i = 0; i < 3; i++) {
          const star = new THREE.Mesh(
            this.sharedDebrisGeo,
            new THREE.MeshBasicMaterial({ color: '#facc15' })
          );
          star.scale.setScalar(0.35);
          const a = (i * Math.PI * 2) / 3;
          star.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.25);
          stunRing.add(star);
        }
        stunRing.visible = false;
        rig.root.add(stunRing);

        this.actorsGroup.add(rig.root);
        entry = { rig, type: en.type, hpBar, stunRing };
        this.enemyRigs.set(en.id, entry);
      }

      entry.rig.root.position.set(worldX(en.x + en.w / 2), worldY(en.y + en.h), 0);
      updateEnemyRig3D(entry.rig, en, animTick, state.dt);

      const hpRatio = Math.max(0.01, en.hp / en.maxHp);
      entry.hpBar.scale.x = hpRatio;
      entry.hpBar.visible = en.hp < en.maxHp;

      entry.stunRing.visible = !!(en.stunTimer && en.stunTimer > 0);
      if (entry.stunRing.visible) entry.stunRing.rotation.y += state.dt * 6;
    }

    for (const [id, entry] of this.enemyRigs) {
      if (!activeEnemyIds.has(id)) {
        this.actorsGroup.remove(entry.rig.root);
        disposeMaterialTree(entry.rig.root);
        this.enemyRigs.delete(id);
      }
    }

    // Update Boss 3D Rig
    if (state.boss.active) {
      if (!this.bossEntry || this.bossEntry.id !== state.boss.id) {
        if (this.bossEntry) {
          this.actorsGroup.remove(this.bossEntry.rig.root);
          disposeMaterialTree(this.bossEntry.rig.root);
          if (this.bossEntry.twinRig) {
            this.actorsGroup.remove(this.bossEntry.twinRig.root);
            disposeMaterialTree(this.bossEntry.twinRig.root);
          }
          this.fxGroup.remove(this.bossEntry.daggers);
          this.fxGroup.remove(this.bossEntry.shieldMesh);
        }
        const rig = buildBossRig3D(state.boss);
        this.actorsGroup.add(rig.root);

        let twinRig: HumanoidRigParts | undefined;
        if (state.boss.behavior === 'twins') {
          twinRig = buildBossRig3D(state.boss);
          this.actorsGroup.add(twinRig.root);
        }

        const daggers = new THREE.Group();
        const dagMat = makeToonMaterial('#e879f9', { emissive: '#d946ef', emissiveIntensity: 1.1 });
        for (let i = 0; i < 3; i++) {
          const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), dagMat);
          d.scale.set(1.6, 0.5, 0.5);
          daggers.add(d);
        }
        daggers.visible = false;
        this.fxGroup.add(daggers);

        const shieldMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, state.boss.h * WORLD_UNIT * 1.1, 1.8),
          new THREE.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.45 })
        );
        shieldMesh.visible = false;
        this.fxGroup.add(shieldMesh);

        this.bossEntry = { id: state.boss.id, rig, twinRig, daggers, shieldMesh };
      }

      const b = state.boss;
      this.bossEntry.rig.root.visible = true;
      this.bossEntry.rig.root.position.set(worldX(b.x + b.w / 2), worldY(b.y + b.h), 0);
      updateBossRig3D(this.bossEntry.rig, b, animTick, state.dt);

      if (this.bossEntry.twinRig) {
        const showTwin = b.twinX !== undefined && b.twinY !== undefined;
        this.bossEntry.twinRig.root.visible = showTwin;
        if (showTwin) {
          this.bossEntry.twinRig.root.position.set(
            worldX((b.twinX ?? b.x) + b.w / 2),
            worldY((b.twinY ?? b.y) + b.h),
            -0.3
          );
          updateBossRig3D(this.bossEntry.twinRig, b, animTick + 12, state.dt);
        }
      }

      this.bossEntry.daggers.visible = b.behavior === 'cipher';
      if (this.bossEntry.daggers.visible) {
        const ang = b.orbitalAngle ?? 0;
        this.bossEntry.daggers.position.set(worldX(b.x + b.w / 2), worldY(b.y + b.h / 2), 0.2);
        this.bossEntry.daggers.children.forEach((d, idx) => {
          const a = ang + (idx * Math.PI * 2) / 3;
          d.position.set(Math.cos(a) * 1.4, Math.sin(a) * 0.75, Math.sin(a) * 0.6);
          d.rotation.z = a;
        });
      }

      this.bossEntry.shieldMesh.visible = !!b.shieldActive;
      if (b.shieldActive) {
        this.bossEntry.shieldMesh.position.set(
          worldX(b.facing === 1 ? b.x + b.w + 8 : b.x - 8),
          worldY(b.y + b.h / 2),
          0
        );
      }
    } else if (this.bossEntry) {
      this.bossEntry.rig.root.visible = false;
      if (this.bossEntry.twinRig) this.bossEntry.twinRig.root.visible = false;
      this.bossEntry.daggers.visible = false;
      this.bossEntry.shieldMesh.visible = false;
    }

    // Pickups
    while (this.pickupMeshes.length < state.pickups.length) {
      const m = buildPickupMesh3D('heal');
      this.fxGroup.add(m);
      this.pickupMeshes.push(m);
    }
    const pickupColors: Record<PickupItem['kind'], string> = {
      heal: '#22c55e',
      full_heal: '#16a34a',
      psy: '#a855f7',
      wav: '#06b6d4',
      atk: '#ef4444',
      jmp: '#eab308',
      gst: '#c084fc',
    };
    for (let i = 0; i < this.pickupMeshes.length; i++) {
      const pm = this.pickupMeshes[i];
      if (i >= state.pickups.length) {
        pm.visible = false;
        continue;
      }
      const it = state.pickups[i];
      pm.visible = true;
      pm.position.set(
        worldX(it.x + it.w / 2),
        worldY(it.y + it.h / 2) + Math.sin(state.tickCount * 0.1 + i) * 0.1,
        0
      );
      pm.rotation.y += state.dt * 2.5;
      const core = pm.children[0] as THREE.Mesh;
      const cMat = core.material as THREE.MeshToonMaterial;
      cMat.color.set(pickupColors[it.kind]);
      cMat.emissive.set(pickupColors[it.kind]);
    }

    // Bullets & Wind Blades
    const normalBullets = state.bullets.filter((b) => !b.isWindBlade);
    const bladeBullets = state.bullets.filter((b) => b.isWindBlade);
    this.syncPoolMeshes(this.bulletMeshes, normalBullets.length, this.sharedSphereGeo);
    for (let i = 0; i < normalBullets.length; i++) {
      const b = normalBullets[i];
      const m = this.bulletMeshes[i];
      m.position.set(worldX(b.x + b.w / 2), worldY(b.y + b.h / 2), 0);
      m.scale.set(Math.max(0.28, b.w * WORLD_UNIT), Math.max(0.22, b.h * WORLD_UNIT), 0.28);
      (m.material as THREE.MeshBasicMaterial).color.set(b.color);
    }

    this.syncPoolMeshes(this.thrownMeshes, bladeBullets.length + state.thrownEnemies.length, this.sharedBladeGeo);
    for (let i = 0; i < bladeBullets.length; i++) {
      const b = bladeBullets[i];
      const m = this.thrownMeshes[i];
      m.position.set(worldX(b.x + b.w / 2), worldY(b.y + b.h / 2), 0);
      m.rotation.set(0, b.vx < 0 ? Math.PI : 0, -Math.PI * 0.45);
      m.scale.setScalar(1.1);
      (m.material as THREE.MeshBasicMaterial).color.set('#00f0ff');
    }
    for (let i = 0; i < state.thrownEnemies.length; i++) {
      const te = state.thrownEnemies[i];
      const m = this.thrownMeshes[bladeBullets.length + i];
      m.position.set(worldX(te.x + te.w / 2), worldY(te.y + te.h / 2), 0);
      m.rotation.set(0, 0, m.rotation.z + state.dt * 12);
      m.scale.setScalar(1.3);
      (m.material as THREE.MeshBasicMaterial).color.set('#a855f7');
    }

    // Particles
    this.syncPoolMeshes(this.particleMeshes, state.particles.length, this.sharedBoxGeo);
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      const m = this.particleMeshes[i];
      m.position.set(worldX(pt.x), worldY(pt.y), 0.15);
      const s = Math.max(0.1, pt.size * WORLD_UNIT);
      m.scale.set(s, s, s);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(pt.color);
      mat.opacity = Math.max(0, Math.min(1, pt.life));
    }

    // 3D Prop Shatter Debris Update
    for (let i = this.debrisShards.length - 1; i >= 0; i--) {
      const d = this.debrisShards[i];
      d.life -= state.dt * 1.15;
      if (d.life <= 0) {
        this.fxGroup.remove(d.mesh);
        (d.mesh.material as THREE.Material).dispose();
        this.debrisShards.splice(i, 1);
        continue;
      }
      d.vy -= 20 * state.dt;
      d.mesh.position.x += d.vx * state.dt;
      d.mesh.position.y += d.vy * state.dt;
      d.mesh.position.z += d.vz * state.dt;
      d.mesh.rotation.x += d.rx * state.dt;
      d.mesh.rotation.y += d.ry * state.dt;
      d.mesh.rotation.z += d.rz * state.dt;
      d.mesh.scale.setScalar(Math.max(0.05, d.life));
    }

    // Maya Gravity Well & Leon Flame Zone
    this.mayaWellGroup.visible = !!state.mayaWell;
    if (state.mayaWell) {
      this.mayaWellGroup.position.set(worldX(state.mayaWell.x), worldY(state.mayaWell.y), 0.15);
      this.mayaWellGroup.children.forEach((ring, idx) => {
        if (idx === 0) {
          ring.scale.setScalar(0.9 + Math.sin(state.tickCount * 0.25) * 0.2);
        } else {
          ring.rotation.z += state.dt * (idx % 2 === 0 ? 3.5 : -2.8);
          ring.rotation.x = Math.sin(state.tickCount * 0.06 + idx) * 0.45;
        }
      });
    }

    this.leonFlameMesh.visible = !!state.leonFlameZone;
    if (state.leonFlameZone) {
      const lf = state.leonFlameZone;
      this.leonFlameMesh.position.set(worldX(lf.x + lf.w / 2), worldY(lf.y + 9), 0.15);
      this.leonFlameMesh.scale.set(lf.w * WORLD_UNIT, 0.8 + Math.sin(state.tickCount * 0.4) * 0.25, 1);
    }

    // Stage 2 Monorail Hazards
    this.hazardGantryGroup.visible = state.lowCeilingActive && state.lowCeilingKind === 'gantry';
    this.hazardSweeperGroup.visible = state.lowCeilingActive && state.lowCeilingKind === 'sweeper';
    if (state.lowCeilingActive) {
      if (state.lowCeilingKind === 'sweeper') {
        this.hazardSweeperGroup.position.set(worldX(state.lowCeilingX + 39), worldY(612 + 19), 0);
      } else {
        this.hazardGantryGroup.position.set(worldX(state.lowCeilingX + 65), worldY(496 + 55), 0);
      }
    }

    // Lightning flash boost
    this.hemiLight.intensity = state.lightningAlpha > 0.02 ? 0.9 + state.lightningAlpha * 2.5 : 0.9;

    void _tmpVec;
    this.renderer.render(this.scene, this.camera);
  }

  cancelScheduledFrame(): void {
    if (this.pendingRafId !== null) {
      cancelAnimationFrame(this.pendingRafId);
      this.pendingRafId = null;
    }
    if (this.pendingTimerId !== null) {
      clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
  }

  scheduleNextFrame(cb: () => void): void {
    if (this.disposed) return;
    this.cancelScheduledFrame();
    if (!this.isSoftwareGl) {
      this.pendingRafId = requestAnimationFrame(() => {
        this.pendingRafId = null;
        cb();
      });
      return;
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl?.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.pendingTimerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.pendingTimerId = window.setTimeout(() => {
            this.pendingTimerId = null;
            cb();
          }, 80);
        }
      };
      this.pendingTimerId = window.setTimeout(poll, 5);
    } else {
      this.pendingTimerId = window.setTimeout(() => {
        this.pendingTimerId = null;
        cb();
      }, 80);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelScheduledFrame();
    disposeMaterialTree(this.scene);
    this.sharedBoxGeo.dispose();
    this.sharedSphereGeo.dispose();
    this.sharedBladeGeo.dispose();
    this.sharedDebrisGeo.dispose();
    this.sharedShadowGeo.dispose();
    this.sharedShadowMat.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
