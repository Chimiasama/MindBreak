// Manual visual review boards, using the actual runtime draw function.
import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('/tools/art-studio.html',process.env.PREVIEW_URL??'http://localhost:3000').href);await page.waitForFunction(()=>window.artStudio);
for(const hero of ['ren','maya']){
 const data=await page.evaluate(async hero=>{const a=window.artStudio;await a.prepareHero(hero);const m=a.getHeroMetadata(hero);if(m.w!==320)throw Error('Painting not ready '+hero);
 const preview=document.createElement('canvas');preview.width=1440;preview.height=650;const x=preview.getContext('2d');x.fillStyle='#182438';x.fillRect(0,0,1440,650);x.fillStyle='#edf4fa';x.font='600 30px sans-serif';x.fillText(`${hero.toUpperCase()} · PINTURA INTEGRADA AO JOGO`,42,52);x.font='17px sans-serif';x.fillStyle='#adc0d0';x.fillText('Repouso, corrida e golpe na mesma orientação',42,86);
 for(const[i,pose]of ['idle','run','attack1'].entries()){const f=m.clips[pose].frames[0];x.drawImage(a.getHeroAtlas(hero),f.x,f.y,f.w,f.h,i*470,100,480,480);x.fillStyle='#e1edf4';x.fillText(['Repouso','Corrida','Golpe'][i],180+i*470,601);}
 const board=document.createElement('canvas');board.width=1000;board.height=840;const b=board.getContext('2d');b.fillStyle='#182438';b.fillRect(0,0,1000,840);b.font='20px sans-serif';b.fillStyle='#e5edf5';b.fillText(`${hero.toUpperCase()} · ESQUERDA ←`,90,45);b.fillText('DIREITA →',650,45);
 const cases=[['idle',0,'repouso'],['run',0,'corrida'],['attack1',0,'ataque'],['attack1',2,'recuperação']];let transforms=0;
 for(const[row,[pose,frame,label]]of cases.entries())for(const facing of [-1,1]){
  const cx=facing===1?750:250,feet=245+row*190;b.save();b.translate(cx,feet);b.scale(2,2);a.drawHeroFrame(b,hero,pose,frame,0,0,facing);b.restore();b.fillStyle='#acc2d7';b.fillText(label,cx-65,feet+20);
  let actual;const spy={save(){},restore(){},translate(){},scale(x){actual=x;},drawImage(){},imageSmoothingEnabled:true};a.drawHeroFrame(spy,hero,pose,frame,0,0,facing);if(actual!==1)throw Error('Authored direction must never be reflected at runtime');transforms++;
 }
 return{preview:preview.toDataURL(),board:board.toDataURL(),transforms};},hero);
 mkdirSync(`docs/arte/${hero}`,{recursive:true});for(const[key,file]of [['preview','previa'],['board','orientacao']])writeFileSync(`docs/arte/${hero}/${file}.png`,Buffer.from(data[key].split(',')[1],'base64'));console.log(JSON.stringify({hero,runtimeDirectionChecks:data.transforms}));
}
if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
