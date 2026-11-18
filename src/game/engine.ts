import { requiredRouteNodes, routeFinished, gateOpened } from './campaign/routeState';
import { drawBossSprite } from './bossArtwork';
import { HeroAnimator } from './heroAnimation';
import { drawHeroFrame, isHeroPainted } from './heroArtwork';
import { COMBO, SWINGS, nextComboStep } from './combat';
import { bossBodies, bossShots, bossWarnings, BOSS_MOVES, isBossCharge, moveBoss, stepBoss } from './bosses';
import { sound } from './audio';
import { AreaSave, CampaignSave, campaignContentId, decodeCampaignSave } from './campaign/save';
import { FixedStepClock } from './simulation';
import { GameInput, GameAction, InputKey, InputSource } from './input';
import { moveAgainstSolids, depenetrate, overlaps, sweepTime } from './collision';
import { ALLOW_TEST_CHARACTER_SWITCH } from './rules';
import { MOVEMENT } from './tuning';
import { MOVEMENT_PROFILES, horizontalVelocity } from './movement';
import { canSeeBody, ENEMY_COMBAT, isFlyingEnemy, stepEnemyAI, terrainHit } from './enemyAI';
import { GROUND_ENEMY, enemySolids, enemyHome, hasSafeFooting, moveGroundEnemy } from './groundActors';
import { SpawnManager } from './spawns';
import { viewportFor, cameraTarget, followCamera } from './camera';
import { CHARACTER_ORDER, CHARACTERS } from './characters';
import { getEnemyPixelSprite, enemyVisualFrame, enemySourceRect } from './enemyArtwork';
import { WorldRenderer3D } from './render3d/sceneRenderer';
import { lerpActorPosition } from './render3d/spriteInterpolation';
import { MEDITATION_START_TICKS } from './render3d/idleChoreography';
import { STAGES } from './stages';
import { CAMPAIGN, adaptLegacy, getSubstage, SubstageDefinition, SubstageId, PlayerCarry, CampaignProgress } from './campaign';
import {
  AmbushArena,
  BossRuntime,
  CeilingPipe,
  CharacterId,
  DestructibleProp,
  Enemy,
  HudSnapshot,
  PickupItem,
  Platform,
  SectorTransitionInfo,
} from './types';

interface AreaState {
  activated: string[];
  platforms: Platform[];
  props: DestructibleProp[];
  pickups: PickupItem[];
  arenas: AmbushArena[];
  enemies: Enemy[];
  boss: BossRuntime;
  spawns: SpawnManager;
  tick: number;
  checkpoint: string;
  leftAt: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  fromPlayer?: boolean;
  piercing?: boolean;
  passesThroughWalls?: boolean;
  reflectable?: boolean;
  isWindBlade?: boolean;
  shooterId?: number;
  hitIds?: Set<number>;
  color: string;
  damage: number;
  gravity?: number;
  dead?: boolean;
}

interface ThrownEnemy {
  hitIds: Set<number>;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  damage: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}

interface MangaFx {
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  vy: number;
  rot: number;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ScarfNode {
  x: number;
  y: number;
}

export interface EngineCallbacks {
  onSaveRequest?: () => void;
  onPauseRequest?: () => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (stageId: number, score: number) => void;
  onContinueCountdown: (stageId: number, score: number) => void;
  onGameOver: (stageId: number, score: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private loopActive = false;
  private renderer3d: WorldRenderer3D | null = null;
  private lastRenderTs = 0;
  private paused = true;
  private clock = new FixedStepClock();
  private transitionTimers = new Set<ReturnType<typeof setTimeout>>();
  private wallKickLock = 0;
  private knockbackLock = 0;
  private standingPlatform: Platform | null = null;
  private platformDeltas = new Map<Platform, { x: number; y: number }>();
  private input = new GameInput();
  private jumpBuffer = 0;
  private flightRequested = false;
  private coyoteTicks = 0;
  private wallContactGrace = 0;
  private wallContactSide: -1 | 0 | 1 = 0;
  private slideHitIds = new Set<number>();
  private spawns = new SpawnManager(STAGES[0]);
  private tickCount = 0;
  private visualTick = 0;
  private heroAnimator = new HeroAnimator();
  private heroVisualTimers = { hurt:0, vault:0, special:0 };
  private hitstop = 0;
  private idleTicks = 0;
  private prevPlayerPos = { x: 100, y: 600 };
  private prevCameraPos = { x: 0, y: 0 };
  private prevEnemyPos = new Map<number, { x: number; y: number }>();
  private prevBossPos = { x: 0, y: 0, twinX: 0, twinY: 0 };

  private stage: SubstageDefinition = adaptLegacy(STAGES[0]);
  private campaignMode = false;
  private areaCache = new Map<SubstageId, AreaState>();
  private checkpointId = 'entrada';
  private worldTick = 0;
  private characterId: CharacterId = 'ren';

  private platforms: Platform[] = [];
  private ceilingPipes: CeilingPipe[] = [];
  private props: DestructibleProp[] = [];
  private pickups: PickupItem[] = [];
  private ambushArenas: AmbushArena[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private thrownEnemies: ThrownEnemy[] = [];
  private particles: Particle[] = [];
  private mangaTexts: MangaFx[] = [];
  private ambient: AmbientParticle[] = [];
  private scarfNodes: ScarfNode[] = [];
  private scenarioPatterns = new Map<string, CanvasPattern | null>();
  private hitFlashCanvas: HTMLCanvasElement | null = null;

  private boss: BossRuntime = {
    ...STAGES[0].boss,
    active: false,
    triggered: false,
    hp: STAGES[0].boss.maxHp,
    vx: 0,
    vy: 0,
    facing: -1,
    phase: 1,
    attackTimer: 60,
    specialTimer: 160,
    telegraph: 0,
    orbitalAngle: 0,
  };

  private player = {
    x: 100,
    y: 600,
    w: 32,
    h: 56,
    vx: 0,
    vy: 0,
    grounded: false,
    doubleJump: true,
    onWall: 0 as -1 | 0 | 1,
    lastWallSide: 0 as -1 | 0 | 1,
    lastWallX: null as number | null,
    hangingCeiling: false,
    hangingPipe: null as CeilingPipe | null,
    facing: 1 as 1 | -1,
    hp: 100,
    maxHp: 100,
    psyEnergy: 60,
    maxPsy: 100,
    lives: 3,
    nextOneUpScore: 15000,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    isSliding: false,
    slideTimer: 0,
    slashing: false,
    slashTimer: 0,
    comboStep: 0,
    comboWindow: 0,
    comboHits: 0,
    comboTimer: 0,
    invulnTimer: 0,
    stunTimer: 0,
    stunGraceTimer: 0,
    pitfallCooldown: 0,
    lastGroundX: 100,
    lastGroundY: 600,
    isFlying: false,
    wavAmmo: 0,
    atkTimer: 0,
    jmpTimer: 0,
    gstTimer: 0,
    flameTimer: 0,
    score: 0,
  };

  private get keys() { return this.input.keys; }

  private footstepDistance = 0;
  private activated = new Set<string>();
  private attackBuffered = false;

  private resetAttack() {
    this.attackBuffered = false;
    this.player.slashing = false; this.player.slashTimer = 0;
    this.player.comboWindow = 0; this.player.comboStep = 0;
  }

  clearInput() {
    this.flightRequested = false;
    this.player.isFlying = false;
    this.attackBuffered = false;
    this.input.clear();
    this.jumpBuffer = 0;
    this.coyoteTicks = 0;
    this.wallContactGrace = 0;
    this.wallContactSide = 0;
    this.lastGamepadJump = false;
    this.lastGamepadAttack = false;
    this.lastGamepadDash = false;
    this.lastGamepadPsy = false;
    this.lastGamepadAssist = false;
    this.lastGamepadUp = false;
  }

  private cancelTransitions() {
    this.transitionTimers.forEach((timer) => clearTimeout(timer));
    this.transitionTimers.clear();
  }

  private scheduleTransition(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.transitionTimers.delete(timer);
      callback();
    }, delay);
    this.transitionTimers.add(timer);
  }

  private canAct() {
    return !this.paused && !this.stageClearTriggered && !this.continueTriggered && !this.gameOverTriggered;
  }

  private camera = { x: 0, y: 0 };
  private get viewport() { return viewportFor(this.canvas.width, this.canvas.height); }
  private shakeAmount = 0;
  private superCutinTimer = 0;
  private superLabel = '';
  private dimensionalSlashes: { x1: number; y1: number; x2: number; y2: number }[] = [];

  private mayaWell: { x: number; y: number; timer: number; radius: number } | null = null;
  private leonFlameZone: { x: number; y: number; w: number; timer: number } | null = null;

  private lowCeilingTimer = 280;
  private lowCeilingActive = false;
  private lowCeilingX = 0;
  private lowCeilingKind: 'gantry' | 'sweeper' = 'gantry';
  private lowCeilingSpeed = 16;
  private lowCeilingSequence = 0;
  private lightningAlpha = 0;
  private alertBanner: string | null = null;
  private alertTimer = 0;
  private sectorTransitionSeq = 0;
  private sectorTransition: (SectorTransitionInfo & {
    timer: number;
    duration: number;
    cameraOffsetX: number;
  }) | null = null;

  private stageClearTriggered = false;
  private continueTriggered = false;
  private gameOverTriggered = false;

  private lastGamepadJump = false;
  private lastGamepadAttack = false;
  private lastGamepadDash = false;
  private lastGamepadPsy = false;
  private lastGamepadAssist = false;
  private lastGamepadUp = false;
  private lastGamepadPause = false;
  private gamepadWasConnected = false;

  private applyPixelatedRendering(ctx: CanvasRenderingContext2D, targetCanvas?: HTMLCanvasElement) {
    ctx.imageSmoothingEnabled = false;
    if (targetCanvas?.style) {
      targetCanvas.style.imageRendering = 'pixelated';
    }
  }

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.ctx = context;
    this.applyPixelatedRendering(this.ctx, this.canvas);
    this.callbacks = callbacks;
    this.initAmbient();
    this.initScarf(100, 600);
  }

  attach3DContainer(container: HTMLElement | null) {
    if (this.renderer3d) {
      this.renderer3d.dispose();
      this.renderer3d = null;
    }
    if (!container || typeof document === 'undefined') return;
    try {
      this.renderer3d = new WorldRenderer3D(container);
      this.renderer3d.resize(this.canvas.width, this.canvas.height);
      this.canvas.style.imageRendering = 'auto';
    } catch (err) {
      console.warn('WebGL 2.5D fallback to 2D canvas:', err);
      this.renderer3d = null;
    }
  }

  dispose() {
    this.stop();
    if (this.renderer3d) {
      this.renderer3d.dispose();
      this.renderer3d = null;
    }
  }

  private initAmbient() {
    this.ambient = [];
    for (let i = 0; i < 70; i++) {
      this.ambient.push({
        x: Math.random() * 1600,
        y: Math.random() * 1000,
        vx: -1 - Math.random() * 3,
        vy: 1 + Math.random() * 5,
        size: 1.5 + Math.random() * 3,
        alpha: 0.25 + Math.random() * 0.55,
      });
    }
  }

  private initScarf(x: number, y: number) {
    this.scarfNodes = [];
    for (let i = 0; i < 8; i++) {
      this.scarfNodes.push({ x: x - i * 6, y: y + 14 });
    }
  }

  loadStage(
    stageId: number,
    charId: CharacterId,
    preserveScore = 0,
    preserveLives = 3,
    preserveNextOneUp = 15000
  ) {
    this.campaignMode = false;
    this.areaCache.clear();
    this.worldTick = 0;
    const found = STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
    this.initializeArea(adaptLegacy(found), charId, preserveScore, preserveLives, preserveNextOneUp);
  }

  startCampaign(stageId: number, charId: CharacterId, score = 0, lives = 3, nextOneUp = 15000) {
    const chapter = CAMPAIGN.find((stage) => stage.id === stageId);
    if (!chapter) throw new Error(`Fase desconhecida: ${stageId}`);
    this.campaignMode = true;
    this.areaCache.clear();
    this.worldTick = 0;
    this.initializeArea(getSubstage(chapter.entry), charId, score, lives, nextOneUp);
    this.callbacks.onSaveRequest?.();
  }

  private initializeArea(found: SubstageDefinition, charId: CharacterId, preserveScore = 0,
    preserveLives = 3, preserveNextOneUp = 15000, emitHud = true) {
    this.cancelTransitions();
    this.clearInput();
    this.clock.reset();
    this.wallKickLock = 0;
    this.standingPlatform = null;
    this.platformDeltas.clear();
    this.hitstop = 0;
    this.tickCount = 0;
    this.idleTicks = 0;
    this.visualTick = 0; this.heroAnimator.reset(); this.heroVisualTimers = { hurt:0, vault:0, special:0 };
    this.checkpointId = found.entryCheckpoint;
    this.stage = found;
    this.activated = new Set();
    this.footstepDistance = 0;
    this.characterId = charId;
    const char = CHARACTERS[charId];

    this.platforms = found.platforms.map((p) => ({
      ...p,
      originX: p.x,
      originY: p.y,
      crumbleTimer: 0,
      broken: false,
    }));
    this.ceilingPipes = found.ceilingPipes.map((c) => ({ ...c }));
    this.props = found.props.map((pr) => ({ ...pr, broken: false }));
    this.pickups = [];
    this.ambushArenas = (found.ambushArenas ?? []).map((a) => ({
      ...a,
      cleared: false,
      active: false,
    }));
    this.spawns = new SpawnManager(found, found.substageId);
    this.enemies = this.spawns.initial();
    this.bullets = [];
    this.thrownEnemies = [];
    this.particles = [];
    this.mangaTexts = [];
    this.mayaWell = null;
    this.leonFlameZone = null;
    this.sectorTransition = null;
    this.superCutinTimer = 0;
    this.dimensionalSlashes = [];
    this.knockbackLock = 0;
    this.lowCeilingActive = false;
    this.lowCeilingKind = 'gantry';
    this.lowCeilingSpeed = found.substageId === '2A' ? 14 : 16;
    this.lowCeilingSequence = 0;
    this.lowCeilingTimer = 190;
    this.lightningAlpha = 0;
    this.stageClearTriggered = false;
    this.continueTriggered = false;
    this.gameOverTriggered = false;

    const bossConfig = found.boss ?? STAGES[0].boss;
    this.boss = {
      ...bossConfig,
      mind: undefined, twinVy: 0,
      active: !!found.boss,
      triggered: false,
      hp: bossConfig.maxHp,
      vx: 0,
      vy: 0,
      facing: -1,
      phase: 1,
      attackTimer: 70,
      specialTimer: 160,
      telegraph: 0,
      twinX: bossConfig.x + 120,
      twinY: bossConfig.y,
      shieldActive: bossConfig.behavior === 'cipher',
      orbitalAngle: 0,
    };

    this.player = {
      x: found.spawnX,
      y: found.spawnY,
      w: 32,
      h: 56,
      vx: 0,
      vy: 0,
      grounded: false,
      doubleJump: char.canPsyJump,
      onWall: 0,
      lastWallSide: 0,
      lastWallX: null,
      hangingCeiling: false,
      hangingPipe: null,
      facing: 1,
      hp: char.maxHp,
      maxHp: char.maxHp,
      psyEnergy: 65,
      maxPsy: 100,
      lives: preserveLives,
      nextOneUpScore: preserveNextOneUp,
      isDashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      isSliding: false,
      slideTimer: 0,
      slashing: false,
      slashTimer: 0,
      comboStep: 0,
      comboWindow: 0,
      comboHits: 0,
      comboTimer: 0,
      invulnTimer: 45,
      stunTimer: 0,
      stunGraceTimer: 0,
      pitfallCooldown: 0,
      lastGroundX: found.spawnX,
      lastGroundY: found.spawnY + 56,
      isFlying: false,
      wavAmmo: 0,
      atkTimer: 0,
      jmpTimer: 0,
      gstTimer: 0,
      flameTimer: 0,
      score: preserveScore,
    };

    this.initScarf(found.spawnX, found.spawnY);
    this.camera = cameraTarget(this.player, this.viewport,
      { top: found.boundsTop, bottom: found.boundsBottom, width: found.boundsWidth });
    this.syncInterpolationBaseline();
    this.showAlert(`SETOR ${found.substageId}: ${found.title.toUpperCase()}`, 140);
    this.playStageMusic();
    if (emitHud) this.emitHud();
  }

  private syncInterpolationBaseline() {
    this.prevPlayerPos = { x: this.player.x, y: this.player.y };
    this.prevCameraPos = { x: this.camera.x, y: this.camera.y };
    this.prevEnemyPos.clear();
    for (const en of this.enemies) {
      this.prevEnemyPos.set(en.id, { x: en.x, y: en.y });
    }
    this.prevBossPos = {
      x: this.boss.x,
      y: this.boss.y,
      twinX: this.boss.twinX ?? this.boss.x,
      twinY: this.boss.twinY ?? this.boss.y,
    };
  }

  getPlayerCarry(): PlayerCarry {
    const p = this.player;
    return { characterId: this.characterId, hp: p.hp, psyEnergy: p.psyEnergy, lives: p.lives,
      score: p.score, nextOneUpScore: p.nextOneUpScore, wavAmmo: p.wavAmmo,
      atkTimer: p.atkTimer, jmpTimer: p.jmpTimer, gstTimer: p.gstTimer };
  }

  canResume() {
    return this.campaignMode && !this.stageClearTriggered && !this.continueTriggered && !this.gameOverTriggered && this.player.hp > 0;
  }

  getCampaignProgress(): CampaignProgress | null {
    if (!this.campaignMode) return null;
    return { chapterId: this.stage.id, substageId: this.stage.substageId, checkpointId: this.checkpointId,
      visited: [...new Set([...this.areaCache.keys(), this.stage.substageId])], player: this.getPlayerCarry() };
  }

  /** Captured between complete ticks; transient attacks/effects are intentionally not saved. */
  captureCampaignSave(muted = false): CampaignSave | null {
    if (!this.campaignMode) return null;
    this.cacheArea();
    const areas: AreaSave[] = [...this.areaCache.entries()].map(([id, area]) => ({
      id, tick: area.tick, leftAt: area.leftAt, checkpoint: area.checkpoint, activated: [...area.activated],
      platforms: area.platforms.map((platform) => ({ x: platform.x, y: platform.y,
        broken: platform.broken ?? false, crumbleTimer: platform.crumbleTimer ?? 0 })),
      props: area.props.map((prop) => ({ id: prop.id, hp: Math.max(0, prop.hp), broken: prop.broken ?? false })),
      pickups: area.pickups.map((pickup) => ({ ...pickup })),
      arenas: area.arenas.map((arena) => ({ id: arena.id, cleared: arena.cleared })),
      enemies: area.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => ({ ...enemy, ...(enemy.ai ? { ai: { ...enemy.ai } } : {}) })),
      spawns: area.spawns.snapshot(),
    }));
    return { version: 1, content: campaignContentId(this.stage.id), savedAt: Date.now(),
      chapterId: this.stage.id, current: this.stage.substageId, worldTick: this.worldTick,
      mode: this.stageClearTriggered ? 'chapter-clear' : this.gameOverTriggered ? 'game-over' :
        this.continueTriggered ? 'continue' : 'playing',
      player: { ...this.getPlayerCarry(), psyEnergy: Math.min(100, this.player.psyEnergy) },
      preferences: { muted }, areas };
  }

  /** Validate before changing the current run, then resume paused on a revalidated checkpoint. */
  restoreCampaignSave(candidate: CampaignSave) {
    const decoded = decodeCampaignSave(JSON.stringify(candidate));
    if (decoded.status !== 'ready') throw new Error(`Save ${decoded.status}`);
    const save = decoded.save;
    this.campaignMode = true;
    this.areaCache.clear();
    this.worldTick = save.worldTick;
    this.initializeArea(getSubstage(save.current), save.player.characterId,
      save.player.score, save.player.lives, save.player.nextOneUpScore, false);
    for (const area of save.areas) {
      const definition = getSubstage(area.id);
      const spawns = new SpawnManager(definition, area.id);
      spawns.restore(area.spawns);
      this.areaCache.set(area.id, {
        platforms: definition.platforms.map((platform, index) => ({ ...platform,
          originX: platform.x, originY: platform.y, ...area.platforms[index] })),
        props: definition.props.map((prop, index) => ({ ...prop, ...area.props[index] })),
        activated: [...area.activated],
        pickups: area.pickups.map((pickup) => ({ ...pickup })),
        arenas: (definition.ambushArenas ?? []).map((arena, index) => ({ ...arena,
          cleared: area.arenas[index].cleared, active: false })),
        enemies: area.enemies.map((enemy) => ({ ...enemy })), spawns,
        // A boss cannot be left through a portal. Checkpoint restores restart that encounter.
        boss: { ...this.boss, ...(definition.boss ?? {}), mind: undefined, twinVy: 0, active: !!definition.boss,
          triggered: false, hp: definition.boss?.maxHp ?? this.boss.maxHp,
          phase: 1, vx: 0, vy: 0, twinX: (definition.boss?.x ?? 0) + 120,
          twinY: definition.boss?.y ?? 0, shieldActive: definition.boss?.behavior === 'cipher' },
        tick: area.tick, checkpoint: area.checkpoint, leftAt: area.leftAt,
      });
    }
    const current = this.areaCache.get(save.current)!;
    this.activated = new Set(current.activated);
    this.platforms = current.platforms;
    this.props = current.props;
    this.pickups = current.pickups;
    this.ambushArenas = current.arenas;
    this.enemies = current.enemies;
    this.spawns = current.spawns;
    this.boss = current.boss;
    this.tickCount = current.tick;
    this.checkpointId = current.checkpoint;
    const { characterId: _, ...resources } = save.player;
    Object.assign(this.player, resources);
    this.respawnAtCheckpoint();
    this.mangaTexts = [];
    this.stageClearTriggered = save.mode === 'chapter-clear';
    this.continueTriggered = save.mode === 'continue';
    this.gameOverTriggered = save.mode === 'game-over';
    if (this.stageClearTriggered) { this.boss.active = false; this.boss.hp = 0; }
    this.paused = true;
    this.clearInput();
    this.clock.reset();
    this.shakeAmount = 0;
    sound.stopMusic();
    this.initScarf(this.player.x, this.player.y);
    this.camera = cameraTarget(this.player, this.viewport,
      { top: this.stage.boundsTop, bottom: this.stage.boundsBottom, width: this.stage.boundsWidth });
    this.syncInterpolationBaseline();
    this.emitHud();
    return save.mode;
  }

  getIntroDialogue() { return this.stage.introDialogue; }

  private cacheArea() {
    this.spawns.noteMissing(this.enemies, this.tickCount);
    this.areaCache.set(this.stage.substageId, {
      platforms: this.platforms, props: this.props, pickups: this.pickups, arenas: this.ambushArenas,
      enemies: this.enemies, boss: this.boss, spawns: this.spawns, tick: this.tickCount,
      checkpoint: this.checkpointId, leftAt: this.worldTick, activated: [...this.activated],
    });
  }

  private routeComplete() {
    return routeFinished(this.stage,this.activated);
  }
  private nextRouteNode() { return requiredRouteNodes(this.stage).find(node => !this.activated.has(node.id)); }
  /** The same local interaction is used by keyboard, touch and gamepad. */
  inspectRouteNode(id: string, action:'interact'|'smash'='interact') {
    if (!this.canAct()) return false;
    const node = this.stage.exploration?.nodes.find(node => node.id === id);
    if (!node || !overlaps(this.player, node)) return false;
    if (this.activated.has(id)) { sound.playCue('confirm'); this.showAlert(`${node.label}: ATIVO`, 80); return true; }
    if (node.requiredHero && node.requiredHero !== this.characterId) {
      sound.playCue('denied'); this.showAlert(`PASSAGEM ESPECIAL: ${node.requiredHero.toUpperCase()}`,100); return true;
    }
    if ((node.action ?? 'interact') !== action) {
      sound.playCue('denied'); this.showAlert('PAREDE FRÁGIL: LEON PODE ROMPER COM UM GOLPE.',100); return true;
    }
    if (!node.requires.every(required => this.activated.has(required))) {
      sound.playCue('denied'); this.showAlert(`SEM SINAL: examine ${this.nextRouteNode()?.label}`, 120); return true;
    }
    const guardOrigin = node.guardIndex === undefined ? null : `${this.stage.substageId}:${node.guardIndex + 1}`;
    if (guardOrigin && this.enemies.some(enemy => enemy.hp > 0 && enemy.spawnId === guardOrigin)) {
      sound.playCue('denied'); this.showAlert('POSTO PROTEGIDO: derrote o guarda do painel.', 120); return true;
    }
    this.activated.add(id);
    let opened=0;
    for (const platform of this.platforms) if (platform.gateId && !platform.broken && gateOpened(this.stage,platform.gateId,this.activated)){platform.broken=true;opened++;}
    sound.playCue(opened>0 ? 'unlock' : 'panel'); this.addMangaFx(node.action==='smash'?'PASSAGEM ROMPIDA!':'ATIVADO!', node.x, node.y - 18, '#22d3ee');
    this.showAlert(node.optional ? 'PASSAGEM ESPECIAL LIBERADA — explore os recursos e conexões.' : this.routeComplete() ? (this.stage.boss ? 'ACESSO AO CONFRONTO LIBERADO.' : 'PASSAGEM LIBERADA — procure a saída superior.') : `SINAL ENVIADO — procure ${this.nextRouteNode()?.label}`, 160);
    this.emitHud(); this.callbacks.onSaveRequest?.(); return true;
  }

  /** Portal transitions preserve the same hero and resources; only continue may choose a new one. */
  travel(exitId: string) {
    if (!this.campaignMode || !this.canAct() || this.ambushArenas.some((arena) => arena.active) ||
      this.boss.active && this.boss.triggered) return false;
    const exit = this.stage.exits.find((door) => door.id === exitId);
    if (!exit || !overlaps(this.player, exit)) return false;
    if (exit.x > this.stage.boundsWidth / 2 && !this.routeComplete()) {
      sound.playCue('denied'); this.showAlert(`PASSAGEM BLOQUEADA: ${this.nextRouteNode()?.label ?? 'explore o setor'}`, 140); this.emitHud(); return false;
    }
    const target = getSubstage(exit.target);
    if(target.id!==this.stage.id)return false; // Exploration never travels back across main chapters.
    const point = target.checkpoints.find((checkpoint) => checkpoint.id === exit.targetCheckpoint);
    if (!point) return false;
    const fromId = this.stage.substageId;
    const fromTitle = this.stage.title;
    const direction: 'forward' | 'backward' = exit.x > this.stage.boundsWidth / 2 ? 'forward' : 'backward';
    const carry = this.getPlayerCarry();
    this.cacheArea();
    const cached = this.areaCache.get(target.substageId);
    this.initializeArea(target, carry.characterId, carry.score, carry.lives, carry.nextOneUpScore, false);
    if (cached) {
      this.activated = new Set(cached.activated);
      this.platforms = cached.platforms;
      this.props = cached.props;
      this.pickups = cached.pickups;
      this.ambushArenas = cached.arenas;
      this.enemies = cached.enemies;
      this.boss = cached.boss;
      this.spawns = cached.spawns;
      this.tickCount = cached.tick;
      this.spawns.advanceAway(this.worldTick - cached.leftAt);
    }
    this.checkpointId = point.id;
    const { characterId: _, ...resources } = carry;
    Object.assign(this.player, { ...resources, x: point.x, y: point.y, invulnTimer: 60,
      lastGroundX: point.x, lastGroundY: point.y + this.player.h });
    this.initScarf(point.x, point.y);
    this.camera = cameraTarget(this.player, this.viewport,
      { top: target.boundsTop, bottom: target.boundsBottom, width: target.boundsWidth });
    this.syncInterpolationBaseline();
    if (cached) {
      // The destination is not displayed yet: returning actors are present on first reveal,
      // rather than appearing later inside the camera. All cooldown/safety rules still apply.
      const solids = this.platforms.filter((platform) => !platform.broken && platform.type !== 'acid' && platform.type !== 'laser_gate');
      this.enemies.push(...this.spawns.update(this.player, null, this.tickCount, this.enemies, solids, true));
    }
    const chapter = CAMPAIGN.find((c) => c.id === target.id);
    this.sectorTransition = {
      key: ++this.sectorTransitionSeq,
      fromId,
      toId: target.substageId,
      fromTitle,
      toTitle: target.title,
      direction,
      accentColor: target.palette.accentNeon,
      substages: chapter?.substages ?? [fromId, target.substageId],
      timer: 36,
      duration: 36,
      cameraOffsetX: direction === 'forward' ? 68 : -68,
    };
    sound.playCue('portal');
    this.emitHud();
    this.callbacks.onSaveRequest?.();
    return true;
  }

  private respawnAtCheckpoint() {
    if (this.campaignMode) {
      const point = this.stage.checkpoints.find((checkpoint) => checkpoint.id === this.checkpointId);
      if (point) {
        this.player.lastGroundX = point.x;
        this.player.lastGroundY = point.y + this.player.h;
      }
    }
    this.recoverPlayer();
  }

  continueWithCharacter(charId: CharacterId) {
    this.cancelTransitions();
    this.clearInput();
    this.clock.reset();
    this.characterId = charId;
    const profile = CHARACTERS[charId];
    const p = this.player;
    p.lives = 3;
    p.maxHp = profile.maxHp;
    p.hp = profile.maxHp;
    p.psyEnergy = 75;
    p.score = 0;
    p.nextOneUpScore = 15000;
    p.invulnTimer = 180;
    p.stunTimer = 0;
    p.stunGraceTimer = 90;
    p.flameTimer = 0;
    p.vx = 0;
    p.vy = 0;
    this.respawnAtCheckpoint();
    this.continueTriggered = false;
    this.gameOverTriggered = false;
    this.paused = false;
    this.bullets = this.bullets.filter((b) => b.fromPlayer);
    this.playStageMusic();
    sound.playVoiceShout(charId);
    this.addMangaFx('CONTINUE!', p.x, p.y - 30, '#00f0ff');
    this.showAlert(`${profile.name.toUpperCase()} ENTROU EM AÇÃO!`, 100);
    this.emitHud();
    if (this.campaignMode) this.callbacks.onSaveRequest?.();
  }

  triggerFinalGameOver() {
    this.cancelTransitions();
    this.clearInput();
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.paused = true;
    sound.stopMusic(); sound.playCue('death');
    this.callbacks.onGameOver(this.stage.id, this.player.score);
    if (this.campaignMode) this.callbacks.onSaveRequest?.();
  }

  switchCharacter(nextId?: CharacterId) {
    if (!ALLOW_TEST_CHARACTER_SWITCH || !this.canAct()) return;
    const idx = CHARACTER_ORDER.indexOf(this.characterId);
    const target = nextId ?? CHARACTER_ORDER[(idx + 1) % CHARACTER_ORDER.length];
    if (target === this.characterId) return;

    const oldRatio = this.player.hp / this.player.maxHp;
    this.characterId = target;
    const profile = CHARACTERS[target];
    this.player.maxHp = profile.maxHp;
    this.player.hp = Math.max(1, Math.floor(profile.maxHp * oldRatio));
    this.player.isFlying = false;
    this.player.flameTimer = 0;
    this.player.onWall = 0;
    this.wallContactGrace = 0;
    this.wallContactSide = 0;
    this.player.doubleJump = profile.canPsyJump && this.player.grounded;
    this.flightRequested = false;
    this.heroVisualTimers = { hurt:0, vault:0, special:0 };
    this.idleTicks = 0;
    this.heroAnimator.reset(this.visualTick);
    this.addParticle(this.player.x + 16, this.player.y + 28, profile.accentColor, 14, 6);
    this.addMangaFx(`TAG: ${profile.name.toUpperCase()}!`, this.player.x, this.player.y - 24, profile.accentColor);
    sound.sfxAssist();
    sound.playVoiceShout(target);
    this.emitHud();
  }

  private musicScene() {
    return { chapter: this.stage.id, sector: this.stage.substageId, boss: this.boss.active && this.boss.triggered,
      phase: this.boss.phase === 2 ? 2 as const : 1 as const,
      tension: this.ambushArenas.some((arena) => arena.active && !arena.cleared) };
  }
  private playStageMusic() { sound.startMusic(this.stage.musicGenre, this.musicScene()); }

  setPaused(pause: boolean) {
    this.paused = pause || this.stageClearTriggered || this.continueTriggered || this.gameOverTriggered;
    this.clock.reset();
    this.clearInput();
    if (this.paused) {
      sound.pauseMusic();
    } else {
      this.playStageMusic();
    }
  }

  start() {
    this.stop();
    this.loopActive = true;
    const loop = (timestamp: number) => {
      if (!this.loopActive) return;
      try {
        this.pollGamepadPause();
        if (!this.paused) {
          this.clock.advance(timestamp, () => {
            this.pollGamepad();
            this.update();
            return !this.paused;
          });
        }
        this.draw(timestamp);
      } catch (err) {
        console.error('GameLoop Safe Recover:', err);
      }
      if (!this.loopActive) return;
      if (this.renderer3d) {
        this.renderer3d.scheduleNextFrame(() => loop(typeof performance !== 'undefined' ? performance.now() : Date.now()));
      } else {
        this.rafId = requestAnimationFrame(loop);
      }
    };
    if (this.renderer3d) {
      this.renderer3d.scheduleNextFrame(() => loop(typeof performance !== 'undefined' ? performance.now() : Date.now()));
    } else {
      this.rafId = requestAnimationFrame(loop);
    }
  }

  stop() {
    this.loopActive = false;
    this.cancelTransitions();
    this.clearInput();
    this.clock.reset();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.renderer3d?.cancelScheduledFrame();
    sound.stopMusic();
  }

  resize(width: number, height: number) {
    this.canvas.width = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
    this.canvas.height = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
    if (!this.renderer3d) {
      this.applyPixelatedRendering(this.ctx, this.canvas);
    } else {
      this.renderer3d.resize(this.canvas.width, this.canvas.height);
    }
    this.camera = cameraTarget(this.player, this.viewport,
      { top: this.stage.boundsTop, bottom: this.stage.boundsBottom, width: this.stage.boundsWidth });
      // keep arena lock centering if active
    const activeArena = this.ambushArenas.find((arena) => arena.active && !arena.cleared);
    if (activeArena) {
      this.camera = cameraTarget(this.player, this.viewport,
        { top: this.stage.boundsTop, bottom: this.stage.boundsBottom, width: this.stage.boundsWidth },
        activeArena);
    }
  }

  setKey(key: InputKey, pressed: boolean, source: InputSource = 'keyboard') {
    if (pressed && !this.canAct()) return;
    this.input.set(source, key, pressed);
    if (key === 'jumpHeld' && !this.keys.jumpHeld) {
      this.flightRequested = false;
      this.player.isFlying = false;
    }
  }

  queueAction(action: GameAction, source: InputSource = 'keyboard') {
    if (!this.canAct()) return;
    if (action === 'jump') this.input.set(source, 'jumpHeld', true);
    this.input.enqueue(action, source);
  }

  private showAlert(msg: string, frames = 110) {
    this.alertBanner = msg;
    this.alertTimer = frames;
  }

  private pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads ?? []).find((candidate) => candidate?.connected);
    if (!pad) {
      this.input.clear('gamepad');
      this.lastGamepadJump = this.lastGamepadAttack = this.lastGamepadDash = this.lastGamepadPsy = this.lastGamepadAssist = this.lastGamepadUp = false;
      return;
    }

    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    this.input.set('gamepad', 'left', ax < -0.35 || !!pad.buttons[14]?.pressed);
    this.input.set('gamepad', 'right', ax > 0.35 || !!pad.buttons[15]?.pressed);
    const up = ay < -0.45 || !!pad.buttons[12]?.pressed;
    this.input.set('gamepad', 'up', up);
    if (up && !this.lastGamepadUp) this.queueAction('interact', 'gamepad');
    this.lastGamepadUp = up;
    this.input.set('gamepad', 'down', ay > 0.45 || !!pad.buttons[13]?.pressed);

    const jumpBtn = !!pad.buttons[0]?.pressed;
    this.input.set('gamepad', 'jumpHeld', jumpBtn);
    if (jumpBtn && !this.lastGamepadJump) this.queueAction('jump', 'gamepad');
    this.lastGamepadJump = jumpBtn;

    const atkBtn = !!pad.buttons[2]?.pressed;
    if (atkBtn && !this.lastGamepadAttack) this.queueAction('attack', 'gamepad');
    this.lastGamepadAttack = atkBtn;

    const dashBtn = !!pad.buttons[1]?.pressed || !!pad.buttons[5]?.pressed;
    if (dashBtn && !this.lastGamepadDash) this.queueAction('dash', 'gamepad');
    this.lastGamepadDash = dashBtn;

    const psyBtn = !!pad.buttons[3]?.pressed;
    if (psyBtn && !this.lastGamepadPsy) this.queueAction('psy', 'gamepad');
    this.lastGamepadPsy = psyBtn;

    const assistBtn = !!pad.buttons[4]?.pressed;
    if (assistBtn && !this.lastGamepadAssist) this.queueAction('assist', 'gamepad');
    this.lastGamepadAssist = assistBtn;
  }

  // Read Options/Start even while paused, so the same button can resume gameplay.
  private pollGamepadPause() {
    const pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected);
    const pressed = !!pad?.buttons[9]?.pressed;
    if (pressed && !this.lastGamepadPause) this.callbacks.onPauseRequest?.();
    if (!pad && this.gamepadWasConnected && !this.paused) {
      this.setPaused(true);
      this.callbacks.onPauseRequest?.();
    }
    this.lastGamepadPause = pressed;
    this.gamepadWasConnected = !!pad;
  }

  // =========================================================================
  // PLAYER ACTIONS
  // =========================================================================
  triggerJump(source: InputSource = 'keyboard') {
    if (!this.canAct()) return;
    this.input.set(source, 'jumpHeld', true);
    this.requestJump();
    if (this.tryJump() || this.flightRequested) this.jumpBuffer = 0;
  }

  /** A new aerial press can request flight; holding the takeoff press cannot. */
  private requestJump() {
    const p = this.player;
    if (CHARACTERS[this.characterId].canFlight && this.keys.jumpHeld && !p.grounded &&
      this.coyoteTicks <= 0 && p.onWall === 0 && !p.hangingCeiling &&
      p.stunTimer <= 0 && p.psyEnergy > 0.6) this.flightRequested = true;
    this.jumpBuffer = MOVEMENT.jumpBufferTicks;
  }

  private tryJump(): boolean {
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return false;

    const char = CHARACTERS[this.characterId];
    const jumpMult = p.jmpTimer > 0 ? 1.4 : 1;
    const jumpForce = char.jumpForce * jumpMult;

    // Ceiling Hang -> Vault Over!
    if (p.hangingCeiling && p.hangingPipe) {
      this.heroVisualTimers.vault = 10;
      p.hangingCeiling = false;
      p.y = p.hangingPipe.y - p.h - 2;
      p.vy = -jumpForce * MOVEMENT.vaultJump;
      p.hangingPipe = null;
      p.doubleJump = char.canPsyJump;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, this.stage.palette.pipeColor, 8, 4);
      this.addMangaFx('VAULT!', p.x, p.y - 16, this.stage.palette.pipeColor);
      return true;
    }

    // Strict Alternating Wall-Kick (Ren only, requires pressing against the wall + jump; dash does not alter kick)
    if (char.canWallJump && !p.grounded && !p.hangingCeiling) {
      let wallSide: -1 | 0 | 1 = p.onWall;
      if (wallSide === 0) {
        const solids = this.platforms.filter((plat) => !plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate');
        if (this.keys.right && !this.keys.left && this.hasWallContact(solids, 1)) wallSide = 1;
        else if (this.keys.left && !this.keys.right && this.hasWallContact(solids, -1)) wallSide = -1;
      }
      if (wallSide !== 0) {
        const sameWall =
          wallSide === p.lastWallSide &&
          p.lastWallX !== null &&
          Math.abs(p.x - p.lastWallX) < 52;
        if (sameWall) {
          return false;
        }

        p.lastWallSide = wallSide;
        p.lastWallX = p.x;
        p.isDashing = false;
        p.dashTimer = 0;
        p.vy = -jumpForce * MOVEMENT.wallKickJump;
        p.vx = -wallSide * (char.speed * MOVEMENT.wallKickSpeed);
        this.wallKickLock = MOVEMENT.wallKickLockTicks;
        p.facing = (-wallSide) as 1 | -1;
        p.onWall = 0;
        this.wallContactGrace = 0;
        this.wallContactSide = 0;
        p.doubleJump = char.canPsyJump;
        sound.sfxWallKick();
        this.addParticle(p.x + (wallSide === 1 ? p.w : 0), p.y + 20, char.trailColor, 10, 5);
        this.addMangaFx('WALL KICK!', p.x, p.y - 16, char.trailColor);
        return true;
      }
    }

    if (p.grounded || this.coyoteTicks > 0) {
      this.coyoteTicks = 0;
      p.vy = -jumpForce;
      p.grounded = false;
      p.doubleJump = char.canPsyJump;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, '#cbd5e1', 5, 3);
      return true;
    }

    if ((p.doubleJump && char.canPsyJump) || p.jmpTimer > 0) {
      p.vy = -jumpForce * MOVEMENT.aerialJump;
      if (p.jmpTimer <= 0) p.doubleJump = false;
      sound.sfxDoubleJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, char.accentColor, 12, 5);
      this.addMangaFx(p.jmpTimer > 0 ? 'AIR STEP!' : 'PSY JUMP!', p.x, p.y - 12, char.accentColor);
      return true;
    }
    return false;
  }

  private hasWallContact(solids: Platform[], side: -1 | 1): boolean {
    const p = this.player;
    for (const solid of solids) {
      const verticalOverlap = Math.min(p.y + p.h, solid.y + solid.h) - Math.max(p.y, solid.y);
      if (verticalOverlap < 16) continue;
      if (side === 1 && Math.abs((p.x + p.w) - solid.x) <= 2) return true;
      if (side === -1 && Math.abs(p.x - (solid.x + solid.w)) <= 2) return true;
    }
    return false;
  }

  triggerDropDown() {
    if (!this.canAct()) return;
    if (this.player.hangingCeiling) {
      this.player.hangingCeiling = false;
      this.player.hangingPipe = null;
      this.player.vy = 5;
    }
  }

  triggerDashOrSlide() {
    if (!this.canAct()) return;
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return;
    const char = CHARACTERS[this.characterId];

    if (this.keys.down && p.grounded && !p.isSliding) {
      p.isSliding = true;
      p.slideTimer = 22;
      this.slideHitIds.clear();
      p.vx = p.facing * (char.speed * MOVEMENT.slideSpeed);
      sound.sfxSlide();
      this.addMangaFx('SLIDE!', p.x, p.y - 10, char.trailColor);
      return;
    }

    if (p.dashCooldown <= 0 && !p.isDashing) {
      p.isDashing = true;
      p.dashTimer = 12;
      p.dashCooldown = 26;
      p.vy = 0;
      p.vx = p.facing * (char.speed * MOVEMENT.dashSpeed);
      sound.sfxDash();
      this.addParticle(p.x + p.w / 2, p.y + 28, char.trailColor, 10, 5);
      this.addMangaFx('DASH!', p.x, p.y - 14, char.trailColor);
    }
  }

  triggerAttack() {
    if (!this.canAct()) return;
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) { this.attackBuffered = false; return; }
    if (p.slashTimer > 0) {
      if (p.slashTimer <= COMBO.bufferTicks) this.attackBuffered = true;
      return;
    }

    const char = CHARACTERS[this.characterId];
    p.slashing = true;
    this.attackBuffered = false;
    p.comboStep = nextComboStep(p.comboStep, p.comboWindow);
    const swing = SWINGS[p.comboStep];
    p.slashTimer = swing.totalTicks;
    p.comboWindow = swing.totalTicks + COMBO.linkTicks;
    sound.sfxSlash(p.comboStep);
    if (p.comboStep === 2) sound.playVoiceShout(this.characterId);

    const dmgMult = p.atkTimer > 0 ? 2 : 1;
    const breakShieldsNow = char.shieldBreaker || p.atkTimer > 0;

    // WAV Wind Blade projectile
    if (p.wavAmmo > 0) {
      p.wavAmmo--;
      this.bullets.push({
        x: p.facing === 1 ? p.x + p.w : p.x - 18,
        y: p.y + 10,
        vx: p.facing * 12,
        vy: 0,
        w: 22,
        h: 34,
        fromPlayer: true,
        piercing: true,
        isWindBlade: true,
        hitIds: new Set<number>(),
        color: '#00f0ff',
        damage: Math.round(char.attackPower * 1.15 * dmgMult),
      });
      this.addMangaFx('WIND BLADE!', p.x, p.y - 24, '#00f0ff');
    }

    const range = char.slashRange;
    const slashHitbox = {
      x: p.facing === 1 ? p.x + p.w - 8 : p.x - range + 8,
      y: p.y - 16,
      w: range,
      h: p.h + 28,
    };

    const meleeSolids = enemySolids(this.platforms);
    for(const wall of this.platforms) if(wall.breakNode && !wall.broken && this.checkAABB(slashHitbox,wall) &&
      canSeeBody(p,wall,meleeSolids.filter(solid=>solid!==wall))) this.inspectRouteNode(wall.breakNode,'smash');
    // Hit destructible props & secret chests
    this.props.forEach((pr) => {
      if (pr.broken) return;
      if (this.checkAABB(slashHitbox, pr) && canSeeBody(p, pr, meleeSolids)) {
        pr.hp -= char.attackPower * dmgMult;
        this.screenShake(4);
        sound.sfxHit();
        this.addParticle(pr.x + pr.w / 2, pr.y + pr.h / 2, '#facc15', 10, 5);
        if (pr.hp <= 0) {
          pr.broken = true;
          this.addScore(pr.kind === 'chest' ? 500 : 150);
          this.addMangaFx(pr.kind === 'chest' ? 'BAÚ ABERTO!' : 'SMASH!', pr.x, pr.y - 16, '#facc15');
          this.spawnDropFromProp(pr);
        }
      }
    });

    // Hit enemies with Guard Crush & Backstab!
    this.enemies.forEach((en) => {
      if (en.hp <= 0 || !this.checkAABB(slashHitbox, en) || !canSeeBody(p, en, meleeSolids)) return;

      const enemyMid = en.x + en.w / 2;
      const playerMid = p.x + p.w / 2;
      const attackingFromBehind =
        (en.facing === 1 && playerMid < enemyMid) || (en.facing === -1 && playerMid > enemyMid);
      const hasActiveShield =
        (en.type === 'mib_shield' || en.type === 'heavy_trooper') &&
        !en.shieldBroken &&
        !en.airborne &&
        (en.stunTimer ?? 0) <= 0;

      if (hasActiveShield && !attackingFromBehind) {
        if (breakShieldsNow) {
          en.shieldBroken = true;
          en.stunTimer = 90;
          sound.sfxGuardCrush();
          this.hitstop = 5;
          this.screenShake(9);
          this.addMangaFx('SHIELD BREAK!', en.x, en.y - 26, '#f97316');
          this.hitEnemy(en, Math.round(char.attackPower * dmgMult), p.facing * 8, -5, 5);
          if (this.characterId === 'leon') {
            this.applyBurnToEnemy(en);
          }
          return;
        }

        en.shieldHits = (en.shieldHits ?? 0) + 1;
        if (en.shieldHits >= 3) {
          en.shieldBroken = true;
          en.stunTimer = 90; // 1.5s stun!
          sound.sfxGuardCrush();
          this.hitstop = 6;
          this.screenShake(11);
          this.addParticle(en.x + en.w / 2, en.y + 24, '#00f0ff', 16, 6);
          this.addMangaFx('GUARD CRUSH!', en.x, en.y - 28, '#facc15');
          this.registerHit(0);
          return;
        }

        sound.sfxBlock();
        this.screenShake(4);
        this.addMangaFx(`ESCUDO (${en.shieldHits}/3)`, en.x, en.y - 22, '#facc15');
        p.vx = -p.facing * 4.5;
        return;
      }

      const isLauncher = p.comboStep === 2 && p.grounded;
      const backstabMult = attackingFromBehind ? 2 : 1;
      const baseDmg = (char.attackPower + swing.bonusDamage) * dmgMult * backstabMult;
      const liftY = isLauncher ? -11.5 : en.airborne ? -5.8 : -3.5;
      const impactFrames = attackingFromBehind || isLauncher ? 5 : 2;
      this.hitEnemy(en, baseDmg, p.facing * (isLauncher ? 4 : 6.5), liftY, impactFrames);
      if (this.characterId === 'leon') {
        this.applyBurnToEnemy(en);
      }
      this.addMangaFx(
        attackingFromBehind ? 'BACKSTAB! 2X' : isLauncher ? 'LAUNCH!' : 'ZASH!',
        en.x,
        en.y - 20,
        attackingFromBehind ? '#facc15' : char.accentColor
      );
      if (this.characterId === 'leon' && p.comboStep === 2) {
        this.leonFlameZone = { x: en.x - 40, y: en.y + en.h - 14, w: 120, timer: 90 };
      }
    });

    // Hit Boss
    if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => this.checkAABB(slashHitbox, body) && canSeeBody(p, body, meleeSolids))) {
      if (
        this.boss.shieldActive &&
        !breakShieldsNow &&
        ((p.facing === 1 && this.boss.facing === -1) || (p.facing === -1 && this.boss.facing === 1)) &&
        !p.isSliding
      ) {
        sound.sfxBlock();
        this.screenShake(5);
        this.addMangaFx('SHIELD!', this.boss.x, this.boss.y - 24, '#00f0ff');
        p.vx = -p.facing * 6;
      } else {
        if (breakShieldsNow && this.boss.shieldActive) {
          this.boss.shieldActive = false;
          sound.sfxGuardCrush();
          this.addMangaFx('SHIELD BREAK!', this.boss.x, this.boss.y - 36, '#f97316');
        }
        this.damageBoss((char.attackPower + swing.bonusDamage) * dmgMult);
        if (this.characterId === 'leon') {
          this.applyBurnToBoss();
        }
        this.boss.vx = p.facing * 4.5;
      }
    }

    // Deflect Counter: slice enemy bullets & reflect at 2x speed aimed at shooter/nearest target!
    this.bullets.forEach((b) => {
      if (!b.fromPlayer && b.reflectable !== false && !b.dead && this.checkAABB(slashHitbox, b) && canSeeBody(p, b, meleeSolids)) {
        b.fromPlayer = true;
        const origSpeed = Math.max(6.5, Math.hypot(b.vx, b.vy));
        const targetSpeed = origSpeed * 2;

        // Aim back at shooter if alive, or nearest enemy/boss
        let target: { x: number; y: number; w: number; h: number } | undefined =
          b.shooterId !== undefined ? this.enemies.find((e) => e.id === b.shooterId) : undefined;
        if (!target && this.boss.active && this.boss.triggered) {
          target = bossBodies(this.boss).sort((left, right) => Math.hypot(left.x - b.x, left.y - b.y) - Math.hypot(right.x - b.x, right.y - b.y))[0];
        }
        if (!target) {
          target = this.enemies.filter((enemy) => enemy.hp > 0).sort((left, right) =>
            Math.hypot(left.x - b.x, left.y - b.y) - Math.hypot(right.x - b.x, right.y - b.y))[0];
        }

        if (target) {
          const tx = target.x + target.w / 2 - b.x;
          const ty = target.y + target.h * 0.4 - b.y;
          const d = Math.max(1, Math.hypot(tx, ty));
          b.vx = (tx / d) * targetSpeed;
          b.vy = (ty / d) * targetSpeed;
        } else {
          b.vx = -b.vx * 2;
          b.vy = -b.vy * 2;
        }

        b.color = '#00f0ff';
        b.damage = 42 * dmgMult;
        this.hitstop = 4;
        sound.sfxDeflect();
        try {
          navigator.vibrate?.(35);
        } catch {
          // Ignore haptic rejection on desktop
        }
        this.addParticle(b.x, b.y, '#00f0ff', 10, 6);
        this.addMangaFx('DEFLECT 2X!', b.x, b.y - 18, '#00f0ff');
        p.psyEnergy = Math.min(p.maxPsy, p.psyEnergy + 8);
        this.addScore(100);
      }
    });
  }

  private spawnDropFromProp(pr: DestructibleProp) {
    const cx = pr.x + pr.w / 2 - 11;
    const cy = pr.y + pr.h - 24;
    if (pr.dropType === 'none') return;
    if (pr.dropType === 'secret_a' || pr.dropType === 'secret_b') sound.playCue('secret');
    if (pr.dropType === 'secret_a') {
      // Secret Chest A: 12x WAV + Camuflagem Óptica (GST)
      this.pickups.push({ x: cx - 14, y: cy, w: 22, h: 22, kind: 'wav', amount: 12, vy: -6 });
      this.pickups.push({ x: cx + 14, y: cy, w: 22, h: 22, kind: 'gst', vy: -5 });
    } else if (pr.dropType === 'secret_b') {
      // Secret Chest B: ATK 2X + Cura 100%
      this.pickups.push({ x: cx - 14, y: cy, w: 22, h: 22, kind: 'atk', vy: -6 });
      this.pickups.push({ x: cx + 14, y: cy, w: 22, h: 22, kind: 'full_heal', vy: -5 });
    } else {
      this.pickups.push({ x: cx, y: cy, w: 22, h: 22, kind: pr.dropType, vy: -5 });
    }
  }

  triggerPsy() {
    if (!this.canAct()) return;
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return;
    const char = CHARACTERS[this.characterId];

    // OVERDRIVE when Focus >= 95%
    if (p.psyEnergy >= 95) {
      p.psyEnergy = 0;
      this.superCutinTimer = 46;
      this.heroVisualTimers.special = 24;
      this.superLabel = char.overdriveName;
      this.screenShake(24);
      sound.sfxOverdrive(this.characterId);
      sound.playVoiceShout(this.characterId);

      this.dimensionalSlashes = [];
      for (let i = 0; i < 16; i++) {
        this.dimensionalSlashes.push({
          x1: Math.random() * this.canvas.width,
          y1: Math.random() * this.canvas.height,
          x2: Math.random() * this.canvas.width,
          y2: Math.random() * this.canvas.height,
        });
      }

      // Gameplay radius is independent of phone/window resolution.
      this.enemies.forEach((en) => {
        if (Math.hypot(en.x - p.x, en.y - p.y) < 760) {
          this.hitEnemy(en, 110, (en.x > p.x ? 1 : -1) * 10, -12, 6);
          if (this.characterId === 'leon') this.applyBurnToEnemy(en, 6, 200);
        }
      });
      if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => Math.abs(body.x - p.x) < 760)) {
        this.damageBoss(100);
        if (this.characterId === 'leon') this.applyBurnToBoss(8, 220);
      }
      this.bullets = this.bullets.filter((b) => b.fromPlayer);
      this.emitHud();
      return;
    }

    if (p.psyEnergy < 25) {
      this.addMangaFx('SEM FOCO!', p.x, p.y - 20, '#ef4444');
      sound.sfxBlock();
      return;
    }

    // Leon's Exclusive Flame Psy Skill: Chama Intensa (activates 2x burn DoT overclock + radial flame wave)
    if (this.characterId === 'leon') {
      p.psyEnergy -= 25;
      p.flameTimer = 480; // 8s of doubled fire burn DoT
      this.heroVisualTimers.special = 18;
      sound.sfxPsyThrow();
      sound.playVoiceShout('leon');
      this.hitstop = 4;
      this.screenShake(10);
      this.addMangaFx('CHAMA INTENSA!', p.x, p.y - 28, '#f97316');
      this.addParticle(p.x + p.w / 2, p.y + p.h / 2, '#f97316', 22, 9);
      this.leonFlameZone = { x: p.x - 74, y: p.y + p.h - 14, w: 180, timer: 110 };
      this.enemies.forEach((en) => {
        if (Math.hypot(en.x - p.x, en.y - p.y) < 230) {
          this.hitEnemy(en, 28, (en.x >= p.x ? 1 : -1) * 9, -6, 4);
          this.applyBurnToEnemy(en);
        }
      });
      if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => Math.hypot(body.x - p.x, body.y - p.y) < 230)) {
        this.damageBoss(24);
        this.applyBurnToBoss();
      }
      this.emitHud();
      return;
    }

    let targetIdx = -1;
    let minDist = 240;
    this.enemies.forEach((en, idx) => {
      const dist = Math.hypot(en.x - p.x, en.y - p.y);
      if (!en.mount && en.hp > 0 && dist < minDist) {
        minDist = dist;
        targetIdx = idx;
      }
    });

    if (targetIdx !== -1 && p.psyEnergy >= 28) {
      p.psyEnergy -= 28;
      const grabbed = this.enemies.splice(targetIdx, 1)[0];
      grabbed.hp = 0;
      this.addScore(this.spawns.claimDefeatReward(grabbed));
      sound.sfxPsyThrow();
      sound.playVoiceShout(this.characterId);
      this.hitstop = 4;
      this.screenShake(10);
      this.addMangaFx('TELE-THROW!', p.x, p.y - 26, '#a855f7');
      this.thrownEnemies.push({
        hitIds: new Set<number>(),
        x: p.x + p.facing * 36,
        y: p.y,
        w: grabbed.w,
        h: grabbed.h,
        vx: p.facing * 18,
        damage: 70,
        color: '#a855f7',
      });
    } else {
      p.psyEnergy -= 25;
      sound.sfxPsyThrow();
      sound.playVoiceShout(this.characterId);
      this.hitstop = 4;
      this.screenShake(9);
      this.addMangaFx('PSY-BURST!', p.x, p.y - 26, '#a855f7');
      this.addParticle(p.x + p.w / 2, p.y + p.h / 2, '#a855f7', 18, 9);
      this.enemies.forEach((en) => {
        if (Math.hypot(en.x - p.x, en.y - p.y) < 195) {
          this.hitEnemy(en, 38, (en.x >= p.x ? 1 : -1) * 11, -8, 4);
        }
      });
      if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => Math.hypot(body.x - p.x, body.y - p.y) < 195)) {
        this.damageBoss(35);
      }
    }
    this.emitHud();
  }

  triggerAssist() {
    if (!this.canAct()) return;
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0 || p.psyEnergy < 32 || this.mayaWell !== null) {
      this.addMangaFx('RECARREGANDO!', p.x, p.y - 20, '#facc15');
      sound.sfxBlock();
      return;
    }

    p.psyEnergy -= 32;
    sound.sfxAssist();
    this.screenShake(11);

    if (this.characterId === 'ren') {
      this.addMangaFx('MAYA: GRAVIDADE!', p.x + p.facing * 100, p.y - 30, '#00f0ff');
      let wellX = Math.max(40, Math.min(this.stage.boundsWidth - 40, p.x + p.w / 2 + p.facing * 150));
      const wellY = p.y + p.h / 2 - 22;
      const probe = { x: wellX - 8, y: wellY - 8, w: 16, h: 16 };
      if (this.platforms.some((plat) => !plat.broken && (plat.type === 'solid' || plat.type === 'wall') && overlaps(probe, plat))) {
        wellX = Math.max(40, Math.min(this.stage.boundsWidth - 40, p.x + p.w / 2 + p.facing * 75));
      }
      this.mayaWell = {
        x: wellX,
        y: wellY,
        timer: 165,
        radius: 265,
      };
    } else if (this.characterId === 'maya') {
      this.addMangaFx('LEON: INFERNO!', p.x + p.facing * 90, p.y - 30, '#f97316');
      this.leonFlameZone = {
        x: p.x + (p.facing === 1 ? 20 : -240),
        y: p.y + p.h - 18,
        w: 240,
        timer: 140,
      };
    } else {
      this.addMangaFx('REN: BLITZ!', p.x + p.facing * 90, p.y - 30, '#ff007f');
      this.enemies.forEach((en) => {
        if (Math.abs(en.x - p.x) < 320 && Math.abs(en.y - p.y) < 180) {
          this.hitEnemy(en, 50, p.facing * 8, -9, 5);
        }
      });
      if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => Math.abs(body.x - p.x) < 320)) {
        this.damageBoss(40);
      }
    }
    this.emitHud();
  }

  // =========================================================================
  // COMBAT & SCORE HELPERS
  // =========================================================================
  private addScore(points: number) {
    this.player.score += points;
    while (this.player.score >= this.player.nextOneUpScore) {
      this.player.lives++;
      this.player.nextOneUpScore += 15000;
      sound.sfxOneUp();
      this.addMangaFx('1-UP! ♥', this.player.x, this.player.y - 38, '#22c55e');
      this.showAlert('VIDA EXTRA CONQUISTADA! (1-UP)', 100);
    }
  }

  private hitEnemy(en: Enemy, dmg: number, kx: number, ky: number, hitstopFrames = 3) {
    if (en.hp <= 0) return;
    en.hp -= dmg;
    en.hitFlashTimer = 2;
    en.vx = en.mount ? 0 : kx;
    en.vy = en.mount ? 0 : ky;
    en.airborne = !en.mount;
    if (en.ai) { en.ai.state = en.hp <= 0 ? 'dead' : 'stunned'; en.ai.timer = 12; en.telegraph = 0; }
    this.hitstop = Math.max(this.hitstop, hitstopFrames);
    this.screenShake(6);
    sound.sfxHit(en.type === 'turret' || en.type === 'drone' || en.type === 'heavy_trooper' ? 'metal' : 'body');
    this.addParticle(en.x + en.w / 2, en.y + en.h / 2, CHARACTERS[this.characterId].accentColor, 10, 5);
    this.registerHit(0);
    if (en.hp <= 0) this.addScore(this.spawns.claimDefeatReward(en));
  }

  private applyBurnToEnemy(en: Enemy, overrideDmg?: number, overrideDuration?: number) {
    if (en.hp <= 0) return;
    const boosted = this.characterId === 'leon' && this.player.flameTimer > 0;
    const dmg = overrideDmg ?? (boosted ? 6 : 3);
    const duration = overrideDuration ?? (boosted ? 200 : 144);
    const interval = boosted ? 20 : 24;
    if (!en.burnTimer || en.burnTimer <= 0) {
      en.burnTickTimer = interval;
    }
    en.burnTimer = Math.max(en.burnTimer ?? 0, duration);
    en.burnDamage = Math.max(en.burnDamage ?? 0, dmg);
  }

  private applyBurnToBoss(overrideDmg?: number, overrideDuration?: number) {
    if (!this.boss.active || !this.boss.triggered || this.boss.hp <= 0) return;
    const boosted = this.characterId === 'leon' && this.player.flameTimer > 0;
    const dmg = overrideDmg ?? (boosted ? 8 : 4);
    const duration = overrideDuration ?? (boosted ? 220 : 168);
    const interval = boosted ? 20 : 24;
    if (!this.boss.burnTimer || this.boss.burnTimer <= 0) {
      this.boss.burnTickTimer = interval;
    }
    this.boss.burnTimer = Math.max(this.boss.burnTimer ?? 0, duration);
    this.boss.burnDamage = Math.max(this.boss.burnDamage ?? 0, dmg);
  }

  private tickBurns() {
    const interval = this.characterId === 'leon' && this.player.flameTimer > 0 ? 20 : 24;
    for (const en of this.enemies) {
      if (en.hp <= 0 || !en.burnTimer || en.burnTimer <= 0) continue;
      en.burnTimer--;
      if (en.burnTimer % 6 === 0) {
        this.addParticle(en.x + Math.random() * en.w, en.y + Math.random() * (en.h * 0.7), '#f97316', 1, 2.2);
      }
      en.burnTickTimer = (en.burnTickTimer ?? interval) - 1;
      if (en.burnTickTimer <= 0) {
        en.burnTickTimer = interval;
        const dmg = en.burnDamage ?? 3;
        en.hp -= dmg;
        en.hitFlashTimer = 1;
        this.addParticle(en.x + en.w / 2, en.y + en.h * 0.4, '#fb923c', 4, 3);
        this.addMangaFx(`-${dmg}`, en.x + en.w * 0.25, en.y - 10, '#f97316');
        if (en.hp <= 0) {
          if (en.ai) en.ai.state = 'dead';
          this.addScore(this.spawns.claimDefeatReward(en));
          this.addParticle(en.x + en.w / 2, en.y + en.h / 2, '#f97316', 10, 5);
        }
      }
    }

    if (this.boss.active && this.boss.triggered && this.boss.burnTimer && this.boss.burnTimer > 0) {
      this.boss.burnTimer--;
      if (this.boss.burnTimer % 5 === 0) {
        this.addParticle(this.boss.x + Math.random() * this.boss.w, this.boss.y + Math.random() * (this.boss.h * 0.8), '#fb923c', 2, 2.5);
      }
      this.boss.burnTickTimer = (this.boss.burnTickTimer ?? interval) - 1;
      if (this.boss.burnTickTimer <= 0) {
        this.boss.burnTickTimer = interval;
        this.damageBoss(this.boss.burnDamage ?? 4, true);
      }
    }
  }

  private damageBoss(dmg: number, isDot = false) {
    if (!this.boss.active || this.stageClearTriggered) return;
    this.boss.hp -= dmg;
    if (isDot) {
      this.addParticle(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h * 0.4, '#f97316', 5, 3.5);
      this.addMangaFx(`-${dmg}`, this.boss.x + this.boss.w * 0.3, this.boss.y - 16, '#f97316');
    } else {
      this.hitstop = Math.max(this.hitstop, 4);
      this.screenShake(8);
      sound.sfxHit('boss');
      this.addParticle(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, this.boss.accentColor, 14, 6);
      this.addMangaFx('CRUSH!', this.boss.x, this.boss.y - 24, '#ff007f');
      this.registerHit(200);
    }

    if (this.boss.phase === 1 && this.boss.hp <= this.boss.maxHp * 0.5) {
      this.boss.phase = 2;
      this.boss.shieldActive = false;
      this.showAlert(
        this.boss.behavior === 'oswald'
          ? 'FASE 2: ENTIDADE ZERO DESPERTOU!'
          : `${this.boss.name} ENTROU EM OVERLOAD!`,
        130
      );
      this.addMangaFx('PHASE 2!', this.boss.x, this.boss.y - 48, '#facc15');
      sound.sfxAlarm();
      this.screenShake(16);
    }

    if (this.boss.hp <= 0 && !this.stageClearTriggered) {
      this.boss.hp = 0;
      this.boss.active = false;
      this.stageClearTriggered = true;
      this.setPaused(true);
      this.addScore(2500);
      this.screenShake(22);
      this.addParticle(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, '#00f0ff', 36, 9);
      this.addMangaFx('STAGE CLEAR!', this.boss.x, this.boss.y - 40, '#00f0ff');
      sound.sfxStageClear();
      this.emitHud();
      if (this.campaignMode) this.callbacks.onSaveRequest?.();
      this.scheduleTransition(() => {
        this.callbacks.onStageClear(this.stage.id, this.player.score);
      }, 1150);
    }
  }

  private damagePlayer(dmg: number, knockX: number, ignoreInvuln = false, isWeakBullet = false) {
    const p = this.player;
    const char = CHARACTERS[this.characterId];
    if (this.stageClearTriggered || this.continueTriggered || this.gameOverTriggered) return false;
    if (p.gstTimer > 0 && !ignoreInvuln) return false; // GST optical camouflage invulnerability
    if (!ignoreInvuln && (p.invulnTimer > 0 || p.isDashing)) return false;

    this.flightRequested = false;
    p.isFlying = false;

    // Leon Super Armor: absorbs knockback/flinch from weak bullets!
    if (char.superArmor && isWeakBullet) {
      p.hp = Math.max(0, p.hp - Math.round(dmg * 0.7));
      p.invulnTimer = 42;
      this.addMangaFx('SUPER ARMOR!', p.x, p.y - 18, '#f97316');
      sound.sfxBlock();
    } else {
      this.resetAttack();
      this.heroVisualTimers.hurt = 12;
      p.hp = Math.max(0, p.hp - dmg);
      p.vx = knockX;
      if (Math.abs(knockX) >= 8) this.knockbackLock = Math.max(this.knockbackLock, 11);
      p.invulnTimer = 42;
      this.screenShake(10);
      sound.sfxHurt();
      this.addParticle(p.x + 16, p.y + 28, '#ef4444', 12, 6);
      this.addMangaFx('OUCH!', p.x, p.y - 16, '#ef4444');
    }

    if (p.hp <= 0) {
      if (p.lives > 1) {
        p.lives--;
        p.hp = p.maxHp;
        p.invulnTimer = 180; // 3 seconds I-Frames!
        p.stunTimer = 0;
        p.stunGraceTimer = 90;
        p.vx = 0;
        p.vy = 0;
        this.respawnAtCheckpoint();
        this.addMangaFx('RESPAWN! 3s I-FRAMES', p.x, p.y - 30, '#00f0ff');
        this.showAlert(`VIDAS RESTANTES: ${p.lives}`, 90);
        this.emitHud();
        if (this.campaignMode) this.callbacks.onSaveRequest?.();
      } else if (!this.continueTriggered) {
        p.lives = 0;
        this.continueTriggered = true;
        this.setPaused(true);
        this.emitHud();
        if (this.campaignMode) this.callbacks.onSaveRequest?.();
        this.scheduleTransition(() => {
          this.callbacks.onContinueCountdown(this.stage.id, p.score);
        }, 450);
      }
    }
    return true;
  }

  private registerHit(scorePoints: number) {
    this.player.comboHits++;
    this.player.comboTimer = 130;
    this.player.psyEnergy = Math.min(this.player.maxPsy, this.player.psyEnergy + 8);
    this.addScore(scorePoints * Math.max(1, Math.floor(this.player.comboHits / 3)));
  }

  private checkAABB(
    r1: { x: number; y: number; w: number; h: number },
    r2: { x: number; y: number; w: number; h: number }
  ) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  }

  private addParticle(x: number, y: number, color: string, count = 6, speed = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        life: 1.0,
        decay: 0.025 + Math.random() * 0.03,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private addMangaFx(text: string, x: number, y: number, color = '#ff007f') {
    this.mangaTexts.push({
      text,
      x,
      y,
      color,
      scale: 0.5,
      alpha: 1,
      vy: -1.8,
      rot: (Math.random() - 0.5) * 0.35,
    });
  }

  private screenShake(val: number) {
    this.shakeAmount = Math.max(this.shakeAmount, val);
  }

  // =========================================================================
  // UPDATE LOOP
  // =========================================================================
  private update() {
    this.syncInterpolationBaseline();
    this.worldTick++;
    this.tickCount++;

    if (this.superCutinTimer > 0) {
      this.superCutinTimer--;
      return;
    }
    for (const en of this.enemies) {
      if (en.hitFlashTimer && en.hitFlashTimer > 0) en.hitFlashTimer--;
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    this.visualTick++;
    for (const key of ['hurt','vault','special'] as const) this.heroVisualTimers[key] = Math.max(0,this.heroVisualTimers[key]-1);
    const p = this.player;
    const char = CHARACTERS[this.characterId];
    this.coyoteTicks = p.grounded ? MOVEMENT.coyoteTicks : Math.max(0, this.coyoteTicks - 1);
    this.wallContactGrace = Math.max(0, this.wallContactGrace - 1);
    let interactRequested = false;
    for (const { action } of this.input.drain()) {
      if (action === 'interact') interactRequested = true;
      if (action === 'jump') this.requestJump();
      if (action === 'attack') this.triggerAttack();
      if (action === 'dash') this.triggerDashOrSlide();
      if (action === 'psy') this.triggerPsy();
      if (action === 'assist') this.triggerAssist();
    }
    if (this.jumpBuffer > 0) {
      if (this.tryJump() || this.flightRequested) this.jumpBuffer = 0;
      else this.jumpBuffer--;
    }

    if (this.alertTimer > 0) {
      this.alertTimer--;
      if (this.alertTimer <= 0) this.alertBanner = null;
    }
    if (p.invulnTimer > 0) p.invulnTimer--;
    if (p.stunTimer > 0) p.stunTimer--;
    if (p.stunGraceTimer > 0) p.stunGraceTimer--;
    if (p.pitfallCooldown > 0) p.pitfallCooldown--;
    if (p.atkTimer > 0) p.atkTimer--;
    if (p.jmpTimer > 0) p.jmpTimer--;
    if (p.gstTimer > 0) p.gstTimer--;
    if (p.flameTimer > 0) {
      p.flameTimer--;
      if (this.characterId === 'leon' && this.tickCount % 6 === 0) {
        this.addParticle(p.x + Math.random() * p.w, p.y + p.h * 0.7, '#f97316', 1, 2.5);
      }
    }
    if (!p.isFlying && p.psyEnergy < p.maxPsy) p.psyEnergy += 0.07;
    if (this.shakeAmount > 0) this.shakeAmount *= 0.85;

    // Update moving & crumbling platforms
    this.platformDeltas.clear();
    this.platforms.forEach((plat) => {
      if (plat.type === 'moving' && plat.originX !== undefined && plat.originY !== undefined) {
        const previousX = plat.x;
        const previousY = plat.y;
        const offset = Math.sin(this.tickCount * (plat.moveSpeed ?? 0.03)) * (plat.moveRange ?? 80);
        if (plat.moveAxis === 'x') plat.x = plat.originX + offset;
        else plat.y = plat.originY + offset;
        this.platformDeltas.set(plat, { x: plat.x - previousX, y: plat.y - previousY });
        if (this.standingPlatform === plat && p.grounded) {
          const obstacles = this.platforms.filter((other) => other !== plat && !other.broken && other.type !== 'acid' && other.type !== 'laser_gate');
          moveAgainstSolids(p, plat.x - previousX, 'x', obstacles);
          moveAgainstSolids(p, plat.y - previousY, 'y', obstacles);
        }
      }
      if (plat.type === 'crumble' && plat.crumbleTimer && plat.crumbleTimer > 0) {
        plat.crumbleTimer++;
        if (plat.crumbleTimer > 38 && !plat.broken) {
          plat.broken = true;
          this.addParticle(plat.x + plat.w / 2, plat.y + 8, '#eab308', 12, 5);
        }
        if (plat.crumbleTimer > 200) {
          plat.broken = false;
          plat.crumbleTimer = 0;
        }
      }
    });

    // Stage 2: Monorail Express Hazards (overhead gantries to slide/dash + low track sweepers to jump)
    if (this.stage.hasLowCeilingHazard && !this.boss.triggered) {
      this.lowCeilingTimer--;
      if (this.lowCeilingTimer <= 0 && !this.lowCeilingActive) {
        const seq = this.lowCeilingSequence++;
        const pattern: ('gantry' | 'sweeper')[] = ['gantry', 'sweeper', 'gantry', 'sweeper', 'sweeper', 'gantry'];
        this.lowCeilingKind = pattern[seq % pattern.length];
        this.lowCeilingSpeed =
          this.lowCeilingKind === 'sweeper'
            ? this.stage.substageId === '2A' ? 12 : 14
            : this.stage.substageId === '2A' ? 14 : 16;
        this.lowCeilingActive = true;
        this.lowCeilingX = p.x + 880;
        this.lowCeilingTimer = this.stage.substageId === '2C' ? (seq % 3 === 2 ? 195 : 240) : 275;
        sound.sfxAlarm();
        this.showAlert(
          this.lowCeilingKind === 'sweeper'
            ? 'PERIGO BAIXO: VARREDOR NO TRILHO — PULE (PULO)!'
            : 'PERIGO ALTO: PÓRTICO BAIXO — DESLIZE (▼ + DASH) ou DASH!',
          90
        );
      }
      if (this.lowCeilingActive) {
        this.lowCeilingX -= this.lowCeilingSpeed;
        if (this.lowCeilingKind === 'sweeper') {
          const sweeperBox = { x: this.lowCeilingX, y: 612, w: 78, h: 38 };
          const playerBox = p.isSliding ? { x: p.x, y: p.y + 34, w: p.w + 12, h: 22 } : p;
          if (this.checkAABB(playerBox, sweeperBox)) {
            if (p.isDashing && p.grounded) {
              p.isDashing = false;
              p.dashTimer = 0;
            }
            if (this.damagePlayer(20, -11)) {
              p.vy = Math.min(p.vy, -5.2);
              this.addMangaFx('VARRIDO!', p.x, p.y - 24, '#ef4444');
            }
          }
        } else {
          const beamBox = { x: this.lowCeilingX, y: 496, w: 130, h: 110 };
          if (this.checkAABB(p, beamBox) && !p.isSliding) {
            if (this.damagePlayer(22, -11)) {
              p.vy = Math.min(p.vy, -4.2);
              this.addMangaFx('IMPACTO!', p.x, p.y - 24, '#facc15');
            }
          }
        }
        if (this.lowCeilingX < p.x - 520) this.lowCeilingActive = false;
      }
    }

    // Stage 3: Storm lightning flash
    if (this.stage.palette.weather === 'storm') {
      if (this.lightningAlpha > 0) this.lightningAlpha *= 0.88;
      if (Math.random() < 0.004) this.lightningAlpha = 0.65;
    }

    if (this.sectorTransition) {
      this.sectorTransition.timer--;
      this.sectorTransition.cameraOffsetX *= 0.82;
      if (Math.abs(this.sectorTransition.cameraOffsetX) < 0.5) this.sectorTransition.cameraOffsetX = 0;
      if (this.sectorTransition.timer <= 0) this.sectorTransition = null;
    }

    // Maya Gravity Well active
    if (this.mayaWell) {
      this.mayaWell.timer--;
      const well = this.mayaWell;
      const grav = 0.6 * this.stage.gravityScale;
      this.enemies.forEach((en) => {
        if (en.hp <= 0 || en.mount) return;
        const ex = en.x + en.w / 2;
        const ey = en.y + en.h / 2;
        const dx = well.x - ex;
        const dy = well.y - ey;
        const dist = Math.hypot(dx, dy);
        if (dist <= well.radius) {
          // Suspend normal AI movement so patrol/chase/flight does not fight the singularity
          en.stunTimer = Math.max(en.stunTimer ?? 0, 6);
          if (dist > 6) {
            const pullSpeed = Math.min(8.5, Math.max(3.8, dist * 0.085));
            const targetVx = (dx / dist) * pullSpeed;
            const targetVy = (dy / dist) * pullSpeed;
            en.vx = en.vx * 0.6 + targetVx * 0.55;
            en.vy = en.vy * 0.6 + targetVy * 0.55 - grav;
          } else {
            en.vx *= 0.45;
            en.vy = -grav;
          }
          en.airborne = true;
        }
      });
      if (this.mayaWell.timer <= 0) this.mayaWell = null;
    }

    // Leon Inferno Floor active
    if (this.leonFlameZone) {
      this.leonFlameZone.timer--;
      if (this.leonFlameZone.timer % 16 === 0) {
        this.enemies.forEach((en) => {
          if (
            en.x + en.w > this.leonFlameZone!.x &&
            en.x < this.leonFlameZone!.x + this.leonFlameZone!.w &&
            Math.abs(en.y + en.h - this.leonFlameZone!.y) < 60
          ) {
            this.hitEnemy(en, 12, (en.x > p.x ? 1 : -1) * 3, -4, 1);
            this.applyBurnToEnemy(en);
          }
        });
        if (
          this.boss.active &&
          this.boss.triggered &&
          bossBodies(this.boss).some(
            (b) =>
              b.x + b.w > this.leonFlameZone!.x &&
              b.x < this.leonFlameZone!.x + this.leonFlameZone!.w &&
              Math.abs(b.y + b.h - this.leonFlameZone!.y) < 70
          )
        ) {
          this.damageBoss(12);
          this.applyBurnToBoss();
        }
      }
      if (this.leonFlameZone.timer <= 0) this.leonFlameZone = null;
    }

    this.tickBurns();

    // Combat timers
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.dashTimer > 0) {
      p.dashTimer--;
      if (p.dashTimer <= 0) p.isDashing = false;
    }
    if (p.slideTimer > 0) {
      p.slideTimer--;
      this.enemies.forEach((en) => {
        if (this.checkAABB({ x: p.x, y: p.y + 34, w: p.w + 14, h: 22 }, en)) {
          if ((!en.airborne || en.vy >= 0) && !this.slideHitIds.has(en.id)) {
            this.slideHitIds.add(en.id);
            this.hitEnemy(en, 18, p.facing * 4, -12.5, 4);
            this.addMangaFx('LAUNCH!', en.x, en.y - 24, '#00f0ff');
          }
        }
      });
      if (p.slideTimer <= 0) p.isSliding = false;
    }
    if (p.slashTimer > 0) {
      p.slashTimer--;
      const swing = SWINGS[p.comboStep];
      p.slashing = p.slashTimer > swing.totalTicks - swing.activeTicks;
    }
    if (p.comboWindow > 0) p.comboWindow--;
    if (p.stunTimer > 0) this.resetAttack();
    if (this.attackBuffered && p.slashTimer === 0) this.triggerAttack();
    if (p.comboTimer > 0) {
      p.comboTimer--;
      if (p.comboTimer <= 0) p.comboHits = 0;
    }

    // Maya 8-Directional Free Flight check
    const wasFlying = p.isFlying;
    p.isFlying =
      char.canFlight &&
      this.flightRequested &&
      this.keys.jumpHeld &&
      !p.grounded &&
      p.onWall === 0 &&
      !p.hangingCeiling &&
      p.psyEnergy > 0.6 &&
      p.stunTimer <= 0;
    if (!p.isFlying) this.flightRequested = false;

    // Briefly preserve outward wall-kick or heavy knockback impulse instead of overriding it immediately.
    if (this.wallKickLock > 0) this.wallKickLock--;
    if (this.knockbackLock > 0) this.knockbackLock--;
    // Horizontal movement
    if (!p.isDashing && !p.isSliding && this.wallKickLock === 0) {
      if (this.knockbackLock > 0) {
        p.vx *= 0.91;
      } else if (p.stunTimer > 0) {
        p.vx *= MOVEMENT.stunDrag;
      } else {
        const direction = this.keys.left ? -1 : this.keys.right ? 1 : 0;
        p.vx = horizontalVelocity(p.vx, direction, char.speed * (p.isFlying ? MOVEMENT.flightSpeedX : 1),
          MOVEMENT_PROFILES[this.characterId], p.grounded, p.isFlying);
        if (direction) p.facing = direction;
      }
      if (!p.grounded && !p.hangingCeiling && !p.isFlying) {
        p.vx += this.stage.windForce;
      }
    }

    // Ceiling Pipe Hang
    if (!p.hangingCeiling && p.vy < 0 && !p.isFlying) {
      this.ceilingPipes.forEach((pipe) => {
        if (p.x + p.w > pipe.x && p.x < pipe.x + pipe.w && Math.abs(p.y - (pipe.y + pipe.h)) < 18) {
          p.hangingCeiling = true;
          p.hangingPipe = pipe;
          p.y = pipe.y + pipe.h;
          p.vy = 0;
          p.doubleJump = char.canPsyJump;
          p.lastWallSide = 0;
          p.lastWallX = null;
          sound.sfxGrabPipe();
          this.addMangaFx('HANG!', p.x, p.y + 42, this.stage.palette.pipeColor);
        }
      });
    }

    // Vertical physics: Ceiling Hang / Maya 8-Dir Flight / Active Wall Climb / Gravity
    if (p.hangingCeiling) {
      p.vy = 0;
      if (this.keys.left) p.vx = -char.speed * MOVEMENT.hangSpeed;
      else if (this.keys.right) p.vx = char.speed * MOVEMENT.hangSpeed;
      else p.vx = 0;
    } else if (p.isFlying) {
      p.psyEnergy = Math.max(0, p.psyEnergy - MOVEMENT.flightDrain);
      if (this.keys.up) p.vy = -char.speed * MOVEMENT.flightSpeedY;
      else if (this.keys.down) p.vy = char.speed * MOVEMENT.flightSpeedY;
      else p.vy *= 0.75;
      if (this.tickCount % 5 === 0) {
        this.addParticle(p.x + p.w / 2, p.y + p.h, '#00f0ff', 2, 2.5);
      }
    } else {
      let gravity = MOVEMENT.gravity * this.stage.gravityScale;
      if (p.onWall !== 0 && p.vy > 0) {
        gravity = MOVEMENT.wallSlideGravity;
      }
      p.vy += gravity;
      if (p.onWall !== 0 && p.vy > MOVEMENT.wallSlideTerminal) p.vy = MOVEMENT.wallSlideTerminal;
    }

    if (p.isFlying && (this.keys.left || this.keys.right) && (this.keys.up || this.keys.down)) {
      p.vx /= Math.SQRT2;
      p.vy /= Math.SQRT2;
    }
    p.vy = Math.min(p.vy, MOVEMENT.terminalVelocity);

    // Ambush Arena activation & clamping
    const activeArena = this.checkAmbushArenas();

    const solids = this.platforms.filter((plat) => !plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate');
    if (!depenetrate(p, solids)) {
      if (p.pitfallCooldown <= 0) {
        p.pitfallCooldown = 90;
        this.damagePlayer(25, 0, true);
      }
      this.recoverPlayer();
      if (!this.canAct()) return;
    }
    const wasGrounded = p.grounded, footstepStartX = p.x;
    const preCollisionVx = p.vx;
    const wall = moveAgainstSolids(p, p.vx, 'x', solids);
    if (wall) {
      p.vx = 0;
      if (p.isDashing) {
        p.isDashing = false;
        p.dashTimer = 0;
      }
    }
    const minBoundX = activeArena ? activeArena.minX : 10;
    const maxBoundX = activeArena ? activeArena.maxX - p.w : this.stage.boundsWidth - p.w - 10;
    p.x = Math.max(minBoundX, Math.min(maxBoundX, p.x));

    // Collision Y
    const verticalSpeed = p.vy;
    const surface = moveAgainstSolids(p, p.vy, 'y', solids);
    this.standingPlatform = verticalSpeed > 0 ? surface as Platform | null : null;
    p.grounded = false;
    this.platforms.forEach((plat) => {
      if (plat.broken) return;
      if (plat.type === 'acid') {
        if (this.checkAABB(p, plat)) {
          this.damagePlayer(18, -p.facing * 4);
          p.vy = -12;
          p.doubleJump = char.canPsyJump;
        }
        return;
      }
      if (plat.type === 'laser_gate') {
        const laserOn = Math.floor(this.tickCount / 75) % 2 === 0;
        if (laserOn && this.checkAABB(p, plat) && !p.isDashing) {
          this.damagePlayer(15, -p.facing * 5);
        }
        return;
      }
      if (surface === plat) {
        if (verticalSpeed > 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.doubleJump = char.canPsyJump;
          p.lastWallSide = 0;
          p.lastWallX = null;

          // Conveyor belt active push
          if (plat.type === 'conveyor' && plat.conveyorSpeed) {
            moveAgainstSolids(p, plat.conveyorSpeed, 'x', solids.filter((other) => other !== plat));
          }

          // Safe ground checkpoint (debounced, 50px inward margin from platform edge)
          if (plat.type === 'solid' || plat.type === 'conveyor') {
            const safeMin = plat.x + Math.min(50, Math.max(8, plat.w * 0.25));
            const safeMax = plat.x + plat.w - p.w - Math.min(50, Math.max(8, plat.w * 0.25));
            p.lastGroundX = safeMax >= safeMin ? Math.max(safeMin, Math.min(safeMax, p.x)) : plat.x + plat.w * 0.5 - p.w * 0.5;
            p.lastGroundY = plat.y;
          }

          if (plat.type === 'crumble' && !plat.crumbleTimer) {
            plat.crumbleTimer = 1;
          }
        } else if (verticalSpeed < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    });

    if (!char.canWallJump || p.grounded || p.hangingCeiling) {
      p.onWall = 0;
      this.wallContactGrace = 0;
      this.wallContactSide = 0;
    } else {
      const pressingRight = this.keys.right && !this.keys.left;
      const pressingLeft = this.keys.left && !this.keys.right;
      const touchRight = (!!wall && preCollisionVx > 0) || this.hasWallContact(solids, 1);
      const touchLeft = (!!wall && preCollisionVx < 0) || this.hasWallContact(solids, -1);
      if (pressingRight && touchRight) {
        p.onWall = 1;
        this.wallContactSide = 1;
        this.wallContactGrace = 4;
      } else if (pressingLeft && touchLeft) {
        p.onWall = -1;
        this.wallContactSide = -1;
        this.wallContactGrace = 4;
      } else if (this.wallContactGrace > 0 && this.wallContactSide !== 0 && this.hasWallContact(solids, this.wallContactSide)) {
        p.onWall = this.wallContactSide;
      } else {
        p.onWall = 0;
        this.wallContactGrace = 0;
        this.wallContactSide = 0;
      }
    }

    if (p.grounded || p.onWall !== 0 || p.hangingCeiling) {
      this.flightRequested = false;
      p.isFlying = false;
    }
    if (!wasGrounded && p.grounded && verticalSpeed > 4.5) sound.playCue('land');
    if (p.grounded && (this.keys.left || this.keys.right) && !p.isDashing && !p.isSliding) {
      this.footstepDistance += Math.abs(p.x - footstepStartX);
      if (this.footstepDistance >= 90) { this.footstepDistance %= 90; sound.playCue('footstep'); }
    } else this.footstepDistance = 0;

    // Debounced Pitfall Recovery (§4.2)
    if (p.y > this.stage.boundsBottom && p.pitfallCooldown <= 0) {
      p.pitfallCooldown = 90; // 1.5s debounce
      this.damagePlayer(25, 0, true);
      if (p.hp > 0) {
        this.recoverPlayer();
        if (this.stage.id === 2) this.addMangaFx('CAIU DO TREM!', p.x, p.y - 42, '#facc15');
      }
    }

    if (p.hangingCeiling && p.hangingPipe) {
      const pipe = p.hangingPipe;
      const stillOnPipe =
        p.x + p.w > pipe.x && p.x < pipe.x + pipe.w && Math.abs(p.y - (pipe.y + pipe.h)) < 25;
      if (!stillOnPipe) {
        p.hangingCeiling = false;
        p.hangingPipe = null;
      }
    }

    // Update 8-Node Kinematic Scarf (Ren's flowing scarf in world coordinates)
    this.updateScarf();

    // Pickups (All 6 Power-Ups + full_heal)
    this.pickups.forEach((item) => {
      item.vy += 0.4;
      item.y += item.vy;
      this.platforms.forEach((plat) => {
        if (!plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate' && this.checkAABB(item, plat)) {
          if (item.vy > 0) {
            item.y = plat.y - item.h;
            item.vy = 0;
          }
        }
      });
      if (this.checkAABB(p, item)) {
        sound.sfxPickup();
        if (item.kind === 'heal') {
          const amount = Math.round(p.maxHp * 0.35);
          p.hp = Math.min(p.maxHp, p.hp + amount);
          this.addMangaFx(`+${amount} HP!`, p.x, p.y - 20, '#22c55e');
        } else if (item.kind === 'full_heal') {
          p.hp = p.maxHp;
          this.addMangaFx('CURA 100%!', p.x, p.y - 24, '#22c55e');
        } else if (item.kind === 'psy') {
          p.psyEnergy = Math.min(p.maxPsy, p.psyEnergy + Math.round(p.maxPsy * 0.5));
          this.addMangaFx('+50% PSY!', p.x, p.y - 20, '#a855f7');
        } else if (item.kind === 'wav') {
          const shots = item.amount ?? 6;
          p.wavAmmo += shots;
          this.addMangaFx(`LÂMINA WAV x${shots}!`, p.x, p.y - 24, '#00f0ff');
        } else if (item.kind === 'atk') {
          p.atkTimer = 720; // 12s
          this.addMangaFx('BERSERK 2X (12s)!', p.x, p.y - 26, '#ef4444');
        } else if (item.kind === 'jmp') {
          p.jmpTimer = 900; // 15s
          this.addMangaFx('BOTAS GRAV (15s)!', p.x, p.y - 26, '#facc15');
        } else if (item.kind === 'gst') {
          p.gstTimer = 600; // 10s
          this.addMangaFx('CAMUFLAGEM (10s)!', p.x, p.y - 26, '#c084fc');
        }
        item.y = 99999;
      }
    });
    this.pickups = this.pickups.filter((i) => i.y < 5000);

    // Ordinary exploration spawns re-arm only after substantial absence.
    this.enemies.push(...this.spawns.update(p, {
      x: this.camera.x, y: this.camera.y,
      w: this.viewport.width, h: this.viewport.height,
    }, this.tickCount, this.enemies, solids));
    // Update Enemies (Cooperative Squad AI)
    this.updateEnemies();
    if (!this.canAct()) return;

    if (this.campaignMode) {
      for (const point of this.stage.checkpoints) {
        if (point.id !== this.checkpointId && p.grounded && Math.hypot(p.x - point.x, p.y - point.y) < 64) {
          this.checkpointId = point.id;
          sound.playCue('checkpoint');
          this.callbacks.onSaveRequest?.();
          this.showAlert(`PONTO DE APOIO: ${point.label.toUpperCase()}`, 100);
        }
      }
      if (interactRequested) {
        const node = this.stage.exploration?.nodes.find(node => overlaps(p, node));
        if (node) this.inspectRouteNode(node.id);
        else {
          const door = this.stage.exits.find((exit) => overlaps(p, exit));
          if (door && this.travel(door.id)) return;
        }
      }
    }

    // Update Thrown Enemies
    this.thrownEnemies.forEach((te) => {
      const previous = { ...te };
      te.x += te.vx;
      this.enemies.forEach((en) => {
        if (!te.hitIds.has(en.id) && sweepTime(previous, te.vx, 0, en) !== null) {
          te.hitIds.add(en.id);
          this.hitEnemy(en, te.damage, te.vx * 0.45, -7, 4);
          this.addMangaFx('STRIKE!', en.x, en.y - 26, '#a855f7');
        }
      });
      if (this.boss.active && this.boss.triggered && !te.hitIds.has(-999) && bossBodies(this.boss).some((body) => sweepTime(previous, te.vx, 0, body) !== null)) {
        te.hitIds.add(-999);
        this.damageBoss(te.damage);
      }
    });
    this.thrownEnemies = this.thrownEnemies.filter((te) => Math.abs(te.x - p.x) < 1000);

    // Boss trigger & update
    if (this.boss.active && !this.boss.triggered && this.routeComplete() && !this.ambushArenas.some((arena) => arena.active && !arena.cleared) && Math.abs(p.x - this.boss.x) < 540) {
      this.boss.triggered = true;
      sound.sfxAlarm();
      this.showAlert(`CHEFE: ${this.boss.name} — ${this.boss.subtitle}`, 130);
    }
    if (this.boss.active && this.boss.triggered) {
      this.updateBoss();
    }

    if (this.canAct()) sound.setMusicScene(this.musicScene());

    // Swept projectiles are processed in contact order; a non-piercing shot hits once.
    this.bullets.forEach((b) => {
      b.vy += b.gravity ?? 0;
      const previous = { ...b };
      b.x += b.vx;
      b.y += b.vy;
      const wallTime = b.passesThroughWalls === true ? Infinity : terrainHit(previous, b.vx, b.vy, solids);
      if (b.fromPlayer) {
        const targets = [...this.enemies.filter((enemy) => enemy.hp > 0),
          ...(this.boss.active && this.boss.triggered ? bossBodies(this.boss).map((body) => ({ ...body, id: -999 })) : [])];
        const contacts = targets.map((target) => ({ target, time: sweepTime(previous, b.vx, b.vy, target) }))
          .filter((hit) => hit.time !== null && hit.time < wallTime && !b.hitIds?.has(hit.target.id))
          .sort((left, right) => left.time! - right.time!);
        for (const { target } of contacts) {
          if (b.dead) break;
          if (b.hitIds?.has(target.id)) continue;
          if (target.id === -999) this.damageBoss(b.damage);
          else this.hitEnemy(target as Enemy, b.damage, b.vx > 0 ? 5 : -5, -4, 3);
          if (b.piercing) (b.hitIds ??= new Set()).add(target.id);
          else b.dead = true;
        }
      } else {
        const playerBox = p.isSliding ? { x: p.x, y: p.y + 34, w: p.w + 12, h: 22 } : p;
        const playerTime = sweepTime(previous, b.vx, b.vy, playerBox);
        if (p.gstTimer <= 0 && playerTime !== null && playerTime < wallTime) {
          this.damagePlayer(b.damage, b.vx > 0 ? 5 : -5, false, b.damage <= 14);
          b.dead = true;
        }
      }
      if (wallTime !== Infinity) b.dead = true;
    });
    this.bullets = this.bullets.filter((b) => !b.dead && Math.abs(b.x - p.x) < 1150 && b.y >= this.stage.boundsTop - 1200 && b.y <= this.stage.boundsBottom + 600);

    // Particles & Manga Texts
    this.particles.forEach((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= pt.decay;
    });
    this.particles = this.particles.filter((pt) => pt.life > 0);

    this.mangaTexts.forEach((mt) => {
      mt.y += mt.vy;
      mt.scale = Math.min(1.2, mt.scale + 0.1);
      mt.alpha -= 0.024;
    });
    this.mangaTexts = this.mangaTexts.filter((mt) => mt.alpha > 0);

    // Ambient weather
    this.ambient.forEach((a) => {
      a.x += a.vx;
      a.y += a.vy;
      if (a.y > 1000) a.y = -20;
      if (a.x < -40) a.x = 1600;
    });

    const target = cameraTarget(p, this.viewport,
      { top: this.stage.boundsTop, bottom: this.stage.boundsBottom, width: this.stage.boundsWidth }, activeArena);
    this.camera.x = followCamera(this.camera.x, target.x);
    this.camera.y = followCamera(this.camera.y, target.y);

    const isStationaryIdle =
      p.grounded &&
      Math.abs(p.vx) <= 0.35 &&
      Math.abs(p.vy) <= 0.35 &&
      !p.slashing &&
      !p.isDashing &&
      !p.isSliding &&
      !p.isFlying &&
      !p.hangingCeiling &&
      p.onWall === 0 &&
      p.stunTimer <= 0 &&
      this.heroVisualTimers.hurt <= 0 &&
      this.heroVisualTimers.special <= 0 &&
      this.heroVisualTimers.vault <= 0 &&
      !this.keys.left &&
      !this.keys.right &&
      !this.keys.up &&
      !this.keys.down &&
      !this.keys.jumpHeld &&
      !interactRequested;
    if (isStationaryIdle) {
      this.idleTicks++;
      if (this.idleTicks >= MEDITATION_START_TICKS) {
        if (this.characterId === 'ren' && this.idleTicks % 16 === 0) {
          this.addParticle(p.x + Math.random() * p.w, p.y + p.h * 0.85, '#312e81', 1, 2.6);
        } else if (this.characterId === 'maya' && this.idleTicks % 14 === 0) {
          this.addParticle(p.x + p.w * (0.15 + Math.random() * 0.7), p.y + p.h * 0.65, '#22d3ee', 1, 2.2);
        } else if (this.characterId === 'leon' && this.idleTicks % 10 === 0) {
          this.addParticle(p.x + Math.random() * p.w, p.y + p.h * 0.75, this.idleTicks % 20 === 0 ? '#facc15' : '#f97316', 1, 2.8);
        }
      }
    } else {
      this.idleTicks = 0;
    }

    this.heroAnimator.sample(this.heroVisualInput(),this.visualTick);
    if (this.tickCount % 4 === 0 || p.isFlying !== wasFlying) {
      this.emitHud();
    }
  }

  private recoverPlayer() {
    const p = this.player;
    const solids = this.platforms.filter((plat) => !plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate');
    const candidates = solids.filter((plat) => plat.type === 'solid' || plat.type === 'conveyor')
      .map((plat) => ({
        x: Math.max(plat.x + 4, Math.min(plat.x + plat.w - p.w - 4, p.lastGroundX)),
        y: plat.y - p.h - 1, w: p.w, h: p.h,
      }))
      .filter((body) => body.x >= 10 && body.x + body.w <= this.stage.boundsWidth - 10 &&
        body.y >= this.stage.boundsTop && body.y + body.h < this.stage.boundsBottom &&
        !solids.some((solid) => overlaps(body, solid)) &&
        !this.platforms.some((plat) => !plat.broken && (plat.type === 'acid' || plat.type === 'laser_gate') && overlaps(body, plat)))
      .sort((a, b) => Math.hypot(a.x - p.lastGroundX, a.y + p.h - p.lastGroundY) -
        Math.hypot(b.x - p.lastGroundX, b.y + p.h - p.lastGroundY));
    if (!candidates.length) {
      this.triggerFinalGameOver();
      return;
    }
    p.x = candidates[0].x;
    p.y = candidates[0].y;
    p.vx = p.vy = 0;
    p.lastGroundX = p.x;
    p.lastGroundY = p.y + p.h + 1;
    p.hangingCeiling = false;
    p.hangingPipe = null;
    p.isFlying = p.isDashing = p.isSliding = false;
    p.onWall = 0;
    this.wallContactGrace = 0;
    this.wallContactSide = 0;
    p.doubleJump = CHARACTERS[this.characterId].canPsyJump;
    p.stunTimer = 0;
    p.stunGraceTimer = 90;
    p.invulnTimer = Math.max(60, p.invulnTimer);
    this.knockbackLock = 0;
    this.standingPlatform = null;
    this.clearInput();
    this.resetAttack(); this.heroVisualTimers = { hurt:0, vault:0, special:0 }; this.idleTicks = 0; this.heroAnimator.reset(this.visualTick);
    this.syncInterpolationBaseline();
    this.addMangaFx('RESGATE!', p.x, p.y - 20, '#38bdf8');
  }

  private checkAmbushArenas(): AmbushArena | null {
    const p = this.player;
    for (const arena of this.ambushArenas) {
      if (arena.cleared) continue;
      const members = new Set(this.stage.enemies.flatMap((origin, index) =>
        origin.x >= arena.minX - 60 && origin.x <= arena.maxX + 60 ? [`${this.stage.substageId}:${index + 1}`] : []));
      const hasSurvivors = () => this.enemies.some((enemy) => enemy.hp > 0 && (enemy.spawnId ? members.has(enemy.spawnId) :
        enemy.x >= arena.minX - 60 && enemy.x <= arena.maxX + 60));
      if (!arena.active && p.x >= arena.triggerX) {
        const hasEnemiesInside = hasSurvivors();
        if (hasEnemiesInside) {
          arena.active = true;
          sound.sfxAlarm();
          this.showAlert('EMBOSCADA TÁTICA! DERROTE O ESQUADRÃO!', 110);
        } else {
          arena.cleared = true;
        }
      }
      if (arena.active) {
        const aliveInside = hasSurvivors();
        if (!aliveInside) {
          arena.active = false;
          arena.cleared = true;
          this.showAlert('ESQUADRÃO ELIMINADO — AVANCE!', 90);
          this.addMangaFx('ÁREA LIBERADA!', p.x, p.y - 30, '#22c55e');
        } else {
          return arena;
        }
      }
    }
    return null;
  }

  private updateScarf() {
    const p = this.player;
    const anchorX = p.x + p.w * 0.5 - p.facing * 5;
    const anchorY = p.isSliding ? p.y + 38 : p.y + 13;
    this.scarfNodes[0].x = anchorX;
    this.scarfNodes[0].y = anchorY;

    const segLen = 7.5;
    const windBias = -p.facing * 4.5 + this.stage.windForce * 10 - p.vx * 0.45;
    for (let i = 1; i < this.scarfNodes.length; i++) {
      const prev = this.scarfNodes[i - 1];
      const curr = this.scarfNodes[i];
      const wave = Math.sin(this.tickCount * 0.24 + i * 0.85) * (1.8 + Math.abs(p.vx) * 0.25);

      const targetX = prev.x + windBias;
      const targetY = prev.y + 1.4 + wave - p.vy * 0.22;

      curr.x += (targetX - curr.x) * 0.45;
      curr.y += (targetY - curr.y) * 0.45;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy);
      if (d > segLen && d > 0.001) {
        curr.x = prev.x + (dx / d) * segLen;
        curr.y = prev.y + (dy / d) * segLen;
      }
    }
  }

  private updateEnemies() {
    const p = this.player;
    const solids = enemySolids(this.platforms);
    const guardEngaged = this.enemies.some((enemy) => enemy.hp > 0 && enemy.type === 'mib_shield' &&
      !enemy.shieldBroken && Math.abs(enemy.x - p.x) < 160 && Math.abs(enemy.y - p.y) < 70 &&
      (p.facing === 1 ? enemy.x > p.x : enemy.x < p.x) && canSeeBody(enemy, p, solids));

    for (const enemy of this.enemies) {
      const flying = isFlyingEnemy(enemy), home = enemyHome(enemy), profile = ENEMY_COMBAT[enemy.type];
      const stunned = (enemy.stunTimer ?? 0) > 0;
      if (stunned) enemy.stunTimer!--;
      if (enemy.hp > 0 && enemy.y <= this.stage.boundsBottom + 300 && !enemy.mount && (!flying || stunned)) {
        enemy.vx *= stunned ? 0.8 : 1;
        if (!moveGroundEnemy(enemy, solids, this.stage.gravityScale, this.platformDeltas)) enemy.hp = 0;
        enemy.vx *= 0.86;
      }
      if (enemy.mount) { enemy.vx = 0; enemy.vy = 0; enemy.airborne = false; }
      const distance = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      const inMountArc = enemy.mount !== 'ceiling' || p.y + p.h / 2 > enemy.y + enemy.h;
      const inWallArc = enemy.mount === 'wall-left' ? p.x > enemy.x + enemy.w : enemy.mount === 'wall-right' ? p.x + p.w < enemy.x : true;
      const visible = inMountArc && inWallArc && p.gstTimer <= 0 && distance <= GROUND_ENEMY.detectionRadius && canSeeBody(enemy, p, solids);
      const opportunisticTrain = Boolean(this.stage.hasLowCeilingHazard && (this.lowCeilingActive || this.knockbackLock > 0) && distance < 420);
      if (opportunisticTrain && enemy.attackTimer > 10) enemy.attackTimer = 10;
      if (opportunisticTrain && enemy.shootTimer > 16) enemy.shootTimer = 16;
      const landingX = p.x - p.facing * 56;
      const intent = stepEnemyAI(enemy, { player: p, visible, home, stunned,
        installationX: this.spawns.installationX(enemy),
        coverFire: p.stunTimer > 10 || opportunisticTrain,
        canFlank: guardEngaged && Math.abs(landingX - home) <= GROUND_ENEMY.leash &&
          hasSafeFooting(enemy, landingX - enemy.x, this.platforms) });
      if (enemy.hp <= 0 || enemy.y > this.stage.boundsBottom + 300) continue;
      const mind = enemy.ai!;
      if (enemy.type === 'turret_engineer' && enemy.deployed) enemy.facing = mind.facing;
      else if (mind.state === 'windup' || mind.state === 'attack' || mind.state === 'recover') enemy.facing = mind.facing;
      else if (intent.move !== 0 || mind.state === 'chase' || mind.state === 'alert') {
        const direction = enemy.type === 'turret_engineer' && intent.move !== 0 ? (intent.move > 0 ? 1 : -1) : mind.state === 'chase' || mind.state === 'alert' ? (mind.aimX >= enemy.x + enemy.w / 2 ? 1 : -1) : intent.move > 0 ? 1 : -1;
        if ((enemy.type === 'mib_shield' || enemy.type === 'heavy_trooper') && !enemy.shieldBroken &&
          enemy.facing !== direction && mind.state !== 'return') {
          enemy.turnTimer = (enemy.turnTimer ?? 36) > 0 ? enemy.turnTimer! - 1 : 36;
          if (enemy.turnTimer === 0) enemy.facing = direction;
        } else { enemy.facing = direction; enemy.turnTimer = 36; }
      }
      if (intent.coverWarning) this.addMangaFx('COBERTURA!', enemy.x, enemy.y - 22, '#facc15');
      if (flying && !stunned && intent.move !== 0) {
        const returning = mind.state === 'return' || mind.state === 'patrol';
        const targetX = returning ? home : intent.targetX + (enemy.type === 'drone' ? Math.cos(this.tickCount * 0.06 + enemy.id) * 90 : enemy.x > intent.targetX ? 180 : -180);
        const targetY = (enemy.originY ?? enemy.y) + Math.sin(this.tickCount * 0.06 + enemy.id) * 32;
        enemy.x += (targetX - enemy.x) * 0.035 + enemy.vx;
        enemy.y += (targetY - enemy.y) * 0.045 + enemy.vy;
        enemy.vx *= 0.85; enemy.vy *= 0.85;
      } else if (!flying && !enemy.mount && !enemy.airborne && intent.move !== 0 && enemy.facing === Math.sign(intent.move)) {
        if (Math.abs(enemy.x + intent.move - home) <= GROUND_ENEMY.leash || mind.state === 'return' && !enemy.deployed) {
          if (hasSafeFooting(enemy, intent.move, this.platforms)) {
            const wall = moveAgainstSolids(enemy, intent.move, 'x', solids);
            if (wall && mind.state === 'patrol') enemy.facing = enemy.facing === 1 ? -1 : 1;
          } else if (mind.state === 'patrol') enemy.facing = enemy.facing === 1 ? -1 : 1;
        }
      }
      if (intent.attack === 'shot') {
        const x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h / 2;
        const dx = mind.aimX - x, dy = mind.aimY - y, length = Math.max(1, Math.hypot(dx, dy));
        this.bullets.push({ x, y, w: enemy.type === 'sniper' ? 12 : 10, h: 6,
          vx: flying || enemy.type === 'turret' ? dx / length * profile.bulletSpeed : mind.facing * profile.bulletSpeed,
          vy: flying || enemy.type === 'turret' ? dy / length * profile.bulletSpeed : 0,
          shooterId: enemy.id, color: enemy.type === 'sniper' ? '#ff007f' : '#facc15', damage: profile.damage });
        sound.sfxShoot(enemy.type === 'turret' ? 'turret' : enemy.type === 'sniper' ? 'sniper' : 'gunner');
      } else if (intent.attack === 'deploy') {
        const turret = this.spawns.deploy(enemy, this.enemies, solids, p, this.tickCount);
        if (turret) { sound.playCue('deploy'); this.enemies.push(turret); this.addMangaFx('TORRETA!', enemy.x, enemy.y - 22, '#f59e0b'); }
        if (enemy.deployed) { enemy.facing = p.x >= enemy.x ? -1 : 1; mind.facing = enemy.facing; }
      } else if (intent.attack === 'flank') {
        if (hasSafeFooting(enemy, mind.aimX - enemy.x, this.platforms)) {
          enemy.vx = mind.facing * 9.5; enemy.vy = -8.5; enemy.airborne = true;
          enemy.isFlanking = true;
          this.addMangaFx('FLANCO!', enemy.x, enemy.y - 22, '#ef4444');
        }
      } else if (intent.attack === 'melee') {
        const dx = p.x + p.w / 2 - enemy.x - enemy.w / 2;
        const dy = p.y + p.h / 2 - enemy.y - enemy.h / 2;
        if (Math.abs(dx) <= profile.range && Math.abs(dy) < 60 && dx * mind.facing >= 0 && visible && canSeeBody(enemy, p, solids)) {
          const guardShove = enemy.type === 'mib_shield' && !enemy.shieldBroken;
          const heavyShove = guardShove || enemy.type === 'suit_martial' || enemy.type === 'heavy_trooper';
          const shoveSpeed = guardShove ? 12 : heavyShove ? 10 : this.stage.id === 2 ? 9 : 7;
          const damaged = this.damagePlayer(profile.damage, mind.facing * shoveSpeed);
          if (damaged && (heavyShove || this.stage.id === 2)) {
            p.vy = Math.min(p.vy, -3.5);
            if (this.stage.id === 2 && !guardShove) this.addMangaFx('EMPURRÃO!', p.x, p.y - 24, '#f97316');
          }
          if (damaged && guardShove && p.hp > 0 && p.stunGraceTimer === 0) {
            p.stunTimer = 24; p.stunGraceTimer = 90;
            sound.sfxStun(); this.addMangaFx('STUN!', p.x, p.y - 24, '#00f0ff');
          }
        }
      }
      if (enemy.type === 'drone' && mind.state === 'chase' && !stunned && visible && this.checkAABB(enemy, p) &&
        (!p.grounded || p.onWall !== 0 || p.hangingCeiling) && this.damagePlayer(6, (p.x >= enemy.x ? 1 : -1) * 4)) {
        p.onWall = 0; p.hangingCeiling = false; p.hangingPipe = null; p.vy = Math.max(p.vy, 3.5);
        this.addMangaFx('INTERROMPIDO!', p.x, p.y - 20, '#ef4444');
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0 && enemy.y < this.stage.boundsBottom + 300);
  }

  private updateBoss() {
    const b = this.boss, p = this.player;
    const solids = enemySolids(this.platforms);
    const minX = Math.max(10, this.stage.goalX - 700);
    const maxX = Math.max(minX, this.stage.boundsWidth - b.w - 10);
    const event = stepBoss(b, p);
    const mind = b.mind!;
    b.orbitalAngle = (b.orbitalAngle ?? 0) + 0.08;
    if (event.started) { sound.playCue('boss_warning'); this.addMangaFx(BOSS_MOVES[mind.attack].label, b.x, b.y - 28, b.accentColor); }
    if (event.fire) {
      if (isBossCharge(event.fire)) {
        const speed = event.fire === 'draw_cut' ? 15 : event.fire === 'charge' ? 14 : 12;
        if (event.fire === 'dive') {
          const dx = mind.aimX - b.x - b.w / 2, dy = mind.aimY - b.y - b.h / 2;
          const length = Math.max(1, Math.hypot(dx, dy)); b.vx = dx / length * speed; b.vy = dy / length * speed;
        } else b.vx = mind.facing * speed;
      }
      if (event.fire === 'portal') {
        const twin = { x: b.x, y: b.y, w: b.w, h: b.h };
        const targetX = Math.max(minX, Math.min(maxX, mind.aimX + mind.facing * 160));
        moveAgainstSolids(twin, targetX - twin.x, 'x', solids);
        // Never teleport a twin onto the player or inside terrain.
        if (Math.abs(twin.x - p.x) >= 100 && !solids.some((solid) => overlaps(twin, solid))) {
          b.twinX = twin.x; b.twinY = twin.y; b.twinVy = 0;
        }
      }
      const shots = bossShots(b, event.fire);
      this.bullets.push(...shots);
      if (shots.length) sound.sfxShoot('boss');
    }
    const previous = { x: b.x, y: b.y, w: b.w, h: b.h };
    const charging = mind.state === 'active' && isBossCharge(mind.attack);
    if (!charging) b.vx *= 0.86;
    moveBoss(b, solids, minX, maxX, this.stage.gravityScale, p);
    if (charging && sweepTime(previous, b.x - previous.x, b.y - previous.y, p) !== null) {
      this.damagePlayer(mind.attack === 'charge' ? 22 : 18, mind.facing * 9);
    }
  }

  private emitHud() {
    const p = this.player;
    const arenaLocked = this.ambushArenas.some((a) => a.active && !a.cleared);
    const chapter = CAMPAIGN.find((c) => c.id === this.stage.id);
    this.callbacks.onHudUpdate({
      routeObjective: (() => {
        const node = this.nextRouteNode();
        return node ? `${node.y < p.y - 70 ? '↑ ' : ''}${node.x < p.x - 80 ? '← ' : node.x > p.x + 80 ? '→ ' : ''}${node.label}` : this.stage.exploration ? this.stage.boss ? 'Acesso ao confronto liberado' : 'Passagem superior liberada' : null;
      })(),
      nearbyInteraction: (() => {
        const node = this.stage.exploration?.nodes.find(node => overlaps(p, node));
        return node ? `▲ Cima: examinar ${node.label}` : null;
      })(),
      stageId: this.stage.id,
      substageId: this.stage.substageId,
      chapterSubstages: chapter?.substages ?? [this.stage.substageId],
      sectorTransition: this.sectorTransition ? {
        key: this.sectorTransition.key,
        fromId: this.sectorTransition.fromId,
        toId: this.sectorTransition.toId,
        fromTitle: this.sectorTransition.fromTitle,
        toTitle: this.sectorTransition.toTitle,
        direction: this.sectorTransition.direction,
        accentColor: this.sectorTransition.accentColor,
        substages: this.sectorTransition.substages,
      } : null,
      checkpoint: this.stage.checkpoints.find((point) => point.id === this.checkpointId)?.label ?? '',
      nearbyExit: this.campaignMode && !arenaLocked && !(this.boss.active && this.boss.triggered)
        ? this.stage.exits.find((exit) => overlaps(p, exit))?.label ?? null : null,
      stageTitle: this.stage.title,
      characterId: this.characterId,
      characterName: CHARACTERS[this.characterId].name,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      psyEnergy: Math.floor(p.psyEnergy),
      maxPsy: p.maxPsy,
      lives: p.lives,
      nextOneUpScore: p.nextOneUpScore,
      comboHits: p.comboHits,
      score: p.score,
      enemiesRemaining: this.enemies.length,
      bossActive: this.boss.active && this.boss.triggered,
      bossName: this.boss.name,
      bossSubtitle: this.boss.subtitle,
      bossHp: Math.max(0, Math.ceil(this.boss.hp)),
      bossMaxHp: this.boss.maxHp,
      bossPhase: this.boss.phase,
      bossSharedLife: this.boss.behavior === 'twins',
      alertBanner: this.alertBanner,
      wavAmmo: p.wavAmmo,
      atkTimer: Math.ceil(p.atkTimer / 60),
      jmpTimer: Math.ceil(p.jmpTimer / 60),
      gstTimer: Math.ceil(p.gstTimer / 60),
      flameTimer: this.characterId === 'leon' ? Math.ceil(p.flameTimer / 60) : 0,
      arenaLocked,
      isFlying: p.isFlying,
    });
  }

  // =========================================================================
  // RENDERING (2.5D Three.js World + Crisp 2D HUD/FX Overlay)
  // =========================================================================
  private draw(timestamp = 0) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pal = this.stage.palette;

    if (this.renderer3d) {
      const dt = this.lastRenderTs > 0
        ? Math.min(0.05, Math.max(0.004, (timestamp - this.lastRenderTs) / 1000))
        : 1 / 60;
      this.lastRenderTs = timestamp;
      const tickAlpha = this.paused || this.hitstop > 0 || this.superCutinTimer > 0 ? 1 : this.clock.alpha;
      const glideX = this.sectorTransition ? this.sectorTransition.cameraOffsetX : 0;
      const view = this.viewport;
      const sample = this.heroAnimator.sampleInterpolated(this.heroVisualInput(), this.visualTick, tickAlpha);
      const char = CHARACTERS[this.characterId];
      const p = this.player;

      const interpPlayer = lerpActorPosition(this.prevPlayerPos.x, this.prevPlayerPos.y, p.x, p.y, tickAlpha);
      const interpCam = lerpActorPosition(this.prevCameraPos.x, this.prevCameraPos.y, this.camera.x, this.camera.y, tickAlpha, 120);
      const interpEnemies = tickAlpha >= 0.999
        ? this.enemies
        : this.enemies.map((en) => {
            const prev = this.prevEnemyPos.get(en.id);
            if (!prev) return en;
            const pos = lerpActorPosition(prev.x, prev.y, en.x, en.y, tickAlpha);
            return { ...en, x: pos.x, y: pos.y };
          });
      const interpBoss = tickAlpha >= 0.999 || !this.boss.active
        ? this.boss
        : (() => {
            const pos = lerpActorPosition(this.prevBossPos.x, this.prevBossPos.y, this.boss.x, this.boss.y, tickAlpha);
            const twinPos = this.boss.twinX !== undefined && this.boss.twinY !== undefined
              ? lerpActorPosition(this.prevBossPos.twinX, this.prevBossPos.twinY, this.boss.twinX, this.boss.twinY, tickAlpha)
              : null;
            return {
              ...this.boss,
              x: pos.x,
              y: pos.y,
              ...(twinPos ? { twinX: twinPos.x, twinY: twinPos.y } : {}),
            };
          })();

      this.renderer3d.render({
        width: w,
        height: h,
        viewportWidth: view.width,
        viewportHeight: view.height,
        stageId: this.stage.id,
        substageId: this.stage.substageId,
        palette: pal,
        cameraX: interpCam.x,
        cameraY: interpCam.y,
        shakeAmount: this.shakeAmount,
        sectorOffsetX: glideX,
        sectorDirection: this.sectorTransition?.direction ?? null,
        tickCount: this.tickCount,
        tickAlpha,
        dt,
        campaignMode: this.campaignMode,
        checkpointId: this.checkpointId,
        checkpoints: this.stage.checkpoints,
        exits: this.stage.exits,
        explorationNodes: this.stage.exploration?.nodes ?? [],
        activatedNodes: this.activated,
        platforms: this.platforms,
        ceilingPipes: this.ceilingPipes,
        props: this.props,
        pickups: this.pickups,
        enemies: interpEnemies,
        thrownEnemies: this.thrownEnemies,
        boss: interpBoss,
        bullets: this.bullets,
        particles: this.particles,
        mayaWell: this.mayaWell,
        leonFlameZone: this.leonFlameZone,
        lowCeilingActive: this.lowCeilingActive,
        lowCeilingKind: this.lowCeilingKind,
        lowCeilingX: this.lowCeilingX,
        player: {
          characterId: this.characterId,
          pose: sample.pose,
          frame: sample.frame,
          nextFrame: sample.nextFrame,
          frameAlpha: sample.frameAlpha,
          elapsedTicks: sample.elapsed,
          idleTicks: this.idleTicks,
          x: interpPlayer.x,
          y: interpPlayer.y,
          w: p.w,
          h: p.h,
          vx: p.vx,
          vy: p.vy,
          facing: p.facing,
          onWall: p.onWall,
          grounded: p.grounded,
          isDashing: p.isDashing,
          isSliding: p.isSliding,
          isFlying: p.isFlying,
          slashing: p.slashing,
          slashTimer: p.slashTimer,
          comboStep: p.comboStep,
          invulnTimer: p.invulnTimer,
          gstTimer: p.gstTimer,
          atkTimer: p.atkTimer,
          flameTimer: p.flameTimer,
          stunTimer: p.stunTimer,
          hp: p.hp,
        },
        slashRange: char.slashRange,
        accentColor: char.accentColor,
        trailColor: char.trailColor,
        lightningAlpha: this.lightningAlpha,
      });

      this.drawOverlay2D(ctx, w, h, interpCam.x + glideX);
      return;
    }

    this.applyPixelatedRendering(ctx, this.canvas);

    // 1. Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, pal.skyTop);
    skyGrad.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    if (pal.weather === 'stars') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 1.45, h * 0.85, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    const glideX = this.sectorTransition ? this.sectorTransition.cameraOffsetX : 0;
    const renderCamX = this.camera.x + glideX;

    // Parallax city silhouettes (with 16-bit lit pixel windows)
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = pal.cityFar;
    for (let i = 0; i < 16; i++) {
      const bx = Math.round(((i * 220 - renderCamX * 0.22) % (w + 320)) - 140);
      const bh = 180 + ((i * 73) % 240);
      ctx.fillRect(bx, h - bh, 150, bh);
      ctx.fillStyle = i % 3 === 0 ? pal.accentNeon + '18' : pal.secondaryNeon + '18';
      for (let wy = h - bh + 18; wy < h - 40; wy += 24) {
        for (let wx = bx + 14; wx < bx + 132; wx += 22) {
          if (((wx + wy + i) % 5) !== 0) ctx.fillRect(wx, wy, 10, 12);
        }
      }
      ctx.fillStyle = pal.cityFar;
    }
    ctx.fillStyle = pal.cityMid;
    for (let i = 0; i < 12; i++) {
      const bx = Math.round(((i * 290 - renderCamX * 0.45) % (w + 420)) - 180);
      const bh = 130 + ((i * 97) % 200);
      ctx.fillRect(bx, h - bh, 190, bh);
      ctx.fillStyle = i % 2 === 0 ? pal.accentNeon + '2a' : pal.secondaryNeon + '2a';
      for (let wy = h - bh + 20; wy < h - 32; wy += 26) {
        for (let wx = bx + 16; wx < bx + 168; wx += 26) {
          if (((wx * 3 + wy) % 7) !== 0) ctx.fillRect(wx, wy, 12, 14);
        }
      }
      ctx.fillStyle = pal.cityMid;
    }

    this.drawWeather(ctx, w, h);

    // World scale follows a fixed logical height, not physical screen resolution.
    ctx.save();
    ctx.scale(this.viewport.zoom, this.viewport.zoom);
    const sx = (Math.random() - 0.5) * this.shakeAmount;
    const sy = (Math.random() - 0.5) * this.shakeAmount;
    ctx.translate(Math.round(-renderCamX + sx), Math.round(-this.camera.y + sy));
    this.applyPixelatedRendering(ctx, this.canvas);

    if (this.campaignMode) {
      for (const point of this.stage.checkpoints) {
        const active = point.id === this.checkpointId;
        ctx.strokeStyle = active ? '#facc15' : '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(point.x + 8, point.y + 12, 16, 42);
        ctx.fillStyle = active ? '#facc15' : '#64748b';
        ctx.fillRect(point.x + 24, point.y + 12, 18, 10);
      }
      for (const exit of this.stage.exits) {
        ctx.fillStyle = '#083344';
        ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#a5f3fc';
        ctx.fillText(`▲ ${exit.label}`, exit.x - 12, exit.y - 12);
      }
    }

    // 2. Ceiling Pipes (16-bit Metallic Beams & Riveted Pipes)
    this.ceilingPipes.forEach((cp) => {
      this.drawMetalPipe16Bit(ctx, cp, pal.pipeColor);
    });

    // 3. Platforms, Conveyors & Hazards (16-bit Asphalt, Bricks, Metal Beams)
    this.platforms.forEach((plat) => {
      if (plat.broken) return;
      if (plat.gateId) {
        this.drawBrickBlock16Bit(ctx, plat, plat.breakNode ? '#64748b' : '#b45309', '#fbbf24');
        ctx.fillStyle = '#fbbf24';
        for (let y = plat.y + 5; y < plat.y + plat.h - 6; y += 18) ctx.fillRect(plat.x + 3, y, plat.w - 6, 5);
        return;
      }
      if (plat.type === 'acid') {
        ctx.fillStyle = this.stage.id === 7 ? '#0c4a6e' : '#16a34a';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = this.stage.id === 7 ? '#38bdf8' : '#86efac';
        for (let wx = plat.x; wx < plat.x + plat.w; wx += 28) {
          const wy = plat.y + Math.sin(this.tickCount * 0.1 + wx * 0.05) * 4;
          ctx.fillRect(wx, wy, 18, 4);
        }
        return;
      }
      if (plat.type === 'laser_gate') {
        const active = Math.floor(this.tickCount / 75) % 2 === 0;
        ctx.fillStyle = active ? '#ff0055' : 'rgba(255,0,85,0.18)';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        return;
      }
      if (plat.type === 'conveyor') {
        this.drawMetalBeam16Bit(ctx, plat, '#475569', '#fb923c', false);
        // Animated directional chevrons
        const dir = (plat.conveyorSpeed ?? 1) >= 0 ? 1 : -1;
        const shift = ((this.tickCount * 2 * dir) % 28 + 28) % 28;
        ctx.fillStyle = '#facc15';
        for (let cx = plat.x + shift; cx < plat.x + plat.w - 10; cx += 28) {
          ctx.fillRect(cx, plat.y + 5, 10, 4);
        }
        return;
      }
      if (plat.type === 'wall' || (plat.type === 'solid' && plat.h > 48 && plat.w < 260)) {
        this.drawBrickBlock16Bit(ctx, plat, pal.platformFill, pal.platformStroke);
        return;
      }
      if (plat.type === 'solid' && plat.h >= 60 && plat.w >= 260) {
        this.drawAsphaltPlatform16Bit(ctx, plat, pal.platformFill, pal.platformStroke, pal.accentNeon);
        return;
      }
      // Elevated platforms, moving trusses & crumbling construction girders -> 16-bit Metal Beams
      this.drawMetalBeam16Bit(
        ctx,
        plat,
        plat.type === 'crumble' ? '#78350f' : pal.platformFill,
        plat.type === 'crumble' ? '#facc15' : pal.platformStroke,
        plat.type === 'crumble'
      );
    });

    const complex=this.stage.exploration?.complex;
    if(complex){ctx.font='bold 16px monospace';ctx.fillStyle='#7dd3fc';for(const room of complex.rooms)for(const level of [0,300,600])ctx.fillText(room.label,room.x+30,complex.floor-level-90);}
    const zones=this.stage.exploration?.zones;
    if(zones){ctx.font='bold 15px monospace';ctx.fillStyle='#7dd3fc';for(const zone of zones)ctx.fillText(zone.label,zone.x,zone.y);}
    for (const node of this.stage.exploration?.nodes ?? []) {
      const active = this.activated.has(node.id);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(node.x, node.y, node.w, node.h);
      ctx.strokeStyle = active ? '#4ade80' : '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(node.x, node.y, node.w, node.h);
      ctx.fillStyle = active ? '#4ade80' : '#22d3ee'; ctx.fillRect(node.x + 5, node.y + 6, node.w - 10, 14);
      ctx.font = 'bold 12px monospace'; ctx.fillText(active ? '✓' : '▲', node.x + 7, node.y - 10);
      ctx.font = '11px monospace'; ctx.fillText(node.label, node.x - 10, node.y - 75);
    }

    // 4. Destructible Props & Golden Secret Chests
    this.props.forEach((pr) => {
      if (pr.broken) return;
      if (pr.kind === 'chest') {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(pr.x, pr.y + 10, pr.w, 6);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('★', pr.x + pr.w / 2 - 4, pr.y - 6);
        return;
      }
      ctx.fillStyle =
        pr.kind === 'car'
          ? '#dc2626'
          : pr.kind === 'vending'
          ? '#0284c7'
          : pr.kind === 'pillar'
          ? '#e2e8f0'
          : '#b45309';
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.strokeStyle = '#ffffff55';
      ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
    });

    // 5. Pickups (6 Power-Up Orbs)
    this.pickups.forEach((it) => {
      const styleMap: Record<PickupItem['kind'], { bg: string; label: string }> = {
        heal: { bg: '#22c55e', label: '+' },
        full_heal: { bg: '#16a34a', label: '★' },
        psy: { bg: '#a855f7', label: 'P' },
        wav: { bg: '#06b6d4', label: 'W' },
        atk: { bg: '#ef4444', label: '2X' },
        jmp: { bg: '#eab308', label: 'J' },
        gst: { bg: '#c084fc', label: 'G' },
      };
      const st = styleMap[it.kind];
      ctx.fillStyle = st.bg;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(st.label, it.x + 5, it.y + 15);
    });

    // 6. Monorail Express Hazards (Stage 2: Overhead Gantry vs Low Track Sweeper)
    if (this.lowCeilingActive) {
      if (this.lowCeilingKind === 'sweeper') {
        const sx = Math.round(this.lowCeilingX);
        const sy = 612;
        ctx.fillStyle = '#18181b';
        ctx.fillRect(sx, sy, 78, 38);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(sx, sy + 6, 78, 8);
        ctx.fillStyle = '#38bdf8';
        for (let cx = sx + 6; cx < sx + 70; cx += 16) {
          ctx.fillRect(cx, sy + (this.tickCount % 6 < 3 ? 2 : 20), 8, 6);
        }
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, 78, 38);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('▲ PULE!', sx + 12, sy - 8);
      } else {
        const gx = Math.round(this.lowCeilingX);
        const gy = 496;
        // Support struts into the sky
        ctx.fillStyle = '#334155';
        ctx.fillRect(gx + 18, gy - 260, 14, 260);
        ctx.fillRect(gx + 98, gy - 260, 14, 260);
        // Main warning gantry
        ctx.fillStyle = '#facc15';
        ctx.fillRect(gx, gy, 130, 110);
        ctx.fillStyle = '#09090b';
        for (let sx = gx + 6; sx < gx + 124; sx += 24) {
          ctx.fillRect(sx, gy + 8, 12, 94);
        }
        ctx.fillStyle = this.tickCount % 10 < 5 ? '#ef4444' : '#fbbf24';
        ctx.fillRect(gx + 6, gy + 88, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx + 16, gy + 38, 98, 22);
        ctx.fillStyle = '#09090b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('DESLIZE! ▼', gx + 28, gy + 53);
      }
    }

    // 7. Partner Zones
    if (this.mayaWell) {
      const well = this.mayaWell;
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(well.x, well.y, well.radius * 0.65, this.tickCount * 0.03, this.tickCount * 0.03 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const phase = 1 - ((this.tickCount * 0.045 + i / 3) % 1);
        ctx.strokeStyle = `rgba(0, 240, 255, ${(1 - phase) * 0.75 + 0.15})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(well.x, well.y, 14 + phase * 82, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(well.x, well.y, 20 + Math.sin(this.tickCount * 0.28) * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.leonFlameZone) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.72)';
      ctx.fillRect(this.leonFlameZone.x, this.leonFlameZone.y, this.leonFlameZone.w, 18);
    }

    // 8. Enemies
    this.enemies.forEach((en) => this.drawEnemy(ctx, en));

    // 9. Thrown Enemies
    this.thrownEnemies.forEach((te) => {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(te.x, te.y, te.w, te.h);
    });

    // 10. Boss
    if (this.boss.active) {
      this.drawBoss(ctx, this.boss);
    }

    // 11. Bullets & Wind Blades
    this.bullets.forEach((b) => {
      if (b.isWindBlade) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 16, -Math.PI * 0.45, Math.PI * 0.45, b.vx < 0);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.reflectable === false) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); }
      }
    });

    // 12. Player + 8-node scarf
    this.drawPlayer(ctx);

    // 13. Particles & Manga FX
    ctx.imageSmoothingEnabled = false;
    this.particles.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.life;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), Math.max(1, Math.round(pt.size)), Math.max(1, Math.round(pt.size)));
    });
    ctx.globalAlpha = 1;

    this.mangaTexts.forEach((mt) => {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(mt.x, mt.y);
      ctx.rotate(mt.rot);
      ctx.scale(mt.scale, mt.scale);
      ctx.globalAlpha = mt.alpha;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.font = 'italic 900 20px "Barlow Condensed", sans-serif';
      ctx.strokeText(mt.text, 0, 0);
      ctx.fillStyle = mt.color;
      ctx.fillText(mt.text, 0, 0);
      ctx.restore();
    });

    ctx.restore();
    this.applyPixelatedRendering(ctx, this.canvas);

    if (this.lightningAlpha > 0.02) {
      ctx.fillStyle = `rgba(224, 231, 255, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.lowCeilingActive && this.lowCeilingX > this.camera.x + this.viewport.width - 20) {
      const blink = Math.floor(this.tickCount / 4) % 2 === 0;
      const screenY = Math.max(70, Math.min(h - 90,
        ((this.lowCeilingKind === 'sweeper' ? 620 : 540) - this.camera.y) * this.viewport.zoom));
      ctx.fillStyle = blink ? (this.lowCeilingKind === 'sweeper' ? '#ef4444' : '#facc15') : '#0f172a';
      ctx.fillRect(w - 178, screenY - 18, 166, 36);
      ctx.strokeStyle = this.lowCeilingKind === 'sweeper' ? '#fca5a5' : '#fef08a';
      ctx.lineWidth = 2;
      ctx.strokeRect(w - 178, screenY - 18, 166, 36);
      ctx.fillStyle = blink ? '#09090b' : '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(this.lowCeilingKind === 'sweeper' ? '◀ ⚠ PULE! ▲' : '◀ ⚠ DESLIZE! ▼', w - 166, screenY + 4);
    }

    if (this.superCutinTimer > 0) {
      this.drawCutIn(ctx, w, h);
    }

    if (this.sectorTransition && this.sectorTransition.timer > 0) {
      const tr = this.sectorTransition;
      const progress = 1 - tr.timer / tr.duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const curtainAlpha = Math.max(0, (1 - easeOut) * 0.68);
      ctx.save();
      ctx.fillStyle = `rgba(7, 5, 16, ${curtainAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      const sweepX = tr.direction === 'forward' ? w * (1 - easeOut) : w * easeOut;
      const bandW = Math.max(48, w * 0.14);
      const grad = ctx.createLinearGradient(sweepX - bandW, 0, sweepX + bandW, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, tr.accentColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.5);
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - bandW, 0, bandW * 2, h);
      ctx.restore();
    }
  }

  private drawOverlay2D(ctx: CanvasRenderingContext2D, w: number, h: number, renderCamX: number) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.scale(this.viewport.zoom, this.viewport.zoom);
    ctx.translate(Math.round(-renderCamX), Math.round(-this.camera.y));

    if (this.campaignMode) {
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#a5f3fc';
      for (const exit of this.stage.exits) {
        ctx.fillText(`▲ ${exit.label}`, exit.x - 12, exit.y - 12);
      }
    }

    const complex = this.stage.exploration?.complex;
    if (complex) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#7dd3fc';
      for (const room of complex.rooms) {
        for (const level of [0, 300, 600]) {
          ctx.fillText(room.label, room.x + 30, complex.floor - level - 90);
        }
      }
    }
    const zones = this.stage.exploration?.zones;
    if (zones) {
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#7dd3fc';
      for (const zone of zones) ctx.fillText(zone.label, zone.x, zone.y);
    }
    for (const node of this.stage.exploration?.nodes ?? []) {
      const active = this.activated.has(node.id);
      ctx.fillStyle = active ? '#4ade80' : '#22d3ee';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(active ? '✓' : '▲', node.x + 7, node.y - 10);
      ctx.font = '11px monospace';
      ctx.fillText(node.label, node.x - 10, node.y - 75);
    }

    for (const pr of this.props) {
      if (!pr.broken && pr.kind === 'chest') {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('★', pr.x + pr.w / 2 - 4, pr.y - 18);
      }
    }

    for (const en of this.enemies) {
      if (en.ai?.state === 'alert') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('!', en.x + en.w / 2 - 4, en.y - 18);
      } else if (en.telegraph) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 20px "Barlow Condensed", sans-serif';
        ctx.fillText('!', en.x + en.w / 2 - 4, en.y - 18);
      }
    }

    if (this.boss.active) {
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = 'rgba(251,191,36,0.12)';
      ctx.lineWidth = 2;
      for (const zone of bossWarnings(this.boss)) {
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      }
      if (this.boss.telegraph) {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 24px "Barlow Condensed", sans-serif';
        ctx.fillText('!', this.boss.x + this.boss.w / 2 - 5, this.boss.y - 22);
      }
    }

    if (this.lowCeilingActive) {
      if (this.lowCeilingKind === 'sweeper') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('▲ PULE!', Math.round(this.lowCeilingX) + 12, 604);
      } else {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('DESLIZE! ▼', Math.round(this.lowCeilingX) + 28, 488);
      }
    }

    for (const mt of this.mangaTexts) {
      ctx.save();
      ctx.translate(mt.x, mt.y);
      ctx.rotate(mt.rot);
      ctx.scale(mt.scale, mt.scale);
      ctx.globalAlpha = mt.alpha;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.font = 'italic 900 20px "Barlow Condensed", sans-serif';
      ctx.strokeText(mt.text, 0, 0);
      ctx.fillStyle = mt.color;
      ctx.fillText(mt.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    if (this.lightningAlpha > 0.02) {
      ctx.fillStyle = `rgba(224, 231, 255, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.lowCeilingActive && this.lowCeilingX > this.camera.x + this.viewport.width - 20) {
      const blink = Math.floor(this.tickCount / 4) % 2 === 0;
      const screenY = Math.max(70, Math.min(h - 90,
        ((this.lowCeilingKind === 'sweeper' ? 620 : 540) - this.camera.y) * this.viewport.zoom));
      ctx.fillStyle = blink ? (this.lowCeilingKind === 'sweeper' ? '#ef4444' : '#facc15') : '#0f172a';
      ctx.fillRect(w - 178, screenY - 18, 166, 36);
      ctx.strokeStyle = this.lowCeilingKind === 'sweeper' ? '#fca5a5' : '#fef08a';
      ctx.lineWidth = 2;
      ctx.strokeRect(w - 178, screenY - 18, 166, 36);
      ctx.fillStyle = blink ? '#09090b' : '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(this.lowCeilingKind === 'sweeper' ? '◀ ⚠ PULE! ▲' : '◀ ⚠ DESLIZE! ▼', w - 166, screenY + 4);
    }

    if (this.superCutinTimer > 0) {
      this.drawCutIn(ctx, w, h);
    }

    if (this.sectorTransition && this.sectorTransition.timer > 0) {
      const tr = this.sectorTransition;
      const progress = 1 - tr.timer / tr.duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const curtainAlpha = Math.max(0, (1 - easeOut) * 0.68);
      ctx.save();
      ctx.fillStyle = `rgba(7, 5, 16, ${curtainAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      const sweepX = tr.direction === 'forward' ? w * (1 - easeOut) : w * easeOut;
      const bandW = Math.max(48, w * 0.14);
      const grad = ctx.createLinearGradient(sweepX - bandW, 0, sweepX + bandW, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, tr.accentColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.5);
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - bandW, 0, bandW * 2, h);
      ctx.restore();
    }
  }

  // =========================================================================
  // 16-BIT SCENARIO TEXTURES (Asphalt, Bricks, Metal Beams & Pipes)
  // =========================================================================
  private getScenarioPattern(
    ctx: CanvasRenderingContext2D,
    kind: 'asphalt' | 'bricks' | 'metal' | 'pipe',
    baseColor: string,
    accentColor: string
  ): CanvasPattern | null {
    const key = `${kind}:${baseColor}:${accentColor}`;
    if (this.scenarioPatterns.has(key)) {
      return this.scenarioPatterns.get(key) ?? null;
    }
    if (typeof document === 'undefined' || typeof ctx.createPattern !== 'function') {
      this.scenarioPatterns.set(key, null);
      return null;
    }

    const tile = document.createElement('canvas');
    tile.width = 32;
    tile.height = 32;
    const tctx = tile.getContext('2d');
    if (!tctx) {
      this.scenarioPatterns.set(key, null);
      return null;
    }
    this.applyPixelatedRendering(tctx, tile);

    if (kind === 'asphalt') {
      // Base 16-bit dark asphalt roadbed
      tctx.fillStyle = '#151824';
      tctx.fillRect(0, 0, 32, 32);

      // 2x2 pixel-grid checkerboard tint from stage palette (crisp 16-bit dither)
      tctx.fillStyle = baseColor;
      for (let py = 0; py < 32; py += 2) {
        for (let px = 0; px < 32; px += 2) {
          if (((px + py) >> 1) % 2 === 0) {
            tctx.fillRect(px, py, 2, 2);
          }
        }
      }

      // Pixel-art aggregate noise speckles & micro cracks (2x2 crisp 16-bit texels)
      const lightSpecks = [
        [2, 4], [10, 2], [22, 6], [28, 4],
        [6, 12], [16, 10], [24, 14], [12, 18],
        [4, 22], [20, 20], [30, 24], [8, 28], [26, 28],
      ];
      tctx.fillStyle = '#3b445e';
      for (const [px, py] of lightSpecks) tctx.fillRect(px, py, 2, 2);

      const darkSpecks = [
        [0, 8], [14, 6], [26, 10], [8, 16],
        [18, 14], [28, 18], [2, 26], [14, 24], [22, 30],
      ];
      tctx.fillStyle = '#090b12';
      for (const [px, py] of darkSpecks) tctx.fillRect(px, py, 2, 2);

      // Subtle hairline crack + accent grit
      tctx.fillStyle = '#07090f';
      tctx.fillRect(6, 18, 6, 2);
      tctx.fillRect(12, 20, 4, 2);
      tctx.fillStyle = accentColor;
      tctx.fillRect(20, 8, 2, 2);
      tctx.fillRect(8, 28, 2, 2);
    } else if (kind === 'bricks') {
      // Dark mortar background
      tctx.fillStyle = '#090b13';
      tctx.fillRect(0, 0, 32, 32);

      // 4 staggered running-bond brick courses (each brick 14x6 + 2px mortar)
      const rows = [
        { y: 0, offsets: [0, 16] },
        { y: 8, offsets: [-8, 8, 24] },
        { y: 16, offsets: [0, 16] },
        { y: 24, offsets: [-8, 8, 24] },
      ];
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].offsets.length; c++) {
          const bx = rows[r].offsets[c];
          const by = rows[r].y;
          // Brick body
          tctx.fillStyle = baseColor;
          tctx.fillRect(bx, by, 14, 6);
          // Crisp 16-bit alternate brick dither shading
          tctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.22)';
          tctx.fillRect(bx, by, 14, 6);
          // Top pixel highlight & accent glint
          tctx.fillStyle = 'rgba(255,255,255,0.24)';
          tctx.fillRect(bx, by, 14, 2);
          tctx.fillStyle = accentColor;
          tctx.fillRect(bx + 2, by, 2, 2);
          // Bottom shadow lip & right brick edge
          tctx.fillStyle = 'rgba(0,0,0,0.42)';
          tctx.fillRect(bx, by + 4, 14, 2);
          tctx.fillRect(bx + 12, by + 2, 2, 2);
        }
      }
    } else if (kind === 'metal') {
      // 16-bit riveted steel beam / industrial truss texture
      tctx.fillStyle = '#1b2234';
      tctx.fillRect(0, 0, 32, 32);
      // 2x2 steel dither tint using baseColor
      tctx.fillStyle = baseColor;
      for (let py = 4; py < 28; py += 2) {
        for (let px = 0; px < 32; px += 2) {
          if (((px + py) >> 1) % 2 === 0) {
            tctx.fillRect(px, py, 2, 2);
          }
        }
      }

      // Horizontal steel plate banding
      tctx.fillStyle = '#475569';
      tctx.fillRect(0, 0, 32, 4);
      tctx.fillRect(0, 28, 32, 4);
      // Specular metallic glint pixels
      tctx.fillStyle = '#cbd5e1';
      tctx.fillRect(2, 0, 12, 2);
      tctx.fillRect(18, 0, 10, 2);
      // Recessed diagonal steel X-truss
      tctx.fillStyle = '#0f172a';
      tctx.fillRect(0, 6, 32, 20);
      tctx.fillStyle = '#334155';
      for (let i = 0; i < 10; i++) {
        const d = i * 2;
        tctx.fillRect(4 + d, 6 + d, 4, 2);
        tctx.fillRect(24 - d, 6 + d, 4, 2);
      }
      // Corner steel rivets
      tctx.fillStyle = accentColor;
      tctx.fillRect(2, 10, 2, 2);
      tctx.fillRect(28, 10, 2, 2);
      tctx.fillRect(2, 20, 2, 2);
      tctx.fillRect(28, 20, 2, 2);
    } else {
      // 16-bit ribbed cylindrical steel ceiling pipe pattern
      tctx.fillStyle = '#334155';
      tctx.fillRect(0, 0, 32, 32);
      // Horizontal metallic shading bands
      tctx.fillStyle = accentColor;
      tctx.fillRect(0, 0, 32, 4);
      tctx.fillStyle = '#f8fafc';
      tctx.fillRect(0, 2, 32, 2);
      tctx.fillStyle = '#475569';
      tctx.fillRect(0, 4, 32, 4);
      tctx.fillStyle = '#1e293b';
      tctx.fillRect(0, 12, 32, 20);
      // Vertical pixel rib seams & bolts every 16px
      tctx.fillStyle = '#0f172a';
      tctx.fillRect(14, 0, 2, 32);
      tctx.fillRect(30, 0, 2, 32);
      tctx.fillStyle = '#94a3b8';
      tctx.fillRect(12, 2, 2, 10);
      tctx.fillRect(28, 2, 2, 10);
    }

    const pattern = ctx.createPattern(tile, 'repeat');
    this.scenarioPatterns.set(key, pattern);
    return pattern;
  }

  private drawAsphaltPlatform16Bit(
    ctx: CanvasRenderingContext2D,
    plat: Platform,
    fillColor: string,
    strokeColor: string,
    neonAccent: string
  ) {
    ctx.imageSmoothingEnabled = false;
    const px = Math.round(plat.x);
    const py = Math.round(plat.y);
    const pw = Math.round(plat.w);
    const ph = Math.round(plat.h);

    const pat = this.getScenarioPattern(ctx, 'asphalt', fillColor, strokeColor);
    ctx.fillStyle = pat ?? fillColor;
    ctx.fillRect(px, py, pw, ph);

    // 16-bit Concrete Curb / Sidewalk Edge along the top 8px
    ctx.fillStyle = '#334155';
    ctx.fillRect(px, py, pw, 8);
    ctx.fillStyle = strokeColor;
    ctx.fillRect(px, py, pw, 2);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(px, py + 8, pw, 2);
    for (let cx = px; cx < px + pw; cx += 32) {
      ctx.fillRect(cx, py + 2, 2, 6);
    }

    // Dashed 16-bit Street Lane Markings with pixel drop-shadow
    for (let lx = px + 18; lx < px + pw - 22; lx += 64) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(lx, py + 20, 22, 4);
      ctx.fillStyle = neonAccent;
      ctx.fillRect(lx, py + 24, 22, 2);
    }
  }

  private drawBrickBlock16Bit(
    ctx: CanvasRenderingContext2D,
    plat: Platform,
    fillColor: string,
    strokeColor: string
  ) {
    ctx.imageSmoothingEnabled = false;
    const px = Math.round(plat.x);
    const py = Math.round(plat.y);
    const pw = Math.round(plat.w);
    const ph = Math.round(plat.h);

    const pat = this.getScenarioPattern(ctx, 'bricks', fillColor, strokeColor);
    ctx.fillStyle = pat ?? fillColor;
    ctx.fillRect(px, py, pw, ph);

    // Crisp 16-bit pixel cornice & edge outline
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(px, py, pw, 2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
  }

  private drawMetalBeam16Bit(
    ctx: CanvasRenderingContext2D,
    plat: Platform,
    fillColor: string,
    strokeColor: string,
    hazardStripes: boolean
  ) {
    ctx.imageSmoothingEnabled = false;
    const px = Math.round(plat.x);
    const py = Math.round(plat.y);
    const pw = Math.round(plat.w);
    const ph = Math.round(plat.h);

    const pat = this.getScenarioPattern(ctx, 'metal', fillColor, strokeColor);
    ctx.fillStyle = pat ?? fillColor;
    ctx.fillRect(px, py, pw, ph);

    // Top & Bottom Metallic I-Beam Flanges
    ctx.fillStyle = '#475569';
    ctx.fillRect(px, py, pw, 4);
    ctx.fillRect(px, py + ph - 4, pw, 4);
    ctx.fillStyle = strokeColor;
    ctx.fillRect(px, py, pw, 2);

    // Rivets along girder
    ctx.fillStyle = '#e2e8f0';
    for (let rx = px + 8; rx < px + pw - 6; rx += 24) {
      ctx.fillRect(rx, py + 2, 2, 2);
      if (ph >= 16) ctx.fillRect(rx, py + ph - 4, 2, 2);
    }

    // Zebra hazard stripes on crumbling construction beams
    if (hazardStripes) {
      ctx.fillStyle = '#facc15';
      for (let hx = px + 4; hx < px + pw - 10; hx += 16) {
        ctx.fillRect(hx, py + 2, 8, 4);
      }
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
  }

  private drawMetalPipe16Bit(ctx: CanvasRenderingContext2D, cp: CeilingPipe, pipeColor: string) {
    ctx.imageSmoothingEnabled = false;
    const cx = Math.round(cp.x);
    const cy = Math.round(cp.y);
    const cw = Math.round(cp.w);
    const ch = Math.round(cp.h);

    // Pixelated cylindrical pipe fill pattern
    const pat = this.getScenarioPattern(ctx, 'pipe', '#334155', pipeColor);
    ctx.fillStyle = pat ?? '#334155';
    ctx.fillRect(cx, cy, cw, ch);

    // Top specular highlight & lower pixel rim
    ctx.fillStyle = pipeColor;
    ctx.fillRect(cx, cy, cw, 2);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx, cy + ch - 2, cw, 2);

    // Bolted metallic pipe collars every 48px
    for (let px = cx + 12; px < cx + cw - 8; px += 48) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(px, cy - 2, 6, ch + 4);
      ctx.fillStyle = pipeColor;
      ctx.fillRect(px + 2, cy - 2, 2, ch + 4);
    }
  }

  private drawWeather(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.imageSmoothingEnabled = false;
    const weather = this.stage.palette.weather;
    if (weather === 'none') return;

    this.ambient.forEach((a) => {
      ctx.globalAlpha = a.alpha;
      if (weather === 'rain' || weather === 'storm') {
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x % w, a.y % h);
        ctx.lineTo((a.x % w) - 6, (a.y % h) + 18);
        ctx.stroke();
      } else if (weather === 'speedlines') {
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(a.x % w, a.y % h, 55, 2);
      } else if (weather === 'sakura') {
        ctx.fillStyle = '#f9a8d4';
        ctx.fillRect(a.x % w, a.y % h, 6, 4);
      } else if (weather === 'spores') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(a.x % w, a.y % h, a.size, a.size);
      } else if (weather === 'stars') {
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(a.x % w, a.y % h, 2, 2);
      }
    });
    ctx.globalAlpha = 1;

    if (weather === 'searchlights') {
      const sweep = Math.sin(this.tickCount * 0.02) * 180;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h);
      ctx.lineTo(w * 0.25 + sweep - 90, 0);
      ctx.lineTo(w * 0.25 + sweep + 90, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  private heroVisualInput() {
    return { ...this.player, climbHeld: false, hurtTicks:this.heroVisualTimers.hurt,
      specialTicks:this.heroVisualTimers.special, vaultTicks:this.heroVisualTimers.vault };
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    const p = this.player;
    const char = CHARACTERS[this.characterId];
    if (p.gstTimer > 0) {
      ctx.globalAlpha = 0.35;
    } else if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 3) % 2 === 1) {
      ctx.globalAlpha = 0.45;
    }

    // Ren's 8-Node Kinematic Scarf drawn in world space
    if (this.characterId === 'ren' && !isHeroPainted(this.characterId) && this.scarfNodes.length > 1) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 6;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(this.scarfNodes[0].x, this.scarfNodes[0].y);
      for (let i = 1; i < this.scarfNodes.length; i++) {
        ctx.lineTo(this.scarfNodes[i].x, this.scarfNodes[i].y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Berserk 2X aura
    if (p.atkTimer > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
    }

    // Leon Chama Intensa 2X burn aura
    if (this.characterId === 'leon' && p.flameTimer > 0) {
      ctx.strokeStyle = this.tickCount % 6 < 3 ? '#f97316' : '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
    }

    // Maya 8-dir flight halo
    if (p.isFlying) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 26 + Math.sin(this.tickCount * 0.3) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (p.isDashing) {
      ctx.fillStyle = char.trailColor + '66';
      ctx.fillRect(p.x - p.vx * 1.4, p.y, p.w, p.h);
    }

    const sample = this.heroAnimator.sample(this.heroVisualInput(),this.visualTick);
    const facing = sample.pose === 'wall' || sample.pose === 'climb' ? p.onWall : p.facing;
    drawHeroFrame(ctx,this.characterId,sample.pose,sample.frame,p.x+p.w/2,p.y+p.h,facing);
    ctx.imageSmoothingEnabled = false;

    // Wall Claws
    if (p.onWall !== 0 && !p.grounded) {
      ctx.fillStyle = char.trailColor;
      const gx = p.onWall === 1 ? p.x + p.w : p.x - 6;
      ctx.fillRect(gx, p.y + 16, 6, 16);
    }

    // Stunned Stars overhead
    if (p.stunTimer > 0) {
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 3; i++) {
        const ang = this.tickCount * 0.2 + (i * Math.PI * 2) / 3;
        ctx.fillRect(p.x + p.w / 2 + Math.cos(ang) * 14 - 2, p.y - 10 + Math.sin(ang) * 4, 4, 4);
      }
    }

    // Psychic Slash Arc
    if (p.slashing) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.strokeStyle = p.atkTimer > 0 ? '#ef4444' : isHeroPainted(this.characterId) ? '#6be7ef' : char.accentColor;
      const swing = SWINGS[p.comboStep];
      const progress = (swing.totalTicks - p.slashTimer) / swing.activeTicks;
      ctx.globalAlpha = 1 - progress * 0.65;
      ctx.lineWidth = p.comboStep === 2 ? 7 : 5;
      ctx.beginPath();
      const startX = p.facing === 1 ? p.x + p.w : p.x;
      ctx.arc(
        startX,
        p.y + p.h / 2,
        char.slashRange * 0.72,
        p.facing === 1 ? -Math.PI / 2 : Math.PI / 2,
        p.facing === 1 ? Math.PI / 2 : (3 * Math.PI) / 2
      );
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawEnemySprite(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement,
    source: { x: number; y: number; w: number; h: number },
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    hitFlash: boolean
  ) {
    ctx.imageSmoothingEnabled = false;
    if (!hitFlash || typeof document === 'undefined') {
      ctx.drawImage(sprite, source.x, source.y, source.w, source.h, dx, dy, dw, dh);
      return;
    }

    if (!this.hitFlashCanvas) {
      this.hitFlashCanvas = document.createElement('canvas');
    }
    if (this.hitFlashCanvas.width !== source.w || this.hitFlashCanvas.height !== source.h) {
      this.hitFlashCanvas.width = source.w;
      this.hitFlashCanvas.height = source.h;
    }
    const fctx = this.hitFlashCanvas.getContext('2d');
    if (!fctx) {
      ctx.drawImage(sprite, source.x, source.y, source.w, source.h, dx, dy, dw, dh);
      return;
    }

    this.applyPixelatedRendering(fctx, this.hitFlashCanvas);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, source.w, source.h);
    fctx.drawImage(sprite, source.x, source.y, source.w, source.h, 0, 0, source.w, source.h);
    fctx.globalCompositeOperation = 'source-in';
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, source.w, source.h);
    fctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.hitFlashCanvas, 0, 0, source.w, source.h, dx, dy, dw, dh);
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, en: Enemy) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (en.stealthAlpha) ctx.globalAlpha = en.stealthAlpha;
    const hitFlash = (en.hitFlashTimer ?? 0) > 0;

    if (en.type === 'turret') {
      const cx = en.x + en.w / 2, cy = en.y + en.h / 2;
      ctx.fillStyle = hitFlash ? '#ffffff' : '#1e293b';
      if (en.mount === 'ceiling') ctx.fillRect(en.x, en.y, en.w, 8);
      else if (en.mount === 'wall-left') ctx.fillRect(en.x, en.y, 8, en.h);
      else if (en.mount === 'wall-right') ctx.fillRect(en.x + en.w - 8, en.y, 8, en.h);
      else ctx.fillRect(en.x, en.y + en.h - 8, en.w, 8);
      const extension = !en.mount ? 1 : !en.ai || en.ai.state === 'patrol' ? 0 : en.ai.state === 'alert' ? 1 - en.ai.timer / 12 : 1;
      const source = enemySourceRect('turret');
      this.drawEnemySprite(ctx, getEnemyPixelSprite('turret'), source, en.x + 4, en.y + 5, en.w - 8, en.h - 10, hitFlash);
      if (en.deployedBy) { ctx.fillStyle = hitFlash ? '#ffffff' : '#f59e0b'; ctx.fillRect(en.x + 6,en.y + 8,3,en.h - 16); }
      if (extension > 0) {
        const angle = en.ai ? Math.atan2(en.ai.aimY - cy, en.ai.aimX - cx) : en.mount === 'ceiling' ? Math.PI / 2 : en.facing === 1 ? 0 : Math.PI;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.fillStyle = hitFlash || en.telegraph ? '#fff' : '#ef4444';
        ctx.fillRect(0, -5, en.w / 2 * extension, 4); ctx.fillRect(0, 2, en.w / 2 * extension, 4); ctx.restore();
      }
    } else {
      if (en.type === 'turret_engineer') {
        if (en.ai?.action === 'deploy' && en.telegraph) {
          ctx.fillStyle = '#fbbf24'; ctx.fillRect(en.x, en.y + en.h + 3, en.w * (1 - en.ai.timer / 90), 4);
        }
      }
      const sprite = getEnemyPixelSprite(en.type, enemyVisualFrame(en, this.visualTick));
      ctx.save();
      ctx.translate(en.x + en.w / 2, en.y + en.h / 2);
      ctx.scale(en.facing, 1);
      const source = enemySourceRect(en.type);
      this.drawEnemySprite(ctx, sprite, source, -en.w / 2, -en.h / 2, en.w, en.h, hitFlash);
      ctx.restore();

      if ((en.type === 'mib_shield' || en.type === 'heavy_trooper') && !en.shieldBroken) {
        ctx.fillStyle = hitFlash ? '#ffffff' : '#00f0ff';
        const sx = en.facing === 1 ? en.x + en.w - 4 : en.x - 8;
        ctx.fillRect(sx, en.y - 2, 10, en.h + 4);
      }
    }

    // Guard Crush stun stars overhead
    if (en.stunTimer && en.stunTimer > 0) {
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 3; i++) {
        const ang = this.tickCount * 0.25 + (i * Math.PI * 2) / 3;
        ctx.fillRect(en.x + en.w / 2 + Math.cos(ang) * 14 - 2, en.y - 14 + Math.sin(ang) * 4, 4, 4);
      }
    } else if (en.telegraph) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 20px "Barlow Condensed", sans-serif';
      ctx.fillText('!', en.x + en.w / 2 - 4, en.y - 16);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(en.x, en.y - 9, en.w, 4);
    if (en.ai?.state === 'alert') {
      ctx.globalAlpha = 1; ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 18px monospace';
      ctx.fillText('!', en.x + en.w / 2 - 4, en.y - 16);
    }
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(en.x, en.y - 9, Math.max(0, (en.hp / en.maxHp) * en.w), 4);
    if (en.burnTimer && en.burnTimer > 0) {
      const flicker = Math.sin(this.tickCount * 0.4 + en.id) * 3;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.fillRect(en.x + 2, en.y + en.h - 14 - Math.abs(flicker), 6, 12 + Math.abs(flicker));
      ctx.fillRect(en.x + en.w - 8, en.y + en.h - 12 - Math.max(0, flicker), 6, 10 + Math.max(0, flicker));
      ctx.fillStyle = '#facc15';
      ctx.fillRect(en.x + en.w / 2 - 3, en.y + en.h - 10, 6, 8);
    }
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: BossRuntime) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#fbbf24'; ctx.fillStyle = 'rgba(251,191,36,0.12)'; ctx.lineWidth = 2;
    for (const zone of bossWarnings(b)) { ctx.fillRect(zone.x, zone.y, zone.w, zone.h); ctx.strokeRect(zone.x, zone.y, zone.w, zone.h); }
    ctx.restore();
    drawBossSprite(ctx,b);
    ctx.imageSmoothingEnabled = false;

    // Cipher-01 Orbiting Psychic Daggers
    if (b.behavior === 'cipher') {
      const ang = b.orbitalAngle ?? 0;
      for (let i = 0; i < 3; i++) {
        const a = ang + (i * Math.PI * 2) / 3;
        const dx = b.x + b.w / 2 + Math.cos(a) * 44;
        const dy = b.y + b.h / 2 + Math.sin(a) * 24;
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(dx - 4, dy - 2, 10, 4);
      }
    }

    if (b.shieldActive) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
      const sx = b.facing === 1 ? b.x + b.w + 2 : b.x - 10;
      ctx.fillRect(sx, b.y - 4, 8, b.h + 8);
    }
    if (b.behavior === 'twins' && b.twinX !== undefined && b.twinY !== undefined) {
      drawBossSprite(ctx,b,true);
      ctx.imageSmoothingEnabled = false;
    }
    if (b.telegraph) {
      ctx.fillStyle = '#facc15';
      ctx.font = '900 24px "Barlow Condensed", sans-serif';
      ctx.fillText('!', b.x + b.w / 2 - 5, b.y - 20);
    }
    if (b.burnTimer && b.burnTimer > 0) {
      const flicker = Math.sin(this.tickCount * 0.35) * 4;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.fillRect(b.x + 4, b.y + b.h - 18 - Math.abs(flicker), 8, 16 + Math.abs(flicker));
      ctx.fillRect(b.x + b.w - 12, b.y + b.h - 16 - Math.max(0, flicker), 8, 14 + Math.max(0, flicker));
      ctx.fillStyle = '#facc15';
      ctx.fillRect(b.x + b.w / 2 - 4, b.y + b.h - 14, 8, 12);
    }
  }

  private drawCutIn(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const char = CHARACTERS[this.characterId];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05030d';
    ctx.fillRect(0, h * 0.34, w, h * 0.3);
    ctx.strokeStyle = char.accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, h * 0.34, w, h * 0.3);

    ctx.strokeStyle = char.trailColor;
    ctx.lineWidth = 3;
    this.dimensionalSlashes.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 34px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.superLabel, w / 2, h * 0.51);
    ctx.restore();
  }
}
