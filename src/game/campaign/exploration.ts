import { overlaps } from '../collision';
import { Platform } from '../types';
import { enemyAt } from './authoring';
import { SubstageDefinition, SubstageId } from './types';

type Anchor = [number, number];
interface RoutePlan {
  rooms: [string, string];
  first: Anchor; returnTo: Anchor; exit?: Anchor;
  links?: Anchor[];
  cache?: Anchor;
}
/** Authored routes, not random objectives: visit the distant wing, return, then take the upper exit. */
export const ROUTE_PLANS: Partial<Record<SubstageId, RoutePlan>> = {
  '1A': { cache: [80,260], rooms: ['Arquivo de contenção', 'Comando de manutenção'], first: [1190,340], returnTo: [650,540], exit: [1500,500] },
  '1B': { rooms: ['Antena leste', 'Relé da cobertura oeste'], first: [1450,330], returnTo: [400,540], exit: [2250,440], links: [[900,540]] },
  '1C': { rooms: ['Bomba do reservatório', 'Válvula de retorno'], first: [1120,480], returnTo: [410,600], exit: [2160,560] },
  '1D': { rooms: ['Posto de vigilância', 'Comando do bloqueio'], first: [1240,430], returnTo: [900,540] },
  '3A': { cache: [80,420], rooms: ['Controle de carga', 'Oficina de fundação'], first: [980,500], returnTo: [620,480], exit: [1690,460], links: [[790,640],[1430,670],[1570,550]] },
  '3B': { rooms: ['Cabine do guindaste', 'Relé lateral das vigas'], first: [1920,-20], returnTo: [1470,180] },
  '3C': { rooms: ['Controle de tempestade', 'Abrigo do heliponto'], first: [1240,150], returnTo: [930,270], links: [[710,350]] },
  '4A': { cache: [80,320], rooms: ['Comando dos tanques', 'Sala de refrigeração'], first: [1360,400], returnTo: [500,320], exit: [2100,440], links: [[300,460],[800,600],[800,440],[1020,420],[1850,580]] },
  '4B': { rooms: ['Distribuidor de energia', 'Controle de alimentação'], first: [1150,330], returnTo: [400,420], exit: [2390,500], links: [[720,540],[900,450]] },
  '4C': { rooms: ['Comando do reator', 'Válvula de descarte'], first: [1460,430], returnTo: [640,500] },
  '5A': { cache: [80,290], rooms: ['Sala de credenciais', 'Recepção de segurança'], first: [1110,320], returnTo: [700,430], exit: [2210,420], links: [[760,570],[950,450],[2020,550]] },
  '5B': { rooms: ['Servidor da garagem', 'Oficina de serviço'], first: [1250,300], returnTo: [740,480], exit: [2180,340], links: [[900,610],[1740,620],[1950,500],[1080,460],[2050,400]] },
  '5C': { rooms: ['Arquivo executivo', 'Comando do cofre'], first: [1170,260], returnTo: [840,380], links: [[650,500]] },
  '6A': { rooms: ['Arquivo holográfico', 'Sala de projeção'], first: [860,350], returnTo: [300,500], exit: [1930,370], links: [[1520,600],[1710,510]] },
  '6B': { rooms: ['Núcleo de irrigação', 'Controle do jardim oeste'], first: [1320,390], returnTo: [330,500], exit: [2200,430], links: [[580,620],[910,650],[1080,540],[1190,450],[1970,570],[2080,500]] },
  '6C': { rooms: ['Catálogo restrito', 'Controle do acervo'], first: [1150,290], returnTo: [830,400], links: [[650,520]] },
  '7A': { cache: [80,300], rooms: ['Central da doca', 'Posto de vigilância'], first: [1120,460], returnTo: [620,300], exit: [2280,520], links: [[900,580],[850,420]] },
  '7B': { rooms: ['Servidor de contenção', 'Comando de acesso'], first: [1430,300], returnTo: [410,430], exit: [2190,440], links: [[260,570],[970,600],[1170,460],[2040,580],[2120,500]] },
  '7C': { rooms: ['Sala de comunicações', 'Comando de autorização'], first: [1160,280], returnTo: [830,390], links: [[650,520]] },
  '8A': { cache: [80,320], rooms: ['Distribuidor da torre', 'Comando da base'], first: [1260,320], returnTo: [650,440], exit: [2080,410], links: [[450,580],[1030,480],[1850,550]] },
  '8B': { rooms: ['Estabilizador Zero', 'Controle de retorno'], first: [1080,380], returnTo: [400,460], exit: [2240,320], links: [[1720,600],[1960,460],[820,530]] },
  '8C': { rooms: ['Comando orbital', 'Relé lateral do eixo'], first: [2110,-100], returnTo: [1800,100] },
  '8D': { rooms: ['Autorização estratosférica', 'Comando da plataforma'], first: [1180,200], returnTo: [860,320], links: [[650,460]] },
};

export function withExploration(source: SubstageDefinition): SubstageDefinition {
  const plan = ROUTE_PLANS[source.substageId];
  if (!plan) return source; // The monorail remains the deliberately linear exception.
  const area = { ...source, platforms: source.platforms.map(p => ({ ...p })), enemies: source.enemies.map(e => ({ ...e })),
    props: source.props.map(p => ({ ...p })), exits: source.exits.map(e => ({ ...e })), checkpoints: source.checkpoints.map(p => ({ ...p })) };
  const landing = ([x,y]: Anchor): Platform => {
    let p = area.platforms.find(p => p.x === x && p.y === y && p.type !== 'acid' && p.type !== 'laser_gate');
    if (p) { p.type = 'solid'; return p; } // An essential control never rests on a crumbling/moving floor.
    p = { x, y, w: 180, h: 18, type: 'solid' }; area.platforms.push(p); return p;
  };
  for (const link of plan.links ?? []) landing(link);
  if (plan.cache) {
    const [x,y] = plan.cache;
    landing([x + 280,y + 270]); landing([x + 170,y + 140]);
    const shelf = landing(plan.cache);
    landing([x,y-150]);
    const chest = area.props.find(p => p.kind === 'chest');
    if (chest) { chest.x = shelf.x + 30; chest.y = shelf.y - chest.h; }
  }
  const first = landing(plan.first), back = landing(plan.returnTo);
  const guardIndex = area.enemies.length;
  area.enemies.push(enemyAt('mib_gunner', first.x + first.w - 52, first.y, 70, { requiredGuard: true, shootTimer: 45 }));
  const nodes = [
    { id: 'rele', label: plan.rooms[0], x: first.x + 12, y: first.y - 44, w: 28, h: 44, requires: [] as string[], guardIndex },
    { id: 'comando', label: plan.rooms[1], x: back.x + 12, y: back.y - 44, w: 28, h: 44, requires: ['rele'] },
  ];
  // Covered rooms have solid ceilings and two approaches; traversal does not force wall-kick exploits.
  for (const floor of [first, back]) {
    const roof = { x: floor.x, y: floor.y - 150, w: floor.w, h: 12, type: 'solid' as const };
    for (const piece of [roof]) if (!area.platforms.some(p => overlaps(piece, p)) &&
      !area.enemies.some(e => overlaps(piece, e)) && !area.checkpoints.some(p => overlaps(piece, { ...p, w: 32, h: 56 }))) area.platforms.push(piece);
  }
  if (plan.exit) {
    const floor = landing(plan.exit);
    const forward = area.exits.find(exit => exit.x > area.boundsWidth / 2);
    if (forward) {
      forward.x = floor.x + floor.w - 75; forward.y = floor.y - 88;
      const checkpoint = area.checkpoints.find(p => p.id === 'saida');
      if (checkpoint) { checkpoint.x = forward.x + 4; checkpoint.y = floor.y - 56; checkpoint.label = 'Acesso à passagem superior'; }
    }
  }
  const forward = area.exits.find(exit => exit.x > area.boundsWidth / 2);
  const floor = forward ? forward.y + forward.h : area.checkpoints[0].y + 56;
  const gateCandidates = forward ? [42,82,122,162].map(offset => forward.x - offset) : [(area.ambushArenas?.[0]?.minX ?? area.goalX - 700) - 70];
  // Gates overlap no authored actor/checkpoint; progression also checks the route if flown over.
  for (const x of gateCandidates) {
    const gate = { x, y: floor - 160, w: 18, h: 160, type: 'wall' as const, gateId: 'rota' };
    if (!area.enemies.some(e => overlaps(gate,e)) && !area.checkpoints.some(p => overlaps(gate,{...p,w:32,h:56}))) { area.platforms.push(gate); break; }
  }
  return { ...area, exploration: { nodes, style: source.substageId === '3B' || source.substageId === '8C' ? 'vertical' : 'loop' },
    introDialogue: source.substageId === '1A' ? [
      { speaker: 'REN', line: 'A saída do laboratório está bloqueada. Vou procurar uma passagem por cima.' },
      { speaker: 'MAYA', line: 'Suba até o Arquivo de contenção, vença o guarda e examine o painel com CIMA. Depois volte ao Comando de manutenção para liberar a passagem.' },
      { speaker: 'MAYA', line: 'O depósito lateral guarda recursos, mas é um desvio opcional. CIMA também atravessa portas; os pontos de apoio marcam nosso retorno.' },
    ] : source.introDialogue,
    description: `${source.description} Explore ${plan.rooms[0]}, volte até ${plan.rooms[1]} e libere ${source.boss ? 'o acesso ao confronto' : 'a passagem superior'}.` };
}
