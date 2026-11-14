// Manual authoring: Vite + Playwright/Chromium. No workflow or APK.
import{mkdirSync,writeFileSync,readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{pathToFileURL}from'node:url';
export async function buildPaintedArtwork(hero,direction='right'){
 if(!['right','left'].includes(direction))throw Error('Unknown direction');
 if(!['ren','maya','leon'].includes(hero))throw Error('Unknown painted hero');
 const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{const page=await browser.newPage();await page.goto(new URL(`/tools/painted-atlas-builder.html?hero=${hero}&direction=${direction}`,process.env.PREVIEW_URL??'http://localhost:3000').href);await page.waitForFunction(()=>window.paintedBuilder);const result=await page.evaluate(()=>({webp:window.paintedBuilder.canvas.toDataURL('image/webp',.97),metadata:window.paintedBuilder.metadata}));
 mkdirSync(`src/assets/${hero}`,{recursive:true});mkdirSync(`docs/arte/${hero}`,{recursive:true});const bytes=Buffer.from(result.webp.split(',')[1],'base64');const file=`src/assets/${hero}/${hero}-painted${direction==='left'?'-left':''}.webp`;writeFileSync(file,bytes);
 result.metadata.asset={file,bytes:bytes.length,quality:.97,sha256:createHash('sha256').update(bytes).digest('hex')};if(result.metadata.alignmentHero){const h=result.metadata.alignmentHero,file=`src/assets/${h}/${h}-painted.webp`;result.metadata.alignmentReference={file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};}
 if(result.metadata.layoutReference){const file=result.metadata.layoutReference;result.metadata.layoutReferenceHash=createHash('sha256').update(readFileSync(file)).digest('hex');}
 result.metadata.sourceFiles=(result.metadata.sourceSheets?result.metadata.sourceSheets.map(s=>s.file):['01-locomocao','02-combate','03-acrobacia',...(hero==='maya'?['04-corrida-e-poderes']:[])]).map(name=>({file:`docs/arte/${hero}/fontes/${name}.png`,sha256:createHash('sha256').update(readFileSync(`docs/arte/${hero}/fontes/${name}.png`)).digest('hex')}));writeFileSync(`docs/arte/${hero}/manifesto${direction==='left'?'-esquerda':''}.json`,JSON.stringify(result.metadata,null,2)+'\n');console.log(JSON.stringify({hero,direction,bytes:bytes.length,width:result.metadata.width,height:result.metadata.height}));
 }finally{await browser.close();}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await buildPaintedArtwork(process.argv[2]??'ren',process.argv[3]??'right');
