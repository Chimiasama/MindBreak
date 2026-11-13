import { STAGES } from '../stages';
import { EnemyType } from '../types';
import { SubstageDefinition, SubstageId } from './types';

const chapter = STAGES[2];
const common = {
  id: 3, location: 'Torre Nexus em Obras', musicLabel: chapter.musicLabel, musicGenre: chapter.musicGenre,
  gravityScale: 1, windForce: 0.2, boundsTop: -480, boundsBottom: 1240,
  spawnX: 140, spawnY: 764, goalX: 2320, palette: { ...chapter.palette },
  introDialogue: [], outroDialogue: [],
};
function enemy(type: EnemyType, x: number, floor: number, hp = 60): SubstageDefinition['enemies'][number] {
  const flying = type === 'drone' || type === 'jetpack';
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : 56;
  return { type, x, y: flying ? floor - 180 : floor - h,
    w: type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : 34, h,
    hp, maxHp: hp, facing: -1, shootTimer: 100, attackTimer: 70,
    ...(flying ? { originY: floor - 180 } : {}) };
}
function door(id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) {
  return { id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint };
}

/** Distinct foundation, 1,000-unit ascent and final open helipad. */
export const CONSTRUCTION: SubstageDefinition[] = [
  {
    ...common, substageId: '3A', title: 'Fundação da Torre', boundsWidth: 2440,
    palette: { ...chapter.palette, weather: 'rain' },
    description: 'Cruze as bases de concreto, procure suprimentos nas vigas superiores e alcance o acesso ao núcleo da torre.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Canteiro de fundação', x: 140, y: 764 },
      { id: 'concreto', label: 'Base de concreto', x: 1120, y: 764 },
      { id: 'saida', label: 'Acesso aos guindastes', x: 2220, y: 764 },
    ],
    exits: [door('vigas', 'Guindastes e vigas', 2320, 820, '3B', 'entrada')],
    platforms: [
      { x: -100, y: 820, w: 800, h: 420, type: 'solid' },
      { x: 820, y: 820, w: 700, h: 420, type: 'solid' },
      { x: 1640, y: 820, w: 900, h: 420, type: 'solid' },
      { x: 430, y: 730, w: 170, h: 90, type: 'wall' },
      { x: 620, y: 480, w: 160, h: 18, type: 'solid' },
      { x: 980, y: 500, w: 230, h: 18, type: 'solid' },
      { x: 1530, y: 560, w: 130, h: 18, type: 'moving', moveAxis: 'x', moveRange: 45, moveSpeed: 0.025 },
      { x: 1690, y: 460, w: 180, h: 18, type: 'solid' },
      { x: 1850, y: 720, w: 170, h: 100, type: 'wall' },
    ],
    ceilingPipes: [{ x: 620, y: 340, w: 720, h: 10 }, { x: 1450, y: 300, w: 620, h: 10 }],
    props: [
      { id: 1, x: 300, y: 776, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1100, y: 456, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2240, y: 776, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    enemies: [enemy('mib_gunner', 600, 820), enemy('drone', 1050, 820, 40), enemy('sniper', 1040, 500, 50),
      enemy('mib_shield', 1340, 820, 95), enemy('cyber_hound', 2150, 820)],
    introDialogue: [
      { speaker: 'LEON', line: 'A base está aberta, mas o núcleo sobe até o heliponto. Usem os pontos de apoio durante a subida.' },
      { speaker: 'REN', line: 'Salto duplo para alcançar as vigas. Perto de uma parede, segure CIMA para escalar. Goliath guarda o topo.' },
    ],
  },
  {
    ...common, substageId: '3B', title: 'Guindastes e Vigas', boundsWidth: 2400,
    spawnY: 984, windForce: 0.12,
    description: 'Suba mil unidades pelo núcleo em degraus; andaimes, um guindaste móvel e vigas frágeis abrem desvios para recursos.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Base do núcleo', x: 140, y: 984 },
      { id: 'nucleo', label: 'Patamar intermediário', x: 1070, y: 584 },
      { id: 'saida', label: 'Saída superior', x: 2190, y: -16 },
    ],
    exits: [door('fundacao', 'Fundação', 40, 1040, '3A', 'saida'), door('heliponto', 'Heliponto na tormenta', 2320, 40, '3C', 'entrada')],
    platforms: [
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
      { x: 2150, y: 40, w: 350, h: 1200, type: 'solid' },
      { x: 220, y: 780, w: 140, h: 18, type: 'moving', moveAxis: 'y', moveRange: 50, moveSpeed: 0.02 },
      { x: 780, y: 600, w: 160, h: 18, type: 'solid' },
      { x: 1200, y: 380, w: 160, h: 18, type: 'moving', moveAxis: 'x', moveRange: 45, moveSpeed: 0.025 },
      { x: 1600, y: 80, w: 160, h: 18, type: 'crumble' },
      { x: 1920, y: -20, w: 190, h: 18, type: 'solid' },
      { x: 2180, y: -120, w: 180, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 180, y: 610, w: 400, h: 10 }, { x: 1410, y: -80, w: 460, h: 10 }],
    props: [
      { id: 1, x: 330, y: 996, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 1110, y: 596, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 3, x: 2260, y: -164, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
    ],
    enemies: [enemy('mib_gunner', 540, 940), enemy('drone', 700, 840, 40), enemy('mib_shield', 920, 740, 95),
      enemy('sniper', 1260, 540, 50), enemy('mutant', 1640, 340, 75), enemy('jetpack', 1860, 240, 65)],
  },
  {
    ...common, substageId: '3C', title: 'Heliponto na Tormenta', boundsWidth: 2600,
    spawnY: 384, goalX: 2360,
    description: 'Rompa a escolta de demolição no heliponto e enfrente Goliath-IV sob a tempestade.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Escada do heliponto', x: 140, y: 384 },
      { id: 'terminal', label: 'Terminal da torre', x: 1080, y: 384 },
      { id: 'goliath', label: 'Área de pouso', x: 2130, y: 384 },
    ],
    exits: [door('vigas', 'Guindastes e vigas', 40, 440, '3B', 'saida')],
    platforms: [
      { x: -100, y: 440, w: 2800, h: 800, type: 'solid' },
      { x: 520, y: 350, w: 170, h: 90, type: 'wall' },
      { x: 930, y: 270, w: 240, h: 18, type: 'solid' },
      { x: 1240, y: 150, w: 220, h: 18, type: 'solid' },
      { x: 1660, y: 300, w: 180, h: 18, type: 'solid' },
      { x: 1980, y: 200, w: 190, h: 18, type: 'solid' },
      { x: 2520, y: 80, w: 60, h: 360, type: 'wall' },
    ],
    ceilingPipes: [{ x: 850, y: 20, w: 590, h: 10 }],
    props: [
      { id: 1, x: 310, y: 396, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1350, y: 106, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2240, y: 396, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    ambushArenas: [{ id: 1, triggerX: 1420, minX: 1320, maxX: 2050, cleared: false, active: false }],
    enemies: [enemy('jetpack', 850, 440, 65), enemy('drone', 1200, 440, 45),
      enemy('mib_shield', 1460, 440, 100), enemy('cyber_hound', 1630, 440), enemy('heavy_trooper', 1900, 440, 110)],
    boss: { ...chapter.boss, x: 2320, y: 352 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
