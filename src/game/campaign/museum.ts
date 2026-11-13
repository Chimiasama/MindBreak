import { STAGES } from '../stages';
import { SubstageDefinition } from './types';
import { chapterBase, enemyAt as enemy, exitAt as door } from './authoring';
const chapter = STAGES[5];
export const MUSEUM: SubstageDefinition[] = [
  {
    ...chapterBase(6, 690), substageId: '6A', title: 'Galerias Holográficas', boundsWidth: 2460,
    description: 'Atravesse galerias, sensores e marquises para alcançar os jardins digitais.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Recepção do museu', x: 140, y: 634 },
      { id: 'galeria', label: 'Galeria central', x: 1300, y: 634 },
      { id: 'saida', label: 'Acesso aos jardins', x: 2260, y: 634 },
    ], exits: [door('jardins', 'Jardins digitais', 2340, 690, '6B', 'entrada')],
    platforms: [
      { x: -100, y: 690, w: 2660, h: 370, type: 'solid' },
      { x: 410, y: 600, w: 170, h: 90, type: 'wall' },
      { x: 620, y: 390, w: 200, h: 18, type: 'solid' },
      { x: 860, y: 350, w: 220, h: 18, type: 'solid' },
      { x: 1040, y: 676, w: 100, h: 14, type: 'laser_gate' },
      { x: 1690, y: 590, w: 170, h: 100, type: 'wall' },
      { x: 1930, y: 370, w: 240, h: 18, type: 'solid' },
    ], ceilingPipes: [{ x: 610, y: 190, w: 620, h: 10 }, { x: 1690, y: 180, w: 640, h: 10 }],
    props: [
      { id: 1, x: 300, y: 646, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 940, y: 306, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2200, y: 646, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'heal' },
    ], enemies: [enemy('samurai', 760, 690, 100), enemy('sniper', 930, 350, 65), enemy('drone', 1290, 690, 50),
      enemy('suit_martial', 1550, 690, 100), enemy('samurai', 2170, 690, 105)],
    introDialogue: [{ speaker: 'REN', line: 'As galerias levam aos jardins e ao acervo restrito. Procurem os sensores no piso antes de avançar.' },
      { speaker: 'MAYA', line: 'Kusanagi está no acervo. Os jardins permitem voltar para buscar os recursos das marquises.' }],
  },
  {
    ...chapterBase(6, 740), substageId: '6B', title: 'Jardins Digitais', boundsWidth: 2600,
    description: 'Cruze canais e passarelas sob cerejeiras holográficas; explore os comandos elevados antes do acervo.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Portal dos jardins', x: 140, y: 684 },
      { id: 'pavilhao', label: 'Pavilhão holográfico', x: 1220, y: 684 },
      { id: 'saida', label: 'Porta do acervo', x: 2390, y: 684 },
    ], exits: [door('galerias', 'Galerias', 40, 740, '6A', 'saida'), door('acervo', 'Acervo restrito', 2480, 740, '6C', 'entrada')],
    platforms: [
      { x: -100, y: 740, w: 930, h: 320, type: 'solid' },
      { x: 830, y: 800, w: 90, h: 260, type: 'acid' },
      { x: 920, y: 740, w: 700, h: 320, type: 'solid' },
      { x: 1620, y: 800, w: 90, h: 260, type: 'acid' },
      { x: 1710, y: 740, w: 990, h: 320, type: 'solid' },
      { x: 330, y: 500, w: 220, h: 18, type: 'solid' },
      { x: 1050, y: 430, w: 160, h: 18, type: 'moving', moveAxis: 'y', moveRange: 45, moveSpeed: 0.025 },
      { x: 1320, y: 390, w: 220, h: 18, type: 'solid' },
      { x: 1960, y: 640, w: 180, h: 100, type: 'wall' },
      { x: 2200, y: 430, w: 200, h: 18, type: 'solid' },
    ], ceilingPipes: [{ x: 700, y: 200, w: 840, h: 10 }, { x: 1830, y: 220, w: 620, h: 10 }],
    props: [
      { id: 1, x: 330, y: 696, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1440, y: 346, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2290, y: 696, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'psy' },
    ], enemies: [enemy('drone', 620, 740, 50), enemy('samurai', 1080, 740, 110), enemy('sniper', 1420, 390, 65),
      enemy('mutant', 1850, 740, 100), enemy('jetpack', 2260, 740, 75)],
  },
  {
    ...chapterBase(6, 650), substageId: '6C', title: 'Acervo Restrito', boundsWidth: 2920, goalX: 2640,
    description: 'Rompa a escolta do acervo e encontre Kusanagi na sala dos arquivos imperiais.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Ala de conservação', x: 140, y: 594 },
      { id: 'arquivo', label: 'Antes da escolta do acervo', x: 1420, y: 594 },
      { id: 'kusanagi', label: 'Arquivo imperial', x: 2390, y: 594 },
    ], exits: [door('jardins', 'Jardins digitais', 40, 650, '6B', 'saida')],
    platforms: [
      { x: -100, y: 650, w: 3120, h: 410, type: 'solid' },
      { x: 500, y: 560, w: 180, h: 90, type: 'wall' },
      { x: 830, y: 400, w: 220, h: 18, type: 'solid' },
      { x: 1040, y: 636, w: 100, h: 14, type: 'laser_gate' },
      { x: 1150, y: 290, w: 220, h: 18, type: 'solid' },
      { x: 1770, y: 390, w: 200, h: 18, type: 'solid' },
      { x: 2840, y: 200, w: 60, h: 450, type: 'wall' },
    ], ceilingPipes: [{ x: 790, y: 110, w: 640, h: 10 }],
    props: [
      { id: 1, x: 300, y: 606, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1240, y: 246, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2440, y: 606, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'atk' },
    ], ambushArenas: [{ id: 1, triggerX: 1680, minX: 1540, maxX: 2280, cleared: false, active: false }],
    enemies: [enemy('samurai', 760, 650, 110), enemy('sniper', 1200, 290, 65),
      enemy('samurai', 1710, 650, 115), enemy('suit_martial', 1940, 650, 110), enemy('heavy_trooper', 2140, 650, 140)],
    boss: { ...chapter.boss, x: 2600, y: 584 }, outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
