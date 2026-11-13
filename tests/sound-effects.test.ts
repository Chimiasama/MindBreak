import test,{afterEach}from'node:test';import assert from'node:assert/strict';
import{GameEngine}from'../src/game/engine';import{sound}from'../src/game/audio';import{SOUND_CUES,SoundCue}from'../src/game/soundEffects';
Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});afterEach(()=>sound.stopMusic());
function fixture(){const engine=new GameEngine({width:915,height:412,getContext:()=>({})}as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});engine.loadStage(1,'ren');engine.setPaused(false);const s:any=engine;s.enemies=[];s.updateEnemies=()=>{};s.spawns.update=()=>[];s.props=[];s.pickups=[];s.ceilingPipes=[];s.ambushArenas=[];s.boss.active=false;s.platforms=[{x:0,y:600,w:5000,h:500,type:'solid'}];Object.assign(s.player,{x:500,y:544,vx:0,vy:0,grounded:true});return{engine,s};}
test('all cues have finite bounded envelopes and delays, without timers or external samples',()=>{
 for(const cue of Object.values(SOUND_CUES)){assert.ok(cue.events.length<=4);assert.ok(cue.cooldown>=0);for(const e of cue.events){assert.ok(e.delay>=0&&e.delay<1);assert.ok(e.duration>0&&e.duration<1);assert.ok(e.volume>0&&e.volume<=0.2);assert.ok(e.noise||e.frequency!>0);}}
});
test('footsteps follow ground distance, stop when idle and a jump produces one landing cue',t=>{
 const{engine,s}=fixture();t.after(()=>engine.stop());const cues:SoundCue[]=[];t.mock.method(sound,'playCue',(cue:SoundCue)=>{cues.push(cue);return true;});
 engine.setKey('right',true);for(let i=0;i<45;i++)s.update();assert.ok(cues.filter(c=>c==='footstep').length>=2);
 engine.setKey('right',false);for(let i=0;i<8;i++)s.update();const before=cues.filter(c=>c==='footstep').length;for(let i=0;i<20;i++)s.update();assert.equal(cues.filter(c=>c==='footstep').length,before);
 engine.queueAction('jump');engine.setKey('jumpHeld',false);for(let i=0;i<80;i++)s.update();assert.equal(cues.filter(c=>c==='land').length,1);assert.equal(cues.filter(c=>c==='footstep').length,before);
});
test('panel guard denial, first activation and final unlock produce different cues',t=>{
 const{engine,s}=fixture();engine.startCampaign(1,'ren');engine.setPaused(false);t.after(()=>engine.stop());const cues:SoundCue[]=[];t.mock.method(sound,'playCue',(cue:SoundCue)=>{cues.push(cue);return true;});
 const[a,b]=s.stage.exploration.nodes;Object.assign(s.player,{x:a.x,y:a.y});engine.inspectRouteNode(a.id);assert.equal(cues.at(-1),'denied');
 const guard=s.enemies.find((e:any)=>e.requiredGuard);s.hitEnemy(guard,999,0,0);engine.inspectRouteNode(a.id);assert.equal(cues.at(-1),'panel');
 Object.assign(s.player,{x:b.x,y:b.y});engine.inspectRouteNode(b.id);assert.equal(cues.at(-1),'unlock');engine.inspectRouteNode(b.id);assert.equal(cues.at(-1),'confirm');
});
