/** Anatomical illustration rig in 48 × 64 design units. Rasterize once, never during simulation. */
export type Point=[number,number];
export interface FigureRig {head:Point;chest:Point;hip:Point;elbows:[Point,Point];hands:[Point,Point];knees:[Point,Point];feet:[Point,Point];lean:number;horizontal:boolean}
export interface FigureStyle {body:string;light:string;accent:string;pants:string;skin:string;hair:string;build:'lean'|'athletic'|'heavy';role:string;phase?:number}
export function figureRig(pose:string,frame:number):FigureRig {
 const r:FigureRig={head:[26,9],chest:[24,27],hip:[24,39],elbows:[[16,32],[32,31]],hands:[[16,40],[35,36]],knees:[[20,50],[29,51]],feet:[[17,61],[33,61]],lean:0,horizontal:false};
 const phase=frame%6,cycle=[0,1,0.6,0,-1,-0.6][phase];
 if(pose==='idle'){r.head[1]-=frame%4===1?0.5:0;r.chest[1]-=frame%4===1?0.35:0;}
 if(pose==='run'){
  r.head=[28,8+(phase%3===1?-1:0)];r.chest=[26,26];r.hip=[23,39];r.lean=0.12;
  r.elbows=[[17+cycle*4,28],[33-cycle*4,28]];r.hands=[[17+cycle*9,23+Math.abs(cycle)*6],[34-cycle*9,25+Math.abs(cycle)*7]];
  r.knees=[[21-cycle*8,49],[28+cycle*8,48]];r.feet=[[21-cycle*12,60-Math.max(0,cycle)*8],[29+cycle*12,60-Math.max(0,-cycle)*8]];
 }
 if(['jump','vault','flight'].includes(pose)){
  r.knees=[[16,45],[32,46]];r.feet=[[14,53+frame%2],[36,54]];r.elbows=[[16,25],[34,23]];r.hands=[[13,18],[37,16]];
  if(pose==='vault'){r.head=[29,11];r.chest=[27,28];r.hands[1]=[41,29];r.feet[0]=[23,53-frame];}
  if(pose==='flight'){r.elbows=[[15,31],[35,29]];r.hands=[[10,35],[40,32]];r.head[1]-=frame%2;}
 }
 if(pose==='fall'){r.elbows=[[15,25],[35,23]];r.hands=[[9,19+frame],[41,17+frame]];r.knees=[[18,49],[31,50]];r.feet=[[14,59],[36,59]];}
 if(pose==='wall'||pose==='climb'){
  const swap=pose==='climb'?frame%2:0;r.head=[29,10];r.chest=[28,28];r.hip=[27,40];r.elbows=[[34,19],[38,26]];r.hands=[[41,9+swap*9],[41,28-swap*9]];r.knees=[[24,49],[35,43]];r.feet=[[25,60-swap*4],[40,53+swap*4]];
 }
 if(pose==='hang'){r.head=[25,16];r.chest=[24,32];r.hip=[24,43];r.elbows=[[16,14],[32,14]];r.hands=[[17,2],[33,2]];r.knees=[[19,51],[30,51]];r.feet=[[17,61],[34,60-frame%2]];}
 if(pose==='dash'){r.head=[34,20];r.chest=[28,35];r.hip=[19,44];r.elbows=[[16,37],[36,31]];r.hands=[[7,36],[41,25]];r.knees=[[12,51],[27,51]];r.feet=[[5,59],[26,61]];r.lean=0.4;}
 if(pose==='slide'||pose==='death'){
  r.horizontal=true;r.chest=[26,48];r.head=[pose==='slide'?35:10,pose==='slide'?40:49+frame*0.3];r.hip=[19,52];r.elbows=[[16,48],[34,50]];r.hands=[[10,45],[40,49]];r.knees=[[28,55],[34,56]];r.feet=[[38,60],[44,61]];
 }
 if(pose.startsWith('attack')&&frame<2){
  r.head=[28,10];r.chest=[26,27];r.feet=[[12,61],[36,61]];r.elbows[0]=[18,28];r.hands[0]=[20,23];
  if(pose==='attack1'){r.elbows[1]=[36,24];r.hands[1]=[43,20+frame*5];}
  if(pose==='attack2'){r.elbows[1]=[35,30];r.hands[1]=[43,37-frame*4];}
  if(pose==='attack3'){r.elbows[1]=[34,16];r.hands[1]=[36,5+frame*3];r.knees[1]=[30,48];}
 }
 if(pose==='hurt'){r.head=[21,11+frame];r.chest=[21,29];r.elbows=[[13,28],[32,30]];r.hands=[[8,23],[39,26]];}
 if(pose==='stun'){r.head=[25,14+frame];r.chest=[24,30];r.hands=[[16,44],[33,44]];}
 if(pose==='special'){r.elbows=[[15,24],[35,24]];r.hands=[[8,16],[42,16]];r.head[1]-=frame%2;}
 if(!r.horizontal)r.head[1]+=3;
 return r;
}
export function figureGeometry(r:FigureRig,build:FigureStyle['build']){
 const shoulder=build==='heavy'?9:build==='athletic'?7.2:7,waist=build==='heavy'?6.5:4.2;
 return {shoulders:[[r.chest[0]-shoulder,r.chest[1]-5],[r.chest[0]+shoulder,r.chest[1]-5]] as [Point,Point],shoulder,waist,headRadius:build==='heavy'?3.8:3.3};
}
function tint(hex:string,amount:number){const n=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(shift=>Math.max(0,Math.min(255,((n>>shift)&255)+amount)).toString(16).padStart(2,'0')).join('');}
export function paintFigure(ctx:CanvasRenderingContext2D,r:FigureRig,s:FigureStyle){
 const g=figureGeometry(r,s.build),outline='#111825',heavy=s.build==='heavy';
 const shape=(points:Point[],color:string)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=outline;ctx.lineWidth=.65;ctx.stroke();};
 const oval=(p:Point,rx:number,ry:number,c:string)=>{ctx.beginPath();ctx.ellipse(...p,rx,ry,0,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle=outline;ctx.lineWidth=.55;ctx.stroke();};
 const stroke=(a:Point,b:Point,width:number,color:string)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineWidth=width;ctx.lineCap='round';ctx.strokeStyle=color;ctx.stroke();};
 const segment=(a:Point,b:Point,ra:number,rb:number,color:string)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  const grad=ctx.createLinearGradient(a[0]-nx*ra,a[1]-ny*ra,a[0]+nx*ra,a[1]+ny*ra);grad.addColorStop(0,tint(color,30));grad.addColorStop(.4,color);grad.addColorStop(1,tint(color,-35));
  ctx.beginPath();ctx.moveTo(a[0]+nx*ra,a[1]+ny*ra);ctx.quadraticCurveTo((a[0]+b[0])/2+nx*(ra+.8),(a[1]+b[1])/2+ny*(ra+.8),b[0]+nx*rb,b[1]+ny*rb);ctx.quadraticCurveTo(b[0]+dx/len*rb,b[1]+dy/len*rb,b[0]-nx*rb,b[1]-ny*rb);ctx.lineTo(a[0]-nx*ra,a[1]-ny*ra);ctx.quadraticCurveTo(a[0]-dx/len*ra,a[1]-dy/len*ra,a[0]+nx*ra,a[1]+ny*ra);ctx.fillStyle=grad;ctx.fill();ctx.lineWidth=.65;ctx.strokeStyle=outline;ctx.stroke();
 };
 // Far limbs first: joints, knees and ankles follow the same pose in every costume.
 for(const side of [0,1] as const){
  const hip:Point=[r.hip[0]+(side===0?-2.5:2.5),r.hip[1]];
  segment(hip,r.knees[side],heavy?3.6:2.7,2.1,s.pants);segment(r.knees[side],r.feet[side],2.1,1.4,s.pants);
  oval(r.knees[side],1.7,2.3,tint(s.pants,-12));stroke([r.knees[side][0]-.7,r.knees[side][1]-1],[r.knees[side][0]+1,r.knees[side][1]+1],.5,tint(s.pants,55));
  const [x,y]=r.feet[side];shape([[x-1.7,y-4],[x+1.7,y-4],[x+2.2,y-1],[x+4,y+.2],[x+3.7,y+1],[x-2,y+1]],'#253042');stroke([x-1.5,y],[x+3.5,y+.3],.6,'#8694a7');
 }
 segment(g.shoulders[0],r.elbows[0],heavy?3:2.2,1.6,heavy?s.skin:s.body);segment(r.elbows[0],r.hands[0],1.7,1.1,heavy?s.skin:s.body);
 const cx=r.chest[0],cy=r.chest[1],hx=r.hip[0],hy=r.hip[1],sw=g.shoulder,ww=g.waist;
 const torso=ctx.createLinearGradient(cx-sw,cy,cx+sw,hy);torso.addColorStop(0,s.light);torso.addColorStop(.28,s.body);torso.addColorStop(.72,s.body);torso.addColorStop(1,tint(s.body,-36));
 ctx.beginPath();ctx.moveTo(cx-sw,cy-4);ctx.quadraticCurveTo(cx-3,cy-8,cx,cy-7);ctx.quadraticCurveTo(cx+5,cy-7,cx+sw,cy-4);ctx.quadraticCurveTo(cx+sw+1,cy+2,hx+ww,hy-2);ctx.lineTo(hx+ww,hy+2);ctx.quadraticCurveTo(hx,hy+3,hx-ww,hy+2);ctx.quadraticCurveTo(hx-ww,hy-5,cx-sw,cy-4);ctx.fillStyle=torso;ctx.fill();ctx.strokeStyle=outline;ctx.lineWidth=.8;ctx.stroke();
 stroke([cx-2,cy-6],[hx-1,hy-1],.6,tint(s.light,20));stroke([cx+4,cy+1],[hx+2,hy-1],.6,tint(s.body,-45));
 for(let i=0;i<3;i++)stroke([hx-ww+1,hy-6+i*2],[hx-1,hy-7+i*2],.45,tint(s.light,-10));
 // Neck and clavicles, not a square head planted on a rectangular chest.
 segment([cx,cy-7],[r.head[0]-.7,r.head[1]+4],1.7,1.25,s.skin);
 stroke([cx-4,cy-5],[cx,cy-3],.6,tint(s.skin,-35));stroke([cx,cy-3],[cx+4,cy-5],.6,tint(s.skin,-35));
 const [x,y]=r.head,rad=g.headRadius;
 const face=ctx.createLinearGradient(x-rad,y,x+rad,y+2);face.addColorStop(0,tint(s.skin,26));face.addColorStop(.55,s.skin);face.addColorStop(1,tint(s.skin,-42));
 ctx.beginPath();ctx.moveTo(x-rad,y-2);ctx.bezierCurveTo(x-rad-1,y-4.5,x+rad,y-4.5,x+rad,y-1);ctx.lineTo(x+rad+.8,y+1);ctx.lineTo(x+rad-.3,y+1.5);ctx.quadraticCurveTo(x+rad-.4,y+4,x+.2,y+4);ctx.quadraticCurveTo(x-rad,y+3,x-rad,y-2);ctx.fillStyle=face;ctx.fill();ctx.strokeStyle=outline;ctx.lineWidth=.55;ctx.stroke();
 oval([x-rad+.3,y+1],.85,1.4,s.skin);stroke([x+1,y],[x+2.8,y-.1],.55,'#263047');stroke([x+1.3,y+3],[x+2.9,y+3],.35,'#8c5854');
 const role=s.role,helmet=['shield','jetpack','engineer','heavy','samurai','vane','valkyrie','goliath'].includes(role);
 if(helmet){shape([[x-rad-1,y-3],[x-rad+.3,y-6],[x+rad-1,y-6],[x+rad+1,y-3],[x+rad+1,y-1],[x-rad-1,y-1]],s.body);stroke([x-rad,y-2],[x+rad+1,y-2],.7,s.light);stroke([x+.1,y],[x+rad+.5,y],1,s.accent);}
 else {shape([[x-rad-.6,y],[x-rad-1,y-3],[x-rad+1,y-4.5],[x,y-3.5],[x+2,y-4.5],[x+rad+1,y-3],[x+rad,y-1],[x+1,y-2],[x-1,y],[x-2,y-1]],s.hair);stroke([x-rad,y-3],[x+1,y-4],.5,tint(s.hair,40));}
 // Belt, fabric seams, straps and layered clothing define material rather than solid blocks.
 stroke([hx-ww,hy],[hx+ww,hy],1.5,'#273040');shape([[hx,hy-1],[hx+2,hy-1],[hx+2,hy+1],[hx,hy+1]],'#adb7c6');
 if(['maya','sniper','cipher','twins','oswald'].includes(role)){
  shape([[hx-ww,hy-2],[hx-ww-4,hy+14],[hx-1,hy+9],[hx,hy]],s.body);stroke([hx-ww-3,hy+12],[hx-ww+1,hy+1],.6,s.accent);
 }
 if(role==='ren'||role==='cipher'){
  stroke([x-rad+.2,y-.3],[x+rad+.5,y-.3],1.25,'#46d9e6');stroke([cx-4,cy-6],[cx+3,cy-5],2.4,s.accent);stroke([cx-3,cy-5],[cx-4,cy+1],2,s.accent);
  stroke([cx+sw-1,cy-3],[hx-ww+1,hy-1],1.2,'#202c3e');stroke([cx+sw-1,cy-3],[hx-ww+1,hy-1],.4,'#8290a3');
 }
 if(role==='maya'){
  ctx.beginPath();ctx.moveTo(x-rad,y-3);ctx.bezierCurveTo(x-10,y-6,x-11,y+8,x-8,y+15);ctx.quadraticCurveTo(x-13,y+10,x-11,y+3);ctx.quadraticCurveTo(x-11,y-5,x-rad,y-3);ctx.fillStyle=s.hair;ctx.fill();ctx.strokeStyle=tint(s.hair,38);ctx.lineWidth=.5;ctx.stroke();
  stroke([cx+4,cy-4],[hx+ww-1,hy-1],.7,s.accent);stroke([x-rad,y-3],[x-rad-1,y-2],1.2,s.accent);
 }
 if(role==='leon'){stroke([x-rad+1,y+3],[x+1,y+4],1.2,tint(s.hair,25));stroke([cx+3,cy-4],[cx+3,hy-3],1.4,'#281e29');for(let i=0;i<3;i++)oval([cx+4,cy+i*3],.35,.35,'#a8b2bd');}
 segment(g.shoulders[1],r.elbows[1],heavy?3.3:2.3,1.7,heavy?s.skin:s.body);segment(r.elbows[1],r.hands[1],1.9,1.1,heavy?s.skin:s.body);
 for(const side of [0,1] as const){oval(r.hands[side],heavy?2.4:1.4,heavy?2.6:1.8,role==='leon'?s.accent:s.skin);stroke([r.hands[side][0]-.4,r.hands[side][1]+.2],[r.hands[side][0]+1,r.hands[side][1]+.5],.35,tint(s.skin,-50));}
 if(role==='leon')for(const side of [0,1] as const){segment(r.elbows[side],r.hands[side],2.8,2.2,s.accent);for(let i=0;i<3;i++){const [a,b]=r.hands[side];stroke([a-1.6,b-1+i],[a+1.6,b-1+i],.45,'#ffc987');}}
 if(['heavy','goliath','vane'].includes(role))for(const shoulder of g.shoulders){oval(shoulder,heavy?4.5:3.2,2.7,s.body);stroke([shoulder[0]-2,shoulder[1]-1],[shoulder[0]+2,shoulder[1]-1],1,s.light);}
 if(s.phase===2){stroke([cx-3,cy+1],[cx+3,cy+1],1,s.accent);stroke([cx,cy+1],[hx,hy-4],.6,'#a5f3fc');}
}
