import { CharacterId } from './types';
import { HERO_FRAME, HERO_CLIPS, HeroPose, HERO_ATLAS } from './heroAnimation';
export const HERO_PALETTES:Record<CharacterId,Record<string,string>>={
 ren:{O:'#020617',H:'#172033',S:'#fed7aa',K:'#d79c72',A:'#394d69',L:'#7a93b5',P:'#31445e',B:'#22344e',C:'#ff267f',V:'#55e5ff',W:'#ecfeff'},
 maya:{O:'#03191c',H:'#115e59',S:'#ffe0c0',K:'#dba779',A:'#0f766e',L:'#40b8a4',P:'#e2e8f0',B:'#164e63',C:'#facc15',V:'#67e8f9',W:'#fffbeb'},
 leon:{O:'#180d13',H:'#4a291d',S:'#fdba74',K:'#ce8150',A:'#991b1b',L:'#e34c3f',P:'#263449',B:'#121b2c',C:'#ff902e',V:'#62d5ff',W:'#ffe5b4'},
};
type Pt=[number,number];
/** Editable source raster: integer pixels only; pose changes never change physics. */
export function heroRows(hero:CharacterId,pose:HeroPose,frame:number):string[]{
 const grid=Array.from({length:HERO_FRAME.h},()=>Array<string>(HERO_FRAME.w).fill('.'));
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{for(let yy=Math.round(y);yy<Math.round(y+h);yy++)for(let xx=Math.round(x);xx<Math.round(x+w);xx++)if(grid[yy]?.[xx]!==undefined)grid[yy][xx]=color;};
 const line=(a:Pt,b:Pt,width:number,color:string)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(Math.abs(dx),Math.abs(dy),1);
  for(let i=0;i<=steps;i++)rect(Math.round(a[0]+dx*i/steps)-Math.floor(width/2),Math.round(a[1]+dy*i/steps)-Math.floor(width/2),width,width,color);
 };
 const limb=(a:Pt,b:Pt,c:Pt,color:string)=>{line(a,b,5,'O');line(b,c,5,'O');line(a,b,3,color);line(b,c,3,color);};
 let chest:Pt=[12,16],head:Pt=[12,8],hip:Pt=[12,22];
 let elbowL:Pt=[6,18],handL:Pt=[6,22],elbowR:Pt=[18,18],handR:Pt=[18,22];
 let kneeL:Pt=[9,26],footL:Pt=[9,30],kneeR:Pt=[15,26],footR:Pt=[15,30];
 const cycle=[0,1,1,0,-1,-1][frame%6];
 if(pose==='idle'){const bob=frame===1||frame===2?-1:0;head[1]+=bob;chest[1]+=bob;}
 if(pose==='run'){
  chest=[13,16];head=[14,8+(frame%3===1?-1:0)];hip=[12,22];
  kneeL=[9-cycle*2,25];footL=[8-cycle*4,30-Math.max(0,cycle)*2];kneeR=[15+cycle*2,25];footR=[16+cycle*4,30-Math.max(0,-cycle)*2];
  elbowL=[7+cycle*2,17];handL=[6+cycle*4,20];elbowR=[17-cycle*2,17];handR=[18-cycle*4,20];
 }
 if(pose==='jump'||pose==='vault'){
  kneeL=[8,24];footL=[7,27];kneeR=[16,23];footR=[18,26];elbowL=[6,14];handL=[5,11];elbowR=[18,14];handR=[20,10];
  if(pose==='jump'&&frame===1){footL=[8,29];footR=[17,28];handL=[4,12];}
  if(pose==='vault'){chest=[13,17];head=[15,9];footL=[10,27-frame];handR=[21,15];}
 }
 if(pose==='fall'){elbowL=[5,14];handL=[3,11+frame];elbowR=[19,14];handR=[21,11+frame];kneeL=[8,26];footL=[7,30];kneeR=[16,26];footR=[17,30];}
 if(pose==='wall'||pose==='climb'){
  head=[14,8];chest=[13,16];hip=[13,22];elbowR=[19,11];handR=[21,6+(pose==='climb'?frame%2*5:0)];elbowL=[18,17];handL=[21,16-(pose==='climb'?frame%2*5:0)];
  kneeR=[17,24];footR=[19,27+(frame%2)*2];kneeL=[10,25];footL=[11,30-(frame%2)*2];
 }
 if(pose==='hang'){
  head=[12,12];chest=[12,19];hip=[12,24];elbowL=[7,9];handL=[7,1];elbowR=[17,9];handR=[17,1];kneeL=[9,27];footL=[8,30];kneeR=[15,27];footR=[16,30-frame];
 }
 if(pose==='dash'){
  chest=[13,19];head=[17,12];hip=[10,23];elbowL=[6,20];handL=[3,21];elbowR=[18,18];handR=[21,15];kneeL=[6,26];footL=[3,29];kneeR=[13,26];footR=[12,30];
  rect(1+frame,13,4,1,'C');rect(1,18+frame,3,1,'V');
 }
 if(pose==='slide'||pose==='death'){
  chest=[12,25];head=[pose==='slide'?17:5,pose==='slide'?21:24];hip=[9,26];
  elbowL=[7,25];handL=[4,24];elbowR=[18,26];handR=[21,26];kneeL=[13,28];footL=[18,30];kneeR=[16,28];footR=[22,30];
  if(pose==='slide'){rect(1+frame*2,29,3,1,'C');head[1]+=frame;handL[0]+=frame;}
  if(pose==='death'){head[1]-=Math.max(0,2-frame);head[0]+=Math.min(frame,2);hip=[15,27];kneeL=[18,27];footL=[21,29];kneeR=[17,29];footR=[20,30];}
 }
 if(pose.startsWith('attack')&&frame<2){
  chest=[13,16];head=[14,8];footL=[7,30];footR=[17,30];elbowL=[8,17];handL=[7,20];
  if(pose==='attack1'){elbowR=[19,13];handR=[22,12+frame*2];}
  if(pose==='attack2'){elbowR=[19,17];handR=[22,20-frame*2];}
  if(pose==='attack3'){elbowR=[18,9];handR=[19,3+frame];kneeL=[8,26];kneeR=[16,25];}
 }
 if(pose==='hurt'){head=[9,9+frame];chest=[10,17];elbowL=[5,17];handL=[3,15];elbowR=[17,18];handR=[20,17];}
 if(pose==='stun'){head=[11,10+frame];chest=[12,18];elbowL=[7,21];handL=[7,24];elbowR=[17,21];handR=[17,24];}
 if(pose==='special'||pose==='flight'){
  elbowL=[6,pose==='special'?13:18];handL=[3,pose==='special'?9:17];elbowR=[18,pose==='special'?13:18];handR=[21,pose==='special'?9:17];
  if(pose==='flight'){kneeL=[8,24];footL=[7,28+frame%2];kneeR=[15,24];footR=[17,27+frame%2];}
 }
 const wide=hero==='leon'?13:9;
 limb([hip[0]-2,hip[1]],kneeL,footL,'P');limb([hip[0]+2,hip[1]],kneeR,footR,'P');
 rect(footL[0]-2,footL[1]-1,5,2,'B');rect(footR[0]-2,footR[1]-1,5,2,'B');
 limb([chest[0]-4,chest[1]-2],elbowL,handL,hero==='leon'?'S':'A');
 limb([chest[0]+4,chest[1]-2],elbowR,handR,hero==='leon'?'S':'A');
 const horizontal=pose==='slide'||pose==='death';
 rect(chest[0]-Math.floor(wide/2)-1,chest[1]-5,wide+2,horizontal?7:12,'O');
 rect(chest[0]-Math.floor(wide/2),chest[1]-4,wide,horizontal?5:10,'A');
 rect(chest[0]-Math.floor(wide/2),chest[1]-4,2,horizontal?4:8,'L');
 rect(chest[0]-4,chest[1]+(horizontal?0:4),8,2,'C');
 rect(head[0]-5,head[1]-5,10,11,'O');rect(head[0]-3,head[1]-2,7,7,'S');rect(head[0]-3,head[1]+3,3,2,'K');
 rect(head[0]-4,head[1]-5,9,4,'H');rect(head[0]-3,head[1]-6,3,2,'H');
 if(hero==='ren'){
  rect(head[0]-4,head[1]-2,9,2,'C');rect(head[0]+1,head[1],4,2,'V');rect(head[0]-3,head[1]+3,8,2,'H');
  rect(chest[0]-6,chest[1]-6,9,2,'C');rect(chest[0]-6,chest[1]-4,2,4,'C');
  if(pose.startsWith('attack')&&frame<2){const h=handR;rect(h[0],h[1]-2,1,6,'V');rect(Math.min(23,h[0]+1),h[1]-1,1,4,'W');}
 }else if(hero==='maya'){
  rect(head[0]-5,head[1]-3,2,10,'H');rect(head[0]-6-frame%2,head[1]+4,3,7,'H');rect(head[0]-2,head[1]-4,2,2,'C');rect(head[0]+2,head[1],2,1,'V');
  rect(chest[0]+2,chest[1]-3,2,8,'C');rect(handL[0]-1,handL[1]-1,3,2,'S');rect(handR[0]-1,handR[1]-1,3,2,'S');
 }else{
  rect(head[0]+1,head[1],4,2,'V');rect(chest[0]-6,chest[1]-3,3,3,'L');rect(chest[0]+4,chest[1]-3,3,3,'L');
  rect(handL[0]-2,handL[1]-2,4,4,'C');rect(handR[0]-2,handR[1]-2,4,4,'C');rect(handR[0]-1,handR[1]-2,2,1,'W');
 }
 if(pose==='special'||pose==='flight'&&hero==='maya')for(const hand of [handL,handR]){const offset=frame%2;rect(hand[0]-2,hand[1]-3-offset,4,1,'V');rect(hand[0]-2,hand[1]+2+offset,4,1,'C');rect(hand[0],hand[1]-1,1,1,'W');}
 return grid.map(row=>row.join(''));
}
const atlases=new Map<CharacterId,HTMLCanvasElement>();
export function getHeroAtlas(hero:CharacterId){
 const cached=atlases.get(hero);if(cached)return cached;
 const meta=HERO_ATLAS,canvas=document.createElement('canvas');canvas.width=meta.width;canvas.height=meta.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Hero atlas canvas unavailable');ctx.imageSmoothingEnabled=false;
 for(const pose of Object.keys(HERO_CLIPS)as HeroPose[])for(const[i,f]of meta.clips[pose].frames.entries()){
  const rows=heroRows(hero,pose,i);for(let y=0;y<HERO_FRAME.h;y++)for(let x=0;x<HERO_FRAME.w;x++){
   const color=HERO_PALETTES[hero][rows[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(f.x+x,f.y+y,1,1);}
  }
 }
 atlases.set(hero,canvas);return canvas;
}
export function drawHeroFrame(ctx:CanvasRenderingContext2D,hero:CharacterId,pose:HeroPose,frame:number,centerX:number,feetY:number,facing:number){
 const meta=HERO_ATLAS,f=meta.clips[pose].frames[frame];ctx.save();ctx.translate(Math.round(centerX),Math.round(feetY));ctx.scale(facing,1);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(getHeroAtlas(hero),f.x,f.y,f.w,f.h,-HERO_FRAME.pivot.x*2,-HERO_FRAME.pivot.y*2,HERO_FRAME.w*2,HERO_FRAME.h*2);ctx.restore();
}
