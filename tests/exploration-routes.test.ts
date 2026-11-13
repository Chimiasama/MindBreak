import { prepareForwardTravel } from './support/flow';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine';
import { SUBSTAGES, getSubstage } from '../src/game/campaign';
import { sound } from '../src/game/audio';
import { navigate } from './support/navigation';
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());
for (const hero of ['ren', 'maya', 'leon'] as const) for (const chapter of [1,3,4,5,6,7,8]) {
 for (const letter of (chapter === 1 || chapter === 8 ? ['A','B','C','D'] : ['A','B','C'])) {
  const id = `${chapter}${letter}` as any;
  test(`${hero} explores both wings and the upper exit of ${id} without flight, damage or teleport`, (t) => {
   const engine = new GameEngine({width:915,height:412,getContext:()=>({})} as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
   t.after(()=>engine.stop());
   const s:any=engine; engine.startCampaign(chapter,hero); s.initializeArea(getSubstage(id),hero); engine.setPaused(false);
   s.enemies=[]; s.spawns.update=()=>[];s.updateEnemies=()=>{};s.ambushArenas=[];s.boss.active=false;s.pickups=[];
   // Combat has separate acceptance. Remove moving helpers: mandatory traversal cannot depend on them.
   s.platforms=s.platforms.filter((p:any)=>p.type!=='moving');
   let jumps=0, left=0;
   for(const node of s.stage.exploration.nodes) { const result=navigate(engine,s,node); jumps+=result.jumps;left+=result.left; assert.equal(engine.inspectRouteNode(node.id),true); }
   assert.ok(jumps>0);assert.ok(left>150,'exploration requires returning toward the other wing');
   const door=s.stage.exits.find((e:any)=>e.x>s.stage.boundsWidth/2);
   if(door) { navigate(engine,s,door);assert.equal(engine.travel(door.id),true); }
   else { navigate(engine,s,{x:s.stage.goalX-180,y:s.stage.checkpoints[0].y,w:120,h:56}); }
   engine.stop();
  });
 }
}

// Returning from a checkpoint is a separate acceptance path, not a rightward corridor bot.
for (const hero of ['ren','maya','leon'] as const) for (const area of SUBSTAGES.filter(a=>a.exploration)) {
 test(`${hero} returns from the last checkpoint of ${area.substageId} without flight, hazards or teleport`,(t)=>{
  const engine=new GameEngine({width:915,height:412,getContext:()=>({})} as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
  t.after(()=>engine.stop());const s:any=engine;s.initializeArea(area,hero);s.campaignMode=true;engine.setPaused(false);
  prepareForwardTravel(engine,s);s.checkpointId=area.checkpoints.at(-1)!.id;
  engine.restoreCampaignSave(engine.captureCampaignSave()!);engine.setPaused(false);
  s.enemies=[];s.updateEnemies=()=>{};s.spawns.update=()=>[];s.ambushArenas=[];s.boss.active=false;s.pickups=[];
  s.platforms=s.platforms.filter((p:any)=>p.type!=='moving');
  const door=area.exits.find(e=>e.x<100);
  const result=navigate(engine,s,door??{x:area.spawnX,y:area.spawnY,w:32,h:56});
  assert.ok(result.left>150);
  if(door)assert.equal(engine.travel(door.id),true);
 });
}

for (const hero of ['ren','maya','leon'] as const) for (const id of ['1A','3A','4A','5A','7A','8A'] as const) {
 test(`${hero} reaches the optional lateral cache in ${id} without unlocking the main route`,(t)=>{
  const area=getSubstage(id),engine=new GameEngine({width:915,height:412,getContext:()=>({})}as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
  t.after(()=>engine.stop());const s:any=engine;s.initializeArea(area,hero);engine.setPaused(false);
  s.enemies=[];s.updateEnemies=()=>{};s.spawns.update=()=>[];s.ambushArenas=[];s.boss.active=false;s.pickups=[];s.platforms=s.platforms.filter((p:any)=>p.type!=='moving');
  const chest=s.props.find((p:any)=>p.kind==='chest');const result=navigate(engine,s,chest);assert.ok(result.jumps>=2);
  s.player.facing=s.player.x+s.player.w/2<chest.x+chest.w/2?1:-1;
  engine.triggerAttack();if(!chest.broken){for(let i=0;i<12;i++){s.hitstop=0;s.update();}engine.triggerAttack();}
  assert.equal(chest.broken,true);assert.equal(s.activated.size,0);
 });
}
