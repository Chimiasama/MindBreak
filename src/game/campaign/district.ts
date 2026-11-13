import { STAGES } from '../stages';
import { EnemyType } from '../types';
import { SubstageDefinition, SubstageId } from './types';

// Reuse the chapter's palette/music, never its geometry or encounter arrays.
const chapter = STAGES[0];
const common = {
  id: 1, location: 'Distrito Nexus · Setor 04', musicLabel: chapter.musicLabel,
  musicGenre: chapter.musicGenre, gravityScale: 1, windForce: 0,
  boundsTop: -240, boundsBottom: 980, spawnX: 120, spawnY: 604,
  goalX: 2100, palette: { ...chapter.palette }, introDialogue: [], outroDialogue: [],
};
const enemy = (type: EnemyType, x: number, floor = 660, hp = 50): SubstageDefinition['enemies'][number] => {
  const airborne = type === 'drone' || type === 'jetpack';
  const w = type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : 34;
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : 56;
  return { type, x, y: airborne ? floor - 180 : floor - h, w, h, hp, maxHp: hp,
    facing: -1, shootTimer: 90, attackTimer: 60, ...(airborne ? { originY: floor - 180 } : {}) };
};
const door = (id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) =>
  ({ id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint });

export const DISTRICT: SubstageDefinition[] = [
  {
    ...common, substageId: '1A', title: 'Fuga do Laboratório', boundsWidth: 2260,
    description: 'Escape pelas salas de contenção, descubra o depósito superior e encontre a saída para os telhados.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Contenção', x: 120, y: 604 },
      { id: 'manutencao', label: 'Manutenção', x: 1100, y: 604 },
      { id: 'saida', label: 'Acesso aos telhados', x: 2060, y: 604 },
    ],
    exits: [door('telhados', 'Telhados', 2150, 660, '1B', 'entrada')],
    platforms: [
      { x: -100, y: 660, w: 2460, h: 260, type: 'solid' },
      { x: 440, y: 580, w: 160, h: 80, type: 'wall' },
      { x: 650, y: 540, w: 210, h: 18, type: 'solid' },
      { x: 910, y: 440, w: 220, h: 18, type: 'solid' },
      { x: 1190, y: 340, w: 240, h: 18, type: 'solid' },
      { x: 1500, y: 500, w: 220, h: 18, type: 'solid' },
      { x: 1780, y: 560, w: 160, h: 100, type: 'wall' },
    ],
    ceilingPipes: [{ x: 600, y: 270, w: 820, h: 10 }],
    props: [
      { id: 1, x: 300, y: 616, w: 40, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1300, y: 296, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 1640, y: 616, w: 40, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    enemies: [enemy('mib_gunner', 700), enemy('drone', 990), enemy('mib_shield', 1500, 660, 80), enemy('cyber_hound', 1950)],
    introDialogue: [
      { speaker: 'REN', line: 'O distrito tem vários setores conectados. Vamos sair do laboratório e alcançar a avenida.' },
      { speaker: 'MAYA', line: 'Nas portas, aperte CIMA para atravessar. Os pontos de apoio marcam onde voltamos se perdermos uma vida.' },
    ],
  },
  {
    ...common, substageId: '1B', title: 'Telhados de Neon', boundsWidth: 2740,
    description: 'Atravesse coberturas, antenas e passarelas. A manutenção leva aos esgotos; é possível voltar ao laboratório.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Cobertura oeste', x: 140, y: 604 },
      { id: 'antenas', label: 'Antenas', x: 1380, y: 604 },
      { id: 'saida', label: 'Duto de manutenção', x: 2510, y: 604 },
    ],
    exits: [door('laboratorio', 'Laboratório', 40, 660, '1A', 'saida'), door('esgotos', 'Esgotos', 2620, 660, '1C', 'entrada')],
    platforms: [
      { x: -100, y: 660, w: 800, h: 260, type: 'solid' },
      { x: 850, y: 660, w: 700, h: 260, type: 'solid' },
      { x: 1700, y: 660, w: 1150, h: 260, type: 'solid' },
      { x: 400, y: 540, w: 220, h: 18, type: 'solid' },
      { x: 740, y: 540, w: 130, h: 18, type: 'moving', moveAxis: 'x', moveRange: 45, moveSpeed: 0.025 },
      { x: 1130, y: 440, w: 240, h: 18, type: 'solid' },
      { x: 1450, y: 330, w: 220, h: 18, type: 'solid' },
      { x: 1970, y: 550, w: 180, h: 110, type: 'wall' },
      { x: 2250, y: 440, w: 230, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 760, y: 260, w: 910, h: 10 }, { x: 1900, y: 300, w: 540, h: 10 }],
    props: [
      { id: 1, x: 470, y: 496, w: 40, h: 44, hp: 20, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 1550, y: 286, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2370, y: 616, w: 40, h: 44, hp: 20, kind: 'vending', dropType: 'heal' },
    ],
    enemies: [enemy('mib_gunner', 450), enemy('jetpack', 1050), enemy('sniper', 1200, 440, 45), enemy('drone', 1580), enemy('mib_shield', 2320, 660, 85)],
  },
  {
    ...common, substageId: '1C', title: 'Esgotos de Manutenção', boundsWidth: 2540,
    spawnY: 664, goalX: 2400, description: 'Passe pelos canais tóxicos e esteiras de drenagem, descubra o reservatório e saia na avenida.',
    palette: { ...chapter.palette, skyTop: '#041511', skyBottom: '#10271e', platformStroke: '#34d399', accentNeon: '#4ade80', weather: 'spores' },
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Escada de manutenção', x: 140, y: 664 },
      { id: 'reservatorio', label: 'Reservatório', x: 1220, y: 664 },
      { id: 'saida', label: 'Galeria da avenida', x: 2300, y: 664 },
    ],
    exits: [door('telhados', 'Telhados', 40, 720, '1B', 'saida'), door('avenida', 'Avenida', 2420, 720, '1D', 'entrada')],
    platforms: [
      { x: -100, y: 720, w: 880, h: 220, type: 'solid' },
      { x: 780, y: 760, w: 80, h: 180, type: 'acid' },
      { x: 860, y: 720, w: 640, h: 220, type: 'conveyor', conveyorSpeed: -1.2 },
      { x: 1500, y: 760, w: 80, h: 180, type: 'acid' },
      { x: 1580, y: 720, w: 1080, h: 220, type: 'solid' },
      { x: 410, y: 600, w: 230, h: 18, type: 'solid' },
      { x: 750, y: 560, w: 190, h: 18, type: 'solid' },
      { x: 1120, y: 480, w: 240, h: 18, type: 'solid' },
      { x: 1510, y: 570, w: 130, h: 18, type: 'moving', moveAxis: 'y', moveRange: 45, moveSpeed: 0.025 },
      { x: 1830, y: 600, w: 180, h: 120, type: 'wall' },
    ],
    ceilingPipes: [{ x: 630, y: 390, w: 770, h: 10 }, { x: 1450, y: 420, w: 590, h: 10 }],
    props: [
      { id: 1, x: 520, y: 676, w: 40, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1240, y: 436, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2110, y: 676, w: 40, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    enemies: [enemy('mutant', 470, 720), enemy('drone', 1050, 720), enemy('mutant', 1330, 720, 65), enemy('cyber_hound', 2110, 720)],
  },
  {
    ...common, substageId: '1D', title: 'Avenida Bloqueada', boundsWidth: 2840,
    spawnY: 644, goalX: 2600, description: 'Rompa o bloqueio tático e enfrente Cipher-01 na avenida. O chefe encerra o distrito inteiro.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Boca da galeria', x: 140, y: 644 },
      { id: 'bloqueio', label: 'Antes do bloqueio', x: 1500, y: 644 },
    ],
    exits: [door('esgotos', 'Esgotos', 40, 700, '1C', 'saida')],
    platforms: [
      { x: -100, y: 700, w: 3040, h: 240, type: 'solid' },
      { x: 550, y: 610, w: 210, h: 90, type: 'wall' },
      { x: 900, y: 540, w: 240, h: 18, type: 'solid' },
      { x: 1240, y: 430, w: 230, h: 18, type: 'solid' },
      { x: 1750, y: 520, w: 240, h: 18, type: 'solid' },
      { x: 2110, y: 420, w: 220, h: 18, type: 'solid' },
      { x: 2760, y: 330, w: 60, h: 370, type: 'wall' },
    ],
    ceilingPipes: [{ x: 930, y: 280, w: 650, h: 10 }],
    props: [
      { id: 1, x: 320, y: 644, w: 96, h: 56, hp: 35, kind: 'car', dropType: 'heal' },
      { id: 2, x: 1350, y: 386, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2390, y: 656, w: 40, h: 44, hp: 20, kind: 'crate', dropType: 'psy' },
    ],
    ambushArenas: [{ id: 1, triggerX: 1750, minX: 1640, maxX: 2350, cleared: false, active: false }],
    enemies: [enemy('mib_gunner', 850, 700), enemy('drone', 1310, 700), enemy('mib_shield', 1860, 700, 85), enemy('cyber_hound', 2040, 700), enemy('mib_gunner', 2200, 700)],
    boss: { ...chapter.boss, x: 2600, y: 626 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
