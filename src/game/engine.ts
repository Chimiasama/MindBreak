import { sound } from './audio';
import { CHARACTER_ORDER, CHARACTERS } from './characters';
import { getEnemyPixelSprite, getHeroPixelSprite } from './pixelSprites';
import { STAGES } from './stages';
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
  StageDefinition,
} from './types';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  fromPlayer?: boolean;
  piercing?: boolean;
  isWindBlade?: boolean;
  shooterId?: number;
  hitIds?: Set<number>;
  color: string;
  damage: number;
  dead?: boolean;
}

interface ThrownEnemy {
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
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (stageId: number, score: number) => void;
  onContinueCountdown: (stageId: number, score: number) => void;
  onGameOver: (stageId: number, score: number) => void;
}

const ZOOM = 0.8;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private paused = false;
  private tickCount = 0;
  private hitstop = 0;

  private stage: StageDefinition = STAGES[0];
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
    comboHits: 0,
    comboTimer: 0,
    invulnTimer: 0,
    stunTimer: 0,
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

  private keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
  };

  private camera = { x: 0, y: 0 };
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
    const found = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    this.stage = found;
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
    this.enemies = found.enemies.map((en, idx) => ({
      ...en,
      id: idx + 1,
      vx: 0,
      vy: 0,
      airborne: en.type === 'jetpack' || en.type === 'drone',
      telegraph: 0,
      patrolMinX: en.x - 120,
      patrolMaxX: en.x + 120,
      turnTimer: 0,
      targetFacing: en.facing,
      shieldHits: 0,
      shieldBroken: false,
      stunTimer: 0,
      isFlanking: false,
    }));
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

    this.boss = {
      ...found.boss,
      active: true,
      triggered: false,
      hp: found.boss.maxHp,
      vx: 0,
      vy: 0,
      facing: -1,
      phase: 1,
      attackTimer: 70,
      specialTimer: 160,
      telegraph: 0,
      twinX: found.boss.x + 120,
      twinY: found.boss.y,
      shieldActive: found.boss.behavior === 'cipher',
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
      comboHits: 0,
      comboTimer: 0,
      invulnTimer: 45,
      stunTimer: 0,
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
    const viewW = this.canvas.width / ZOOM;
    const viewH = this.canvas.height / ZOOM;
    this.camera.x = Math.max(0, this.player.x - viewW * 0.4);
    this.camera.y = Math.max(found.boundsTop, this.player.y + this.player.h - viewH * 0.7);
    this.showAlert(`FASE ${found.id}: ${found.title.toUpperCase()}`, 140);
    sound.startMusic(found.musicGenre);
    this.emitHud();
  }

  continueWithCharacter(charId: CharacterId) {
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
    p.vx = 0;
    p.vy = 0;
    p.x = p.lastGroundX;
    p.y = p.lastGroundY - p.h - 4;
    this.continueTriggered = false;
    this.gameOverTriggered = false;
    this.paused = false;
    this.bullets = this.bullets.filter((b) => b.fromPlayer);
    sound.startMusic(this.stage.musicGenre);
    sound.playVoiceShout(charId);
    this.addMangaFx('CONTINUE!', p.x, p.y - 30, '#00f0ff');
    this.showAlert(`${profile.name.toUpperCase()} ENTROU EM AÇÃO!`, 100);
    this.emitHud();
  }

  triggerFinalGameOver() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.paused = true;
    sound.stopMusic();
    this.callbacks.onGameOver(this.stage.id, this.player.score);
  }

  switchCharacter(nextId?: CharacterId) {
    const idx = CHARACTER_ORDER.indexOf(this.characterId);
    const target = nextId ?? CHARACTER_ORDER[(idx + 1) % CHARACTER_ORDER.length];
    if (target === this.characterId) return;

    const oldRatio = this.player.hp / this.player.maxHp;
    this.characterId = target;
    const profile = CHARACTERS[target];
    this.player.maxHp = profile.maxHp;
    this.player.hp = Math.max(10, Math.round(profile.maxHp * oldRatio));
    this.player.isFlying = false;
    this.addParticle(this.player.x + 16, this.player.y + 28, profile.accentColor, 14, 6);
    this.addMangaFx(`TAG: ${profile.name.toUpperCase()}!`, this.player.x, this.player.y - 24, profile.accentColor);
    sound.sfxAssist();
    sound.playVoiceShout(target);
    this.emitHud();
  }

  setPaused(pause: boolean) {
    this.paused = pause;
    if (pause) {
      sound.stopMusic();
    } else {
      sound.startMusic(this.stage.musicGenre);
    }
  }

  start() {
    this.stop();
    const loop = () => {
      try {
        if (!this.paused) {
          this.pollGamepad();
          this.update();
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
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    sound.stopMusic();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  setKey(key: 'left' | 'right' | 'up' | 'down' | 'jumpHeld', pressed: boolean) {
    this.keys[key] = pressed;
  }

  private showAlert(msg: string, frames = 110) {
    this.alertBanner = msg;
    this.alertTimer = frames;
  }

  private pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (!pad) return;

    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    this.keys.left = ax < -0.35 || !!pad.buttons[14]?.pressed;
    this.keys.right = ax > 0.35 || !!pad.buttons[15]?.pressed;
    this.keys.up = ay < -0.45 || !!pad.buttons[12]?.pressed;
    this.keys.down = ay > 0.45 || !!pad.buttons[13]?.pressed;

    const jumpBtn = !!pad.buttons[0]?.pressed;
    this.keys.jumpHeld = jumpBtn;
    if (jumpBtn && !this.lastGamepadJump) this.triggerJump();
    this.lastGamepadJump = jumpBtn;

    const atkBtn = !!pad.buttons[2]?.pressed;
    if (atkBtn && !this.lastGamepadAttack) this.triggerAttack();
    this.lastGamepadAttack = atkBtn;

    const dashBtn = !!pad.buttons[1]?.pressed || !!pad.buttons[5]?.pressed;
    if (dashBtn && !this.lastGamepadDash) this.triggerDashOrSlide();
    this.lastGamepadDash = dashBtn;

    const psyBtn = !!pad.buttons[3]?.pressed;
    if (psyBtn && !this.lastGamepadPsy) this.triggerPsy();
    this.lastGamepadPsy = psyBtn;

    const assistBtn = !!pad.buttons[4]?.pressed;
    if (assistBtn && !this.lastGamepadAssist) this.triggerAssist();
    this.lastGamepadAssist = assistBtn;
  }

  // =========================================================================
  // PLAYER ACTIONS
  // =========================================================================
  triggerJump() {
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return;

    const char = CHARACTERS[this.characterId];
    const jumpMult = p.jmpTimer > 0 ? 1.4 : 1;
    const jumpForce = char.jumpForce * jumpMult;
    this.keys.jumpHeld = true;

    // Ceiling Hang -> Vault Over!
    if (p.hangingCeiling && p.hangingPipe) {
      p.hangingCeiling = false;
      p.y = p.hangingPipe.y - p.h - 2;
      p.vy = -jumpForce * 0.42;
      p.hangingPipe = null;
      p.doubleJump = true;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, this.stage.palette.pipeColor, 8, 4);
      this.addMangaFx('VAULT!', p.x, p.y - 16, this.stage.palette.pipeColor);
      return;
    }

    // Strict Alternating Wall-Kick
    if (p.onWall !== 0 && !p.grounded) {
      const sameWall =
        p.onWall === p.lastWallSide &&
        p.lastWallX !== null &&
        Math.abs(p.x - p.lastWallX) < 52;
      if (sameWall) {
        this.addMangaFx('TROQUE DE PAREDE!', p.x, p.y - 14, '#facc15');
        return;
      }

      p.lastWallSide = p.onWall;
      p.lastWallX = p.x;
      p.vy = -jumpForce * 0.96;
      p.vx = -p.onWall * (char.speed * 1.45);
      p.facing = (-p.onWall) as 1 | -1;
      p.doubleJump = true;
      sound.sfxWallKick();
      this.addParticle(p.x + (p.onWall === 1 ? p.w : 0), p.y + 20, char.trailColor, 10, 5);
      this.addMangaFx('WALL KICK!', p.x, p.y - 16, char.trailColor);
      return;
    }

    if (p.grounded) {
      p.vy = -jumpForce;
      p.grounded = false;
      p.doubleJump = true;
      sound.sfxJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, '#cbd5e1', 5, 3);
      return;
    }

    if (p.doubleJump || p.jmpTimer > 0) {
      p.vy = -jumpForce * 0.88;
      if (p.jmpTimer <= 0) p.doubleJump = false;
      sound.sfxDoubleJump();
      this.addParticle(p.x + p.w / 2, p.y + p.h, char.accentColor, 12, 5);
      this.addMangaFx(p.jmpTimer > 0 ? 'AIR STEP!' : 'PSY JUMP!', p.x, p.y - 12, char.accentColor);
    }
  }

  triggerDropDown() {
    if (this.player.hangingCeiling) {
      this.player.hangingCeiling = false;
      this.player.hangingPipe = null;
      this.player.vy = 5;
    }
  }

  triggerDashOrSlide() {
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return;
    const char = CHARACTERS[this.characterId];

    if (this.keys.down && p.grounded && !p.isSliding) {
      p.isSliding = true;
      p.slideTimer = 22;
      p.vx = p.facing * (char.speed * 2.05);
      sound.sfxSlide();
      this.addMangaFx('SLIDE!', p.x, p.y - 10, char.trailColor);
      return;
    }

    if (p.dashCooldown <= 0 && !p.isDashing) {
      p.isDashing = true;
      p.dashTimer = 12;
      p.dashCooldown = 26;
      p.vy = 0;
      p.vx = p.facing * (char.speed * 2.35);
      sound.sfxDash();
      this.addParticle(p.x + p.w / 2, p.y + 28, char.trailColor, 10, 5);
      this.addMangaFx('DASH!', p.x, p.y - 14, char.trailColor);
    }
  }

  triggerAttack() {
    sound.init();
    const p = this.player;
    if (p.slashTimer > 0 || p.stunTimer > 0) return;

    const char = CHARACTERS[this.characterId];
    p.slashing = true;
    p.slashTimer = 11;
    p.comboStep = (p.comboStep + 1) % 3;
    sound.sfxSlash();
    sound.playVoiceShout(this.characterId);

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

    // Hit destructible props & secret chests
    this.props.forEach((pr) => {
      if (pr.broken) return;
      if (this.checkAABB(slashHitbox, pr)) {
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
      if (!this.checkAABB(slashHitbox, en)) return;

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
          this.registerHit(150);
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
      const baseDmg = (char.attackPower + (p.comboStep === 2 ? 12 : 0)) * dmgMult * backstabMult;
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
    if (this.boss.active && this.boss.triggered && this.checkAABB(slashHitbox, this.boss)) {
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
        this.damageBoss(char.attackPower * dmgMult);
        this.boss.vx = p.facing * 4.5;
      }
    }

    // Deflect Counter: slice enemy bullets & reflect at 2x speed aimed at shooter/nearest target!
    this.bullets.forEach((b) => {
      if (!b.fromPlayer && this.checkAABB(slashHitbox, b)) {
        b.fromPlayer = true;
        const origSpeed = Math.max(6.5, Math.hypot(b.vx, b.vy));
        const targetSpeed = origSpeed * 2;

        // Aim back at shooter if alive, or nearest enemy/boss
        let target: { x: number; y: number; w: number; h: number } | undefined =
          b.shooterId !== undefined ? this.enemies.find((e) => e.id === b.shooterId) : undefined;
        if (!target && this.boss.active && this.boss.triggered) {
          target = this.boss;
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
    sound.init();
    const p = this.player;
    if (p.stunTimer > 0) return;
    const char = CHARACTERS[this.characterId];

    // OVERDRIVE when Focus >= 95%
    if (p.psyEnergy >= 95) {
      p.psyEnergy = 0;
      this.superCutinTimer = 46;
      this.superLabel = char.overdriveName;
      this.screenShake(24);
      sound.sfxOverdrive();
      sound.playVoiceShout(this.characterId);

      const viewW = this.canvas.width / ZOOM;
      const viewH = this.canvas.height / ZOOM;
      this.dimensionalSlashes = [];
      for (let i = 0; i < 16; i++) {
        this.dimensionalSlashes.push({
          x1: Math.random() * this.canvas.width,
          y1: Math.random() * this.canvas.height,
          x2: Math.random() * this.canvas.width,
          y2: Math.random() * this.canvas.height,
        });
      }

      const viewLeft = this.camera.x - 80;
      const viewRight = this.camera.x + viewW + 80;
      this.enemies.forEach((en) => {
        if (en.x >= viewLeft && en.x <= viewRight && Math.abs(en.y - p.y) < viewH) {
          this.hitEnemy(en, 110, (en.x > p.x ? 1 : -1) * 10, -12, 6);
        }
      });
      if (this.boss.active && this.boss.triggered && Math.abs(this.boss.x - p.x) < 760) {
        this.damageBoss(100);
      }
      this.bullets = this.bullets.filter((b) => b.fromPlayer);
      this.emitHud();
      return;
    }

    if (p.psyEnergy < 28) {
      this.addMangaFx('SEM FOCO!', p.x, p.y - 20, '#ef4444');
      sound.sfxBlock();
      return;
    }

    let targetIdx = -1;
    let minDist = 240;
    this.enemies.forEach((en, idx) => {
      const dist = Math.hypot(en.x - p.x, en.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        targetIdx = idx;
      }
    });

    if (targetIdx !== -1) {
      p.psyEnergy -= 28;
      const grabbed = this.enemies.splice(targetIdx, 1)[0];
      sound.sfxPsyThrow();
      sound.playVoiceShout(this.characterId);
      this.hitstop = 4;
      this.screenShake(10);
      this.addMangaFx('TELE-THROW!', p.x, p.y - 26, '#a855f7');
      this.thrownEnemies.push({
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
      if (this.boss.active && this.boss.triggered && Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < 195) {
        this.damageBoss(35);
      }
    }
    this.emitHud();
  }

  triggerAssist() {
    sound.init();
    const p = this.player;
    if (p.psyEnergy < 32 || this.mayaWell !== null) {
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
      if (this.boss.active && this.boss.triggered && Math.abs(this.boss.x - p.x) < 320) {
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
    en.hp -= dmg;
    en.vx = kx;
    en.vy = ky;
    en.airborne = true;
    this.hitstop = Math.max(this.hitstop, hitstopFrames);
    this.screenShake(6);
    sound.sfxHit();
    this.addParticle(en.x + en.w / 2, en.y + en.h / 2, CHARACTERS[this.characterId].accentColor, 10, 5);
    this.registerHit(120);
  }

  private damageBoss(dmg: number) {
    this.boss.hp -= dmg;
    this.hitstop = Math.max(this.hitstop, 4);
    this.screenShake(8);
    sound.sfxHit();
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
      this.addScore(2500);
      this.screenShake(22);
      this.addParticle(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, '#00f0ff', 36, 9);
      this.addMangaFx('STAGE CLEAR!', this.boss.x, this.boss.y - 40, '#00f0ff');
      sound.sfxStageClear();
      this.emitHud();
      setTimeout(() => {
        this.callbacks.onStageClear(this.stage.id, this.player.score);
      }, 1150);
    }
  }

  private damagePlayer(dmg: number, knockX: number, ignoreInvuln = false, isWeakBullet = false) {
    const p = this.player;
    const char = CHARACTERS[this.characterId];
    if (this.continueTriggered || this.gameOverTriggered) return;
    if (p.gstTimer > 0 && !ignoreInvuln) return; // GST optical camouflage invulnerability
    if (!ignoreInvuln && (p.invulnTimer > 0 || p.isDashing)) return;

    // Leon Super Armor: absorbs knockback/flinch from weak bullets!
    if (char.superArmor && isWeakBullet) {
      p.hp = Math.max(0, p.hp - Math.round(dmg * 0.7));
      this.addMangaFx('SUPER ARMOR!', p.x, p.y - 18, '#f97316');
      sound.sfxBlock();
    } else {
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
        p.vx = 0;
        p.vy = 0;
        p.x = p.lastGroundX;
        p.y = p.lastGroundY - p.h - 4;
        this.addMangaFx('RESPAWN! 3s I-FRAMES', p.x, p.y - 30, '#00f0ff');
        this.showAlert(`VIDAS RESTANTES: ${p.lives}`, 90);
        this.emitHud();
      } else if (!this.continueTriggered) {
        p.lives = 0;
        this.continueTriggered = true;
        this.paused = true;
        sound.stopMusic();
        this.emitHud();
        setTimeout(() => {
          this.callbacks.onContinueCountdown(this.stage.id, p.score);
        }, 450);
      }
    }
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
    this.tickCount++;

    if (this.superCutinTimer > 0) {
      this.superCutinTimer--;
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    const p = this.player;
    const char = CHARACTERS[this.characterId];

    if (this.alertTimer > 0) {
      this.alertTimer--;
      if (this.alertTimer <= 0) this.alertBanner = null;
    }
    if (p.invulnTimer > 0) p.invulnTimer--;
    if (p.stunTimer > 0) p.stunTimer--;
    if (p.pitfallCooldown > 0) p.pitfallCooldown--;
    if (p.atkTimer > 0) p.atkTimer--;
    if (p.jmpTimer > 0) p.jmpTimer--;
    if (p.gstTimer > 0) p.gstTimer--;
    if (!p.isFlying && p.psyEnergy < p.maxPsy) p.psyEnergy += 0.07;
    if (this.shakeAmount > 0) this.shakeAmount *= 0.85;

    // Update moving & crumbling platforms
    this.platforms.forEach((plat) => {
      if (plat.type === 'moving' && plat.originX !== undefined && plat.originY !== undefined) {
        const offset = Math.sin(this.tickCount * (plat.moveSpeed ?? 0.03)) * (plat.moveRange ?? 80);
        if (plat.moveAxis === 'x') plat.x = plat.originX + offset;
        else plat.y = plat.originY + offset;
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
        if (dist < this.mayaWell!.radius && dist > 6) {
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
          if (!en.airborne || en.vy >= 0) {
            this.hitEnemy(en, 18, p.facing * 4, -12.5, 4);
            this.addMangaFx('LAUNCH!', en.x, en.y - 24, '#00f0ff');
          }
        }
      });
      if (p.slideTimer <= 0) p.isSliding = false;
    }
    if (p.slashTimer > 0) {
      p.slashTimer--;
      if (p.slashTimer <= 0) p.slashing = false;
    }
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

    // Horizontal movement
    if (!p.isDashing && !p.isSliding) {
      if (p.stunTimer > 0) {
        p.vx *= 0.85;
      } else if (this.keys.left) {
        p.vx = -char.speed * (p.isFlying ? 1.1 : 1);
        p.facing = -1;
      } else if (this.keys.right) {
        p.vx = char.speed * (p.isFlying ? 1.1 : 1);
        p.facing = 1;
      } else {
        p.vx *= 0.72;
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
      if (this.keys.left) p.vx = -char.speed * 0.85;
      else if (this.keys.right) p.vx = char.speed * 0.85;
      else p.vx = 0;
    } else if (p.isFlying) {
      p.psyEnergy = Math.max(0, p.psyEnergy - 0.35);
      if (this.keys.up) p.vy = -char.speed * 0.95;
      else if (this.keys.down) p.vy = char.speed * 0.95;
      else p.vy *= 0.75;
      if (this.tickCount % 5 === 0) {
        this.addParticle(p.x + p.w / 2, p.y + p.h, '#00f0ff', 2, 2.5);
      }
    } else if (p.onWall !== 0 && !p.grounded && this.keys.up && p.stunTimer <= 0) {
      // Active Wall Climb!
      p.vy = -3.6;
      if (this.tickCount % 6 === 0) {
        this.addParticle(p.x + (p.onWall === 1 ? p.w : 0), p.y + 22, char.trailColor, 3, 2);
      }
    } else {
      let gravity = 0.65 * this.stage.gravityScale;
      if (p.onWall !== 0 && p.vy > 0) {
        gravity = 0.2;
      }
      p.vy += gravity;
      if (p.onWall !== 0 && p.vy > 2.4) p.vy = 2.4;
    }

    // Ambush Arena activation & clamping
    const activeArena = this.checkAmbushArenas();

    // Collision X
    p.x += p.vx;
    const minBoundX = activeArena ? activeArena.minX : 10;
    const maxBoundX = activeArena ? activeArena.maxX - p.w : this.stage.boundsWidth - p.w - 10;
    p.x = Math.max(minBoundX, Math.min(maxBoundX, p.x));
    p.onWall = 0;
    this.platforms.forEach((plat) => {
      if (plat.broken || plat.type === 'acid' || plat.type === 'laser_gate') return;
      if (this.checkAABB(p, plat)) {
        if (p.vx > 0) {
          p.x = plat.x - p.w;
          if (!p.grounded) p.onWall = 1;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
          if (!p.grounded) p.onWall = -1;
        }
        p.vx = 0;
      }
    });

    // Collision Y
    p.y += p.vy;
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
      if (this.checkAABB(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.doubleJump = true;
          p.lastWallSide = 0;
          p.lastWallX = null;

          // Conveyor belt active push
          if (plat.type === 'conveyor' && plat.conveyorSpeed) {
            p.x += plat.conveyorSpeed;
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
        } else if (p.vy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    });

    // Debounced Pitfall Recovery (§4.2)
    if (p.y > this.stage.boundsBottom && p.pitfallCooldown <= 0) {
      p.pitfallCooldown = 90; // 1.5s debounce
      this.damagePlayer(25, 0, true);
      if (p.hp > 0) {
        p.x = p.lastGroundX;
        p.y = p.lastGroundY - p.h - 4;
        p.vx = 0;
        p.vy = 0;
        this.addMangaFx('RESGATE!', p.x, p.y - 20, '#38bdf8');
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

    // Update Enemies (Cooperative Squad AI)
    this.updateEnemies();

    // Update Thrown Enemies
    this.thrownEnemies.forEach((te) => {
      te.x += te.vx;
      this.enemies.forEach((en) => {
        if (this.checkAABB(te, en)) {
          this.hitEnemy(en, te.damage, te.vx * 0.45, -7, 4);
          this.addMangaFx('STRIKE!', en.x, en.y - 26, '#a855f7');
        }
      });
      if (this.boss.active && this.boss.triggered && this.checkAABB(te, this.boss)) {
        this.damageBoss(te.damage);
      }
    });
    this.thrownEnemies = this.thrownEnemies.filter((te) => Math.abs(te.x - p.x) < 1000);

    // Boss trigger & update
    if (this.boss.active && !this.boss.triggered && Math.abs(p.x - this.boss.x) < 540) {
      this.boss.triggered = true;
      sound.sfxAlarm();
      this.showAlert(`CHEFE: ${this.boss.name} — ${this.boss.subtitle}`, 130);
    }
    if (this.boss.active && this.boss.triggered) {
      this.updateBoss();
    }

    // Bullets
    this.bullets.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.fromPlayer) {
        this.enemies.forEach((en) => {
          if (b.hitIds?.has(en.id)) return;
          if (this.checkAABB(b, en)) {
            this.hitEnemy(en, b.damage, b.vx > 0 ? 5 : -5, -4, 3);
            if (b.piercing) {
              b.hitIds?.add(en.id);
            } else {
              b.dead = true;
            }
          }
        });
        if (this.boss.active && this.boss.triggered && this.checkAABB(b, this.boss)) {
          if (!b.hitIds?.has(-999)) {
            this.damageBoss(b.damage);
            if (b.piercing) {
              b.hitIds?.add(-999);
            } else {
              b.dead = true;
            }
          }
        }
      } else {
        if (p.gstTimer > 0) return; // GST: bullets pass right through!
        const playerBox = p.isSliding
          ? { x: p.x, y: p.y + 34, w: p.w + 12, h: 22 }
          : p;
        if (this.checkAABB(b, playerBox)) {
          const isWeak = b.damage <= 14;
          this.damagePlayer(b.damage, b.vx > 0 ? 5 : -5, false, isWeak);
          b.dead = true;
        }
      }
    });
    this.bullets = this.bullets.filter((b) => !b.dead && Math.abs(b.x - p.x) < 1150);

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

    // Camera with 0.8x Zoom-Out & Rule of Thirds (ground at bottom ~70%, >65% upper vision)
    const viewW = this.canvas.width / ZOOM;
    const viewH = this.canvas.height / ZOOM;
    const camMinX = activeArena ? activeArena.minX : 0;
    const camMaxX = activeArena ? Math.max(activeArena.minX, activeArena.maxX - viewW) : Math.max(0, this.stage.boundsWidth - viewW);

    const targetCamX = Math.max(camMinX, Math.min(camMaxX, p.x - viewW * 0.36));
    const targetCamY = Math.max(
      this.stage.boundsTop,
      Math.min(this.stage.boundsBottom - viewH, p.y + p.h - viewH * 0.7)
    );
    this.camera.x += (targetCamX - this.camera.x) * 0.14;
    this.camera.y += (targetCamY - this.camera.y) * 0.14;

    if (this.tickCount % 4 === 0) {
      this.emitHud();
    }
  }

  private checkAmbushArenas(): AmbushArena | null {
    const p = this.player;
    for (const arena of this.ambushArenas) {
      if (arena.cleared) continue;
      if (!arena.active && p.x >= arena.triggerX) {
        const hasEnemiesInside = this.enemies.some(
          (en) => en.x >= arena.minX - 60 && en.x <= arena.maxX + 60
        );
        if (hasEnemiesInside) {
          arena.active = true;
          sound.sfxAlarm();
          this.showAlert('EMBOSCADA TÁTICA! DERROTE O ESQUADRÃO!', 110);
        } else {
          arena.cleared = true;
        }
      }
      if (arena.active) {
        const aliveInside = this.enemies.some(
          (en) => en.x >= arena.minX - 60 && en.x <= arena.maxX + 60
        );
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
    const playerHidden = p.gstTimer > 0;

    // Check if player is currently fighting a shield guard frontally (triggers Cyber Hound Flank Attack)
    const activeShieldEngage = this.enemies.find(
      (s) =>
        s.type === 'mib_shield' &&
        !s.shieldBroken &&
        Math.abs(s.x - p.x) < 160 &&
        Math.abs(s.y - p.y) < 70 &&
        ((p.facing === 1 && s.x > p.x) || (p.facing === -1 && s.x < p.x))
    );

    this.enemies.forEach((en) => {
      if (en.stunTimer && en.stunTimer > 0) {
        en.stunTimer--;
        en.vx *= 0.8;
        en.vy = (en.vy || 0) + 0.6 * this.stage.gravityScale;
        en.y += en.vy;
        this.platforms.forEach((plat) => {
          if (!plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate' && this.checkAABB(en, plat)) {
            if (en.vy > 0) {
              en.y = plat.y - en.h;
              en.vy = 0;
              en.airborne = false;
            }
          }
        });
        return;
      }

      const dx = p.x - en.x;
      const dy = p.y - en.y;
      const dist = Math.hypot(dx, dy);
      const desiredFacing: 1 | -1 = dx >= 0 ? 1 : -1;

      // Guard Turn Delay (~0.6s / 36 frames) so player can Dash behind for Backstab!
      if ((en.type === 'mib_shield' || en.type === 'heavy_trooper') && !en.shieldBroken) {
        if (desiredFacing !== en.facing) {
          if (!en.turnTimer || en.turnTimer <= 0) {
            en.turnTimer = 36;
          } else {
            en.turnTimer--;
            if (en.turnTimer <= 0) {
              en.facing = desiredFacing;
            }
          }
        } else {
          en.turnTimer = 0;
        }
      } else {
        en.facing = desiredFacing;
      }

      if (en.type === 'jetpack' || en.type === 'drone') {
        if (playerHidden) return;
        if (dist < 620) {
          const targetX = en.type === 'drone' ? p.x + Math.cos(this.tickCount * 0.06 + en.id) * 90 : p.x + (en.x > p.x ? 180 : -180);
          const targetY = (en.originY ?? p.y - 100) + Math.sin(this.tickCount * 0.06 + en.id) * 32;
          en.x += (targetX - en.x) * 0.035 + en.vx;
          en.y += (targetY - en.y) * 0.045 + en.vy;
          en.vx *= 0.85;
          en.vy *= 0.85;

          // Micro-Drone contact interrupts jump/wall-climb!
          if (en.type === 'drone' && this.checkAABB(en, p) && (!p.grounded || p.onWall !== 0 || p.hangingCeiling)) {
            p.onWall = 0;
            p.hangingCeiling = false;
            p.hangingPipe = null;
            p.vy = Math.max(p.vy, 3.5);
            this.damagePlayer(6, (p.x >= en.x ? 1 : -1) * 4);
            this.addMangaFx('INTERROMPIDO!', p.x, p.y - 20, '#ef4444');
          }

          en.shootTimer--;
          en.telegraph = en.shootTimer <= 22 && en.shootTimer > 0 ? 1 : 0;
          if (en.shootTimer <= 0) {
            en.shootTimer = en.type === 'drone' ? 95 : 80;
            const norm = Math.max(1, dist);
            this.bullets.push({
              x: en.x + en.w / 2,
              y: en.y + 14,
              vx: (dx / norm) * 6.5,
              vy: (dy / norm) * 6.5,
              w: 10,
              h: 6,
              shooterId: en.id,
              color: '#00f0ff',
              damage: 12,
            });
            sound.sfxShoot();
          }
        }
        return;
      }

      // Grounded enemies physics
      en.vy = (en.vy || 0) + 0.6 * this.stage.gravityScale;
      en.x += en.vx;
      en.y += en.vy;
      en.vx *= 0.86;

      this.platforms.forEach((plat) => {
        if (plat.broken || plat.type === 'acid' || plat.type === 'laser_gate') return;
        if (this.checkAABB(en, plat)) {
          if (en.vy > 0) {
            en.y = plat.y - en.h;
            en.vy = 0;
            en.airborne = false;
            if (plat.type === 'conveyor' && plat.conveyorSpeed) {
              en.x += plat.conveyorSpeed;
            }
          }
        }
      });

      if (playerHidden || dist > 660 || en.airborne) return;

      // MIB Gunner Cover Fire when player is stunned!
      if (en.type === 'mib_gunner' || en.type === 'sniper' || en.type === 'turret') {
        if (en.type === 'mib_gunner' && p.stunTimer > 10 && en.shootTimer > 14) {
          en.shootTimer = 10; // Cover Fire overrides wait!
          this.addMangaFx('COVER FIRE!', en.x, en.y - 22, '#facc15');
        }
        en.shootTimer--;
        en.telegraph = en.shootTimer <= 25 && en.shootTimer > 0 ? 1 : 0;
        if (en.shootTimer <= 0) {
          en.shootTimer = en.type === 'sniper' ? 125 : en.type === 'turret' ? 75 : p.stunTimer > 0 ? 28 : 105;
          this.bullets.push({
            x: en.x + (en.facing === 1 ? en.w : -8),
            y: en.y + 18,
            vx: en.facing * (en.type === 'sniper' ? 11 : 7.2),
            vy: 0,
            w: 12,
            h: 5,
            shooterId: en.id,
            color: en.type === 'sniper' ? '#ff007f' : '#facc15',
            damage: en.type === 'sniper' ? 18 : 11,
          });
          sound.sfxShoot();
        }
      } else {
        // Cyber Hound Cooperative Flank Leap!
        if (en.type === 'cyber_hound' && activeShieldEngage && Math.abs(dx) < 280 && en.attackTimer <= 20) {
          const behindX = p.x - p.facing * 56;
          const flankDir = behindX >= en.x ? 1 : -1;
          en.vx = flankDir * 9.5;
          en.vy = -8.5;
          en.airborne = true;
          en.isFlanking = true;
          en.attackTimer = 65;
          this.addMangaFx('FLANK BITE!', en.x, en.y - 22, '#ef4444');
          return;
        }

        const moveSpd =
          en.type === 'cyber_hound' ? 3.8 : en.type === 'samurai' || en.type === 'suit_martial' ? 3.1 : 1.7;
        if (Math.abs(dx) > 38) {
          en.x += en.facing * moveSpd;
        }
        en.attackTimer--;
        en.telegraph = en.attackTimer <= 18 && en.attackTimer > 0 && Math.abs(dx) < 85 ? 1 : 0;
        if (en.attackTimer <= 0 && Math.abs(dx) < 60 && Math.abs(dy) < 60) {
          en.attackTimer = en.type === 'cyber_hound' ? 50 : 72;
          if (en.type === 'mib_shield' && !en.shieldBroken) {
            // Shield Shove Stun!
            p.stunTimer = Math.max(p.stunTimer, 42);
            sound.sfxStun();
            this.damagePlayer(12, en.facing * 11);
            this.addMangaFx('SHIELD SHOVE!', en.x, en.y - 24, '#00f0ff');
          } else {
            this.damagePlayer(en.type === 'heavy_trooper' ? 18 : 13, en.facing * 7);
          }
        }
      }
    });

    this.enemies = this.enemies.filter((en) => en.hp > 0);
  }

  private updateBoss() {
    const b = this.boss;
    const p = this.player;
    const dx = p.x - b.x;
    b.facing = dx >= 0 ? 1 : -1;
    b.orbitalAngle = (b.orbitalAngle ?? 0) + 0.08;

    b.vx *= 0.86;
    b.x += b.vx;
    b.x = Math.max(this.stage.goalX - 560, Math.min(this.stage.boundsWidth - 140, b.x));

    if (b.behavior !== 'valkyrie' && b.behavior !== 'oswald') {
      b.vy += 0.6 * this.stage.gravityScale;
      b.y += b.vy;
      this.platforms.forEach((plat) => {
        if (!plat.broken && plat.type !== 'acid' && plat.type !== 'laser_gate' && this.checkAABB(b, plat)) {
          if (b.vy > 0) {
            b.y = plat.y - b.h;
            b.vy = 0;
          }
        }
      });
    } else {
      const hoverY = p.y - 70 + Math.sin(this.tickCount * 0.05) * 40;
      b.y += (hoverY - b.y) * 0.04;
    }

    b.attackTimer--;
    b.telegraph = b.attackTimer <= 22 && b.attackTimer > 0 ? 1 : 0;
    if (b.attackTimer <= 0) {
      b.attackTimer = b.phase === 2 ? 56 : 82;
      const spread = b.phase === 2 ? [-1.8, 0, 1.8] : [0];
      spread.forEach((vyOffset) => {
        this.bullets.push({
          x: b.x + (b.facing === 1 ? b.w : -10),
          y: b.y + b.h * 0.4,
          vx: b.facing * (b.phase === 2 ? 9.5 : 7.5),
          vy: vyOffset,
          w: 14,
          h: 6,
          color: b.accentColor,
          damage: 14,
        });
      });
      sound.sfxShoot();
    }

    b.specialTimer--;
    if (b.specialTimer <= 0) {
      b.specialTimer = b.phase === 2 ? 120 : 170;
      if (b.behavior === 'cipher') {
        // Cipher-01 fires 3 orbiting psychic daggers at player
        for (let i = -1; i <= 1; i++) {
          this.bullets.push({
            x: b.x + b.w / 2,
            y: b.y + 20,
            vx: b.facing * 8.5,
            vy: i * 1.9,
            w: 16,
            h: 6,
            color: '#c084fc',
            damage: 15,
          });
        }
        b.vx = b.facing * 12;
        this.addMangaFx('ADAGAS PSÍQUICAS!', b.x, b.y - 24, '#c084fc');
      } else if (b.behavior === 'goliath') {
        b.vx = b.facing * 15;
        this.addMangaFx('CHARGE!', b.x, b.y - 20, b.accentColor);
      } else if (b.behavior === 'valkyrie' || b.behavior === 'kusanagi' || b.behavior === 'oswald') {
        this.addParticle(b.x + b.w / 2, b.y + 30, b.accentColor, 16, 6);
        b.x = Math.max(
          this.stage.goalX - 520,
          Math.min(this.stage.boundsWidth - 160, p.x + (Math.random() > 0.5 ? 140 : -140))
        );
        this.addMangaFx(
          b.behavior === 'oswald' && b.phase === 2 ? 'OLHO CÓSMICO!' : 'WARP!',
          b.x,
          b.y - 20,
          b.accentColor
        );
      } else if (b.behavior === 'twins') {
        b.twinX = p.x + (p.x > b.x ? 120 : -120);
        b.twinY = b.y;
        this.bullets.push({
          x: b.twinX,
          y: b.y + 24,
          vx: (p.x > b.twinX ? 1 : -1) * 9,
          vy: 0,
          w: 16,
          h: 8,
          color: '#facc15',
          damage: 16,
        });
        this.addMangaFx('PORTAL!', b.twinX, b.y - 20, '#facc15');
      } else {
        for (let k = -1; k <= 1; k++) {
          this.bullets.push({
            x: b.x + b.w / 2,
            y: b.y,
            vx: b.facing * 6 + k * 2,
            vy: -4 + Math.abs(k),
            w: 12,
            h: 12,
            color: b.accentColor,
            damage: 15,
          });
        }
      }
    }

    if (Math.abs(b.vx) > 8 && this.checkAABB(p, b)) {
      this.damagePlayer(18, b.facing * 9);
    }
  }

  private emitHud() {
    const p = this.player;
    const arenaLocked = this.ambushArenas.some((a) => a.active && !a.cleared);
    this.callbacks.onHudUpdate({
      stageId: this.stage.id,
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
      alertBanner: this.alertBanner,
      wavAmmo: p.wavAmmo,
      atkTimer: Math.ceil(p.atkTimer / 60),
      jmpTimer: Math.ceil(p.jmpTimer / 60),
      gstTimer: Math.ceil(p.gstTimer / 60),
      arenaLocked,
    });
  }

  // =========================================================================
  // RENDERING (16-Bit Pixel Art + 0.8x Zoom + Rule of Thirds)
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

    // World Space with 0.8x Zoom-Out!
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    const sx = (Math.random() - 0.5) * this.shakeAmount;
    const sy = (Math.random() - 0.5) * this.shakeAmount;
    ctx.translate(-this.camera.x + sx, -this.camera.y + sy);

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

    const sprite = getHeroPixelSprite(this.characterId);

    ctx.save();
    if (p.isSliding) {
      ctx.translate(p.x + p.w / 2, p.y + p.h - 14);
      ctx.scale(p.facing, 1);
      ctx.rotate(-0.95);
      ctx.drawImage(sprite, -p.w / 2, -p.h / 2, p.w, p.h);
    } else if (p.hangingCeiling) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.scale(p.facing, -1);
      ctx.drawImage(sprite, -p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.scale(p.facing, 1);
      const bobY = p.grounded && Math.abs(p.vx) > 0.6 ? Math.sin(this.tickCount * 0.35) * 2 : 0;
      ctx.drawImage(sprite, -p.w / 2, -p.h / 2 + bobY, p.w, p.h);
    }
    ctx.restore();

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
      ctx.lineWidth = 5;
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
      ctx.fillStyle = '#475569';
      ctx.fillRect(en.x, en.y + 16, en.w, en.h - 16);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(en.x + (en.facing === 1 ? 16 : -6), en.y + 12, 26, 10);
    } else {
      const sprite = getEnemyPixelSprite(en.type);
      ctx.save();
      ctx.translate(en.x + en.w / 2, en.y + en.h / 2);
      ctx.scale(en.facing, 1);
      ctx.drawImage(sprite, -en.w / 2, -en.h / 2, en.w, en.h);
      ctx.restore();

      if ((en.type === 'mib_shield' || en.type === 'heavy_trooper') && !en.shieldBroken) {
        ctx.fillStyle = '#00f0ff';
        const sx = en.facing === 1 ? en.x + en.w - 4 : en.x - 8;
        ctx.fillRect(sx, en.y - 2, 10, en.h + 4);
      }
      if (en.type === 'jetpack') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(en.x + (en.facing === 1 ? -6 : en.w), en.y + 24, 6, 14);
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
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(en.x, en.y - 9, Math.max(0, (en.hp / en.maxHp) * en.w), 4);
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: BossRuntime) {
    // Stage 8 Phase 2 Cosmic One-Eyed Entity Zero!
    if (b.behavior === 'oswald' && b.phase === 2) {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.stroke();
      // Giant Glowing Single Cosmic Eye
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x + b.w / 2 - 3, b.y + b.h / 2 - 6, 6, 12);
    } else {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.accentColor;
      ctx.fillRect(b.x + (b.facing === 1 ? b.w - 16 : 6), b.y + 14, 12, 5);
    }

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
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(b.twinX, b.twinY, b.w, b.h);
      ctx.strokeStyle = '#facc15';
      ctx.strokeRect(b.twinX, b.twinY, b.w, b.h);
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
