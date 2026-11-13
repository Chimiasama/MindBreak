// Run manually with Vite serving the repository; Playwright and Chromium required.
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try {
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('/tools/art-studio.html',process.env.PREVIEW_URL ?? 'http://localhost:3000').href);
 await page.waitForFunction(()=>window.artStudio);mkdirSync('docs/arte',{recursive:true});
 for(const hero of ['ren','maya','leon']){
  await page.selectOption('#hero',hero);
  const data=await page.evaluate(hero=>({atlas:window.artStudio.getHeroAtlas(hero).toDataURL(),sheet:document.querySelector('#sheet').toDataURL(),metadata:{hero,...window.artStudio.metadata}}),hero);
  for(const kind of ['atlas','sheet'])writeFileSync(`docs/arte/${hero}-${kind}.png`,Buffer.from(data[kind].split(',')[1],'base64'));
  writeFileSync(`docs/arte/${hero}-atlas.json`,JSON.stringify(data.metadata,null,2)+'\n');
  console.log(`${hero}: ${data.metadata.frameCount} frames; ${data.metadata.width} × ${data.metadata.height}`);
 }
 const enemies=await page.evaluate(()=>({sheet:document.querySelector('#enemies').toDataURL(),frame:window.artStudio.ENEMY_FRAME,types:Object.keys(window.artStudio.ENEMY_ART),rects:Object.fromEntries(Object.keys(window.artStudio.ENEMY_ART).map(type=>[type,window.artStudio.enemySourceRect(type)]))}));
 writeFileSync('docs/arte/inimigos-sheet.png',Buffer.from(enemies.sheet.split(',')[1],'base64'));
 const atlas=await page.evaluate(()=>{const types=Object.keys(window.artStudio.ENEMY_ART),c=document.createElement('canvas');c.width=window.artStudio.ENEMY_FRAME.w*4;c.height=window.artStudio.ENEMY_FRAME.h*types.length;const ctx=c.getContext('2d');types.forEach((type,row)=>{for(let frame=0;frame<4;frame++)ctx.drawImage(window.artStudio.getEnemyPixelSprite(type,frame),frame*window.artStudio.ENEMY_FRAME.w,row*window.artStudio.ENEMY_FRAME.h);});return c.toDataURL();});
 writeFileSync('docs/arte/inimigos-atlas.png',Buffer.from(atlas.split(',')[1],'base64'));
 writeFileSync('docs/arte/inimigos-atlas.json',JSON.stringify({version:2,width:enemies.frame.w*4,height:enemies.frame.h*enemies.types.length,frameWidth:enemies.frame.w,frameHeight:enemies.frame.h,states:['idle','strideA','strideB','action'],types:enemies.types.map((type,row)=>({type,y:row*enemies.frame.h,frames:[0,1,2,3].map(n=>n*enemies.frame.w),source:enemies.rects[type]})),note:'Visual only; engine controls dimensions, shields, mounts and aim.'},null,2)+'\n');
 const bosses=await page.evaluate(()=>{const kinds=Object.keys(window.artStudio.BOSS_ART),rows=kinds.flatMap(kind=>[1,2].flatMap(phase=>(kind==='twins'?[false,true]:[false]).map(twin=>({kind,phase,twin})))),c=document.createElement('canvas');c.width=window.artStudio.BOSS_FRAME.w*4;c.height=window.artStudio.BOSS_FRAME.h*rows.length;const ctx=c.getContext('2d');rows.forEach((r,row)=>{for(let frame=0;frame<4;frame++)ctx.drawImage(window.artStudio.getBossSprite(r.kind,r.phase,frame,r.twin),frame*window.artStudio.BOSS_FRAME.w,row*window.artStudio.BOSS_FRAME.h);});return{sheet:document.querySelector('#bosses').toDataURL(),atlas:c.toDataURL(),metadata:{version:2,width:c.width,height:c.height,frameWidth:window.artStudio.BOSS_FRAME.w,frameHeight:window.artStudio.BOSS_FRAME.h,states:window.artStudio.BOSS_FRAME.states,rows:rows.map((r,row)=>({...r,y:row*window.artStudio.BOSS_FRAME.h,frames:[0,1,2,3].map(n=>n*window.artStudio.BOSS_FRAME.w)})),note:'Visual only: runtime controls body rectangles, warnings, projectiles and shared twin HP.'}};});
 for(const kind of ['atlas','sheet'])writeFileSync(`docs/arte/chefes-${kind}.png`,Buffer.from(bosses[kind].split(',')[1],'base64'));
 writeFileSync('docs/arte/chefes-atlas.json',JSON.stringify(bosses.metadata,null,2)+'\n');
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close();}
