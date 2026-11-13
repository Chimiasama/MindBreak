import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_ART,bossRows,bossPalette,bossVisualFrame,drawBossSprite,type BossKind} from '../src/game/bossArtwork';
import type {BossRuntime} from '../src/game/types';
test('eight bosses have distinct monochrome silhouettes and phase-two artwork',()=>{
 const masks=new Set();for(const kind of Object.keys(BOSS_ART) as BossKind[]){const rows=bossRows(kind,1);const mask=rows.join('').replace(/[^.]/g,'#');assert.ok(!masks.has(mask),kind);masks.add(mask);assert.notDeepEqual(rows,bossRows(kind,2),kind);}assert.equal(masks.size,8);
});
test('all boss phases and twin poses stay bounded and use declared palette',()=>{
 for(const kind of Object.keys(BOSS_ART) as BossKind[])for(const phase of [1,2] as const)for(const twin of kind==='twins'?[false,true]:[false])for(let frame=0;frame<4;frame++){
  const rows=bossRows(kind,phase,frame,twin),palette=bossPalette(kind,phase,twin);assert.equal(rows.length,64);assert.ok(rows.every(r=>r.length===48));assert.ok(rows.join('').replaceAll('.','').length>400,kind);for(const ch of rows.join(''))assert.ok(ch==='.'||palette[ch]);
 }
 assert.notDeepEqual(bossRows('twins',1,0,false),bossRows('twins',1,0,true));
});
test('art poses follow the actual boss state rather than advancing combat from render',()=>{
 const mind={state:'ready',timer:12,index:0,phase:1,attack:'daggers',aimX:0,aimY:0,facing:1} as const;
 for(const [frame,state]of ['ready','windup','active','recover'].entries()){const b={telegraph:0,mind:{...mind,state}} as BossRuntime;const before=structuredClone(b);assert.equal(bossVisualFrame(b),frame);assert.deepEqual(b,before);}
 assert.equal(bossVisualFrame({telegraph:1}),1);assert.equal(bossVisualFrame({telegraph:0}),0);
});
test('attack and recovery poses differ and cosmic transformation redraws the body',()=>{
 for(const kind of Object.keys(BOSS_ART) as BossKind[]){assert.notDeepEqual(bossRows(kind,1,0),bossRows(kind,1,2),kind);assert.notDeepEqual(bossRows(kind,1,0),bossRows(kind,1,3),kind);}
 assert.notDeepEqual(bossRows('oswald',1),bossRows('oswald',2));
});
test('absent secondary body cannot allocate or draw a phantom twin',()=>{
 const boss={behavior:'twins',x:12,y:20,w:60,h:80} as BossRuntime;
 drawBossSprite(new Proxy({},{get(){throw Error('Unexpected canvas call');}}) as CanvasRenderingContext2D,boss,true);
});
