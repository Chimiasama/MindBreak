import { STAGES } from '../stages';
import { SubstageDefinition } from './types';
import { chapterBase, enemyAt as enemy, exitAt as door } from './authoring';
const chapter = STAGES[4];

export const FINANCIAL: SubstageDefinition[] = [
  {
    ...chapterBase(5, 690), substageId: '5A', title: 'Boulevard de Mármore', boundsWidth: 2700,
    description: 'Percorra as barricadas do boulevard e procure os terraços antes de entrar nas garagens de serviço.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Boulevard oeste', x: 140, y: 634 },
      { id: 'marquise', label: 'Marquise central', x: 1350, y: 634 },
      { id: 'saida', label: 'Entrada das garagens', x: 2490, y: 634 },
    ],
    exits: [door('garagens', 'Garagens e serviços', 2580, 690, '5B', 'entrada')],
    platforms: [
      { x: -100, y: 690, w: 2900, h: 370, type: 'solid' },
      { x: 460, y: 600, w: 180, h: 90, type: 'wall' },
      { x: 700, y: 430, w: 230, h: 18, type: 'solid' },
      { x: 1110, y: 320, w: 240, h: 18, type: 'solid' },
      { x: 1790, y: 590, w: 170, h: 100, type: 'wall' },
      { x: 2210, y: 420, w: 230, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 720, y: 210, w: 670, h: 10 }, { x: 1740, y: 220, w: 690, h: 10 }],
    props: [
      { id: 1, x: 300, y: 634, w: 96, h: 56, hp: 35, kind: 'car', dropType: 'heal' },
      { id: 2, x: 1200, y: 276, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 1450, y: 620, w: 34, h: 70, hp: 25, kind: 'pillar', dropType: 'wav' },
    ],
    enemies: [enemy('suit_martial', 760, 690, 85), enemy('sniper', 1180, 320, 55, { stealthAlpha: 0.45 }),
      enemy('mib_shield', 1580, 690, 110), enemy('suit_martial', 2080, 690, 90), enemy('drone', 2410, 690, 45)],
    introDialogue: [
      { speaker: 'REN', line: 'As garagens ligam o boulevard à suíte. Podemos voltar para procurar os terraços e suprimentos.' },
      { speaker: 'LEON', line: 'Os agentes preparam os golpes antes de atacar. Passe pelas costas do escudo e responda na recuperação.' },
    ],
  },
  {
    ...chapterBase(5, 760), substageId: '5B', title: 'Garagens e Serviços', boundsWidth: 2560,
    palette: { ...chapter.palette, skyTop: '#07111e', skyBottom: '#152438', weather: 'none' },
    description: 'Salte barreiras de segurança, procure os elevadores e encontre o acesso restrito à suíte.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Rampa de serviço', x: 140, y: 704 },
      { id: 'controle', label: 'Controle dos elevadores', x: 1070, y: 704 },
      { id: 'saida', label: 'Elevador executivo', x: 2370, y: 704 },
    ],
    exits: [door('boulevard', 'Boulevard', 40, 760, '5A', 'saida'), door('suite', 'Suíte executiva', 2440, 760, '5C', 'entrada')],
    platforms: [
      { x: -100, y: 760, w: 2760, h: 300, type: 'solid' },
      { x: 640, y: 746, w: 100, h: 14, type: 'laser_gate' },
      { x: 1870, y: 746, w: 120, h: 14, type: 'laser_gate' },
      { x: 930, y: 440, w: 160, h: 18, type: 'moving', moveAxis: 'y', moveRange: 45, moveSpeed: 0.025 },
      { x: 1220, y: 670, w: 180, h: 90, type: 'wall' },
      { x: 1250, y: 300, w: 240, h: 18, type: 'solid' },
      { x: 1810, y: 440, w: 180, h: 18, type: 'moving', moveAxis: 'x', moveRange: 60, moveSpeed: 0.025 },
      { x: 2180, y: 340, w: 190, h: 18, type: 'solid' },
    ],
    ceilingPipes: [{ x: 670, y: 210, w: 820, h: 10 }, { x: 1760, y: 190, w: 600, h: 10 }],
    props: [
      { id: 1, x: 350, y: 716, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 1330, y: 256, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2270, y: 690, w: 34, h: 70, hp: 30, kind: 'pillar', dropType: 'psy' },
    ],
    enemies: [enemy('mib_gunner', 450, 760, 65), enemy('drone', 920, 760, 45), enemy('suit_martial', 1080, 760, 90),
      enemy('sniper', 1360, 300, 55, { stealthAlpha: 0.45 }), enemy('heavy_trooper', 2110, 760, 120)],
  },
  {
    ...chapterBase(5, 620), substageId: '5C', title: 'Suíte Executiva', boundsWidth: 3000, goalX: 2700,
    description: 'Rompa a escolta do cofre executivo e alcance Castor e Pólux na ala panorâmica.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Recepção executiva', x: 140, y: 564 },
      { id: 'cofre', label: 'Antes da escolta do cofre', x: 1470, y: 564 },
      { id: 'gemeos', label: 'Ala panorâmica', x: 2470, y: 564 },
    ],
    exits: [door('garagens', 'Garagens e serviços', 40, 620, '5B', 'saida')],
    platforms: [
      { x: -100, y: 620, w: 3200, h: 440, type: 'solid' },
      { x: 520, y: 530, w: 180, h: 90, type: 'wall' },
      { x: 840, y: 380, w: 200, h: 18, type: 'solid' },
      { x: 1170, y: 260, w: 240, h: 18, type: 'solid' },
      { x: 1720, y: 390, w: 200, h: 18, type: 'solid' },
      { x: 2120, y: 340, w: 220, h: 18, type: 'solid' },
      { x: 2920, y: 200, w: 60, h: 420, type: 'wall' },
    ],
    ceilingPipes: [{ x: 820, y: 110, w: 620, h: 10 }],
    props: [
      { id: 1, x: 300, y: 564, w: 96, h: 56, hp: 35, kind: 'car', dropType: 'heal' },
      { id: 2, x: 1270, y: 216, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2520, y: 550, w: 34, h: 70, hp: 30, kind: 'pillar', dropType: 'psy' },
    ],
    ambushArenas: [{ id: 1, triggerX: 1710, minX: 1580, maxX: 2310, cleared: false, active: false }],
    enemies: [enemy('suit_martial', 930, 620, 90), enemy('sniper', 1240, 260, 60, { stealthAlpha: 0.45 }),
      enemy('mib_shield', 1830, 620, 115), enemy('cyber_hound', 2030, 620, 65), enemy('suit_martial', 2220, 620, 95)],
    boss: { ...chapter.boss, x: 2660, y: 556 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
