// Manual authoring verification: Vite + Playwright/Chromium, no workflow or APK.
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('/tools/art-studio.html',process.env.PREVIEW_URL??'http://localhost:3000').href);await page.waitForFunction(()=>window.artStudio);
 const result=await page.evaluate(async()=>{
  const studio=window.artStudio,results=[];const sample=(canvas,x,y,w,h)=>{
   const pixels=canvas.getContext('2d').getImageData(x,y,w,h).data,colors=new Set();let opaque=0,hash=2166136261;
   for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]){opaque++;colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);}for(let c=0;c<4;c++){hash^=pixels[i+c];hash=Math.imul(hash,16777619);}}
   if(opaque<100||colors.size<30)throw Error('Empty or flat illustration');return{opaque,colors:colors.size,hash:hash>>>0};
  };
  for(const hero of ['ren','maya','leon']){await studio.prepareHero(hero);const c=studio.getHeroAtlas(hero);if(c!==studio.getHeroAtlas(hero))throw Error('Hero cache miss');for(const[pose,clip]of Object.entries(studio.getHeroMetadata(hero).clips))for(const[frame,f]of clip.frames.entries())results.push({type:'hero',id:hero,pose,frame,...sample(c,f.x,f.y,f.w,f.h)});}
  for(const id of Object.keys(studio.ENEMY_ART))for(let frame=0;frame<4;frame++){const c=studio.getEnemyPixelSprite(id,frame);if(c!==studio.getEnemyPixelSprite(id,frame))throw Error('Enemy cache miss');results.push({type:'enemy',id,frame,...sample(c,0,0,c.width,c.height)});}
  for(const id of Object.keys(studio.BOSS_ART))for(const phase of [1,2])for(const twin of id==='twins'?[false,true]:[false])for(let frame=0;frame<4;frame++){const c=studio.getBossSprite(id,phase,frame,twin);if(c!==studio.getBossSprite(id,phase,frame,twin))throw Error('Boss cache miss');results.push({type:'boss',id,phase,twin,frame,...sample(c,0,0,c.width,c.height)});}
  for(const id of Object.keys(studio.BOSS_ART)){const rows=results.filter(r=>r.type==='boss'&&r.id===id&&!r.twin&&r.frame===0);if(rows[0].hash===rows[1].hash)throw Error('Phase identity lost '+id);}
  const c=document.createElement('canvas');c.width=1600;c.height=800;const x=c.getContext('2d'),bg=x.createLinearGradient(0,0,1600,800);bg.addColorStop(0,'#101b2d');bg.addColorStop(1,'#26364b');x.fillStyle=bg;x.fillRect(0,0,1600,800);x.fillStyle='#f1f5f9';x.font='600 30px sans-serif';x.fillText('MINDBREAK · PERSONAGENS EM ILUSTRAÇÃO 2D',45,55);x.font='17px sans-serif';x.fillStyle='#afc6dc';x.fillText('Sprites integrados · Ren pintado; demais personagens em ilustração procedural V2',45,88);
  for(const [i,hero]of ['ren','maya','leon'].entries()){const m=studio.getHeroMetadata(hero),f=m.clips.idle.frames[0];x.drawImage(studio.getHeroAtlas(hero),f.x,f.y,f.w,f.h,127+i*220-m.pivot.x*m.scale*3,312-m.pivot.y*m.scale*3,m.w*m.scale*3,m.h*m.scale*3);x.fillStyle='#f1f5f9';x.fillText(hero.toUpperCase(),95+i*220,340);}
  for(const [i,id]of ['mib_gunner','sniper','samurai','turret_engineer','heavy_trooper'].entries()){x.drawImage(studio.getEnemyPixelSprite(id,0),750+i*160,150,96,128);x.fillStyle='#afc6dc';x.fillText(['agente','sniper','samurai','instalador','pesado'][i],750+i*160,320);}
  x.fillStyle='#f1f5f9';x.font='600 23px sans-serif';x.fillText('CHEFES · DUAS FASES, MESMAS REGRAS DE COMBATE',45,417);x.font='16px sans-serif';
  Object.keys(studio.BOSS_ART).forEach((id,i)=>{x.drawImage(studio.getBossSprite(id,id==='oswald'?2:1,0,false),45+i*192,450,144,192);x.fillStyle='#afc6dc';x.fillText(studio.BOSS_ART[id].label.split(' / ')[0],45+i*192,680);});x.fillStyle='#91a7bd';x.fillText('Ren: quadros pintados 320 × 320. Demais fontes V2 preservadas. A arte não altera as caixas físicas.',45,752);
  return{version:2,total:results.length,results,preview:c.toDataURL()};
 });
 if(errors.length)throw Error(errors.join('\n'));mkdirSync('docs/arte',{recursive:true});writeFileSync('docs/arte/identidade-v2.png',Buffer.from(result.preview.split(',')[1],'base64'));delete result.preview;writeFileSync('docs/arte/validacao-v2.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({frames:result.total,errors}));
}finally{await browser.close();}
