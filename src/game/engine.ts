import { drawBossSprite } from './bossArtwork';
import { HeroAnimator } from './heroAnimation';
import { drawHeroFrame } from './heroArtwork';
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
  private paused = true;
  private clock = new FixedStepClock();
  private transitionTimers = new Set<ReturnType<typeof setTimeout>>();
  private wallKickLock = 0;
  private standingPlatform: Platform | null = null;
  private platformDeltas = new Map<Platform, { x: number; y: number }>();
  private input = new GameInput();
  private jumpBuffer = 0;
  private coyoteTicks = 0;
  private slideHitIds = new Set<number>();
  private spawns = new SpawnManager(STAGES[0]);
  private tickCount = 0;
  private visualTick = 0;
  private heroAnimator = new HeroAnimator();
  private heroVisualTimers = { hurt:0, vault:0, special:0 };
  private hitstop = 0;

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
    this.attackBuffered = false;
    this.input.clear();
    this.jumpBuffer = 0;
    this.coyoteTicks = 0;
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
  private lightningAlpha = 0;
  private alertBanner: string | null = null;
  private alertTimer = 0;

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

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.callbacks = callbacks;
    this.initAmbient();
    this.initScarf(100, 600);
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
    this.superCutinTimer = 0;
    this.dimensionalSlashes = [];
    this.lowCeilingActive = false;
    this.lowCeilingTimer = 240;
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
      doubleJump: true,
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
      score: preserveScore,
    };

    this.initScarf(found.spawnX, found.spawnY);
    this.camera = cameraTarget(this.player, this.viewport,
      { top: found.boundsTop, bottom: found.boundsBottom, width: found.boundsWidth });
    this.showAlert(`SETOR ${found.substageId}: ${found.title.toUpperCase()}`, 140);
    this.playStageMusic();
    if (emitHud) this.emitHud();
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
    return (this.stage.exploration?.nodes ?? []).every(node => this.activated.has(node.id));
  }
  private nextRouteNode() { return this.stage.exploration?.nodes.find(node => !this.activated.has(node.id)); }
  /** The same local interaction is used by keyboard, touch and gamepad. */
  inspectRouteNode(id: string) {
    if (!this.canAct()) return false;
    const node = this.stage.exploration?.nodes.find(node => node.id === id);
    if (!node || !overlaps(this.player, node)) return false;
    if (this.activated.has(id)) { sound.playCue('confirm'); this.showAlert(`${node.label}: ATIVO`, 80); return true; }
    if (!node.requires.every(required => this.activated.has(required))) {
      sound.playCue('denied'); this.showAlert(`SEM SINAL: examine ${this.nextRouteNode()?.label}`, 120); return true;
    }
    const guardOrigin = node.guardIndex === undefined ? null : `${this.stage.substageId}:${node.guardIndex + 1}`;
    if (guardOrigin && this.enemies.some(enemy => enemy.hp > 0 && enemy.spawnId === guardOrigin)) {
      sound.playCue('denied'); this.showAlert('POSTO PROTEGIDO: derrote o guarda do painel.', 120); return true;
    }
    this.activated.add(id);
    if (this.routeComplete()) for (const platform of this.platforms) if (platform.gateId) platform.broken = true;
    sound.playCue(this.routeComplete() ? 'unlock' : 'panel'); this.addMangaFx('ATIVADO!', node.x, node.y - 18, '#22d3ee');
    this.showAlert(this.routeComplete() ? (this.stage.boss ? 'ACESSO AO CONFRONTO LIBERADO.' : 'PASSAGEM LIBERADA — procure a saída superior.') : `SINAL ENVIADO — volte até ${this.nextRouteNode()?.label}`, 160);
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
    const point = target.checkpoints.find((checkpoint) => checkpoint.id === exit.targetCheckpoint);
    if (!point) return false;
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
    if (cached) {
      // The destination is not displayed yet: returning actors are present on first reveal,
      // rather than appearing later inside the camera. All cooldown/safety rules still apply.
      const solids = this.platforms.filter((platform) => !platform.broken && platform.type !== 'acid' && platform.type !== 'laser_gate');
      this.enemies.push(...this.spawns.update(this.player, null, this.tickCount, this.enemies, solids, true));
    }
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
    this.heroVisualTimers = { hurt:0, vault:0, special:0 };
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
    const loop = (timestamp: number) => {
      try {
        this.pollGamepadPause();
        if (!this.paused) {
          this.clock.advance(timestamp, () => {
            this.pollGamepad();
            this.update();
            return !this.paused;
          });
        }
        this.draw();
      } catch (err) {
        console.error('GameLoop Safe Recover:', err);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.cancelTransitions();
    this.clearInput();
    this.clock.reset();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    sound.stopMusic();
  }

  resize(width: number, height: number) {
    this.canvas.width = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
    this.canvas.height = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
    this.ctx.imageSmoothingEnabled = false;
    this.camera = cameraTarget(this.player, this.viewport,
      { top: this.stage.boundsTop, bottom: this.stage.boundsBottom, width: this.stage.boundsWidth },
      this.ambushArenas.find((arena) => arena.active && !arena.cleared));
  }

  setKey(key: InputKey, pressed: boolean, source: InputSource = 'keyboard') {
    if (pressed && !this.canAct()) return;
    this.input.set(source, key, pressed);
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
    this.jumpBuffer = MOVEMENT.jumpBufferTicks;
    if (this.tryJump()) this.jumpBuffer = 0;
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
      p.doubleJump = true;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, this.stage.palette.pipeColor, 8, 4);
      this.addMangaFx('VAULT!', p.x, p.y - 16, this.stage.palette.pipeColor);
      return true;
    }

    // Strict Alternating Wall-Kick
    if (p.onWall !== 0 && !p.grounded) {
      const sameWall =
        p.onWall === p.lastWallSide &&
        p.lastWallX !== null &&
        Math.abs(p.x - p.lastWallX) < 52;
      if (sameWall) {
        this.addMangaFx('TROQUE DE PAREDE!', p.x, p.y - 14, '#facc15');
        return false;
      }

      p.lastWallSide = p.onWall;
      p.lastWallX = p.x;
      p.vy = -jumpForce * MOVEMENT.wallKickJump;
      p.vx = -p.onWall * (char.speed * MOVEMENT.wallKickSpeed);
      this.wallKickLock = MOVEMENT.wallKickLockTicks;
      p.facing = (-p.onWall) as 1 | -1;
      p.doubleJump = true;
      sound.sfxWallKick();
      this.addParticle(p.x + (p.onWall === 1 ? p.w : 0), p.y + 20, char.trailColor, 10, 5);
      this.addMangaFx('WALL KICK!', p.x, p.y - 16, char.trailColor);
      return true;
    }

    if (p.grounded || this.coyoteTicks > 0) {
      this.coyoteTicks = 0;
      p.vy = -jumpForce;
      p.grounded = false;
      p.doubleJump = true;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, '#cbd5e1', 5, 3);
      return true;
    }

    if (p.doubleJump || p.jmpTimer > 0) {
      p.vy = -jumpForce * MOVEMENT.aerialJump;
      if (p.jmpTimer <= 0) p.doubleJump = false;
      sound.sfxDoubleJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, char.accentColor, 12, 5);
      this.addMangaFx(p.jmpTimer > 0 ? 'AIR STEP!' : 'PSY JUMP!', p.x, p.y - 12, char.accentColor);
      return true;
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
        }
      });
      if (this.boss.active && this.boss.triggered && bossBodies(this.boss).some((body) => Math.abs(body.x - p.x) < 760)) {
        this.damageBoss(100);
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
      this.mayaWell = {
        x: p.x + p.facing * 150,
        y: p.y + 10,
        timer: 150,
        radius: 215,
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

  private damageBoss(dmg: number) {
    if (!this.boss.active || this.stageClearTriggered) return;
    this.boss.hp -= dmg;
    this.hitstop = Math.max(this.hitstop, 4);
    this.screenShake(8);
    sound.sfxHit('boss');
    this.addParticle(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, this.boss.accentColor, 14, 6);
    this.addMangaFx('CRUSH!', this.boss.x, this.boss.y - 24, '#ff007f');
    this.registerHit(200);

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
    this.worldTick++;
    this.tickCount++;

    if (this.superCutinTimer > 0) {
      this.superCutinTimer--;
      return;
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
    let interactRequested = false;
    for (const { action } of this.input.drain()) {
      if (action === 'interact') interactRequested = true;
      if (action === 'jump') this.jumpBuffer = MOVEMENT.jumpBufferTicks;
      if (action === 'attack') this.triggerAttack();
      if (action === 'dash') this.triggerDashOrSlide();
      if (action === 'psy') this.triggerPsy();
      if (action === 'assist') this.triggerAssist();
    }
    if (this.jumpBuffer > 0) {
      if (this.tryJump()) this.jumpBuffer = 0;
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

    // Stage 2: Low Ceiling Monorail Hazard
    if (this.stage.hasLowCeilingHazard && !this.boss.triggered) {
      this.lowCeilingTimer--;
      if (this.lowCeilingTimer <= 0 && !this.lowCeilingActive) {
        this.lowCeilingActive = true;
        this.lowCeilingX = p.x + 760;
        this.lowCeilingTimer = 320;
        sound.sfxAlarm();
        this.showAlert('PERIGO: PÓRTICO BAIXO — DESLIZE (▼ + DASH)!', 90);
      }
      if (this.lowCeilingActive) {
        this.lowCeilingX -= 16;
        const beamBox = { x: this.lowCeilingX, y: 540, w: 130, h: 66 };
        if (this.checkAABB(p, beamBox) && !p.isSliding) {
          this.damagePlayer(22, -8);
        }
        if (this.lowCeilingX < p.x - 520) this.lowCeilingActive = false;
      }
    }

    // Stage 3: Storm lightning flash
    if (this.stage.palette.weather === 'storm') {
      if (this.lightningAlpha > 0) this.lightningAlpha *= 0.88;
      if (Math.random() < 0.004) this.lightningAlpha = 0.65;
    }

    // Maya Gravity Well active
    if (this.mayaWell) {
      this.mayaWell.timer--;
      this.enemies.forEach((en) => {
        const dx = this.mayaWell!.x - en.x;
        const dy = this.mayaWell!.y - en.y;
        const dist = Math.hypot(dx, dy);
        if (!en.mount && dist < this.mayaWell!.radius && dist > 6) {
          en.vx += (dx / dist) * 2.6;
          en.vy += (dy / dist) * 2.6;
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
          }
        });
      }
      if (this.leonFlameZone.timer <= 0) this.leonFlameZone = null;
    }

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
    p.isFlying =
      char.canFlight &&
      this.keys.jumpHeld &&
      !p.grounded &&
      p.onWall === 0 &&
      !p.hangingCeiling &&
      p.psyEnergy > 0.6 &&
      p.stunTimer <= 0;

    // Briefly preserve the outward wall-kick impulse instead of overriding it with held input.
    if (this.wallKickLock > 0) this.wallKickLock--;
    // Horizontal movement
    if (!p.isDashing && !p.isSliding && this.wallKickLock === 0) {
      if (p.stunTimer > 0) {
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
          p.doubleJump = true;
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
    } else if (p.onWall !== 0 && !p.grounded && this.keys.up && p.stunTimer <= 0) {
      // Active Wall Climb!
      p.vy = -MOVEMENT.wallClimbSpeed;
      if (this.tickCount % 6 === 0) {
        this.addParticle(p.x + (p.onWall === 1 ? p.w : 0), p.y + 22, char.trailColor, 3, 2);
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
    const wall = moveAgainstSolids(p, p.vx, 'x', solids);
    p.onWall = wall && !p.grounded ? (p.vx > 0 ? 1 : -1) : 0;
    if (wall) p.vx = 0;
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
          p.doubleJump = true;
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
          p.doubleJump = true;
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

    this.heroAnimator.sample(this.heroVisualInput(),this.visualTick);
    if (this.tickCount % 4 === 0) {
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
    p.doubleJump = true;
    p.stunTimer = 0;
    p.stunGraceTimer = 90;
    p.invulnTimer = Math.max(60, p.invulnTimer);
    this.standingPlatform = null;
    this.clearInput();
    this.resetAttack(); this.heroVisualTimers = { hurt:0, vault:0, special:0 }; this.heroAnimator.reset(this.visualTick);
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
      const landingX = p.x - p.facing * 56;
      const intent = stepEnemyAI(enemy, { player: p, visible, home, stunned,
        installationX: this.spawns.installationX(enemy),
        coverFire: p.stunTimer > 10,
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
          const damaged = this.damagePlayer(profile.damage, mind.facing * (guardShove ? 11 : 7));
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
      arenaLocked,
    });
  }

  // =========================================================================
  // RENDERING (Pixel Art + resolution-independent world height)
  // =========================================================================
  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pal = this.stage.palette;

    ctx.imageSmoothingEnabled = false;

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

    // Parallax city silhouettes
    ctx.fillStyle = pal.cityFar;
    for (let i = 0; i < 16; i++) {
      const bx = ((i * 220 - this.camera.x * 0.22) % (w + 320)) - 140;
      const bh = 180 + ((i * 73) % 240);
      ctx.fillRect(bx, h - bh, 150, bh);
    }
    ctx.fillStyle = pal.cityMid;
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 290 - this.camera.x * 0.45) % (w + 420)) - 180;
      const bh = 130 + ((i * 97) % 200);
      ctx.fillRect(bx, h - bh, 190, bh);
      ctx.fillStyle = i % 2 === 0 ? pal.accentNeon + '22' : pal.secondaryNeon + '22';
      ctx.fillRect(bx + 18, h - bh + 22, 48, 16);
      ctx.fillStyle = pal.cityMid;
    }

    this.drawWeather(ctx, w, h);

    // World scale follows a fixed logical height, not physical screen resolution.
    ctx.save();
    ctx.scale(this.viewport.zoom, this.viewport.zoom);
    const sx = (Math.random() - 0.5) * this.shakeAmount;
    const sy = (Math.random() - 0.5) * this.shakeAmount;
    ctx.translate(-this.camera.x + sx, -this.camera.y + sy);

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

    // 2. Ceiling Pipes
    this.ceilingPipes.forEach((cp) => {
      ctx.fillStyle = pal.pipeColor;
      ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(cp.x, cp.y + 3, cp.w, 3);
    });

    // 3. Platforms, Conveyors & Hazards
    this.platforms.forEach((plat) => {
      if (plat.broken) return;
      if (plat.gateId) {
        ctx.fillStyle = '#78350f'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#fbbf24'; for (let y = plat.y + 5; y < plat.y + plat.h - 6; y += 18) ctx.fillRect(plat.x + 3, y, plat.w - 6, 5);
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
        ctx.fillStyle = '#334155';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        // Animated directional chevrons
        const dir = (plat.conveyorSpeed ?? 1) >= 0 ? 1 : -1;
        const shift = ((this.tickCount * 2 * dir) % 28 + 28) % 28;
        ctx.fillStyle = '#facc15';
        for (let cx = plat.x + shift; cx < plat.x + plat.w - 10; cx += 28) {
          ctx.fillRect(cx, plat.y + 5, 10, 4);
        }
        return;
      }
      ctx.fillStyle = plat.type === 'crumble' ? '#78350f' : pal.platformFill;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = plat.type === 'crumble' ? '#facc15' : pal.platformStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

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

    // 6. Low Ceiling Hazard (Stage 2)
    if (this.lowCeilingActive) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(this.lowCeilingX, 540, 130, 66);
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('DESLIZE! ▼', this.lowCeilingX + 24, 578);
    }

    // 7. Partner Zones
    if (this.mayaWell) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.mayaWell.x, this.mayaWell.y, 44 + Math.sin(this.tickCount * 0.25) * 10, 0, Math.PI * 2);
      ctx.stroke();
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
    this.particles.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.life;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });
    ctx.globalAlpha = 1;

    this.mangaTexts.forEach((mt) => {
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
    });

    ctx.restore();

    if (this.lightningAlpha > 0.02) {
      ctx.fillStyle = `rgba(224, 231, 255, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.superCutinTimer > 0) {
      this.drawCutIn(ctx, w, h);
    }
  }

  private drawWeather(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
    return { ...this.player, climbHeld:this.keys.up, hurtTicks:this.heroVisualTimers.hurt,
      specialTicks:this.heroVisualTimers.special, vaultTicks:this.heroVisualTimers.vault };
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const char = CHARACTERS[this.characterId];
    if (p.gstTimer > 0) {
      ctx.globalAlpha = 0.35;
    } else if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 3) % 2 === 1) {
      ctx.globalAlpha = 0.45;
    }

    // Ren's 8-Node Kinematic Scarf drawn in world space
    if (this.characterId === 'ren' && this.scarfNodes.length > 1) {
      ctx.save();
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
      ctx.strokeStyle = p.atkTimer > 0 ? '#ef4444' : char.accentColor;
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

  private drawEnemy(ctx: CanvasRenderingContext2D, en: Enemy) {
    ctx.save();
    if (en.stealthAlpha) ctx.globalAlpha = en.stealthAlpha;

    if (en.type === 'turret') {
      const cx = en.x + en.w / 2, cy = en.y + en.h / 2;
      ctx.fillStyle = '#1e293b';
      if (en.mount === 'ceiling') ctx.fillRect(en.x, en.y, en.w, 8);
      else if (en.mount === 'wall-left') ctx.fillRect(en.x, en.y, 8, en.h);
      else if (en.mount === 'wall-right') ctx.fillRect(en.x + en.w - 8, en.y, 8, en.h);
      else ctx.fillRect(en.x, en.y + en.h - 8, en.w, 8);
      const extension = !en.mount ? 1 : !en.ai || en.ai.state === 'patrol' ? 0 : en.ai.state === 'alert' ? 1 - en.ai.timer / 12 : 1;
      ctx.imageSmoothingEnabled = true;
      const source = enemySourceRect('turret');
      ctx.drawImage(getEnemyPixelSprite('turret'),source.x,source.y,source.w,source.h, en.x + 4, en.y + 5, en.w - 8, en.h - 10);
      if (en.deployedBy) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(en.x + 6,en.y + 8,3,en.h - 16); }
      if (extension > 0) {
        const angle = en.ai ? Math.atan2(en.ai.aimY - cy, en.ai.aimX - cx) : en.mount === 'ceiling' ? Math.PI / 2 : en.facing === 1 ? 0 : Math.PI;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.fillStyle = en.telegraph ? '#fff' : '#ef4444';
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
      ctx.imageSmoothingEnabled = true;
      const source = enemySourceRect(en.type);
      ctx.drawImage(sprite,source.x,source.y,source.w,source.h, -en.w / 2, -en.h / 2, en.w, en.h);
      ctx.restore();

      if ((en.type === 'mib_shield' || en.type === 'heavy_trooper') && !en.shieldBroken) {
        ctx.fillStyle = '#00f0ff';
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
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: BossRuntime) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24'; ctx.fillStyle = 'rgba(251,191,36,0.12)'; ctx.lineWidth = 2;
    for (const zone of bossWarnings(b)) { ctx.fillRect(zone.x, zone.y, zone.w, zone.h); ctx.strokeRect(zone.x, zone.y, zone.w, zone.h); }
    ctx.restore();
    drawBossSprite(ctx,b);

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
    }
    if (b.telegraph) {
      ctx.fillStyle = '#facc15';
      ctx.font = '900 24px "Barlow Condensed", sans-serif';
      ctx.fillText('!', b.x + b.w / 2 - 5, b.y - 20);
    }
  }

  private drawCutIn(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const char = CHARACTERS[this.characterId];
    ctx.save();
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
