import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {sound} from '../src/game/audio';
import type {CharacterId} from '../src/game/types';

Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});
afterEach(()=>sound.stopMusic());
function room(hero:CharacterId='maya'){
 const engine=new GameEngine({width:915,height:412,getContext:()=>({})}as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
 engine.loadStage(1,hero);engine.setPaused(false);const s:any=engine;
 s.stage={...s.stage,boundsWidth:10000,boundsBottom:3000,windForce:0};s.platforms=[{x:0,y:1000,w:10000,h:500,type:'solid'}];
 s.enemies=[];s.spawns.update=()=>[];s.ceilingPipes=[];s.ambushArenas=[];s.boss.active=false;
 Object.assign(s.player,{x:500,y:944,vx:0,vy:0,grounded:true,psyEnergy:100,invulnTimer:10000});
 return{engine,s,tick:(count=1)=>{for(let i=0;i<count;i++)s.update();}};
}

for(const source of ['keyboard','touch','gamepad'] as const)test(`Maya: one held ${source} press remains a complete ballistic jump without flight or energy drain`,t=>{
 const{engine,s,tick}=room();t.after(()=>engine.stop());
 engine.setKey('jumpHeld',true,source);engine.queueAction('jump',source);engine.setKey('up',true,source);
 let height=0,flight=0,steps=0;
 do{tick();height=Math.max(height,944-s.player.y);if(s.player.isFlying)flight++;steps++;}while(!s.player.grounded&&steps<100);
 assert.equal(flight,0);assert.equal(steps,38);assert.ok(Math.abs(height-112.1)<.001);assert.equal(s.player.psyEnergy,100);
 tick(10);assert.equal(s.player.isFlying,false);assert.equal(s.player.grounded,true);
});

test('Maya: releasing and pressing again in the air enables held flight; release cancels it',t=>{
 const{engine,s,tick}=room();t.after(()=>engine.stop());engine.queueAction('jump');tick(8);
 assert.equal(s.player.isFlying,false);engine.setKey('jumpHeld',false);tick();engine.queueAction('jump');engine.setKey('up',true);tick(12);
 assert.equal(s.player.isFlying,true);assert.ok(s.player.vy<0);assert.ok(s.player.psyEnergy<100);
 const energy=s.player.psyEnergy;engine.setKey('jumpHeld',false);tick();assert.equal(s.player.isFlying,false);assert.ok(s.player.psyEnergy>=energy);
 // Merely restoring the held state is not another action.
 engine.setKey('jumpHeld',true);tick(3);assert.equal(s.player.isFlying,false);
});

test('Maya: a quick second tap preserves the existing aerial jump without engaging flight',t=>{
 const{engine,s,tick}=room();t.after(()=>engine.stop());engine.queueAction('jump');tick(10);engine.setKey('jumpHeld',false);
 engine.queueAction('jump');engine.setKey('jumpHeld',false);tick();assert.equal(s.player.doubleJump,false);assert.ok(s.player.vy<-8);assert.equal(s.player.isFlying,false);assert.equal(s.player.psyEnergy,100);
});

test('Maya: landing and exhaustion require a fresh aerial press rather than automatic flight on the next fall',t=>{
 const{engine,s,tick}=room();t.after(()=>engine.stop());engine.queueAction('jump');tick(8);engine.setKey('jumpHeld',false);engine.queueAction('jump');tick();assert.equal(s.player.isFlying,true);
 s.player.psyEnergy=.61;tick(2);assert.equal(s.player.isFlying,false);tick(15);assert.equal(s.player.isFlying,false);
 engine.setKey('jumpHeld',false);engine.queueAction('jump');tick();assert.equal(s.player.isFlying,true);
 engine.setKey('down',true);for(let i=0;i<200&&!s.player.grounded;i++)tick();assert.equal(s.player.grounded,true);assert.equal(s.player.isFlying,false);
 s.platforms=[];tick(5);assert.equal(s.player.isFlying,false);
});

test('Maya: pause, damage, load and test switching clear the flight request',t=>{
 const{engine,s,tick}=room();t.after(()=>engine.stop());
 const fly=()=>{engine.clearInput();Object.assign(s.player,{grounded:false,onWall:0,y:600,psyEnergy:100,stunTimer:0,invulnTimer:0});engine.queueAction('jump');tick();assert.equal(s.player.isFlying,true);};
 fly();engine.setPaused(true);assert.equal(s.player.isFlying,false);engine.setPaused(false);engine.setKey('jumpHeld',true);tick();assert.equal(s.player.isFlying,false);
 fly();s.damagePlayer(5,0);assert.equal(s.player.isFlying,false);tick();assert.equal(s.player.isFlying,false);
 fly();engine.switchCharacter('ren');engine.switchCharacter('maya');tick();assert.equal(s.player.isFlying,false);
 fly();engine.loadStage(1,'maya');assert.equal(s.player.isFlying,false);
});

test('Maya: gamepad polling needs a release and a new button edge, then stops on release',t=>{
 const original=Object.getOwnPropertyDescriptor(navigator,'getGamepads'),buttons=Array.from({length:16},()=>({pressed:false}));
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,axes:[0,0],buttons}]});
 t.after(()=>{if(original)Object.defineProperty(navigator,'getGamepads',original);else delete(navigator as any).getGamepads;});
 const{engine,s}=room();t.after(()=>engine.stop());const tick=()=>{s.pollGamepad();s.update();};
 buttons[0].pressed=true;for(let i=0;i<8;i++)tick();assert.equal(s.player.isFlying,false);
 buttons[0].pressed=false;tick();buttons[0].pressed=true;tick();assert.equal(s.player.isFlying,true);
 buttons[0].pressed=false;tick();assert.equal(s.player.isFlying,false);
});

for(const hero of ['ren','leon'] as const)test(`${hero} keeps an ordinary double jump even when the second press is held`,t=>{
 const{engine,s,tick}=room(hero);t.after(()=>engine.stop());engine.queueAction('jump');tick(8);engine.setKey('jumpHeld',false);engine.queueAction('jump');tick(8);
 assert.equal(s.player.isFlying,false);assert.equal(s.player.doubleJump,false);assert.equal(s.player.psyEnergy,100);
});
