// Manual GLB/runtime verification. No workflow or APK.
import{writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const base=process.env.PREVIEW_URL??'http://localhost:3000';
try{
 const page=await browser.newPage({viewport:{width:1050,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(new URL('/tools/ren-model-studio.html',base).href);await page.waitForFunction(()=>window.renModelStudio?.ready);await page.locator('#animate').uncheck();
 for(const view of ['three','front','back','left','right']){
  await page.selectOption('#view',view);await page.evaluate(()=>window.renModelStudio.draw('idle',0));
  await page.locator('canvas').screenshot({path:`docs/arte/ren3d/${view}.png`});
 }
 const report=await page.evaluate(async()=>{
  const s=window.renModelStudio,{HERO_CLIPS}=await import('/src/game/heroAnimation.ts');
  const poses=Object.keys(HERO_CLIPS),board=document.createElement('canvas');board.width=1200;board.height=Math.ceil(poses.length/4)*400;
  const x=board.getContext('2d');x.fillStyle='#344258';x.fillRect(0,0,board.width,board.height);
  s.renderer.setSize(300,360);s.camera.aspect=300/360;s.camera.updateProjectionMatrix();s.camera.position.set(1.8,1.3,3.6);s.camera.lookAt(0,.9,0);
  for(const[i,pose]of poses.entries()){
   if(pose==='slide'||pose==='death'){s.camera.position.set(2.5,1.4,4.7);s.camera.lookAt(0,.65,0);}
   else{s.camera.position.set(1.8,1.3,3.6);s.camera.lookAt(0,.9,0);}
   s.draw(pose,pose.startsWith('attack')?2:pose==='run'?10:6);
   x.drawImage(s.renderer.domElement,i%4*300,Math.floor(i/4)*400,300,360);
   x.fillStyle='#e2e8f0';x.font='18px sans-serif';x.fillText(pose,i%4*300+15,Math.floor(i/4)*400+386);
  }
  return{poses,board:board.toDataURL(),render:{...s.renderer.info.render},model:s.rig.root.userData.externalCharacter};
 });
 writeFileSync('docs/arte/ren3d/poses.png',Buffer.from(report.board.split(',')[1],'base64'));delete report.board;
 const engineCheck=await page.evaluate(async()=>{
  const{GameEngine}=await import('/src/game/engine.ts');
  const mount=document.createElement('div');mount.style.cssText='position:relative;width:915px;height:412px';mount.id='runtime-ren';document.body.append(mount);
  const c=document.createElement('canvas');c.width=915;c.height=412;c.style.cssText='position:absolute;inset:0;pointer-events:none';
  const e=new GameEngine(c,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});e.startCampaign(1,'ren');
  e.attach3DContainer(mount);mount.append(c);await new Promise(resolve=>setTimeout(resolve,50));
  if(!e.renderer3d)throw Error('Real engine did not initialize WebGL');
  const rig=e.renderer3d.heroRigs.get('ren');if(rig.root.userData.externalCharacter!=='ren-cel-v1')throw Error('Real engine retained procedural Ren');
  const before=JSON.stringify(e.player);e.draw(100);if(JSON.stringify(e.player)!==before)throw Error('Render changed physics');
  window.renRuntimeReview=e;
  return{externalModel:rig.root.userData.externalCharacter,renderPreservesPlayer:true,software:e.renderer3d.isSoftwareGl,drawCalls:e.renderer3d.renderer.info.render.calls};
 });
 await page.locator('#runtime-ren').screenshot({path:'docs/arte/ren3d/jogo.png'});await page.evaluate(()=>window.renRuntimeReview.dispose());
 const menu=await browser.newPage();let requestedModel=false;
 menu.on('response',response=>{if(response.url().includes('ren-cel-v1')&&response.ok())requestedModel=true;});
 menu.on('pageerror',e=>errors.push(e.message));
 await menu.goto(new URL('/',base).href);await menu.waitForFunction(async()=>{
  const m=await import('/src/game/render3d/renModel.ts');return m.renModelStatus()==='ready';
 });
 await menu.locator('canvas').last().screenshot({path:'docs/arte/ren3d/menu.png'});
 if(!requestedModel)throw Error('Menu did not load Ren GLB');
 // A fresh context with blocked GLB must keep the procedural model available.
 const fallbackPage=await browser.newPage();await fallbackPage.route('**/ren-cel-v1.glb*',route=>route.abort());
 await fallbackPage.goto(new URL('/tools/ren-model-studio.html',base).href);
 const fallback=await fallbackPage.evaluate(async()=>{
  const model=await import('/src/game/render3d/renModel.ts'),{buildHeroRig3D}=await import('/src/game/render3d/characterRig3d.ts');
  const ready=await model.loadRenModel();if(ready||model.createRenModelInstance())throw Error('Failed model exposed partial asset');
  const rig=buildHeroRig3D('ren');return{status:model.renModelStatus(),fallback:!!rig.head};
 });
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync('docs/arte/ren3d/validacao.json',JSON.stringify({browser:'Chromium',errors,...report,engineCheck,menuLoadsModel:requestedModel,fallback,limits:'Prepared scene and procedural animation states; not full campaign, physical Android, or final artistic approval.'},null,2)+'\n');
 console.log(JSON.stringify({poses:report.poses.length,errors,engineCheck,fallback}));
}finally{await browser.close();}
