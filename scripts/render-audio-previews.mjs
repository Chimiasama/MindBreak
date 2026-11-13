// Authoring command: running Vite server, Playwright/Chromium and ffmpeg are required.
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const scratch = mkdtempSync(join(tmpdir(),'mindbreak-audio-')); mkdirSync('docs/audio',{recursive:true});
try {
 const page = await browser.newPage(); await page.goto(new URL('/tools/music-studio.html', process.env.PREVIEW_URL ?? 'http://localhost:3000').href);
 await page.waitForLoadState('networkidle');
 const tasks = await page.evaluate(async()=>{
  const {SCORES}=await import('/src/game/music.ts');
  return Object.entries(SCORES).flatMap(([id,m])=>(m.kind==='boss'?[1,2]:[1]).map(phase=>({id,phase,...m}))).concat([{id:'effects',phase:1,title:'Catálogo de efeitos',kind:'effects'}]);
 });
 const wanted=process.env.PREVIEW_IDS?.split(',');
 const selected=wanted?tasks.filter(task=>wanted.includes(task.id)):tasks;
 if(!selected.length)throw Error('No matching preview IDs');
 const catalog=wanted&&existsSync('docs/audio/catalogo.json')?JSON.parse(readFileSync('docs/audio/catalogo.json','utf8')).filter(row=>!wanted.includes(row.id)):[];
 for(const task of selected){
  const rendered=await page.evaluate(async(task)=>{
   const {renderMusicPreview,renderEffectsPreview,encodePreviewWav}=await import('/src/game/musicPreview.ts');
   const {SOUND_CUES}=await import('/src/game/soundEffects.ts');
   const buffer=task.id==='effects'?await renderEffectsPreview(Object.keys(SOUND_CUES)):await renderMusicPreview(task.id,{chapter:task.chapter,sector:`${task.chapter}B`,boss:task.kind==='boss',phase:task.phase,tension:false,flow:task.kind==='flow'?task.id:undefined});
   const samples=buffer.getChannelData(0);let peak=0,power=0;
   for(const value of samples){if(!Number.isFinite(value))throw Error('Non-finite sample');peak=Math.max(peak,Math.abs(value));power+=value*value;}
   const rms=Math.sqrt(power/samples.length);if(peak>=0.98||rms<0.00001)throw Error(`${task.id}: invalid audition peak/RMS`);
   const bytes=new Uint8Array(encodePreviewWav(buffer));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return{base64:btoa(binary),duration:buffer.duration,peak,rms};
  },task);
  const name=task.id==='district'?'distrito':task.id==='effects'?'efeitos':task.id;
  const file=`${name}${task.kind==='boss'?`-fase-${task.phase}`:''}.ogg`,wav=join(scratch,'preview.wav');
  writeFileSync(wav,Buffer.from(rendered.base64,'base64'));
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',wav,'-c:a','libvorbis','-q:a','5','-metadata',`title=${task.title}`,`docs/audio/${file}`]);
  const bytes=readFileSync(`docs/audio/${file}`);
  catalog.push({id:task.id,title:task.title,phase:task.phase,bpm:task.bpm,key:task.key,file,bytes:bytes.length,duration:rendered.duration,peak:rendered.peak,rms:rendered.rms,sha256:createHash('sha256').update(bytes).digest('hex')});
  console.log(`${file}: ${rendered.duration.toFixed(2)} s, peak ${rendered.peak.toFixed(4)}, RMS ${rendered.rms.toFixed(4)}`);
 }
 writeFileSync('docs/audio/catalogo.json',`${JSON.stringify(catalog,null,2)}\n`);
} finally { await browser.close();rmSync(scratch,{recursive:true,force:true}); }
