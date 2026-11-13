import { withExploration } from './exploration';
import { STAGES } from '../stages';
import { overlaps } from '../collision';
import { StageDefinition } from '../types';
import { DISTRICT } from './district';
import { MONORAIL } from './monorail';
import { CONSTRUCTION } from './construction';
import { FACTORY } from './factory';
import { FINANCIAL } from './financial';
import { MUSEUM } from './museum';
import { BLACKSITE } from './blacksite';
import { TOWER } from './tower';
import { CampaignStage, SubstageDefinition, SubstageId } from './types';
export type { CampaignStage, SubstageDefinition, SubstageId, PlayerCarry, CampaignProgress } from './types';

export function adaptLegacy(stage: StageDefinition): SubstageDefinition {
  return { ...stage, substageId: `${stage.id}A`, exits: [], entryCheckpoint: 'entrada',
    checkpoints: [{ id: 'entrada', label: 'Entrada do setor', x: stage.spawnX, y: stage.spawnY }] };
}

export const SUBSTAGES: SubstageDefinition[] = [...DISTRICT, ...MONORAIL, ...CONSTRUCTION, ...FACTORY, ...FINANCIAL, ...MUSEUM, ...BLACKSITE, ...TOWER].map(withExploration);
export const CAMPAIGN: CampaignStage[] = STAGES.map((stage) => ({ id: stage.id, title: stage.title,
  entry: `${stage.id}A`, substages: SUBSTAGES.filter((area) => area.id === stage.id).map((area) => area.substageId),
  plannedCount: stage.id === 1 || stage.id === 8 ? 4 : 3 }));

export function getSubstage(id: SubstageId): SubstageDefinition {
  const result = SUBSTAGES.find((area) => area.substageId === id);
  if (!result) throw new Error(`Subfase desconhecida: ${id}`);
  return result;
}

/** Reject broken authoring data before it can create a dead end in gameplay. */
export function validateCampaign(areas: SubstageDefinition[] = SUBSTAGES, chapters: CampaignStage[] = CAMPAIGN) {
  const errors: string[] = [];
  const byId = new Map(areas.map((area) => [area.substageId, area]));
  if (byId.size !== areas.length) errors.push('IDs de subfase duplicados');
  for (const area of areas) {
    if (!chapters.some((chapter) => chapter.id === area.id && chapter.substages.includes(area.substageId))) errors.push(`${area.substageId}: subfase sem filiação`);
    for (const enemy of area.enemies) {
      if (enemy.deployedBy !== undefined) {
        const parent = area.enemies[enemy.deployedBy - 1];
        if (!Number.isInteger(enemy.deployedBy) || parent?.type !== 'turret_engineer' || enemy.type !== 'turret' || enemy.mount !== 'floor' ||
            Math.abs(enemy.x - parent.x) > 70 || Math.abs(enemy.y + enemy.h - parent.y - parent.h) > 8) errors.push(`${area.substageId}: instalação inválida`);
      }
      if (enemy.type === 'turret_engineer' && area.enemies.filter((child) => child.deployedBy === area.enemies.indexOf(enemy) + 1).length !== 1) errors.push(`${area.substageId}: instalador sem torreta única`);
      if (enemy.mount && enemy.type !== 'turret') errors.push(`${area.substageId}: suporte inválido`);
      if (enemy.mount && enemy.mount !== 'floor' && !area.platforms.some((p) =>
        p.type !== 'acid' && p.type !== 'laser_gate' && (enemy.mount === 'ceiling' ? p.y + p.h === enemy.y && enemy.x >= p.x && enemy.x + enemy.w <= p.x + p.w :
          enemy.y >= p.y && enemy.y + enemy.h <= p.y + p.h && (enemy.mount === 'wall-left' ? p.x + p.w === enemy.x : p.x === enemy.x + enemy.w)))) errors.push(`${area.substageId}: torreta sem suporte`);
    }
    const nodes = area.exploration?.nodes ?? [];
    if (new Set(nodes.map(n => n.id)).size !== nodes.length) errors.push(`${area.substageId}: comandos duplicados`);
    for (const node of nodes) {
      if (![node.x,node.y,node.w,node.h].every(Number.isFinite) || node.w <= 0 || node.h <= 0 ||
        !area.platforms.some(p => !p.gateId && p.type !== 'acid' && p.type !== 'laser_gate' && p.type !== 'moving' && p.type !== 'crumble' &&
          p.y === node.y + node.h && p.x <= node.x && p.x + p.w >= node.x + node.w) || area.platforms.some(p => overlaps(node,p))) errors.push(`${area.substageId}: comando sem apoio seguro`);
      if (node.guardIndex !== undefined && !area.enemies[node.guardIndex]?.requiredGuard) errors.push(`${area.substageId}: guarda obrigatório inválido`);
      if (node.requires.some(id => id === node.id || !nodes.some(n => n.id === id))) errors.push(`${area.substageId}: dependência de comando inválida`);
    }
    const reached = new Set<string>();
    for (let i = 0; i < nodes.length; i++) for (const node of nodes) if (node.requires.every(id => reached.has(id))) reached.add(node.id);
    if (reached.size !== nodes.length) errors.push(`${area.substageId}: ciclo de comandos`);
    const geometry = [...area.platforms, ...area.exits];
    if (geometry.some((body) => ![body.x, body.y, body.w, body.h].every(Number.isFinite) || body.w <= 0 || body.h <= 0)) errors.push(`${area.substageId}: geometria inválida`);
    if (new Set(area.props.map((prop) => prop.id)).size !== area.props.length) errors.push(`${area.substageId}: objetos duplicados`);
    if (!area.checkpoints.some((point) => point.id === area.entryCheckpoint)) errors.push(`${area.substageId}: entrada ausente`);
    if (new Set(area.checkpoints.map((point) => point.id)).size !== area.checkpoints.length) errors.push(`${area.substageId}: checkpoints duplicados`);
    if (new Set(area.exits.map((exit) => exit.id)).size !== area.exits.length) errors.push(`${area.substageId}: saídas duplicadas`);
    for (const point of area.checkpoints) {
      const body = { x: point.x, y: point.y, w: 32, h: 56 };
      if (![point.x, point.y].every(Number.isFinite) || point.x < 10 || point.x + 32 > area.boundsWidth - 10 || point.y < area.boundsTop || point.y + 56 > area.boundsBottom ||
        area.platforms.some((solid) => overlaps(body, solid))) errors.push(`${area.substageId}/${point.id}: checkpoint obstruído ou fora do mapa`);
    }
    for (const exit of area.exits) {
      const target = byId.get(exit.target);
      if (!target) errors.push(`${area.substageId}/${exit.id}: destino ausente`);
      else if (!target.checkpoints.some((point) => point.id === exit.targetCheckpoint)) errors.push(`${area.substageId}/${exit.id}: checkpoint de destino ausente`);
      if (target && target.id !== area.id) errors.push(`${area.substageId}/${exit.id}: saída atravessa fase principal`);
    }
  }
  for (const chapter of chapters) {
    const visited = new Set<SubstageId>();
    const queue = [chapter.entry];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(...(byId.get(id)?.exits.map((exit) => exit.target) ?? []));
    }
    if (!chapter.substages.every((id) => visited.has(id))) errors.push(`${chapter.id}: subfase inalcançável`);
    if (chapter.substages.filter((id) => byId.get(id)?.boss).length !== 1) errors.push(`${chapter.id}: deve ter exatamente um encontro final`);
    if (chapter.substages.some((id) => !byId.has(id) || byId.get(id)!.id !== chapter.id)) errors.push(`${chapter.id}: filiação inválida`);
  }
  return errors;
}

const campaignErrors = validateCampaign();
if (campaignErrors.length) throw new Error(`Campanha inválida: ${campaignErrors.join('; ')}`);
