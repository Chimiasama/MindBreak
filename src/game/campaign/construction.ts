import { STAGES } from '../stages';
import { EnemyType } from '../types';
import { SubstageDefinition, SubstageId } from './types';

const chapter = STAGES[2];
const common = {
  id: 3, location: 'Torre Nexus em Obras', musicLabel: chapter.musicLabel, musicGenre: chapter.musicGenre,
  gravityScale: 1, windForce: 0.2, boundsTop: -560, boundsBottom: 1240,
  spawnX: 140, spawnY: 764, goalX: 3160, palette: { ...chapter.palette },
  introDialogue: [], outroDialogue: [],
};
function enemy(
  type: EnemyType,
  x: number,
  floor: number,
  hp = 60,
  extra: Partial<SubstageDefinition['enemies'][number]> = {}
): SubstageDefinition['enemies'][number] {
  const flying = type === 'drone' || type === 'jetpack';
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : type === 'turret' ? 32 : 56;
  const w = type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : type === 'turret' ? 32 : 34;
  return {
    type, x, y: flying ? floor - 180 : floor - h, w, h,
    hp, maxHp: hp, facing: -1, shootTimer: 100, attackTimer: 70,
    ...(flying ? { originY: floor - 180 } : {}),
    ...extra,
  };
}
function door(id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) {
  return { id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint };
}

/** Distinct multi-story foundation, 1,000-unit vertical crane ascent and storm helipad gauntlet. */
export const CONSTRUCTION: SubstageDefinition[] = [
  {
    ...common, substageId: '3A', title: 'Fundação da Torre', boundsWidth: 3400,
    palette: { ...chapter.palette, weather: 'rain' },
    description: 'Cruze as lajes de concreto sobre fossos de obra, escale vigas e andaimes em múltiplos andares e chegue ao núcleo dos guindastes.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Canteiro de fundação', x: 140, y: 764 },
      { id: 'concreto', label: 'Base de concreto', x: 1120, y: 764 },
      { id: 'estaca', label: 'Pátio dos vergalhões', x: 2060, y: 764 },
      { id: 'saida', label: 'Acesso aos guindastes', x: 3080, y: 364 },
    ],
    exits: [door('vigas', 'Guindastes e vigas', 3080, 420, '3B', 'entrada')],
    platforms: [
      // Concrete foundation slabs split by construction pits
      { x: -100, y: 820, w: 800, h: 420, type: 'solid' },
      { x: 820, y: 820, w: 800, h: 420, type: 'solid' },
      { x: 1760, y: 820, w: 720, h: 420, type: 'solid' },
      { x: 2640, y: 820, w: 860, h: 420, type: 'solid' },
      // West / central concrete barriers and steel tiers
      { x: 430, y: 720, w: 140, h: 100, type: 'wall' },
      { x: 620, y: 480, w: 180, h: 18, type: 'solid' },
      { x: 790, y: 640, w: 180, h: 18, type: 'solid' },
      { x: 980, y: 500, w: 240, h: 18, type: 'solid' },
      { x: 1290, y: 400, w: 180, h: 18, type: 'crumble' },
      { x: 1430, y: 670, w: 180, h: 18, type: 'solid' },
      { x: 1570, y: 550, w: 180, h: 18, type: 'solid' },
      { x: 1530, y: 460, w: 140, h: 18, type: 'moving', moveAxis: 'x', moveRange: 50, moveSpeed: 0.025 },
      // East steel girder network & upper hoist tiers
      { x: 1760, y: 390, w: 240, h: 18, type: 'solid' },
      { x: 1940, y: 660, w: 220, h: 18, type: 'solid' },
      { x: 2060, y: 310, w: 210, h: 18, type: 'solid' },
      { x: 2100, y: 720, w: 140, h: 100, type: 'wall' },
      { x: 2280, y: 560, w: 200, h: 18, type: 'solid' },
      { x: 2360, y: 410, w: 190, h: 18, type: 'crumble' },
      { x: 2620, y: 240, w: 190, h: 18, type: 'solid' },
      { x: 2680, y: 650, w: 200, h: 18, type: 'solid' },
      { x: 2880, y: 530, w: 180, h: 18, type: 'solid' },
      { x: 2980, y: 420, w: 260, h: 18, type: 'solid' },
      { x: 3280, y: 660, w: 80, h: 160, type: 'wall' },
    ],
    ceilingPipes: [
      { x: 640, y: 250, w: 680, h: 10 },
      { x: 1460, y: 260, w: 720, h: 10 },
      { x: 2240, y: 200, w: 740, h: 10 },
    ],
    props: [
      { id: 1, x: 300, y: 776, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1100, y: 456, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 1840, y: 346, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'wav' },
      { id: 4, x: 2240, y: 776, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'psy' },
      { id: 5, x: 2700, y: 196, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 6, x: 2840, y: 776, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'atk' },
    ],
    enemies: [
      enemy('mib_gunner', 600, 820),
      enemy('drone', 1050, 820, 40),
      enemy('sniper', 1060, 500, 50),
      enemy('mib_shield', 1340, 820, 95),
      enemy('jetpack', 1780, 680, 65),
      enemy('turret_engineer', 2280, 820, 65),
      enemy('turret', 2245, 820, 55, { mount: 'floor', deployedBy: 6, deployed: false }),
      enemy('cyber_hound', 2740, 820, 60),
      enemy('heavy_trooper', 2980, 820, 110),
      enemy('sniper', 2920, 530, 55),
      enemy('drone', 2420, 680, 45),
    ],
    introDialogue: [
      { speaker: 'LEON', line: 'A base está aberta, mas o núcleo sobe até o heliponto. Usem os pontos de apoio durante a subida.' },
      { speaker: 'REN', line: 'Salto duplo para alcançar as vigas, wall-kick nas torres e canos no teto para cruzar os fossos.' },
      { speaker: 'MAYA', line: 'Há andaimes em vários andares, vigas frágeis e snipers no alto. Fiquem atentos ao terreno.' },
    ],
  },
  {
    ...common, substageId: '3B', title: 'Guindastes e Vigas', boundsWidth: 3300,
    spawnY: 984, goalX: 3180, windForce: 0.12,
    description: 'Suba mil unidades pelo núcleo em degraus e cruze a superestrutura de guindastes; andaimes, pontes frágeis e mastros abrem rotas alternativas.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Base do núcleo', x: 140, y: 984 },
      { id: 'nucleo', label: 'Patamar intermediário', x: 1070, y: 584 },
      { id: 'guindaste-leste', label: 'Plataforma dos guindastes', x: 2320, y: -16 },
      { id: 'saida', label: 'Saída superior', x: 3060, y: -16 },
    ],
    exits: [
      door('fundacao', 'Fundação', 40, 1040, '3A', 'saida'),
      door('heliponto', 'Heliponto na tormenta', 3180, 40, '3C', 'entrada'),
    ],
    platforms: [
      // 1,000-unit vertical stepped ascent (y=1040 -> y=40)
      { x: -100, y: 1040, w: 540, h: 200, type: 'solid' },
      { x: 440, y: 940, w: 190, h: 300, type: 'solid' },
      { x: 630, y: 840, w: 190, h: 400, type: 'solid' },
      { x: 820, y: 740, w: 190, h: 500, type: 'solid' },
      { x: 1010, y: 640, w: 190, h: 600, type: 'solid' },
      { x: 1200, y: 540, w: 190, h: 700, type: 'solid' },
      { x: 1390, y: 440, w: 190, h: 800, type: 'solid' },
      { x: 1580, y: 340, w: 190, h: 900, type: 'solid' },
      { x: 1770, y: 240, w: 190, h: 1000, type: 'solid' },
      { x: 1960, y: 140, w: 190, h: 1100, type: 'solid' },
      // East sky-deck split by crane pit with counterweight catwalk below
      { x: 2150, y: 40, w: 390, h: 1200, type: 'solid' },
      { x: 2550, y: 40, w: 120, h: 18, type: 'crumble' },
      { x: 2460, y: 190, w: 320, h: 22, type: 'solid' },
      { x: 2680, y: 40, w: 720, h: 1200, type: 'solid' },
      // Side scaffolds & moving crane hoists along ascent
      { x: 220, y: 780, w: 140, h: 18, type: 'moving', moveAxis: 'y', moveRange: 50, moveSpeed: 0.02 },
      { x: 170, y: 600, w: 170, h: 18, type: 'solid' },
      { x: 540, y: 470, w: 160, h: 18, type: 'solid' },
      { x: 780, y: 600, w: 160, h: 18, type: 'solid' },
      { x: 880, y: 360, w: 160, h: 18, type: 'crumble' },
      { x: 1200, y: 380, w: 160, h: 18, type: 'moving', moveAxis: 'x', moveRange: 45, moveSpeed: 0.025 },
      { x: 1600, y: 80, w: 160, h: 18, type: 'crumble' },
      { x: 1920, y: -20, w: 190, h: 18, type: 'solid' },
      // High crane superstructure over east skydeck (clearance >= 140px above y=40 floor)
      { x: 2240, y: -120, w: 200, h: 18, type: 'solid' },
      { x: 2540, y: -140, w: 260, h: 18, type: 'solid' },
      { x: 2880, y: -120, w: 200, h: 18, type: 'solid' },
      { x: 2360, y: -260, w: 160, h: 18, type: 'solid' },
      { x: 2880, y: -260, w: 180, h: 18, type: 'solid' },
    ],
    ceilingPipes: [
      { x: 180, y: 610, w: 400, h: 10 },
      { x: 1320, y: -140, w: 540, h: 10 },
      { x: 2260, y: -390, w: 680, h: 10 },
    ],
    props: [
      { id: 1, x: 330, y: 996, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 210, y: 556, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'psy' },
      { id: 3, x: 1110, y: 596, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 4, x: 2590, y: 146, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'atk' },
      { id: 5, x: 2950, y: -304, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 6, x: 2940, y: -4, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
    ],
    enemies: [
      enemy('mib_gunner', 540, 940),
      enemy('drone', 700, 840, 40),
      enemy('mib_shield', 920, 740, 95),
      enemy('sniper', 1260, 540, 50),
      enemy('mutant', 1640, 340, 75),
      enemy('jetpack', 1860, 240, 65),
      enemy('mib_shield', 2380, 40, 100),
      enemy('turret', 2720, 40, 80, { y: -122, mount: 'ceiling' }),
      enemy('heavy_trooper', 2840, 40, 110),
      enemy('sniper', 2920, -120, 55),
      enemy('drone', 2580, 140, 45),
    ],
  },
  {
    ...common, substageId: '3C', title: 'Heliponto na Tormenta', boundsWidth: 3500,
    spawnY: 384, goalX: 3260,
    description: 'Atravesse o controle de tempestade, rompa a escolta pesada na passarela e enfrente Goliath-IV sob relâmpagos.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Escada do heliponto', x: 140, y: 384 },
      { id: 'terminal', label: 'Terminal da torre', x: 1080, y: 384 },
      { id: 'passarela', label: 'Acesso à pista', x: 1740, y: 384 },
      { id: 'goliath', label: 'Área de pouso', x: 3040, y: 384 },
    ],
    exits: [door('vigas', 'Guindastes e vigas', 40, 440, '3B', 'saida')],
    platforms: [
      // West radar/storm control deck + storm chasm + east helipad runway
      { x: -100, y: 440, w: 1580, h: 800, type: 'solid' },
      { x: 1490, y: 440, w: 120, h: 18, type: 'crumble' },
      { x: 1620, y: 440, w: 1980, h: 800, type: 'solid' },
      // West storm control upper platforms
      { x: 520, y: 350, w: 170, h: 90, type: 'wall' },
      { x: 710, y: 350, w: 180, h: 18, type: 'solid' },
      { x: 930, y: 270, w: 240, h: 18, type: 'solid' },
      { x: 1240, y: 150, w: 220, h: 18, type: 'solid' },
      // East helipad catwalks & Goliath tactical perches
      { x: 1660, y: 290, w: 180, h: 18, type: 'solid' },
      { x: 1980, y: 220, w: 220, h: 18, type: 'solid' },
      { x: 2300, y: 150, w: 200, h: 18, type: 'crumble' },
      { x: 2580, y: 230, w: 220, h: 18, type: 'solid' },
      { x: 2920, y: 290, w: 180, h: 18, type: 'solid' },
      { x: 3200, y: 290, w: 190, h: 18, type: 'solid' },
      { x: 3460, y: 60, w: 60, h: 380, type: 'wall' },
    ],
    ceilingPipes: [
      { x: 850, y: 20, w: 560, h: 10 },
      { x: 1520, y: 110, w: 460, h: 10 },
      { x: 2120, y: 40, w: 540, h: 10 },
      { x: 2960, y: 120, w: 420, h: 10 },
    ],
    props: [
      { id: 1, x: 310, y: 396, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1350, y: 106, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 1980, y: 396, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 4, x: 2660, y: 186, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'atk' },
      { id: 5, x: 2960, y: 396, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'psy' },
    ],
    ambushArenas: [{ id: 1, triggerX: 2200, minX: 1920, maxX: 2880, cleared: false, active: false }],
    enemies: [
      enemy('jetpack', 850, 440, 65),
      enemy('drone', 1200, 440, 45),
      enemy('sniper', 1690, 290, 55),
      enemy('mib_shield', 2020, 440, 100),
      enemy('cyber_hound', 2240, 440, 60),
      enemy('turret_engineer', 2480, 440, 65),
      enemy('turret', 2445, 440, 55, { mount: 'floor', deployedBy: 6, deployed: false }),
      enemy('jetpack', 2560, 440, 70),
      enemy('heavy_trooper', 2740, 440, 115),
      enemy('turret', 2670, 440, 75, { y: 248, mount: 'ceiling' }),
    ],
    boss: { ...chapter.boss, x: 3260, y: 352 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
