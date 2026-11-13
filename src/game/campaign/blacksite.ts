import { STAGES } from '../stages';
import { SubstageDefinition } from './types';
import { chapterBase, enemyAt as enemy, exitAt as door } from './authoring';
const chapter = STAGES[6];
export const BLACKSITE: SubstageDefinition[] = [
  {
    ...chapterBase(7, 700), substageId: '7A', title: 'Docas de Blacksite', boundsWidth: 2580, windForce: -0.14,
    description: 'Atravesse os vãos das docas e os postos de vigilância até os blocos de contenção.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Doca de desembarque', x: 140, y: 644 },
      { id: 'vigilancia', label: 'Posto de vigilância', x: 1230, y: 644 },
      { id: 'saida', label: 'Entrada dos blocos', x: 2350, y: 644 },
    ], exits: [door('blocos', 'Blocos de contenção', 2460, 700, '7B', 'entrada')],
    platforms: [
      { x: -100, y: 700, w: 1000, h: 360, type: 'solid' },
      { x: 900, y: 760, w: 100, h: 300, type: 'acid' },
      { x: 1000, y: 700, w: 640, h: 360, type: 'solid' },
      { x: 1640, y: 760, w: 100, h: 300, type: 'acid' },
      { x: 1740, y: 700, w: 940, h: 360, type: 'solid' },
      { x: 410, y: 610, w: 170, h: 90, type: 'wall' },
      { x: 620, y: 300, w: 180, h: 18, type: 'solid' },
      { x: 1120, y: 460, w: 220, h: 18, type: 'solid' },
      { x: 1650, y: 400, w: 150, h: 18, type: 'moving', moveAxis: 'x', moveRange: 40, moveSpeed: 0.025 },
      { x: 2060, y: 600, w: 170, h: 100, type: 'wall' },
    ], ceilingPipes: [{ x: 610, y: 140, w: 730, h: 10 }, { x: 1660, y: 200, w: 640, h: 10 }],
    props: [
      { id: 1, x: 300, y: 656, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1220, y: 416, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2290, y: 656, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'wav' },
    ], enemies: [enemy('turret', 660, 700, 85), enemy('jetpack', 1080, 700, 75), enemy('heavy_trooper', 1390, 700, 130),
      enemy('drone', 1850, 700, 55), enemy('mib_shield', 2380, 700, 125)],
    introDialogue: [{ speaker: 'MAYA', line: 'As docas estão sob vigilância. Há rotas por cima dos canais e pontos de apoio antes de cada bloco.' },
      { speaker: 'REN', line: 'Vamos atravessar a contenção até o comando. Vane prepara rajadas e marca o bombardeio antes de disparar.' }],
  },
  {
    ...chapterBase(7, 740), substageId: '7B', title: 'Blocos de Contenção', boundsWidth: 2660,
    palette: { ...chapter.palette, weather: 'none' },
    description: 'Passe pelos sensores e elevadores de contenção para chegar ao centro de comando.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Controle de acesso', x: 140, y: 684 },
      { id: 'controle', label: 'Controle de contenção', x: 1550, y: 684 },
      { id: 'saida', label: 'Escada do comando', x: 2440, y: 684 },
    ], exits: [door('docas', 'Docas', 40, 740, '7A', 'saida'), door('comando', 'Centro de comando', 2540, 740, '7C', 'entrada')],
    platforms: [
      { x: -100, y: 740, w: 2860, h: 320, type: 'solid' },
      { x: 720, y: 726, w: 110, h: 14, type: 'laser_gate' },
      { x: 1920, y: 726, w: 100, h: 14, type: 'laser_gate' },
      { x: 1220, y: 650, w: 180, h: 90, type: 'wall' },
      { x: 410, y: 430, w: 220, h: 18, type: 'solid' },
      { x: 1010, y: 410, w: 150, h: 18, type: 'moving', moveAxis: 'y', moveRange: 45, moveSpeed: 0.025 },
      { x: 1430, y: 300, w: 220, h: 18, type: 'solid' },
      { x: 2190, y: 440, w: 200, h: 18, type: 'solid' },
    ], ceilingPipes: [{ x: 630, y: 210, w: 890, h: 10 }, { x: 1820, y: 180, w: 650, h: 10 }],
    props: [
      { id: 1, x: 300, y: 696, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'jmp' },
      { id: 2, x: 1510, y: 256, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2340, y: 696, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'psy' },
    ], enemies: [enemy('mib_gunner', 500, 740, 75), enemy('cyber_hound', 1000, 740, 70), enemy('sniper', 1500, 300, 70),
      enemy('mutant', 1790, 740, 105), enemy('heavy_trooper', 2360, 740, 135)],
  },
  {
    ...chapterBase(7, 650), substageId: '7C', title: 'Centro de Comando', boundsWidth: 3000, goalX: 2720,
    description: 'Derrote a guarda de comando e enfrente Vane antes de seguir para a torre central.',
    entryCheckpoint: 'entrada', checkpoints: [
      { id: 'entrada', label: 'Ala do comando', x: 140, y: 594 },
      { id: 'comando', label: 'Antes da guarda de comando', x: 1470, y: 594 },
      { id: 'vane', label: 'Ponte de comando', x: 2480, y: 594 },
    ], exits: [door('blocos', 'Blocos de contenção', 40, 650, '7B', 'saida')],
    platforms: [
      { x: -100, y: 650, w: 3200, h: 410, type: 'solid' },
      { x: 500, y: 560, w: 170, h: 90, type: 'wall' },
      { x: 830, y: 390, w: 220, h: 18, type: 'solid' },
      { x: 1160, y: 280, w: 220, h: 18, type: 'solid' },
      { x: 1710, y: 410, w: 220, h: 18, type: 'solid' },
      { x: 2130, y: 330, w: 210, h: 18, type: 'solid' },
      { x: 2920, y: 200, w: 60, h: 450, type: 'wall' },
    ], ceilingPipes: [{ x: 780, y: 100, w: 620, h: 10 }],
    props: [
      { id: 1, x: 300, y: 606, w: 42, h: 44, hp: 25, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1250, y: 236, w: 50, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 2530, y: 606, w: 42, h: 44, hp: 25, kind: 'terminal', dropType: 'psy' },
    ], ambushArenas: [{ id: 1, triggerX: 1720, minX: 1580, maxX: 2340, cleared: false, active: false }],
    enemies: [enemy('turret', 760, 650, 90), enemy('jetpack', 1240, 650, 80),
      enemy('heavy_trooper', 1830, 650, 140), enemy('mib_shield', 2040, 650, 130), enemy('turret', 2240, 650, 95)],
    boss: { ...chapter.boss, x: 2680, y: 576 }, outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
