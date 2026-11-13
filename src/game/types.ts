export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'DIALOGUE'
  | 'CONTINUE_COUNTDOWN'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'CAMPAIGN_VICTORY';

export type CharacterId = 'ren' | 'maya' | 'leon';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  age: number;
  title: string;
  powerName: string;
  summary: string;
  primaryColor: string;
  accentColor: string;
  trailColor: string;
  speed: number;
  jumpForce: number;
  maxHp: number;
  attackPower: number;
  slashRange: number;
  overdriveName: string;
  assistName: string;
  canFlight: boolean;
  superArmor: boolean;
  shieldBreaker: boolean;
}

export type PlatformType =
  | 'solid'
  | 'wall'
  | 'moving'
  | 'acid'
  | 'crumble'
  | 'laser_gate'
  | 'conveyor';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: PlatformType;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  conveyorSpeed?: number;
  originX?: number;
  originY?: number;
  crumbleTimer?: number;
  broken?: boolean;
}

export interface CeilingPipe {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PowerUpType = 'heal' | 'psy' | 'wav' | 'atk' | 'jmp' | 'gst' | 'full_heal' | 'secret_a' | 'secret_b';

export interface DestructibleProp {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  kind: 'crate' | 'vending' | 'car' | 'pillar' | 'terminal' | 'chest';
  dropType: PowerUpType | 'none';
  broken?: boolean;
}

export interface PickupItem {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: Exclude<PowerUpType, 'secret_a' | 'secret_b'>;
  amount?: number;
  vy: number;
}

export type EnemyType =
  | 'mib_gunner'
  | 'mib_shield'
  | 'cyber_hound'
  | 'jetpack'
  | 'drone'
  | 'mutant'
  | 'sniper'
  | 'suit_martial'
  | 'samurai'
  | 'turret'
  | 'heavy_trooper';

export interface EnemyMind {
  state: 'patrol' | 'alert' | 'chase' | 'windup' | 'attack' | 'recover' | 'stunned' | 'airborne' | 'return' | 'dead';
  timer: number;
  memory: number;
  aimX: number;
  aimY: number;
  facing: 1 | -1;
  action: 'shot' | 'melee' | 'flank';
}

export interface Enemy {
  ai?: EnemyMind;
  id: number;
  spawnId?: string;
  generation?: number;
  type: EnemyType;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  airborne: boolean;
  shootTimer: number;
  attackTimer: number;
  telegraph: number;
  stealthAlpha?: number;
  patrolMinX?: number;
  patrolMaxX?: number;
  originY?: number;
  // Tactical GDD mechanics
  turnTimer?: number;
  targetFacing?: 1 | -1;
  shieldHits?: number;
  shieldBroken?: boolean;
  stunTimer?: number;
  isFlanking?: boolean;
}

export interface BossConfig {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxHp: number;
  color: string;
  accentColor: string;
  behavior:
    | 'cipher'
    | 'valkyrie'
    | 'goliath'
    | 'arisawa'
    | 'twins'
    | 'kusanagi'
    | 'vane'
    | 'oswald';
}

export type BossAttack = 'daggers' | 'lunge' | 'sweep' | 'dive' | 'charge' | 'shockwave' | 'acid_fan' | 'acid_rain' |
  'crossfire' | 'portal' | 'draw_cut' | 'blade_fan' | 'plasma_burst' | 'mortar' | 'orbs' | 'eye_beam';
export interface BossMind {
  state: 'ready' | 'windup' | 'active' | 'recover';
  timer: number;
  index: number;
  phase: 1 | 2;
  attack: BossAttack;
  aimX: number;
  aimY: number;
  facing: 1 | -1;
}

export interface BossRuntime extends BossConfig {
  mind?: BossMind;
  twinVy?: number;
  active: boolean;
  triggered: boolean;
  hp: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  phase: 1 | 2;
  attackTimer: number;
  specialTimer: number;
  telegraph: number;
  twinX?: number;
  twinY?: number;
  shieldActive?: boolean;
  orbitalAngle?: number;
}

export interface AmbushArena {
  id: number;
  triggerX: number;
  minX: number;
  maxX: number;
  cleared: boolean;
  active: boolean;
}

export type MusicGenre =
  | 'electro_funk'
  | 'dnb_jrock'
  | 'industrial_metal'
  | 'acid_techno'
  | 'electro_swing'
  | 'jp_trap'
  | 'hard_synthwave'
  | 'symphonic_dnb';

export interface StagePalette {
  skyTop: string;
  skyBottom: string;
  cityFar: string;
  cityMid: string;
  platformFill: string;
  platformStroke: string;
  pipeColor: string;
  accentNeon: string;
  secondaryNeon: string;
  weather: 'none' | 'rain' | 'storm' | 'speedlines' | 'spores' | 'sakura' | 'searchlights' | 'stars';
}

export interface StageDefinition {
  id: number;
  title: string;
  location: string;
  musicLabel: string;
  musicGenre: MusicGenre;
  description: string;
  gravityScale: number;
  windForce: number;
  hasLowCeilingHazard?: boolean;
  spawnX: number;
  spawnY: number;
  goalX: number;
  boundsWidth: number;
  boundsTop: number;
  boundsBottom: number;
  palette: StagePalette;
  platforms: Platform[];
  ceilingPipes: CeilingPipe[];
  props: DestructibleProp[];
  ambushArenas?: AmbushArena[];
  enemies: Omit<Enemy, 'id' | 'vx' | 'vy' | 'airborne' | 'telegraph'>[];
  boss: BossConfig;
  introDialogue: { speaker: string; line: string }[];
  outroDialogue: { speaker: string; line: string }[];
}

export interface HudSnapshot {
  substageId: string;
  checkpoint: string;
  nearbyExit: string | null;
  stageId: number;
  stageTitle: string;
  characterId: CharacterId;
  characterName: string;
  hp: number;
  maxHp: number;
  psyEnergy: number;
  maxPsy: number;
  lives: number;
  nextOneUpScore: number;
  comboHits: number;
  score: number;
  enemiesRemaining: number;
  bossActive: boolean;
  bossName: string;
  bossSubtitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2;
  alertBanner: string | null;
  wavAmmo: number;
  atkTimer: number;
  jmpTimer: number;
  gstTimer: number;
  arenaLocked: boolean;
}
