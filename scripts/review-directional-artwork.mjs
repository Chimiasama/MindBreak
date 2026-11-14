// Manual raster/runtime verification and review boards. No Actions or APK.
import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true,isMobile:true}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('/tools/art-studio.html',process.env.PREVIEW_URL??'http://localhost:3000').href);
 await page.waitForFunction(()=>window.artStudio);
 const results=await page.evaluate(async()=>{
  const art=await import('/src/game/heroArtwork.ts'),{HERO_CLIPS}=await import('/src/game/heroAnimation.ts'),{GameEngine}=await import('/src/game/engine.ts');
  const require=(condition,message)=>{if(!condition)throw Error(message);},results=[];
  for(const hero of ['ren','maya','leon']){
   require(await art.prepareHeroArtwork(hero),`Load ${hero}`);
   const left=art.getHeroAtlas(hero,-1),right=art.getHeroAtlas(hero,1);require(left!==right,'Separate directional bitmaps required');
   let frames=0;const differences={};
   for(const pose of Object.keys(HERO_CLIPS))for(let frame=0;frame<HERO_CLIPS[pose].durations.length;frame++)for(const side of [-1,1]){
    const meta=art.getHeroMetadata(hero,side),rect=meta.clips[pose].frames[frame],source=art.getHeroAtlas(hero,side);
    let transform,drawn;
    const spy={save(){},restore(){},translate(){},scale(x){transform=x;},drawImage(image){drawn=image;}};
    art.drawHeroFrame(spy,hero,pose,frame,0,0,side);require(transform===1&&drawn===source,'Runtime selected or reflected wrong view');
    const pixels=source.getContext('2d').getImageData(rect.x,rect.y,rect.w,rect.h).data;let opaque=0,edge=0;
    for(let y=0;y<rect.h;y++)for(let x=0;x<rect.w;x++)if(pixels[(y*rect.w+x)*4+3]>32){opaque++;if(x===0||y===0||x===rect.w-1||y===rect.h-1)edge++;}
    require(opaque>250,`${hero} ${pose}:${frame} empty`);if(side<0)require(edge===0,`${hero} ${pose}:${frame} clipped left frame`);frames++;
   }
   for(const pose of ['idle','run','jump','fall','wall','dash','attack1','flight']){
    const render=side=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.scale(4,4);art.drawHeroFrame(x,hero,pose,0,40,72,side);return x.getImageData(0,0,320,320).data;};
    const a=render(-1),b=render(1);let diff=0;
    for(let y=0;y<320;y++)for(let x=0;x<320;x++){const i=(y*320+x)*4,j=(y*320+319-x)*4;if(Math.abs(a[i+3]-b[j+3])+Math.abs(a[i]-b[j])+Math.abs(a[i+1]-b[j+1])+Math.abs(a[i+2]-b[j+2])>80)diff++;}
    require(diff>500,`${hero} ${pose} is merely reflected`);differences[pose]=diff;
   }
   const movementCases=[['idle',0,'Repouso'],...Array.from({length:6},(_,i)=>['run',i,`Corrida ${i+1}/6`]),['jump',0,'Salto'],['fall',0,'Queda']];
   function makeBoard(cases){
   const board=document.createElement('canvas');board.width=1000;board.height=100+cases.length*220;const x=board.getContext('2d');
   x.fillStyle='#142032';x.fillRect(0,0,board.width,board.height);x.fillStyle='#ecf5ff';x.font='600 24px sans-serif';x.fillText(`${hero.toUpperCase()} · VISTAS INDEPENDENTES`,45,37);x.font='17px sans-serif';x.fillText('← ESQUERDA · vista própria',45,75);x.fillText('DIREITA → · vista própria',535,75);
   for(const[row,[pose,frame,label]]of cases.entries())for(const side of [-1,1]){
    const cx=side<0?250:750,feet=280+row*220;
    x.strokeStyle='#36516b';x.beginPath();x.moveTo(cx-170,feet);x.lineTo(cx+170,feet);x.stroke();
    x.save();x.translate(cx,feet);x.scale(3,3);art.drawHeroFrame(x,hero,pose,frame,0,0,side);x.restore();x.fillStyle='#a9c2d8';x.fillText(label,cx-55,feet+25);
   }
   return board.toDataURL();}
   const extended=Object.keys(HERO_CLIPS).flatMap(pose=>pose==='run'?Array.from({length:6},(_,i)=>[pose,i,`run ${i+1}/6`]):pose==='climb'?[[pose,0,'climb 1/2'],[pose,1,'climb 2/2']]:pose==='flight'&&hero==='maya'?[[pose,0,'flight 1/2'],[pose,1,'flight 2/2']]:[[pose,0,pose]]);
   const board=makeBoard(movementCases),continuity=makeBoard(extended);
   // The real engine chooses the correct image after actual left/right input and physics updates.
   const canvas=document.createElement('canvas');canvas.width=915;canvas.height=412;
   const engine=new GameEngine(canvas,{onHudUpdate(){},onStageClear(){},onContinueCountdown(){},onGameOver(){}});
   const movement=[];
   try{
    engine.loadStage(1,hero);engine.setPaused(false);engine.enemies=[];engine.player.invulnTimer=1000;
    const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);let observed;
    ctx.drawImage=(image,...args)=>{if(image===left||image===right)observed=image;draw(image,...args);};
    for(const[key,side]of [['right',1],['left',-1]]){
     const before=engine.player.x;engine.setKey(key,true,'touch');for(let tick=0;tick<12;tick++)engine.update();engine.draw();engine.setKey(key,false,'touch');
     const delta=engine.player.x-before;require(Math.sign(delta)===side&&engine.player.facing===side,`${hero} failed real ${key} movement`);
     require(observed===(side<0?left:right),`${hero} engine drew wrong directional image`);movement.push({key,delta});
    }
   }finally{engine.stop();}
   results.push({hero,frames,differences,movement,board,continuity});
  }
  return results;
 });
 if(errors.length)throw Error(errors.join('\n'));
 for(const result of results){mkdirSync(`docs/arte/${result.hero}`,{recursive:true});writeFileSync(`docs/arte/${result.hero}/direcoes.png`,Buffer.from(result.board.split(',')[1],'base64'));writeFileSync(`docs/arte/${result.hero}/continuidade.png`,Buffer.from(result.continuity.split(',')[1],'base64'));delete result.board;delete result.continuity;}
 writeFileSync('docs/arte/validacao-direcional.json',JSON.stringify({browser:'Chromium',viewport:[915,412],touch:true,errors,results},null,2)+'\n');
 console.log(JSON.stringify({errors,results}));
}finally{await browser.close();}
