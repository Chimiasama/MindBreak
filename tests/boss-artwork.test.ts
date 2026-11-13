import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_ART,BOSS_FRAME,bossRig,bossStyle,bossVisualFrame,drawBossSprite,type BossKind} from '../src/game/bossArtwork';
import type {BossRuntime} from '../src/game/types';
test('eight bosses retain distinct costumes and phase-two energy identities',()=>{
 assert.equal(Object.keys(BOSS_ART).length,8);assert.equal(new Set(Object.values(BOSS_ART).map(a=>a.body)).size,8);
 for(const kind of Object.keys(BOSS_ART) as BossKind[]){assert.notDeepEqual(bossStyle(kind,1),bossStyle(kind,2));assert.ok(BOSS_FRAME.h>=192);}
 assert.notDeepEqual(bossStyle('twins',1),bossStyle('twins',1,true));
});
test('art poses follow actual boss state without mutating combat',()=>{
 const mind={state:'ready',timer:12,index:0,phase:1,attack:'daggers',aimX:0,aimY:0,facing:1} as const;
 for(const [frame,state]of ['ready','windup','active','recover'].entries()){const b={telegraph:0,mind:{...mind,state}} as BossRuntime,before=structuredClone(b);assert.equal(bossVisualFrame(b),frame);assert.deepEqual(b,before);}
 assert.equal(bossVisualFrame({telegraph:1}),1);assert.equal(bossVisualFrame({telegraph:0}),0);
});
test('boss poses are finite and recovery differs from ready',()=>{
 for(const kind of Object.keys(BOSS_ART) as BossKind[])for(let frame=0;frame<4;frame++){
  const rig=bossRig(kind,frame);for(const p of [rig.head,rig.chest,rig.hip,...rig.elbows,...rig.hands,...rig.knees,...rig.feet])assert.ok(p.every(Number.isFinite));
  assert.notDeepEqual(bossRig(kind,0),bossRig(kind,3));
 }
 assert.notDeepEqual(bossRig('twins',0),bossRig('twins',0,true));
});
test('absent secondary body cannot allocate or draw a phantom twin',()=>{
 drawBossSprite(new Proxy({},{get(){throw Error('Unexpected canvas call');}}) as CanvasRenderingContext2D,{behavior:'twins',x:12,y:20,w:60,h:80} as BossRuntime,true);
});
