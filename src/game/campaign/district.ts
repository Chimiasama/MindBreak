import { STAGES } from '../stages';
import { EnemyType, Platform } from '../types';
import { SubstageDefinition, SubstageId } from './types';

// Native multi-story exploratory Stage 1 sectors (8,400–9,200 px) with vertical elevation layers
// (240–280 px per story) and wide hazards (280–360 px) traversed via alternating wall-kicks and ceiling pipes.
const chapter = STAGES[0];
const common = {
  id: 1,
  location: 'Distrito Nexus · Setor 04',
  musicLabel: chapter.musicLabel,
  musicGenre: chapter.musicGenre,
  gravityScale: 1,
  windForce: 0,
  boundsTop: -1200,
  boundsBottom: 1060,
  spawnX: 140,
  spawnY: 604,
  goalX: 8120,
  palette: { ...chapter.palette },
  introDialogue: [],
  outroDialogue: [],
};

const enemy = (
  type: EnemyType,
  x: number,
  floor = 660,
  hp = 55,
  extra: Partial<SubstageDefinition['enemies'][number]> = {}
): SubstageDefinition['enemies'][number] => {
  const airborne = type === 'drone' || type === 'jetpack';
  const w = type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : 34;
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : 56;
  return {
    type,
    x,
    y: airborne ? floor - 180 : floor - h,
    w,
    h,
    hp,
    maxHp: hp,
    facing: -1,
    shootTimer: 90,
    attackTimer: 60,
    ...(airborne ? { originY: floor - 180 } : {}),
    ...extra,
  };
};

const door = (id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) =>
  ({ id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint });

const node = (
  id: string,
  label: string,
  x: number,
  floorY: number,
  requires: string[],
  extra: Partial<NonNullable<SubstageDefinition['exploration']>['nodes'][number]> = {}
) => ({ id, label, x, y: floorY - 44, w: 28, h: 44, requires, ...extra });

const plat = (x: number, y: number, w: number, h: number, type: Platform['type'] = 'solid', extra: Partial<Platform> = {}): Platform =>
  ({ x, y, w, h, type, ...extra });

export const DISTRICT: SubstageDefinition[] = [
  // =========================================================================
  // 1A — FUGA DO LABORATÓRIO (8.400 px · 5 Camadas Verticais)
  // =========================================================================
  {
    ...common,
    substageId: '1A',
    title: 'Fuga do Laboratório',
    boundsWidth: 8400,
    description:
      'Complexo multi-andares com poços de wall-kick, canos suspensos e subsolo de drenagem. Suba ao Observatório do Átrio, retorne pelo mezanino ao Comando Oeste e libere a Ala Leste.',
    entryCheckpoint: 'entrada',
    checkpoints: [
      { id: 'entrada', label: 'Contenção Oeste', x: 140, y: 604 },
      { id: 'manutencao', label: 'Átrio Central', x: 2680, y: 604 },
      { id: 'saida', label: 'Acesso aos Telhados', x: 8000, y: 604 },
    ],
    exits: [door('telhados', 'Telhados de Neon', 8140, 660, '1B', 'entrada')],
    platforms: [
      // --- Camada Térreo (y=660) + Subsolo de Drenagem (y=840) ---
      plat(-100, 660, 1460, 400),
      plat(1360, 840, 760, 220),       // Subsolo de Drenagem (saída por ceiling pipe nas duas pontas!)
      plat(1610, 660, 260, 22),        // Passarela suspensa central sobre o subsolo
      plat(1955, 650, 90, 18),         // Passarela de manutenção leste sobre o subsolo
      plat(2120, 660, 3160, 400),      // Térreo Átrio Central até tanque ácido leste
      plat(5280, 700, 300, 360, 'acid'), // Canal ácido leste (300px: travessia exige ceiling pipe ou andar superior!)
      plat(5580, 660, 2920, 400),      // Térreo Ala Leste até saída

      // --- Poço Oeste 1 (660 -> 420 -> 180): Chaminé de Wall-Kick + Vault por Pipe ---
      plat(460, 180, 24, 370, 'wall'), // Parede esquerda da chaminé oeste (vão livre embaixo y=550..660!)
      plat(620, 420, 24, 130, 'wall'), // Parede direita superior do poço oeste (vão livre y=550..660!)
      plat(620, 420, 1400, 24),        // 2º Andar Mezanino Oeste (x=620..2020, Node 2 comando em x=1420)
      plat(2035, 500, 90, 18),         // Degrau de manutenção para subir ao Mezanino Oeste
      plat(650, 340, 110, 18),         // Degrau para alcançar o cano da Criogenia Oeste
      plat(80, 180, 380, 24),          // 3º Andar Criogenia Secreta Oeste (x=80..460, baú)
      plat(40, -40, 440, 28),          // Teto da Criogenia Oeste
      plat(10, 180, 30, 240, 'wall'),  // Limite oeste

      // --- Átrio Central: Mezanino (420), Câmara Leon, Poço Wall-Kick/Pipe (3440..3604), Observatório (180), Ilha Maya (-280) ---
      plat(2420, 420, 1020, 24),        // Mezanino Oeste-Central (x=2420..3440, sobre a câmara de Leon!)
      plat(2980, 444, 24, 216, 'wall', { gateId: 'brecha', breakNode: 'brecha-leon' }), // Parede frágil Leon
      plat(3380, 444, 24, 216, 'wall'), // Parede fundo câmara Leon
      // Poço Central Multi-Andar (x=3440..3604, vão interior 140px sem obstruções verticais!)
      plat(3440, 40, 24, 260, 'wall'),  // Parede esquerda superior (abertura 300..420 do Mezanino)
      plat(3440, 444, 24, 106, 'wall'), // Guia inferior esquerdo (abertura 550..660 do Térreo)
      plat(3604, 180, 24, 370, 'wall'), // Parede direita do poço até Observatório (abertura 550..660 do Térreo)
      plat(3628, 180, 592, 24),        // 3º Andar: Observatório de Contenção (x=3628..4220, Node 1 rele & guarda)
      plat(3604, -40, 796, 28),        // Teto do Observatório
      plat(3810, 420, 430, 24),        // 2º Andar Mezanino Leste-Central (conecta por pipe a 3644!)
      // Degraus de manutenção para subida sem wall-kick no Átrio Central e Mezanino
      plat(2130, 580, 110, 18),
      plat(2260, 500, 110, 18),
      plat(4240, 580, 130, 18),
      plat(4120, 500, 130, 18),
      plat(4120, 340, 130, 18),
      plat(4220, 260, 120, 18),
      // Camada 4 — Ilha Aérea de Maya (y=-280)
      plat(2420, -280, 440, 24),
      plat(2860, -480, 24, 200, 'wall', { gateId: 'atalho-voo' }),
      plat(2884, -280, 260, 24),
      plat(4380, -280, 24, 460, 'wall', { gateId: 'atalho-voo' }),
      plat(4400, 180, 28, 480, 'wall', { gateId: 'linha' }), // Comporta central bloqueando Ala Leste

      // --- Ala Leste: Galeria Superior (400), Chaminé Ren (-80) & Poço da Subestação (180) ---
      plat(4720, 400, 2080, 24),       // Galeria Superior Leste (x=4720..6800, subida por pipe em 4530!)
      plat(4450, 585, 115, 18),
      plat(4540, 510, 115, 18),
      plat(4620, 440, 95, 18),
      plat(4700, 160, 1140, 24),
      // Chaminé cinética de Ren (x=5880..6100, passagem 120px livre embaixo)
      plat(5880, -80, 24, 360, 'wall'),
      plat(6100, -80, 24, 360, 'wall'),
      plat(6124, -80, 400, 24),
      plat(6524, -280, 24, 200, 'wall', { gateId: 'atalho-cinetico' }),
      plat(6548, -80, 380, 24),
      plat(6800, 40, 24, 240, 'wall'), // Parede esquerda superior (abertura 280..400 da Galeria)
      plat(6800, 440, 24, 110, 'wall'), // Guia inferior (abertura 550..660 do Térreo)
      plat(6956, 180, 24, 370, 'wall'), // Parede direita até Subestação (abertura 550..660!)
      plat(6980, 180, 740, 24),        // 3º Andar: Subestação Leste (x=6980..7720, Node 3 energia)
      plat(7710, 580, 110, 18),
      plat(7580, 500, 110, 18),
      plat(7710, 420, 110, 18),
      plat(7580, 340, 110, 18),
      plat(7725, 260, 110, 18),
      plat(6956, -40, 784, 24),
      plat(7840, 380, 28, 280, 'wall', { gateId: 'rota' }),
      plat(7840, 340, 520, 40),
      plat(8340, 120, 60, 540, 'wall'),
    ],
    ceilingPipes: [
      { x: 492, y: 432, w: 112, h: 10 }, // Pipe no Poço Oeste 1 (660 -> Mezanino 420)
      { x: 500, y: 192, w: 185, h: 10 }, // Pipe superior Poço Oeste (Mezanino 420 -> Criogenia 180)
      { x: 1350, y: 732, w: 220, h: 10 }, // Pipe oeste para sair do Subsolo (840 -> 660)
      { x: 1900, y: 732, w: 230, h: 10 }, // Pipe leste para sair do Subsolo (840 -> 660)
      { x: 1400, y: 500, w: 680, h: 10 }, // Pipe aéreo cruzando todo o Subsolo
      { x: 2230, y: 432, w: 165, h: 10 }, // Pipe Átrio Oeste (660 -> Mezanino Central 420)
      { x: 2040, y: 432, w: 145, h: 10 }, // Pipe Leste do Mezanino Oeste (2020 <-> 2120)
      { x: 2560, y: 245, w: 740, h: 10 }, // Pipe longo pelo Mezanino Central
      { x: 3474, y: 192, w: 112, h: 10 }, // Pipe no Poço Central (sobe -> Observatório 180!)
      { x: 3644, y: 432, w: 146, h: 10 }, // Pipe ligando Poço Central -> Mezanino Leste (420)
      { x: 4530, y: 412, w: 165, h: 10 }, // Pipe Entrada Ala Leste (660 -> Galeria 400)
      { x: 5190, y: 510, w: 480, h: 10 }, // Pipe obrigatório por baixo sobre os 300px de ácido leste!
      { x: 6834, y: 192, w: 106, h: 10 }, // Pipe no Poço Leste (Galeria 400 -> Subestação 180)
      { x: 6820, y: 412, w: 120, h: 10 }, // Pipe para subir do Térreo (660) à Galeria Leste (400)
    ],
    props: [
      { id: 1, x: 300, y: 616, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 1680, y: 796, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
      { id: 3, x: 140, y: 136, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 4, x: 3180, y: 616, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'atk' },
      { id: 5, x: 2980, y: -324, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'full_heal' },
      { id: 6, x: 6720, y: -124, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 7, x: 5020, y: 616, w: 42, h: 44, hp: 20, kind: 'vending', dropType: 'heal' },
      { id: 8, x: 7660, y: 616, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'wav' },
    ],
    enemies: [
      enemy('mib_gunner', 960, 660, 55),
      enemy('drone', 1520, 660, 50),
      enemy('cyber_hound', 1780, 840, 55),
      enemy('mib_shield', 2380, 660, 85),
      enemy('mib_gunner', 4160, 180, 75, { requiredGuard: true, shootTimer: 45 }), // guardIndex: 4
      enemy('sniper', 1720, 420, 50),
      enemy('cyber_hound', 3920, 660, 60),
      enemy('mib_gunner', 4940, 660, 65),
      enemy('drone', 5300, 400, 50),
      enemy('mib_shield', 6420, 400, 90),
      enemy('mutant', 6680, 660, 75),
      enemy('cyber_hound', 7480, 660, 65),
    ],
    exploration: {
      style: 'loop',
      zones: [
        { label: 'CONTENÇÃO OESTE · CHAMINÉ 1', x: 160, y: 560 },
        { label: 'CRIOGENIA SUPERIOR', x: 120, y: 90 },
        { label: 'SUBSOLO DE DRENAGEM', x: 1480, y: 800 },
        { label: 'ÁTRIO CENTRAL NEXUS', x: 2480, y: 340 },
        { label: 'OBSERVATÓRIO LESTE', x: 3680, y: 90 },
        { label: 'ALA DE MANUTENÇÃO LESTE', x: 4760, y: 310 },
      ],
      gates: [
        { id: 'linha', requires: ['comando'] },
        { id: 'rota', requires: ['rele', 'comando', 'energia', 'liberacao'] },
        { id: 'atalho-cinetico', requires: ['trava-ren'] },
        { id: 'atalho-voo', requires: ['nucleo-maya'] },
        { id: 'brecha', requires: ['brecha-leon'] },
      ],
      nodes: [
        node('rele', 'Arquivo de contenção', 3980, 180, [], { guardIndex: 4 }),
        node('comando', 'Comando de manutenção', 1420, 420, ['rele']),
        node('energia', 'Subestação leste', 7220, 180, ['comando']),
        node('liberacao', 'Controle da saída', 5720, 660, ['energia']),
        node('trava-ren', 'Trava cinética — Ren', 6260, -80, [], { optional: true, requiredHero: 'ren' }),
        node('nucleo-maya', 'Núcleo suspenso — Maya', 2580, -280, [], { optional: true, requiredHero: 'maya' }),
        node('brecha-leon', 'Parede frágil — Leon', 2930, 660, [], { optional: true, requiredHero: 'leon', action: 'smash' }),
      ],
    },
    introDialogue: [
      { speaker: 'REN', line: 'O laboratório tem cinco andares sem escadas fáceis. Escale as chaminés com wall-kick e faça vault nos canos do teto.' },
      { speaker: 'MAYA', line: 'Suba pelo poço central até o Observatório do Átrio, volte pelo mezanino ao Comando Oeste e libere a Ala Leste.' },
      { speaker: 'LEON', line: 'Paredes rachadas cedem aos meus socos; chaminés estreitas e ilhas aéreas guardam recursos extras para cada um.' },
    ],
  },

  // =========================================================================
  // 1B — TELHADOS DE NEON (8.600 px · 4 Arranha-Céus Multi-Andares & Vãos Aéreos)
  // =========================================================================
  {
    ...common,
    substageId: '1B',
    title: 'Telhados de Neon',
    boundsWidth: 8600,
    description:
      'Quatro arranha-céus multi-andares separados por cânions profundos. Cruze os vãos por cabos aéreos e passarelas, escale até a Antena Leste do Prisma, volte à Torre Oeste e desça aos esgotos.',
    entryCheckpoint: 'entrada',
    checkpoints: [
      { id: 'entrada', label: 'Cobertura Oeste', x: 140, y: 604 },
      { id: 'antenas', label: 'Torres de Transmissão', x: 4720, y: 604 },
      { id: 'saida', label: 'Duto de Manutenção', x: 8340, y: 604 },
    ],
    exits: [
      door('laboratorio', 'Laboratório', 50, 660, '1A', 'saida'),
      door('esgotos', 'Esgotos de Manutenção', 8440, 660, '1C', 'entrada'),
    ],
    platforms: [
      // --- Torre 1: Cobertura Oeste (x=-100..2020) ---
      plat(-100, 660, 2120, 400),
      plat(480, 180, 24, 370, 'wall'), // Parede oeste da chaminé da Torre 1 (vão 550..660!)
      plat(640, 420, 24, 130, 'wall'), // Parede direita inferior (vão 550..660!)
      plat(640, 420, 1280, 24),        // 2º Pavimento Penthouse (x=640..1920, Node 2 em x=1120)
      plat(670, 340, 110, 18),         // Degrau para alcançar o cano da Cobertura Secreta
      plat(120, 180, 360, 24),         // 3º Pavimento Secreto Oeste (baú x=220)
      plat(1910, 580, 100, 18),
      plat(1925, 500, 95, 18),

      // --- Vão Urbano 1 (x=2020..2320 = 300px abismo!) + Edifício 2: Prisma (x=2320..4380) ---
      plat(2320, 660, 2060, 400),
      plat(2010, 380, 490, 22),        // Ponte aérea alta entre Penthouse e 2º Andar Prisma
      plat(2080, 510, 140, 18, 'moving', { moveAxis: 'x', moveRange: 45, moveSpeed: 0.025 }), // Gôndola móvel opcional
      plat(2660, 420, 980, 24),        // 2º Pavimento Prisma (x=2660..3640)
      plat(2450, 580, 110, 18),
      plat(2560, 500, 100, 18),
      plat(3100, 444, 24, 216, 'wall', { gateId: 'brecha', breakNode: 'brecha-leon' }), // Parede frágil Leon
      plat(3320, 444, 24, 216, 'wall'),
      // Poço da Antena Leste do Prisma (x=3640..3800 = 136px interior)
      plat(3640, 40, 24, 260, 'wall'),  // Parede esquerda superior (abertura 300..420 do 2º pavimento)
      plat(3640, 444, 24, 106, 'wall'), // Guia inferior esquerdo (abertura 550..660)
      plat(3800, 180, 24, 370, 'wall'), // Parede direita até Antena (abertura 550..660)
      plat(3824, 180, 440, 24),        // 3º Andar: Antena Leste do Prisma (x=3824..4264, Node 1!)
      plat(4240, 580, 110, 18),
      plat(4125, 500, 110, 18),
      plat(4160, 340, 110, 18),
      plat(4264, 260, 110, 18),
      plat(3800, -40, 580, 24),

      // --- Vão Urbano 2 (x=4380..4660 = 280px abismo!) + Edifício 3: Transmissão (x=4660..6760) ---
      plat(4660, 660, 2100, 400),
      plat(4240, 420, 420, 22),        // Passarela alta ligando Prisma às Torres de Transmissão
      plat(4670, 580, 110, 18),
      plat(4600, 505, 110, 18),
      plat(4820, 140, 28, 520, 'wall', { gateId: 'linha' }), // Comporta aberta pelo Relé Oeste
      plat(4800, 100, 240, 40),
      plat(5140, 400, 1080, 24),       // Passarela Transmissão (x=5140..6220)
      plat(5380, -220, 360, 24),       // Plataforma suspensa Maya
      plat(5740, -400, 24, 180, 'wall', { gateId: 'atalho-voo' }),
      plat(5764, -220, 260, 24),
      plat(6216, 40, 24, 240, 'wall'),  // Poço torre leste (abertura 280..400)
      plat(6356, 160, 24, 390, 'wall'), // Parede direita torre leste (abertura 550..660)
      plat(6380, 160, 360, 24),        // Torre de Transmissão Leste
      plat(6500, 580, 110, 18),
      plat(6610, 500, 110, 18),
      plat(6490, 420, 110, 18),

      // --- Vão Urbano 3 (x=6760..7040 = 280px abismo!) + Edifício 4: Terraço Leste (x=7040..8600) ---
      plat(7040, 660, 1660, 400),
      plat(6680, 380, 360, 22),        // Ponte aérea alta para Terraço Leste (x=6680..7040)
      plat(7080, 0, 24, 140, 'wall'),   // Parede esquerda alta (240px de vão livre acima de y=380!)
      plat(7080, 404, 24, 146, 'wall'), // Parede esquerda inferior da chaminé Terraço (abertura 550..660!)
      plat(7220, 380, 24, 170, 'wall'), // Parede direita entrada Terraço (abertura 550..660!)
      plat(7220, 380, 495, 24),        // Galeria superior Terraço Leste (x=7220..7715)
      plat(7660, 0, 24, 240, 'wall'),  // Chaminé final parede esquerda (abertura 240..380)
      plat(7800, 140, 24, 410, 'wall'), // Parede direita até Torre Antena Final
      plat(7824, 140, 226, 24),        // 3º Andar: Torre da Antena Final (x=7824..8050, Node 3)
      plat(8060, 580, 110, 18),
      plat(7940, 500, 110, 18),
      plat(8060, 420, 110, 18),
      plat(7940, 340, 110, 18),
      plat(8090, 265, 160, 18),
      plat(8055, 200, 110, 18),
      // Chaminé cinética de Ren (x=7260..7460, passagem 120px livre sobre 7220..7660)
      plat(7260, -80, 24, 340, 'wall'),
      plat(7460, -80, 24, 340, 'wall'),
      plat(7484, -80, 400, 24),
      plat(7884, -260, 24, 180, 'wall', { gateId: 'atalho-cinetico' }),
      plat(7908, -80, 320, 24),
      plat(8220, 380, 28, 280, 'wall', { gateId: 'rota' }),
      plat(8200, 340, 360, 40),
      plat(8540, 120, 60, 540, 'wall'),
    ],
    ceilingPipes: [
      { x: 512, y: 432, w: 112, h: 10 }, // Pipe Chaminé Torre 1 (660 -> Penthouse 420)
      { x: 504, y: 192, w: 175, h: 10 }, // Pipe superior Torre 1 (420 -> Cobertura Secreta 180)
      { x: 1920, y: 215, w: 500, h: 10 }, // Cabo aéreo longo sobre Vão 1 (Torre 1 <-> Prisma)
      { x: 2470, y: 432, w: 165, h: 10 }, // Pipe subida térreo Prisma -> 2º Andar Prisma
      { x: 3672, y: 192, w: 110, h: 10 }, // Pipe elevação no Poço da Antena do Prisma
      { x: 4260, y: 240, w: 500, h: 10 }, // Cabo aéreo longo sobre Vão 2 (Prisma <-> Transmissão)
      { x: 4676, y: 432, w: 120, h: 10 }, // Pipe de retorno Vão 2 (B3L 660 -> passarela 420)
      { x: 4950, y: 412, w: 170, h: 10 }, // Pipe subida Torre de Transmissão (660 -> 400)
      { x: 5260, y: 140, w: 920, h: 10 }, // Rede de cabos de alta tensão
      { x: 6244, y: 172, w: 96, h: 10 },  // Pipe elevação Torre de Transmissão Leste (400 -> 160)
      { x: 6620, y: 165, w: 640, h: 10 }, // Cabo aéreo longo sobre Vão 3 (Transmissão <-> Terraço Leste 7220)
      { x: 7112, y: 392, w: 96, h: 10 },  // Pipe entrada Terraço Leste (660 -> 380)
      { x: 7692, y: 152, w: 96, h: 10 },  // Pipe subida Antena Final (380 -> 140)
    ],
    props: [
      { id: 1, x: 340, y: 616, w: 42, h: 44, hp: 20, kind: 'vending', dropType: 'heal' },
      { id: 2, x: 220, y: 136, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 3, x: 3180, y: 616, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'atk' },
      { id: 4, x: 5860, y: -264, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'full_heal' },
      { id: 5, x: 8020, y: -124, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 6, x: 5300, y: 616, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'jmp' },
      { id: 7, x: 7500, y: 616, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    enemies: [
      enemy('mib_gunner', 780, 660, 55),
      enemy('jetpack', 1620, 660, 60),
      enemy('sniper', 1420, 420, 50),
      enemy('mib_gunner', 4200, 180, 75, { requiredGuard: true, shootTimer: 45 }), // guardIndex: 3
      enemy('cyber_hound', 2740, 660, 60),
      enemy('drone', 3200, 420, 50),
      enemy('mib_shield', 5400, 660, 90),
      enemy('jetpack', 6020, 400, 65),
      enemy('sniper', 6480, 160, 55),
      enemy('mib_gunner', 7380, 380, 65),
      enemy('mib_shield', 7920, 660, 95),
    ],
    exploration: {
      style: 'loop',
      zones: [
        { label: 'TORRE OESTE · COBERTURA', x: 200, y: 560 },
        { label: 'EDIFÍCIO PRISMA · NEON', x: 2700, y: 340 },
        { label: 'ANTENA LESTE DO PRISMA', x: 3860, y: 90 },
        { label: 'TORRES DE TRANSMISSÃO', x: 5160, y: 310 },
        { label: 'TERRAÇO LESTE · DUTO', x: 7220, y: 300 },
      ],
      gates: [
        { id: 'linha', requires: ['comando'] },
        { id: 'rota', requires: ['rele', 'comando', 'transmissor', 'duto'] },
        { id: 'atalho-cinetico', requires: ['trava-ren'] },
        { id: 'atalho-voo', requires: ['nucleo-maya'] },
        { id: 'brecha', requires: ['brecha-leon'] },
      ],
      nodes: [
        node('rele', 'Antena leste do Prisma', 3980, 180, [], { guardIndex: 3 }),
        node('comando', 'Relé da cobertura oeste', 1120, 420, ['rele']),
        node('transmissor', 'Transmissor do terraço', 7960, 140, ['comando']),
        node('duto', 'Trava do duto leste', 7140, 660, ['transmissor']),
        node('trava-ren', 'Trava cinética — Ren', 7620, -80, [], { optional: true, requiredHero: 'ren' }),
        node('nucleo-maya', 'Núcleo suspenso — Maya', 5500, -220, [], { optional: true, requiredHero: 'maya' }),
        node('brecha-leon', 'Parede frágil — Leon', 3030, 660, [], { optional: true, requiredHero: 'leon', action: 'smash' }),
      ],
    },
  },

  // =========================================================================
  // 1C — ESGOTOS DE MANUTENÇÃO (8.500 px · Canais Ácidos, Esteiras & Poços)
  // =========================================================================
  {
    ...common,
    substageId: '1C',
    title: 'Esgotos de Manutenção',
    boundsWidth: 8500,
    spawnY: 664,
    goalX: 8340,
    palette: {
      ...chapter.palette,
      skyTop: '#041511',
      skyBottom: '#10271e',
      platformStroke: '#34d399',
      accentNeon: '#4ade80',
      weather: 'spores',
    },
    description:
      'Galerias secas multi-andares acima de canais ácidos largos e esteiras opostas. Balance pelos canos suspensos e escale os poços com wall-kick até a Bomba do Reservatório.',
    entryCheckpoint: 'entrada',
    checkpoints: [
      { id: 'entrada', label: 'Escada de Manutenção', x: 140, y: 664 },
      { id: 'reservatorio', label: 'Reservatório Central', x: 2420, y: 664 },
      { id: 'saida', label: 'Galeria da Avenida', x: 8200, y: 664 },
    ],
    exits: [
      door('telhados', 'Telhados', 50, 720, '1B', 'saida'),
      door('avenida', 'Avenida Bloqueada', 8340, 720, '1D', 'entrada'),
    ],
    platforms: [
      // --- Canal Oeste & Bacia Ácida 1 (320px larga!) ---
      plat(-100, 720, 940, 340),
      plat(840, 760, 320, 300, 'acid'), // Bacia Ácida 1 (320px -> exige ceiling pipe ou Galeria Oeste acima!)
      plat(1160, 720, 1240, 340),
      plat(460, 200, 24, 410, 'wall'),  // Parede esquerda chaminé oeste (vão 610..720!)
      plat(620, 440, 24, 170, 'wall'),  // Parede direita inferior (vão 610..720!)
      plat(620, 440, 1580, 24),         // Galeria Seca Oeste (x=620..2200, Node 2 comando em x=1380)
      plat(650, 360, 110, 18),          // Degrau para alcançar o cano da Câmara Secreta
      plat(2455, 640, 75, 18),
      plat(2340, 565, 80, 18),
      plat(2235, 495, 70, 18),
      plat(80, 200, 380, 24),           // Câmara Secreta Oeste (baú secret_a em x=200)
      plat(40, -20, 440, 28),

      // --- Reservatório Central (x=2400..4760) ---
      plat(2400, 720, 360, 340),
      plat(2760, 720, 580, 340, 'conveyor', { conveyorSpeed: -1.3 }),
      plat(3340, 720, 1460, 340),
      plat(3300, 464, 24, 256, 'wall', { gateId: 'brecha', breakNode: 'brecha-leon' }),
      plat(3640, 464, 24, 256, 'wall'),
      // Poço Entrada do Reservatório (x=2536..2684 -> Galeria Central y=440)
      plat(2536, 180, 24, 420, 'wall'), // Parede esquerda chaminé (abertura 600..720)
      plat(2684, 440, 24, 160, 'wall'), // Parede direita inferior (abertura 600..720)
      plat(2684, 440, 110, 24),         // Galeria Central Oeste (x=2684..2794)
      plat(3000, 440, 745, 24),         // Galeria Central Leste (x=3000..3745)
      plat(2900, 646, 100, 16),         // Acesso de manutenção à Galeria Central sem wall-kick
      plat(2795, 572, 95, 16),
      plat(2900, 498, 95, 16),
      // Poço da Bomba do Reservatório (x=3680..3840)
      plat(3680, 40, 24, 260, 'wall'),  // Parede esquerda superior (abertura 300..440 da Galeria Central)
      plat(3680, 464, 24, 146, 'wall'), // Guia inferior (abertura 610..720)
      plat(3840, 200, 24, 410, 'wall'), // Parede direita até Bomba (abertura 610..720)
      plat(3864, 200, 576, 24),         // 3º Andar: Bomba do Reservatório (x=3864..4440, Node 1!)
      plat(4590, 640, 110, 18),
      plat(4440, 560, 110, 18),
      plat(4565, 480, 115, 18),
      plat(4435, 400, 135, 18),
      plat(4605, 325, 100, 18),
      plat(4445, 255, 85, 18),
      plat(3840, -20, 620, 24),
      // Camada Maya (y=-220)
      plat(2820, -220, 380, 24),
      plat(3200, -400, 24, 180, 'wall', { gateId: 'atalho-voo' }),
      plat(3224, -220, 240, 24),
      plat(4720, 200, 28, 520, 'wall', { gateId: 'linha' }),

      // --- Canal Leste (x=4800..8500): Bacia Ácida 2 (320px), Esteira +1.4, Chaminé Ren & Turbina Leste ---
      plat(4800, 720, 580, 340),
      plat(5380, 760, 320, 300, 'acid'), // Bacia Ácida 2 (320px -> travessia por ceiling pipe ou Galeria!)
      plat(5700, 720, 520, 340, 'conveyor', { conveyorSpeed: 1.4 }),
      plat(6220, 720, 2380, 340),
      // Poço Entrada Canal Leste (x=4940..5084 -> Galeria Leste y=420)
      plat(4940, 180, 24, 420, 'wall'), // Parede esquerda chaminé (abertura 600..720)
      plat(5084, 420, 24, 180, 'wall'), // Parede direita inferior (abertura 600..720)
      plat(5084, 420, 2016, 24),        // Galeria Superior Leste (x=5084..7100, 300px acima do canal!)
      // Chaminé cinética de Ren (x=5900..6100, passagem 120px livre sobre Galeria 420)
      plat(5900, -60, 24, 360, 'wall'),
      plat(6100, -60, 24, 360, 'wall'),
      plat(6124, -60, 380, 24),
      plat(6504, -240, 24, 180, 'wall', { gateId: 'atalho-cinetico' }),
      plat(6528, -60, 340, 24),
      // Poço Leste da Turbina (x=7120..7260)
      plat(7120, 40, 24, 260, 'wall'),  // Parede esquerda superior (abertura 300..420 da Galeria)
      plat(7120, 444, 24, 166, 'wall'), // Guia inferior (abertura 610..720)
      plat(7260, 180, 24, 430, 'wall'), // Parede direita até Turbina Leste (abertura 610..720)
      plat(7284, 180, 616, 24),         // 3º Andar: Turbina Leste (Node 3 em x=7540)
      plat(7940, 640, 100, 18),
      plat(7790, 560, 110, 18),
      plat(7900, 470, 110, 18),
      plat(8015, 304, 100, 18),
      plat(7910, 245, 75, 18),
      plat(8060, 420, 28, 300, 'wall', { gateId: 'rota' }),
      plat(8040, 380, 420, 40),
      plat(8440, 140, 60, 580, 'wall'),
    ],
    ceilingPipes: [
      { x: 492, y: 452, w: 112, h: 10 }, // Pipe Chaminé Oeste (720 -> Galeria 440)
      { x: 484, y: 212, w: 175, h: 10 }, // Pipe superior Oeste (440 -> Câmara Secreta 200)
      { x: 780, y: 575, w: 460, h: 10 }, // Pipe suspenso obrigatório sobre os 320px de Ácido 1!
      { x: 2568, y: 452, w: 100, h: 10 }, // Pipe Poço Entrada Reservatório (720 -> Galeria Central 440)
      { x: 2210, y: 315, w: 180, h: 10 }, // Pipe saída Leste da Galeria Oeste (2200 -> 2400)
      { x: 2800, y: 210, w: 800, h: 10 }, // Pipe no teto do Reservatório Central
      { x: 3746, y: 452, w: 84, h: 10 }, // Pipe de retorno no Poço da Bomba (720 -> Galeria Central 440)
      { x: 3710, y: 212, w: 112, h: 10 }, // Pipe elevação Poço da Bomba (440 -> 200)
      { x: 4972, y: 432, w: 96, h: 10 },  // Pipe Poço Entrada Canal Leste (720 -> Galeria 420)
      { x: 5310, y: 575, w: 470, h: 10 }, // Pipe suspenso sobre os 320px de Ácido 2!
      { x: 7152, y: 192, w: 96, h: 10 },  // Pipe elevação Poço da Turbina Leste (420 -> 180)
      { x: 7136, y: 432, w: 112, h: 10 }, // Pipe para subir do Canal Leste (720) à Galeria (420)
    ],
    props: [
      { id: 1, x: 420, y: 676, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
      { id: 2, x: 200, y: 156, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 3440, y: 676, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'full_heal' },
      { id: 4, x: 3310, y: -264, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'wav' },
      { id: 5, x: 6650, y: -104, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 6, x: 5240, y: 676, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
      { id: 7, x: 7880, y: 676, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'heal' },
    ],
    enemies: [
      enemy('mutant', 640, 720, 65),
      enemy('drone', 1240, 720, 50),
      enemy('mib_gunner', 1860, 440, 60),
      enemy('mib_gunner', 4260, 200, 80, { requiredGuard: true, shootTimer: 45 }), // guardIndex: 3
      enemy('mutant', 2980, 720, 70),
      enemy('cyber_hound', 4320, 720, 65),
      enemy('mib_shield', 5140, 720, 95),
      enemy('sniper', 5400, 420, 55),
      enemy('drone', 5800, 720, 55),
      enemy('mutant', 6860, 720, 75),
      enemy('mib_shield', 7780, 720, 95),
    ],
    exploration: {
      style: 'loop',
      zones: [
        { label: 'CANAIS DE DRENAGEM OESTE', x: 180, y: 615 },
        { label: 'RESERVATÓRIO CENTRAL', x: 2740, y: 360 },
        { label: 'BOMBA SUPERIOR', x: 3880, y: 110 },
        { label: 'ESTEIRAS DE ESCOAMENTO', x: 5300, y: 340 },
        { label: 'TURBINA LESTE', x: 7300, y: 110 },
      ],
      gates: [
        { id: 'linha', requires: ['comando'] },
        { id: 'rota', requires: ['rele', 'comando', 'turbina', 'comporta'] },
        { id: 'atalho-cinetico', requires: ['trava-ren'] },
        { id: 'atalho-voo', requires: ['nucleo-maya'] },
        { id: 'brecha', requires: ['brecha-leon'] },
      ],
      nodes: [
        node('rele', 'Bomba do reservatório', 4020, 200, [], { guardIndex: 3 }),
        node('comando', 'Válvula de retorno', 1380, 440, ['rele']),
        node('turbina', 'Turbina leste', 7540, 180, ['comando']),
        node('comporta', 'Comporta da galeria', 6480, 720, ['turbina']),
        node('trava-ren', 'Trava cinética — Ren', 6260, -60, [], { optional: true, requiredHero: 'ren' }),
        node('nucleo-maya', 'Núcleo suspenso — Maya', 2940, -220, [], { optional: true, requiredHero: 'maya' }),
        node('brecha-leon', 'Parede frágil — Leon', 3250, 720, [], { optional: true, requiredHero: 'leon', action: 'smash' }),
      ],
    },
  },

  // =========================================================================
  // 1D — AVENIDA BLOQUEADA (9.200 px · Metrô, Avenida, Viaduto, Radar & Cipher-01)
  // =========================================================================
  {
    ...common,
    substageId: '1D',
    title: 'Avenida Bloqueada',
    boundsWidth: 9200,
    spawnY: 644,
    goalX: 8580,
    description:
      'Avenida sitiada em quatro camadas verticais sem escadas simples: metrô no subsolo, rua bloqueada, viaduto e torres de radar escaláveis por wall-kick e canos de teto.',
    entryCheckpoint: 'entrada',
    checkpoints: [
      { id: 'entrada', label: 'Boca da Galeria', x: 140, y: 644 },
      { id: 'bloqueio', label: 'Antes do Bloqueio', x: 6960, y: 644 },
    ],
    exits: [door('esgotos', 'Esgotos', 50, 700, '1C', 'saida')],
    platforms: [
      // --- Avenida (y=700) + Estação de Metrô Subterrânea (y=880) ---
      plat(-100, 700, 1020, 420),
      plat(920, 880, 2080, 240),       // Piso subterrâneo do Metrô (x=920..3000)
      plat(1075, 700, 1765, 24),       // Ponte da avenida sobre o metrô (entradas oeste 920..1075 e leste 2840..3000)
      plat(1960, 724, 24, 156, 'wall', { gateId: 'brecha', breakNode: 'brecha-leon' }),
      plat(2560, 724, 24, 156, 'wall'),
      plat(3000, 700, 6300, 420),

      // --- Viaduto Oeste (y=440), Marquise Secreta (y=190) & Posto de Vigilância (y=200) ---
      plat(500, 190, 24, 400, 'wall'), // Chaminé Oeste parede esquerda (abertura 590..700!)
      plat(656, 440, 24, 150, 'wall'), // Parede direita entrada Viaduto (abertura 590..700!)
      plat(656, 440, 2744, 24),        // Pista intermediária do Viaduto (x=656..3400, Node 2 em 1480)
      plat(3535, 440, 105, 24),        // Cabeceira leste do Viaduto após abertura de subida
      plat(680, 360, 110, 18),         // Degrau para alcançar o cano da Marquise Secreta
      plat(3550, 620, 95, 18),
      plat(3430, 530, 80, 18),
      plat(120, 190, 380, 24),         // 3º Andar: Marquise Secreta Oeste (x=120..500, baú)
      // Poço Central do Viaduto (x=3640..3800 = 136px interior)
      plat(3640, 40, 24, 280, 'wall'), // Parede esquerda superior (abertura 320..440 do Viaduto)
      plat(3640, 464, 24, 126, 'wall'), // Guia inferior (abertura 590..700)
      plat(3800, 200, 24, 390, 'wall'), // Parede direita até Posto de Vigilância (abertura 590..700!)
      plat(3824, 200, 616, 24),        // 3º Andar: Posto de Vigilância Superior (x=3824..4440, Node 1)
      plat(4485, 620, 100, 18),
      plat(4625, 540, 95, 18),
      plat(4760, 460, 55, 18),
      plat(4655, 380, 70, 18),
      plat(4545, 305, 70, 18),
      plat(4465, 240, 50, 18),
      plat(3800, -20, 660, 24),
      plat(2540, -220, 380, 24),       // Outdoor aéreo Maya
      plat(2920, -400, 24, 180, 'wall', { gateId: 'atalho-voo' }),
      plat(2944, -220, 240, 24),
      plat(4820, 200, 28, 500, 'wall', { gateId: 'linha' }),

      // --- Setor Leste (x=4820..6900): Viaduto Leste (440), Chaminé Ren (-60) & Radar (190) ---
      plat(5120, 440, 480, 24),        // Viaduto Leste Oeste (x=5120..5600, subida por pipe em 4940!)
      plat(5600, 20, 24, 300, 'wall'), // Poço Radar parede esquerda (abertura 320..440)
      plat(5600, 464, 24, 126, 'wall'), // Guia inferior (abertura 590..700)
      plat(5760, 190, 24, 400, 'wall'), // Parede direita até Radar (abertura 590..700)
      plat(5784, 190, 536, 24),        // 3º Andar: Torre de Radar do Viaduto (Node 3 em 5960)
      plat(6350, 620, 95, 18),
      plat(6480, 540, 95, 18),
      plat(6605, 460, 50, 18),
      plat(6505, 380, 65, 18),
      plat(6410, 305, 65, 18),
      plat(6340, 240, 50, 18),
      // Chaminé cinética de Ren (x=5380..5580, passagem 120px livre sobre Viaduto Leste 440)
      plat(5380, -60, 24, 380, 'wall'),
      plat(5580, -60, 24, 380, 'wall'),
      plat(5604, -60, 380, 24),
      plat(5984, -240, 24, 180, 'wall', { gateId: 'atalho-cinetico' }),
      plat(6008, -60, 300, 24),
      plat(6680, 440, 28, 260, 'wall', { gateId: 'rota' }),
      plat(6660, 400, 380, 40),

      // --- Praça de Emboscada & Arena Cipher-01 (x=7160..9200) ---
      plat(7480, 520, 240, 22),
      plat(8100, 500, 240, 22),
      plat(9120, 180, 60, 520, 'wall'),
    ],
    ceilingPipes: [
      { x: 530, y: 452, w: 112, h: 10 }, // Pipe Chaminé Oeste (700 -> Viaduto 440)
      { x: 524, y: 202, w: 175, h: 10 }, // Pipe superior Oeste (Viaduto 440 -> Marquise Secreta 190)
      { x: 938, y: 732, w: 125, h: 10 }, // Pipe saída oeste do Metrô (880 -> 700)
      { x: 1220, y: 745, w: 680, h: 10 }, // Pipe teto da Estação de Metrô Subterrânea
      { x: 2850, y: 732, w: 140, h: 10 }, // Pipe saída leste do Metrô (880 -> 700)
      { x: 2440, y: 220, w: 940, h: 10 }, // Pipe longo sobre o Viaduto Central
      { x: 3672, y: 212, w: 112, h: 10 }, // Pipe elevação Poço Vigilância (440 -> 200)
      { x: 3440, y: 452, w: 175, h: 10 }, // Pipe subida sul Avenida -> Viaduto Leste-Central
      { x: 4930, y: 452, w: 165, h: 10 }, // Pipe subida Viaduto Leste (700 -> 440)
      { x: 5632, y: 202, w: 112, h: 10 }, // Pipe elevação Poço Torre de Radar (440 -> 190)
      { x: 7400, y: 310, w: 660, h: 10 }, // Pipe tático na Praça de Emboscada
    ],
    props: [
      { id: 1, x: 340, y: 644, w: 96, h: 56, hp: 35, kind: 'car', dropType: 'heal' },
      { id: 2, x: 220, y: 146, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_a' },
      { id: 3, x: 2220, y: 836, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'atk' },
      { id: 4, x: 3020, y: -264, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'full_heal' },
      { id: 5, x: 6110, y: -104, w: 48, h: 44, hp: 25, kind: 'chest', dropType: 'secret_b' },
      { id: 6, x: 1580, y: 836, w: 42, h: 44, hp: 20, kind: 'vending', dropType: 'heal' },
      { id: 7, x: 5420, y: 656, w: 42, h: 44, hp: 20, kind: 'crate', dropType: 'psy' },
      { id: 8, x: 8320, y: 656, w: 42, h: 44, hp: 20, kind: 'terminal', dropType: 'psy' },
    ],
    ambushArenas: [{ id: 1, triggerX: 7340, minX: 7160, maxX: 8160, cleared: false, active: false }],
    enemies: [
      enemy('mib_gunner', 1320, 700, 60),
      enemy('cyber_hound', 1380, 880, 60),
      enemy('drone', 2280, 440, 50),
      enemy('mib_gunner', 4220, 200, 80, { requiredGuard: true, shootTimer: 45 }), // guardIndex: 3
      enemy('sniper', 3180, 440, 55),
      enemy('mib_shield', 4420, 700, 95),
      enemy('mib_gunner', 5340, 700, 65),
      enemy('drone', 5240, 440, 55),
      enemy('mib_shield', 7320, 700, 95),
      enemy('cyber_hound', 7560, 700, 65),
      enemy('mib_gunner', 7780, 700, 70),
      enemy('heavy_trooper', 8020, 700, 110),
    ],
    exploration: {
      style: 'loop',
      zones: [
        { label: 'AVENIDA OESTE · METRÔ SUBSOLO', x: 180, y: 580 },
        { label: 'ESTAÇÃO SUBTERRÂNEA', x: 1180, y: 825 },
        { label: 'VIADUTO ELEVADO', x: 2420, y: 360 },
        { label: 'POSTO DE VIGILÂNCIA SUPERIOR', x: 3860, y: 110 },
        { label: 'BARRICADA & RADAR LESTE', x: 5120, y: 360 },
        { label: 'PRAÇA DE EMBOSCADA', x: 7300, y: 460 },
      ],
      gates: [
        { id: 'linha', requires: ['comando'] },
        { id: 'rota', requires: ['rele', 'comando', 'radar', 'barreira'] },
        { id: 'atalho-cinetico', requires: ['trava-ren'] },
        { id: 'atalho-voo', requires: ['nucleo-maya'] },
        { id: 'brecha', requires: ['brecha-leon'] },
      ],
      nodes: [
        node('rele', 'Posto de vigilância', 4020, 200, [], { guardIndex: 3 }),
        node('comando', 'Comando do bloqueio', 1480, 440, ['rele']),
        node('radar', 'Radar do viaduto', 5880, 190, ['comando']),
        node('barreira', 'Trava do bloqueio leste', 5060, 700, ['radar']),
        node('trava-ren', 'Trava cinética — Ren', 5760, -60, [], { optional: true, requiredHero: 'ren' }),
        node('nucleo-maya', 'Núcleo suspenso — Maya', 2680, -220, [], { optional: true, requiredHero: 'maya' }),
        node('brecha-leon', 'Parede frágil — Leon', 1910, 880, [], { optional: true, requiredHero: 'leon', action: 'smash' }),
      ],
    },
    boss: { ...chapter.boss, x: 8580, y: 626 },
    outroDialogue: chapter.outroDialogue.map((line) => ({ ...line })),
  },
];
