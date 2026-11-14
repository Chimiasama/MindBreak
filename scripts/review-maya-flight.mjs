// Manual browser check using the application's real touch and keyboard handlers.
import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true,isMobile:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PREVIEW_URL??'http://localhost:3000');
 await page.getByRole('button',{name:/^Maya/}).waitFor();
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/game/engine.ts')?.name;
  if(!url)throw Error('Engine module missing');const{GameEngine}=await import(url),start=GameEngine.prototype.start;
  GameEngine.prototype.start=function(){window.reviewEngine=this;return start.call(this);};
 });
 await page.getByRole('button',{name:/^Maya/}).tap();await page.getByRole('button',{name:'Iniciar Fase 1',exact:true}).tap();
 for(let i=0;i<12;i++){
  const next=page.getByRole('button',{name:/^(Continuar|Avançar)$/});if(!await next.count())break;await next.tap();
 }
 const jump=page.getByRole('button',{name:'Pular, Wall-Kick, Vault ou Voar (Maya)',exact:true});await jump.waitFor();
 await page.evaluate(()=>{
  const e=window.reviewEngine;e.stop();e.setPaused(false);e.enemies=[];e.spawns.update=()=>[];e.ambushArenas=[];e.boss.active=false;e.ceilingPipes=[];
  e.stage={...e.stage,boundsWidth:10000,boundsTop:-1000,boundsBottom:3000,windForce:0};
  e.platforms=[{x:0,y:600,w:10000,h:500,type:'solid'}];
  window.resetReview=()=>{e.clearInput();Object.assign(e.player,{x:1000,y:544,grounded:true,onWall:0,vx:0,vy:0,psyEnergy:100,stunTimer:0,invulnTimer:10000});e.resize(915,412);};window.resetReview();
 });
 const cdp=await page.context().newCDPSession(page),box=await jump.boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};
 const touch=async held=>cdp.send('Input.dispatchTouchEvent',{type:held?'touchStart':'touchEnd',touchPoints:held?[{...point,id:1}]:[]});
 const step=async count=>page.evaluate(count=>{const e=window.reviewEngine;let flight=0;for(let i=0;i<count;i++){e.update();flight+=Number(e.player.isFlying);}e.draw();return{flight,energy:e.player.psyEnergy,grounded:e.player.grounded,vy:e.player.vy,held:e.keys.jumpHeld};},count);
 await touch(true);const first=await step(70);await touch(false);
 if(first.flight||first.energy!==100||!first.grounded)throw Error('First held touch did not remain a normal jump');
 await page.evaluate(()=>window.resetReview());await touch(true);const launch=await step(8);await touch(false);await step(1);await touch(true);const second=await step(12);
 if(launch.flight||second.flight!==12||second.energy>=100||!second.held)throw Error('Second touch hold failed to activate flight');
 await touch(false);const released=await step(1);if(released.flight||released.held)throw Error('Touch release did not stop flight');
 await page.evaluate(()=>window.resetReview());await page.keyboard.down('Space');const keyboardFirst=await step(8);await page.keyboard.up('Space');await step(1);await page.keyboard.down('Space');const keyboardSecond=await step(8);await page.keyboard.up('Space');const keyboardReleased=await step(1);
 if(keyboardFirst.flight||keyboardSecond.flight!==8||keyboardReleased.flight)throw Error('Keyboard jump/flight sequence failed');
 await page.evaluate(async()=>{
  const e=window.reviewEngine;e.loadStage(1,'leon');e.stop();e.setPaused(false);
  const url=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/game/heroArtwork.ts')?.name;
  const art=await import(url);if(!await art.prepareHeroArtwork('leon'))throw Error('Leon painting did not load');
  e.enemies=[];e.spawns.update=()=>[];e.ambushArenas=[];e.boss.active=false;e.ceilingPipes=[];e.stage={...e.stage,boundsWidth:10000,boundsTop:-1000,boundsBottom:2000,windForce:0};e.platforms=[{x:0,y:600,w:10000,h:500,type:'solid'}];
  window.resetReview();e.draw();
 });
 mkdirSync('docs/arte/leon',{recursive:true});await page.screenshot({path:'docs/arte/leon/jogo.png'});
 if(errors.length)throw Error(errors.join('\n'));
 const result={viewport:[915,412],realTouchEvents:true,first,launch,second,released,keyboardFirst,keyboardSecond,keyboardReleased,errors};
 writeFileSync('docs/arte/validacao-voo-maya.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
