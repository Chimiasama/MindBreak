import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine';
import { SUBSTAGES, validateCampaign } from '../src/game/campaign';
import { decodeCampaignSave } from '../src/game/campaign/save';
import { SpawnManager } from '../src/game/spawns';
import { sound } from '../src/game/audio';
import { prepareForwardTravel } from './support/flow';
Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});
afterEach(()=>sound.stopMusic());
function fixture() {
 let hud:any;
 const engine=new GameEngine({width:915,height:412,getContext:()=>({})} as any,{onHudUpdate(value){hud=value;},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
 engine.startCampaign(1,'ren');engine.setPaused(false);return{engine,s:engine as any,hud:()=>hud};
}
test('23 exploratory sectors require an elevated wing and a return; monorail is the explicit exception',()=>{
 assert.equal(SUBSTAGES.filter(a=>a.exploration).length,23);
 for(const area of SUBSTAGES){
  if(area.id===2){assert.equal(area.exploration,undefined);continue;}
  const [first,back]=area.exploration!.nodes;
  assert.ok(first.x-back.x>150);assert.deepEqual(back.requires,[first.id]);
  assert.ok(first.y+first.h<area.checkpoints[0].y+56-100);
  assert.equal(area.enemies[first.guardIndex!].requiredGuard,true);
 }
 assert.deepEqual(validateCampaign(),[]);
});
test('walking right cannot complete an exploratory sector or activate a control',()=>{
 const {engine,s}=fixture();s.enemies=[];s.spawns.update=()=>[];s.updateEnemies=()=>{};engine.setKey('right',true);
 for(let t=0;t<700&&!s.paused;t++)s.update();
 assert.equal(s.stage.substageId,'1A');assert.equal(s.activated.size,0);assert.equal(s.stageClearTriggered,false);engine.stop();
});
test('the exit remains locked even if Maya flies over the physical barrier',()=>{
 const{engine,s}=fixture();engine.switchCharacter('maya');const door=s.stage.exits[0];
 Object.assign(s.player,{x:door.x,y:door.y+door.h-56,isFlying:true});assert.equal(engine.travel(door.id),false);
 assert.equal(s.stage.substageId,'1A');engine.stop();
});
test('remote commands, missing signal and a living guard prevent activation; combat then up activates it',()=>{
 const{engine,s,hud}=fixture();const[first,back]=s.stage.exploration.nodes;
 assert.equal(engine.inspectRouteNode(first.id),false);
 Object.assign(s.player,{x:back.x,y:back.y});engine.inspectRouteNode(back.id);assert.equal(s.activated.size,0);
 Object.assign(s.player,{x:first.x,y:first.y});engine.inspectRouteNode(first.id);assert.equal(s.activated.size,0);
 const guard=s.enemies.find((e:any)=>e.spawnId===`1A:${first.guardIndex+1}`);s.hitEnemy(guard,999,0,0);
 engine.queueAction('interact');s.hitstop=0;s.update();assert.equal(s.activated.has(first.id),true);
 assert.match(hud().routeObjective,/←/);assert.ok(s.platforms.filter((p:any)=>p.gateId).every((p:any)=>!p.broken));
 Object.assign(s.player,{x:back.x,y:back.y});engine.queueAction('interact');s.hitstop=0;s.update();
 assert.equal(s.activated.size,2);assert.ok(s.platforms.filter((p:any)=>p.gateId).every((p:any)=>p.broken));engine.stop();
});
test('activating a panel twice grants no extra rewards and checkpoints do not relock the route',()=>{
 const{engine,s}=fixture();prepareForwardTravel(engine,s);const score=s.player.score;
 const node=s.stage.exploration.nodes[0];Object.assign(s.player,{x:node.x,y:node.y});engine.inspectRouteNode(node.id);
 assert.equal(s.player.score,score);s.respawnAtCheckpoint();assert.equal(s.activated.size,2);engine.stop();
});
test('route and opened gates survive travel, return and a fresh engine restore',()=>{
 const{engine,s}=fixture();prepareForwardTravel(engine,s);const exit=s.stage.exits[0];Object.assign(s.player,{x:exit.x,y:exit.y});assert.equal(engine.travel(exit.id),true);
 const back=s.stage.exits.find((e:any)=>e.target==='1A');Object.assign(s.player,{x:back.x,y:back.y});assert.equal(engine.travel(back.id),true);assert.equal(s.activated.size,2);
 const save=engine.captureCampaignSave()!;const fresh=fixture();fresh.engine.restoreCampaignSave(save);
 assert.equal(fresh.s.activated.size,2);assert.ok(fresh.s.platforms.filter((p:any)=>p.gateId).every((p:any)=>p.broken));
 engine.stop();fresh.engine.stop();
});
test('the boss does not trigger before exploration even when the squad has been cleared',()=>{
 const{engine,s}=fixture();s.initializeArea(SUBSTAGES.find(a=>a.substageId==='1D'),'ren');engine.setPaused(false);
 s.enemies=[];s.spawns.update=()=>[];s.updateEnemies=()=>{};s.ambushArenas.forEach((a:any)=>{a.cleared=true;a.active=false;});
 Object.assign(s.player,{x:s.boss.x-200,y:s.stage.spawnY});s.update();assert.equal(s.boss.triggered,false);
 prepareForwardTravel(engine,s);s.hitstop=0;s.update();assert.equal(s.boss.triggered,true);engine.stop();
});
test('mandatory room guards never refill during exploration respawn',()=>{
 const stage=SUBSTAGES[0],manager=new SpawnManager(stage,stage.substageId),alive=manager.initial();
 const guard=alive.find(e=>e.requiredGuard)!;guard.hp=0;manager.noteMissing(alive,1);manager.advanceAway(10000);
 const spawned=manager.update({x:100,y:604,w:32,h:56},null,10000,alive.filter(e=>e.hp>0),[],true);
 assert.equal(spawned.some(e=>e.requiredGuard),false);
});
test('save validation rejects invented commands, broken dependencies, live guards and forged open gates',()=>{
 const{engine,s}=fixture();const base=engine.captureCampaignSave()!;
 for(const activated of [['inventado'],['comando'],['rele'],['rele','rele']]){
  const save=structuredClone(base);save.areas[0].activated=activated;assert.equal(decodeCampaignSave(JSON.stringify(save)).status,'corrupt');
 }
 const save=structuredClone(base),gate=s.stage.platforms.findIndex((p:any)=>p.gateId);save.areas[0].platforms[gate].broken=true;
 assert.equal(decodeCampaignSave(JSON.stringify(save)).status,'corrupt');engine.stop();
});
test('authoring validator rejects floating controls and dependency cycles',()=>{
 const areas=structuredClone(SUBSTAGES);areas[0].exploration!.nodes[0].y-=1;
 assert.ok(validateCampaign(areas).some(e=>e.includes('apoio seguro')));
 areas[0].exploration!.nodes[0].requires=['comando'];assert.ok(validateCampaign(areas).some(e=>e.includes('ciclo')));
});
