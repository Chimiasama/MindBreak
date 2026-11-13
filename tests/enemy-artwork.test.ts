import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_ART,enemyRows,enemyPalette,enemyVisualFrame} from '../src/game/enemyArtwork';
import type {EnemyType} from '../src/game/types';

test('twelve archetypes have distinct silhouettes without color information',()=>{
 const masks=new Set<string>();
 for(const type of Object.keys(ENEMY_ART) as EnemyType[]){const mask=enemyRows(type).join('').replace(/[^.]/g,'#');assert.ok(!masks.has(mask),type);masks.add(mask);}
 assert.equal(masks.size,12);
});
test('all enemy poses fit native integer raster and use declared palette',()=>{
 for(const type of Object.keys(ENEMY_ART) as EnemyType[])for(let frame=0;frame<4;frame++){
  const rows=enemyRows(type,frame),palette=enemyPalette(type);assert.equal(rows.length,32);assert.ok(rows.every(row=>row.length===24));
  assert.ok(rows.join('').replaceAll('.','').length>80,type);
  for(const ch of rows.join(''))assert.ok(ch==='.'||palette[ch],`${type}: ${ch}`);
 }
});
test('telegraph and attack visuals override stride without mutating gameplay',()=>{
 const e={vx:3,telegraph:0,stunTimer:0},before=structuredClone(e);
 assert.equal(enemyVisualFrame(e,0),1);assert.equal(enemyVisualFrame(e,6),2);assert.deepEqual(e,before);
 assert.equal(enemyVisualFrame({...e,telegraph:5},0),3);
 assert.equal(enemyVisualFrame({...e,telegraph:5,stunTimer:5},0),0);
 assert.equal(enemyVisualFrame({...e,vx:0},1000),0);
 const ai={state:'attack' as const,timer:3,memory:0,aimX:0,aimY:0,facing:1 as const,action:'shot' as const};
 assert.equal(enemyVisualFrame({...e,ai},0),3);assert.equal(enemyVisualFrame({...e,ai:{...ai,state:'stunned'}},0),0);
});
test('humanoid stride and installer anticipation visibly differ from rest',()=>{
 for(const type of ['mib_gunner','mib_shield','mutant','sniper','suit_martial','samurai','turret_engineer','heavy_trooper'] as const){assert.notDeepEqual(enemyRows(type,0),enemyRows(type,1),type);assert.notDeepEqual(enemyRows(type,1),enemyRows(type,2),type);}
 assert.notDeepEqual(enemyRows('turret_engineer',0),enemyRows('turret_engineer',3));
});

test('non-humanoid crop preserves every visible source pixel within the physical draw rectangle',async()=>{
 const {enemySourceRect}=await import('../src/game/enemyArtwork');
 for(const type of Object.keys(ENEMY_ART) as EnemyType[])for(let frame=0;frame<4;frame++){
  const crop=enemySourceRect(type),rows=enemyRows(type,frame);
  assert.ok(crop.w>0&&crop.h>0&&crop.x+crop.w<=24&&crop.y+crop.h<=32);
  for(let y=0;y<32;y++)for(let x=0;x<24;x++)if(rows[y][x]!=='.')assert.ok(x>=crop.x&&x<crop.x+crop.w&&y>=crop.y&&y<crop.y+crop.h,`${type}: ${x},${y}`);
 }
});
