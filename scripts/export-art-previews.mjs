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
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close();}
