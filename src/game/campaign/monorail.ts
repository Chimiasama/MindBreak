import { STAGES } from '../stages';
import { EnemyType } from '../types';
import { SubstageDefinition, SubstageId } from './types';

const chapter = STAGES[1];
const common = {
  id: 2, location: 'Linha Aérea Nexus', musicLabel: chapter.musicLabel, musicGenre: chapter.musicGenre,
  gravityScale: 1, windForce: -0.16, boundsTop: -200, boundsBottom: 960,
  spawnX: 140, spawnY: 594, goalX: 2500, palette: { ...chapter.palette },
  introDialogue: [], outroDialogue: [],
};
function enemy(type: EnemyType, x: number, floor = 650, hp = 55): SubstageDefinition['enemies'][number] {
  const flying = type === 'drone' || type === 'jetpack';
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : 56;
  return { type, x, y: flying ? floor - 180 : floor - h,
    w: type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : 34, h,
    hp, maxHp: hp, facing: -1, shootTimer: 90, attackTimer: 60,
    ...(flying ? { originY: floor - 180 } : {}) };
}
function door(id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) {
  return { id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint };
}

/** Three separately authored maps: train couplings, service conduits and rooftop combat. */
export const MONORAIL: SubstageDefinition[] = [
  {
    ...common, substageId: '2A', title: 'Vagões e Embarque', boundsWidth: 2640,
    description: 'Cruze os acoplamentos entre vagões e procure os compartimentos superiores antes de descer à manutenção.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Plataforma de embarque', x: 140, y: 594 },
      { id: 'acoplamento', label: 'Acoplamento central', x: 1260, y: 594 },
      { id: 'saida', label: 'Escotilha de serviço', x: 2420, y: 594 },
    ],
    exits: [door('manutencao', 'Cabos e manutenção', 2520, 650, '2B', 'entrada')],
    platforms: [
      { x: -100, y: 650, w: 900, h: 260, type: 'solid' },
      { x: 920, y: 650, w: 800, h: 260, type: 'solid' },
      { x: 1840, y: 650, w: 900, h: 260, type: 'solid' },
      { x: 440, y: 570, w: 160, h: 80, type: 'wall' },
      { x: 640, y: 430, w: 220, h: 18, type: 'solid' },
      { x: 830, y: 410, w: 120, h: 18, type: 'moving', moveAxis: 'x', moveRange: 40, moveSpeed: 0.025 },
      { x: 1160, y: 440, w: 220, h: 18, type: 'solid' },
      { x: 1440, y: 330, w: 220, h: 18, type: 'solid' },
      { x: 1740, y: 520, w: 160, h: 18, type: 'solid' },
      { x: 2100, y: 540, w: 180, h: 110, type: 'wall' },
      { x: 2320, y: 420, w: 200, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 650, y: 260, w: 980, h: 10 }, { x: 2050, y: 300, w: 470, h: 10 }],
    props: [
      { id: 1, x: 300, y: 606, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1510, y: 286, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2410, y: 606, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    enemies: [enemy('mib_gunner', 680), enemy('jetpack', 1030), enemy('sniper', 1220, 440, 45),
      enemy('cyber_hound', 1510), enemy('mib_shield', 2340, 650, 90)],
    introDialogue: [
      { speaker: 'REN', line: 'O monotrilho tem três setores. A escotilha no último vagão leva à manutenção.' },
      { speaker: 'MAYA', line: 'Os acoplamentos são estreitos, mas há uma rota por cima. Valkyrie está no teto do trem.' },
    ],
  },
  {
    ...common, substageId: '2B', title: 'Cabos e Manutenção', boundsWidth: 2500,
    spawnY: 644, goalX: 2380, windForce: 0,
    description: 'Percorra conduítes, esteiras e canais de refrigeração; os cabos superiores escondem recursos para o teto.',
    palette: { ...chapter.palette, skyTop: '#071c24', skyBottom: '#123447',
      platformStroke: '#38bdf8', accentNeon: '#38bdf8', weather: 'none' },
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Escada de serviço', x: 140, y: 644 },
      { id: 'controle', label: 'Controle de refrigeração', x: 1030, y: 644 },
      { id: 'saida', label: 'Escada para o teto', x: 2300, y: 644 },
    ],
    exits: [door('vagoes', 'Vagões', 40, 700, '2A', 'saida'), door('teto', 'Teto e pórticos', 2380, 700, '2C', 'entrada')],
    platforms: [
      { x: -100, y: 700, w: 840, h: 220, type: 'solid' },
      { x: 740, y: 760, w: 100, h: 160, type: 'acid' },
      { x: 840, y: 700, w: 720, h: 220, type: 'conveyor', conveyorSpeed: 1.1 },
      { x: 1560, y: 760, w: 100, h: 160, type: 'acid' },
      { x: 1660, y: 700, w: 940, h: 220, type: 'solid' },
      { x: 430, y: 560, w: 220, h: 18, type: 'solid' },
      { x: 740, y: 500, w: 220, h: 18, type: 'solid' },
      { x: 1040, y: 390, w: 240, h: 18, type: 'solid' },
      { x: 1190, y: 610, w: 160, h: 90, type: 'wall' },
      { x: 1400, y: 450, w: 140, h: 18, type: 'moving', moveAxis: 'y', moveRange: 50, moveSpeed: 0.025 },
      { x: 1720, y: 450, w: 230, h: 18, type: 'solid' },
      { x: 1940, y: 590, w: 190, h: 110, type: 'wall' },
      { x: 2170, y: 430, w: 180, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 690, y: 280, w: 830, h: 10 }, { x: 1650, y: 320, w: 690, h: 10 }],
    props: [
      { id: 1, x: 1000, y: 656, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
      { id: 2, x: 1120, y: 346, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2250, y: 656, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
    ],
    enemies: [enemy('drone', 600, 700), enemy('mib_gunner', 950, 700), enemy('sniper', 1120, 390, 45),
      enemy('mutant', 1400, 700, 70), enemy('mib_shield', 2160, 700, 95)],
  },
  {
    ...common, substageId: '2C', title: 'Teto e Pórticos', boundsWidth: 2860,
    goalX: 2620, hasLowCeilingHazard: true, windForce: -0.18,
    description: 'Use rasteiras contra pórticos baixos, rompa a escolta do trem e alcance Valkyrie-7 sobre o último vagão.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Acesso ao teto', x: 140, y: 594 },
      { id: 'passarela', label: 'Passarela antes da escolta', x: 1420, y: 594 },
      { id: 'valkyrie', label: 'Último vagão', x: 2350, y: 594 },
    ],
    exits: [door('manutencao', 'Cabos e manutenção', 40, 650, '2B', 'saida')],
    platforms: [
      { x: -100, y: 650, w: 3060, h: 260, type: 'solid' },
      { x: 550, y: 570, w: 200, h: 80, type: 'wall' },
      { x: 950, y: 470, w: 240, h: 18, type: 'solid' },
      { x: 1290, y: 350, w: 240, h: 18, type: 'solid' },
      { x: 1750, y: 500, w: 220, h: 18, type: 'solid' },
      { x: 2110, y: 400, w: 220, h: 18, type: 'solid' },
      { x: 2760, y: 300, w: 60, h: 350, type: 'wall' },
    ],
    ceilingPipes: [{ x: 820, y: 250, w: 700, h: 10 }],
    props: [
      { id: 1, x: 320, y: 606, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'atk' },
      { id: 2, x: 1390, y: 306, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2430, y: 606, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'heal' },
    ],
    ambushArenas: [{ id: 1, triggerX: 1680, minX: 1580, maxX: 2260, cleared: false, active: false }],
    enemies: [enemy('mib_gunner', 850), enemy('drone', 1260), enemy('mib_shield', 1790, 650, 95),
      enemy('cyber_hound', 1960), enemy('mib_gunner', 2130)],
    boss: { ...chapter.boss, x: 2580, y: 470 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
