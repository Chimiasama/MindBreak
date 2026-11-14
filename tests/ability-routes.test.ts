import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {overlaps} from '../src/game/collision';
import {sound} from '../src/game/audio';
import {navigate} from './support/complex-navigation';
import {navigate as local} from './support/navigation';
Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval,clearInterval}});afterEach(()=>sound.stopMusic());
function fixture(hero:'ren'|'maya'|'leon'){
 const e=new GameEngine({width:915,height:412,getContext:()=>({})}as any,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});e.startCampaign(4,hero);e.setPaused(false);const s:any=e;
 s.enemies=[];s.spawns.update=()=>[];s.updateEnemies=()=>{};s.boss.active=false;s.ambushArenas=[];s.platforms=s.platforms.filter((p:any)=>p.type!=='moving');
 return{e,s,f:s.stage.exploration.complex.floor,scale:s.stage.exploration.complex.width/6000};
}
test('Ren reaches the kinetic latch by actual wall climbing, then crosses the precision duct with an air dash',t=>{
 const{e,s,f,scale}=fixture('ren');t.after(()=>e.stop());navigate(e,s,{x:1400*scale,y:f-656,w:100,h:56});let failed=false;s.damagePlayer=()=>{failed=true;return false;};s.recoverPlayer=()=>{failed=true;};
 const n=s.stage.exploration.nodes.find((n:any)=>n.id==='trava-ren');e.queueAction('jump');let climbing=0;
 for(let i=0;i<550&&!overlaps(s.player,n);i++){e.setKey('right',s.player.x<n.x-5);e.setKey('up',true);s.update();if(s.player.onWall)climbing++;}
 e.clearInput();for(let i=0;i<90&&!s.player.grounded;i++)s.update();assert.ok(overlaps(s.player,n));assert.ok(climbing>20);assert.equal(e.inspectRouteNode(n.id),true);assert.equal(s.activated.has(n.id),true);
 e.queueAction('jump');e.setKey('right',true);for(let i=0;i<250&&s.player.x<2080*scale;i++)s.update();e.clearInput();assert.ok(s.player.x>=2080*scale-10);
 e.setKey('right',true);e.queueAction('jump');for(let i=0;i<110;i++){if(i===8)e.triggerDashOrSlide();if(i===22)e.queueAction('jump');if(i>45&&s.player.grounded&&s.player.x<2530*scale)e.queueAction('jump');s.update();}
 e.clearInput();const chest=s.props.find((p:any)=>Math.abs(p.x-3850*scale)<1&&p.y===f-984);local(e,s,chest);e.triggerAttack();assert.equal(chest.broken,true);assert.equal(failed,false);assert.equal(s.routeComplete(),false);
});
test('Maya flies through the open shaft to the suspended island with a finite energy budget',t=>{
 const{e,s,f,scale}=fixture('maya');t.after(()=>e.stop());navigate(e,s,{x:1400*scale,y:f-356,w:80,h:56});
 local(e,s,{x:2100*scale+10,y:f-456,w:80,h:56});local(e,s,{x:2380*scale,y:f-556,w:50,h:56});local(e,s,{x:2190*scale,y:f-656,w:80,h:56});
 s.player.psyEnergy=s.player.maxPsy;const energy=s.player.psyEnergy;let failed=false,flight=0;s.damagePlayer=()=>{failed=true;return false;};s.recoverPlayer=()=>{failed=true;};
 const tick=()=>{s.update();if(s.player.isFlying)flight++;};e.queueAction('jump');e.setKey('jumpHeld',true);e.setKey('up',true);
 for(let i=0;i<200&&s.player.y+s.player.h>f-1340;i++)tick();e.setKey('up',false);e.setKey('right',true);
 const n=s.stage.exploration.nodes.find((n:any)=>n.id==='nucleo-maya');for(let i=0;i<80&&s.player.x<n.x;i++)tick();e.clearInput();for(let i=0;i<100&&!s.player.grounded;i++)tick();
 assert.ok(overlaps(s.player,n),`${s.player.x},${s.player.y}`);assert.ok(flight>100);assert.ok(s.player.psyEnergy>0&&s.player.psyEnergy<energy);e.inspectRouteNode(n.id);assert.equal(s.activated.has(n.id),true);assert.equal(failed,false);assert.equal(s.routeComplete(),false);
});
test('Leon enters and leaves the sealed resource bay through his melee breach',t=>{
 const{e,s}=fixture('leon');t.after(()=>e.stop());const n=s.stage.exploration.nodes.find((n:any)=>n.id==='brecha-leon');navigate(e,s,n);const wall=s.platforms.find((p:any)=>p.breakNode===n.id);e.setKey('right',true);s.update();e.clearInput();e.triggerAttack();assert.equal(wall.broken,true);
 const c=s.props.find((p:any)=>p.x>wall.x&&p.x<wall.x+400&&p.y===n.y);local(e,s,c);for(let i=0;i<20;i++){s.hitstop=0;s.update();}e.triggerAttack();assert.equal(c.broken,true);local(e,s,n);assert.equal(s.routeComplete(),false);
});
