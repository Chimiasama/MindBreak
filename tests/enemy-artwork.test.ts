import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_ART,ENEMY_ROLES,ENEMY_FRAME,enemyRig,enemySourceRect,enemyVisualFrame} from '../src/game/enemyArtwork';
import type {EnemyType} from '../src/game/types';
test('all twelve archetypes keep distinct roles and higher-resolution source rectangles',()=>{
 assert.equal(new Set(Object.values(ENEMY_ROLES)).size,12);
 for(const type of Object.keys(ENEMY_ART) as EnemyType[]){const source=enemySourceRect(type);assert.equal(source.w,ENEMY_FRAME.w);assert.equal(source.h,ENEMY_FRAME.h);assert.ok(ENEMY_ART[type].body);}
 assert.ok(ENEMY_FRAME.h>=128);
});
test('enemy rig poses remain finite and installation has its own low hand position',()=>{
 for(const type of Object.keys(ENEMY_ART) as EnemyType[])for(let frame=0;frame<4;frame++){
  const rig=enemyRig(type,frame);for(const p of [rig.head,rig.chest,rig.hip,...rig.elbows,...rig.hands,...rig.knees,...rig.feet])assert.ok(p.every(Number.isFinite));
 }
 assert.ok(enemyRig('turret_engineer',3).hands[1][1]>enemyRig('turret_engineer',0).hands[1][1]);
});
test('telegraph and attack visuals override stride without mutating gameplay',()=>{
 const e={vx:3,telegraph:0,stunTimer:0},before=structuredClone(e);
 assert.equal(enemyVisualFrame(e,0),1);assert.equal(enemyVisualFrame(e,6),2);assert.deepEqual(e,before);
 assert.equal(enemyVisualFrame({...e,telegraph:5},0),3);assert.equal(enemyVisualFrame({...e,telegraph:5,stunTimer:5},0),0);assert.equal(enemyVisualFrame({...e,vx:0},1000),0);
 const ai={state:'attack' as const,timer:3,memory:0,aimX:0,aimY:0,facing:1 as const,action:'shot' as const};assert.equal(enemyVisualFrame({...e,ai},0),3);assert.equal(enemyVisualFrame({...e,ai:{...ai,state:'stunned'}},0),0);
});
test('humanoid locomotion moves actual articulated joints',()=>{
 for(const type of ['mib_gunner','mib_shield','sniper','suit_martial','samurai','turret_engineer','heavy_trooper'] as const)assert.notDeepEqual(enemyRig(type,1).knees,enemyRig(type,2).knees);
});
