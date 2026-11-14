import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {SUBSTAGES,getSubstage,validateCampaign} from '../src/game/campaign';
import {MONORAIL} from '../src/game/campaign/monorail';
import {gateOpened,requiredRouteNodes} from '../src/game/campaign/routeState';
import {decodeCampaignSave} from '../src/game/campaign/save';
import {sound} from '../src/game/audio';
import {prepareForwardTravel} from './support/flow';
Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});afterEach(()=>sound.stopMusic());
function fixture(hero:'ren'|'maya'|'leon'='ren'){
 const e=new GameEngine({width:915,height:412,getContext:()=>({})}as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});e.startCampaign(4,hero);e.setPaused(false);return{e,s:e as any};
}
test('all exploratory sectors are broad connected complexes; the train is unchanged and chapters stay isolated',()=>{
 for(const a of SUBSTAGES){if(a.id===2){assert.deepEqual(a,MONORAIL.find(m=>m.substageId===a.substageId));continue;}
  const c=a.exploration!.complex!;assert.ok(a.boundsWidth>=7500);assert.equal(c.rooms.length,3);assert.equal(c.shafts.length,4);assert.equal(requiredRouteNodes(a).length,6);
  assert.equal(a.exploration!.nodes.filter(n=>n.optional).length,3);assert.ok(a.exits.every(e=>getSubstage(e.target).id===a.id));
  assert.ok(c.rooms.every(r=>[300,600].every(level=>a.platforms.some(p=>p.x===r.x&&p.y===c.floor-level&&p.w===r.w))));
 }
 assert.ok(SUBSTAGES.filter(a=>a.id===4).every(a=>a.boundsWidth>=9700));assert.deepEqual(validateCampaign(),[]);
});
test('partial signals open their own gate while final exit and hero branches stay locked',()=>{
 const{e,s}=fixture();const[first,back]=s.stage.exploration.nodes;
 s.enemies=s.enemies.filter((x:any)=>!x.requiredGuard);Object.assign(s.player,{x:first.x,y:first.y});e.inspectRouteNode(first.id);
 assert.equal(s.platforms.some((p:any)=>p.gateId&&p.broken),false);
 Object.assign(s.player,{x:back.x,y:back.y});e.inspectRouteNode(back.id);
 assert.equal(s.platforms.find((p:any)=>p.gateId==='linha').broken,true);assert.equal(s.routeComplete(),false);
 for(const id of ['rota','complexo','brecha','atalho-voo','atalho-cinetico'])assert.equal(gateOpened(s.stage,id,s.activated),false);
 e.stop();
});
for(const [nodeId,owner]of [['trava-ren','ren'],['nucleo-maya','maya'],['brecha-leon','leon']]as const){
 test(`${nodeId} requires its hero but never blocks mandatory completion`,()=>{
  const{e,s}=fixture(owner==='ren'?'maya':'ren'),n=s.stage.exploration.nodes.find((n:any)=>n.id===nodeId);Object.assign(s.player,{x:n.x,y:n.y});e.inspectRouteNode(n.id,nodeId==='brecha-leon'?'smash':'interact');assert.equal(s.activated.has(n.id),false);
  e.switchCharacter(owner);e.inspectRouteNode(n.id,nodeId==='brecha-leon'?'smash':'interact');assert.equal(s.activated.has(n.id),true);prepareForwardTravel(e,s);assert.equal(s.routeComplete(),true);
  const save=e.captureCampaignSave()!;assert.equal(decodeCampaignSave(JSON.stringify(save)).status,'ready');e.restoreCampaignSave(save);assert.equal(s.activated.has(n.id),true);e.stop();
 });
}
test('Leon breaks an actual sealed wall by melee; up and other heroes cannot break it',()=>{
 const{e,s}=fixture('ren'),wall=s.platforms.find((p:any)=>p.breakNode),n=s.stage.exploration.nodes.find((n:any)=>n.id===wall.breakNode);
 Object.assign(s.player,{x:wall.x-40,y:wall.y+wall.h-56,grounded:true,facing:1});e.inspectRouteNode(n.id);assert.equal(wall.broken,false);
 e.triggerAttack();assert.equal(wall.broken,false);e.switchCharacter('leon');s.resetAttack();e.inspectRouteNode(n.id);assert.equal(wall.broken,false);
 e.triggerAttack();assert.equal(wall.broken,true);assert.equal(s.activated.has(n.id),true);
 e.stop();
});
test('optional wall and shortcut progress cannot be forged independently in the save',()=>{
 const{e,s}=fixture();const save=e.captureCampaignSave()!,i=s.stage.platforms.findIndex((p:any)=>p.breakNode);save.areas[0].platforms[i].broken=true;assert.equal(decodeCampaignSave(JSON.stringify(save)).status,'corrupt');e.stop();
});
test('validator rejects required objectives depending on hero-only branches and gates with no signal',()=>{
 const areas=structuredClone(SUBSTAGES);areas[0].exploration!.nodes[0].requires=['trava-ren'];assert.ok(validateCampaign(areas).some(e=>e.includes('habilidade opcional')));
 areas[0].exploration!.gates![0].requires=['missing'];assert.ok(validateCampaign(areas).some(e=>e.includes('sinal de portão')));
});

test('runtime refuses a portal to another main chapter even if a malformed exit is injected',()=>{
 const{e,s}=fixture();prepareForwardTravel(e,s);const exit=s.stage.exits[0];s.stage={...s.stage,exits:[{...exit,target:'2A',targetCheckpoint:'entrada'}]};Object.assign(s.player,{x:exit.x,y:exit.y});assert.equal(e.travel(exit.id),false);assert.equal(s.stage.substageId,'4A');e.stop();
});
