import type { FigureRig, FigureStyle, Point } from './illustratedFigure';
export function paintEquipment(ctx:CanvasRenderingContext2D,role:string,r:FigureRig,s:FigureStyle,action:boolean){
 const path=(points:Point[],color:string)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.lineWidth=.65;ctx.strokeStyle='#111825';ctx.stroke();};
 const line=(a:Point,b:Point,width:number,color:string)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
 const metal=ctx.createLinearGradient(10,15,30,40);metal.addColorStop(0,'#adc4d0');metal.addColorStop(.35,'#4e677d');metal.addColorStop(1,'#203247');
 const capsule=(x:number,y:number,w:number,h:number,color:string|CanvasGradient)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(w/2,2));ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#121c2b';ctx.lineWidth=.7;ctx.stroke();};
 const [cx,cy]=r.chest;
 if(['gunner','sniper','jetpack'].includes(role)){
  const [x,y]=r.hands[1];const long=role==='sniper',length=long?15:role==='vane'?10:8;
  path([[x-4,y-2],[Math.min(47,x+length),y-2],[Math.min(47,x+length),y],[x+2,y+1],[x,y+4],[x-2,y+4],[x-1,y]],'#253342');line([x-3,y-2],[Math.min(47,x+length),y-2],.6,'#9eaebd');
  if(long){capsule(x,y-5,5,2,'#4a6377');line([x+4,y-4],[x+5,y-4],1,s.accent);}
 }
 if(role==='shield'||role==='heavy'){capsule(r.hands[1][0]-1,r.hands[1][1]-1,2,9,metal);capsule(cx-5,cy-4,10,10,metal);line([cx-3,cy-1],[cx+3,cy-1],1,s.accent);}
 if(role==='engineer'||role==='jetpack'||role==='valkyrie'){
  const x=cx-12,y=cy-6;capsule(x,y,5,17,metal);capsule(x+1,y+2,3,9,s.body);line([x+2,y+3],[x+2,y+7],1,s.accent);
  if(role==='engineer'){const [a,b]=r.hands[1];line([a,b-3],[a,b+5],1.3,'#acbdc9');path([[a-2,b-4],[a-1,b-6],[a,b-4],[a+1,b-6],[a+2,b-4],[a+1,b-2],[a-1,b-2]],'#becbd0');}
  else {path([[x+.5,y+17],[x+4.5,y+17],[x+3,y+24+(action?3:0)],[x+1.5,y+21]],'#f49b52');line([x+2.5,y+17],[x+2.5,y+21],1.3,'#fef3b5');}
  if(role==='valkyrie')for(const side of [-1,1]){const a=cx+side*10;capsule(a-2,cy-8,4,19,metal);path([[a,cy-8],[a+side*7,cy-16],[a+side*5,cy+3],[a,cy+11]],s.body);line([a,cy-7],[a+side*5,cy-13],.8,s.accent);}
 }
 if(role==='samurai'||role==='kusanagi'){
  const [x,y]=r.hands[1];const end:Point=action?[Math.min(47,x+10),Math.max(1,y-6)]:[Math.min(46,x+2),Math.max(1,y-27)];line([x,y],end,1.7,'#b9edf2');line([x-.5,y],end,.55,'#ffffff');line([x-2,y-1],[x+3,y+1],1.1,s.accent);
  for(let i=0;i<4;i++)line([cx-5,cy+i*3],[cx+5,cy+i*3],.7,'#242b38');
  const [hx,hy]=r.head;path([[hx-4,hy-3],[hx-6,hy-8],[hx-3,hy-6],[hx-2,hy-4]],s.accent);
 }
 if(role==='vane'){
  for(const hand of r.hands){capsule(hand[0]-3,hand[1]-4,9,6,metal);line([hand[0]+3,hand[1]-2],[hand[0]+6,hand[1]-2],1.4,s.accent);line([hand[0]+3,hand[1]],[hand[0]+6,hand[1]],1.4,s.accent);}
  capsule(cx-4,cy-2,9,6,metal);line([cx-2,cy],[cx+3,cy],.8,s.accent);
 }
 if(role==='mutant')for(const [x,y]of r.hands)for(let i=0;i<3;i++)path([[x-1+i*.8,y+.5],[x-1+i*.8,y+4],[x+i*.8,y+1]],'#d6e3c6');
 if(s.phase===2&&role==='cipher'){line([r.head[0]-3,r.head[1]+2],[r.head[0]+3,r.head[1]+2],1.3,s.accent);}
 if(s.phase===2&&role==='kusanagi'){const [x,y]=r.head;path([[x+2,y-4],[x+6,y-9],[x+5,y-2]],s.accent);}
 if(role==='sniper'){ctx.beginPath();ctx.moveTo(cx-6,cy-5);ctx.bezierCurveTo(cx-14,cy,cx-11,r.hip[1]+10,cx-14,r.hip[1]+16);ctx.lineTo(cx-4,r.hip[1]+10);ctx.lineTo(cx-4,cy-3);ctx.fillStyle=s.body;ctx.fill();ctx.strokeStyle=s.light;ctx.lineWidth=.5;ctx.stroke();}
 if(role==='twins'||role==='oswald'||role==='cipher')for(const hand of r.hands)if(action){const glow=ctx.createRadialGradient(...hand,.2,...hand,3.5);glow.addColorStop(0,'#f8ffff');glow.addColorStop(.3,s.accent);glow.addColorStop(1,'#58dae000');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(...hand,3.5,0,Math.PI*2);ctx.fill();}
}
/** Curved mechanical/creature silhouettes in the same 48 × 64 design space. */
export function paintCreature(ctx:CanvasRenderingContext2D,kind:string,body:string,light:string,accent:string,frame:number,phase=1){
 const active=kind==='hound'?frame===3:frame===2;
 const plate=(points:Point[],color=body)=>{const grad=ctx.createLinearGradient(4,8,42,57);grad.addColorStop(0,light);grad.addColorStop(.3,color);grad.addColorStop(1,'#192838');ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='#0d1725';ctx.lineWidth=.8;ctx.stroke();};
 const oval=(x:number,y:number,rx:number,ry:number,color:string)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#172333';ctx.lineWidth=.6;ctx.stroke();};
 const line=(a:Point,b:Point,w:number,c:string)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke();};
 if(kind==='hound'){
  for(const side of [0,1])for(const back of [0,1]){const x=back?31:11,shift=(frame===1?-2:frame===2?2:0)*(back?1:-1);line([x,33],[x+shift,45+side*2],4,'#536d82');line([x+shift,45+side*2],[x-3+shift,58],2.6,light);plate([[x-6+shift,57],[x+1+shift,57],[x+3+shift,61],[x-6+shift,61]]);}
  plate([[5,29],[13,21],[28,22],[35,18],[42,21],[41,39],[30,40],[14,38],[6,36]]);line([9,28],[28,27],1,light);plate([[32,18],[35,8],[39,17],[46,22],[46,31],[37,35],[31,29]]);line([40,24],[44,24],1.6,accent);plate([[38,31],[47,31],[44,active?40:35],[37,36]],'#253a4c');line([6,29],[2,16],2.5,light);line([15,32],[25,32],1.3,accent);
 }else if(kind==='drone'){
  for(const x of [7,40]){line([24,31],[x,26],3,light);oval(x,24,6,2,'#9aaebc');oval(x,24,4,1,'#273d50');line([x,25],[x,32],1.5,light);}
  plate([[12,23],[24,18],[36,23],[38,36],[31,44],[17,44],[10,36]]);oval(25,31,8,9,'#172c42');oval(26,31,5,6,accent);oval(27,29,2,2,'#effcff');plate([[20,44],[29,44],[27,50],[22,50]],'#243f50');line([19,45],[17,55],1.5,'#69cddd');line([30,45],[32,55],1.5,'#69cddd');
 }else if(kind==='turret'){
  plate([[4,9],[11,4],[37,4],[44,10],[44,55],[38,60],[10,60],[4,54]]);plate([[10,16],[17,11],[35,12],[39,21],[37,46],[30,52],[15,49],[9,41]],'#2e445a');oval(25,30,12,15,'#1c2e41');oval(25,30,8,10,light);oval(25,30,5,6,body);oval(25,30,2,3,accent);for(const x of [9,39])for(const y of [10,54])oval(x,y,1,1,'#d5e1eb');
 }else if(kind==='mecha'){
  for(const side of [-1,1]){
   const x=24+side*10;plate([[x-5,36],[x+5,36],[x+4,48],[x+2,51],[x-4,49]],body);oval(x,47,3.4,3.6,'#1d3446');plate([[x-4,49],[x+3,49],[x+4,59],[x+7,62],[x-6,62],[x-6,59]],body);line([x-2,51],[x-2,57],1.1,phase===2?accent:light);
  }
  plate([[12,17],[21,14],[34,16],[39,24],[35,41],[25,45],[13,40],[9,27]]);plate([[16,21],[32,21],[33,32],[16,32]],'#30495c');oval(25,27,5,6,'#162838');oval(25,27,2.5,3.5,phase===2?accent:'#71d9e5');
  plate([[18,4],[29,4],[33,9],[31,16],[19,16],[16,10]],body);line([20,10],[30,10],2,accent);line([17,5],[28,5],1,light);
  for(const side of [-1,1]){const x=24+side*17,elbowY=frame===1?25:frame===2?34:32,handY=frame===1?18:frame===2?45:42;oval(x,22,5.5,6,light);line([x,24],[x,elbowY],6,body);oval(x,elbowY,2.8,3,'#1b3042');plate([[x-4,elbowY],[x+4,elbowY],[x+5,handY],[x+3,handY+3],[x-4,handY+3]],body);line([x-3,handY+1],[x+3,handY+1],1.2,light);if(phase===2)line([x-2,22],[x+2,22],1.3,accent);}
 }else if(kind==='dino'){
  for(const x of [14,32]){line([x,38],[x-2,48],7,body);line([x-2,48],[x+2,58],4,light);plate([[x-2,57],[x+6,57],[x+9,61],[x-2,61]]);}
  plate([[3,38],[15,23],[30,23],[38,35],[33,47],[18,48],[11,41],[1,46]]);plate([[28,19],[34,12],[46,16],[47,24],[37,28],[30,25]]);plate([[34,27],[47,26],[44,active?34:29],[35,31]],'#35564a');line([40,19],[44,19],1.3,accent);for(let x=36;x<47;x+=3)line([x,25],[x,28],1,'#d9f2e8');line([18,28],[28,28],1.2,light);
  oval(23,14,3.2,4,'#e0b698');plate([[19,19],[26,18],[29,28],[17,29]],'#d8e5df');line([23,13],[26,13],1,'#83dfe6');line([23,7],[26,9],1.5,'#d2e6df');
  if(phase===2){for(let x=8;x<31;x+=5)plate([[x,30],[x+1,22],[x+4,27]],accent);line([14,36],[32,36],1.2,accent);}
 }else if(kind==='eye'){
  const grad=ctx.createRadialGradient(21,27,2,24,32,28);grad.addColorStop(0,'#6a70b5');grad.addColorStop(.6,body);grad.addColorStop(1,'#131b36');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(24,32,21,27,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=light;ctx.lineWidth=.7;ctx.stroke();
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;line([24+Math.cos(a)*18,32+Math.sin(a)*23],[24+Math.cos(a)*22,32+Math.sin(a)*30],.7,accent);}
  ctx.beginPath();ctx.moveTo(7,32);ctx.bezierCurveTo(17,active?13:frame===1?26:19,31,active?13:frame===1?26:19,42,32);ctx.bezierCurveTo(31,frame===1?37:46,17,frame===1?37:46,7,32);ctx.fillStyle='#dfe9f4';ctx.fill();oval(26,32,6,frame===1?4:10,accent);oval(27,32,1.6,frame===1?3:8,'#122138');oval(25,28,1.3,2,'#f0ffff');
 }
}
