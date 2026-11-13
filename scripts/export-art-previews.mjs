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
 const enemies=await page.evaluate(()=>({sheet:document.querySelector('#enemies').toDataURL(),types:Object.keys(window.artStudio.ENEMY_ART),rects:Object.fromEntries(Object.keys(window.artStudio.ENEMY_ART).map(type=>[type,window.artStudio.enemySourceRect(type)]))}));
 writeFileSync('docs/arte/inimigos-sheet.png',Buffer.from(enemies.sheet.split(',')[1],'base64'));
 const atlas=await page.evaluate(()=>{const types=Object.keys(window.artStudio.ENEMY_ART),c=document.createElement('canvas');c.width=24*4;c.height=32*types.length;const ctx=c.getContext('2d');types.forEach((type,row)=>{for(let frame=0;frame<4;frame++)ctx.drawImage(window.artStudio.getEnemyPixelSprite(type,frame),frame*24,row*32);});return c.toDataURL();});
 writeFileSync('docs/arte/inimigos-atlas.png',Buffer.from(atlas.split(',')[1],'base64'));
 writeFileSync('docs/arte/inimigos-atlas.json',JSON.stringify({version:1,width:96,height:384,frameWidth:24,frameHeight:32,states:['idle','strideA','strideB','action'],types:enemies.types.map((type,row)=>({type,y:row*32,frames:[0,24,48,72],source:enemies.rects[type]})),note:'Visual only; engine controls dimensions, shields, mounts and aim.'},null,2)+'\n');
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close();}
