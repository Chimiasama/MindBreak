import test from 'node:test';
import assert from 'node:assert/strict';
import { HERO_ATLAS, HERO_CLIPS, HERO_FRAME, HeroAnimator, heroPose, clipFrame, type HeroVisualInput, type HeroPose } from '../src/game/heroAnimation';
import { heroRows, HERO_PALETTES } from '../src/game/heroArtwork';
import { SWINGS } from '../src/game/combat';
const standing:HeroVisualInput={hp:100,vx:0,vy:0,grounded:true,onWall:0,hangingCeiling:false,isDashing:false,isSliding:false,isFlying:false,slashTimer:0,comboStep:0,stunTimer:0};
test('pose priority handles interruption, traversal and recovery',()=>{
 assert.equal(heroPose({...standing,hp:0,stunTimer:9}),'death');
 assert.equal(heroPose({...standing,hurtTicks:5,slashTimer:8}),'hurt');
 assert.equal(heroPose({...standing,grounded:false,onWall:1,climbHeld:true,vy:-2}),'climb');
 assert.equal(heroPose({...standing,grounded:false,hangingCeiling:true}),'hang');
 assert.equal(heroPose({...standing,grounded:false,isFlying:true}),'flight');
 assert.equal(heroPose({...standing,grounded:false,vy:-2}),'jump');
 assert.equal(heroPose({...standing,grounded:false,vy:2}),'fall');
 assert.equal(heroPose({...standing,vx:3}),'run');
});
test('clips loop or hold their final frame and attack timing follows combat',()=>{
 assert.equal(clipFrame('run',30),0);assert.equal(clipFrame('jump',100),1);
 const animator=new HeroAnimator();
 for(let comboStep=0;comboStep<3;comboStep++){
  const swing=SWINGS[comboStep],pose=`attack${comboStep+1}` as HeroPose;
  assert.equal(HERO_CLIPS[pose].durations.reduce((a,b)=>a+b,0),swing.totalTicks);
  assert.equal(animator.sample({...standing,comboStep,slashTimer:swing.totalTicks},100).frame,0);
  assert.equal(animator.sample({...standing,comboStep,slashTimer:swing.totalTicks-1},100).frame,1);
  assert.equal(animator.sample({...standing,comboStep,slashTimer:swing.totalTicks-swing.activeTicks},100).frame,2);
 }
});
test('repeated render sampling cannot advance animation without simulation ticks',()=>{
 const a=new HeroAnimator(),p={...standing,vx:3};a.sample(p,12);
 for(let i=0;i<100;i++)assert.equal(a.sample(p,12).frame,0);
 assert.equal(a.sample(p,17).frame,1);assert.equal(a.sample(standing,18).frame,0);
});
test('all hero rasters have valid palette pixels, bounded atlas slots and stable physical reference',()=>{
 const slots=new Set();
 for(const pose of Object.keys(HERO_CLIPS) as HeroPose[])for(const[i,f]of HERO_ATLAS.clips[pose].frames.entries()){
  assert.ok(f.x+f.w<=HERO_ATLAS.width&&f.y+f.h<=HERO_ATLAS.height);assert.ok(f.duration>0);
  assert.ok(!slots.has(`${f.x},${f.y}`));slots.add(`${f.x},${f.y}`);
  for(const hero of ['ren','maya','leon'] as const){const rows=heroRows(hero,pose,i);assert.equal(rows.length,32);assert.ok(rows.every(r=>r.length===24));
   assert.ok(rows.join('').replaceAll('.','').length>80);for(const pixel of rows.join(''))assert.ok(pixel==='.'||HERO_PALETTES[hero][pixel]);}
 }
 assert.equal(slots.size,HERO_ATLAS.frameCount);
 assert.equal(HERO_FRAME.hurtbox.w*HERO_FRAME.scale,32);assert.equal(HERO_FRAME.hurtbox.h*HERO_FRAME.scale,56);
 assert.notDeepEqual(heroRows('ren','run',0),heroRows('ren','run',1));
 assert.notDeepEqual(heroRows('ren','idle',0),heroRows('maya','idle',0));
});

test('engine visual clock freezes for hitstop and cut-in, then resets on load',async()=>{
 const {GameEngine}=await import('../src/game/engine');const {sound}=await import('../src/game/audio');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});
 const engine=new GameEngine({width:915,height:412,getContext:()=>({})} as unknown as HTMLCanvasElement,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
 const s:any=engine;
 try{engine.loadStage(1,'ren');engine.setPaused(false);s.hitstop=2;s.update();assert.equal(s.visualTick,0);
  s.hitstop=0;s.superCutinTimer=2;s.update();assert.equal(s.visualTick,0);
  s.superCutinTimer=0;s.update();assert.equal(s.visualTick,1);
  engine.loadStage(1,'maya');assert.equal(s.visualTick,0);
 }finally{engine.stop();sound.stopMusic();}
});
