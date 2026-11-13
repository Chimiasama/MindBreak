import type { BossConfig, BossRuntime } from './types';
export type BossKind=BossConfig['behavior'];
export const BOSS_ART:Record<BossKind,{label:string;body:string;light:string;accent:string}>={
 cipher:{label:'Cipher-01',body:'#58356e',light:'#b78bd4',accent:'#f0abfc'},
 valkyrie:{label:'Valkyrie-7',body:'#155e75',light:'#7dd3fc',accent:'#fb923c'},
 goliath:{label:'Goliath-IV',body:'#475569',light:'#cbd5e1',accent:'#fbbf24'},
 arisawa:{label:'Arisawa / Cyber-T-Rex',body:'#166534',light:'#86efac',accent:'#c084fc'},
 twins:{label:'Castor e Pólux',body:'#7c2d52',light:'#fda4af',accent:'#facc15'},
 kusanagi:{label:'Kusanagi',body:'#991b1b',light:'#fca5a5',accent:'#67e8f9'},
 vane:{label:'Comandante Vane',body:'#1e3a5f',light:'#93c5fd',accent:'#fb923c'},
 oswald:{label:'Oswald / Entidade Zero',body:'#312e81',light:'#a5b4fc',accent:'#f472b6'},
};
export const BOSS_FRAME={w:48,h:64,states:['ready','windup','active','recover'] as const};
export function bossPalette(kind:BossKind,phase:1|2,twin=false):Record<string,string>{
 const a=BOSS_ART[kind];return{O:'#070c18',A:twin?'#075985':a.body,L:twin?'#7dd3fc':a.light,C:phase===2?'#fef08a':a.accent,S:'#fed7aa',K:'#263449',W:'#f8fafc',V:'#67e8f9',H:'#4b2536'};
}
/** Four readable poses per phase; source art is confined to the unchanged physical draw box. */
export function bossRows(kind:BossKind,phase:1|2,frame=0,twin=false):string[]{
 const grid=Array.from({length:64},()=>Array<string>(48).fill('.'));
 const rect=(x:number,y:number,w:number,h:number,c:string)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(grid[yy]?.[xx]!==undefined)grid[yy][xx]=c;};
 const block=(x:number,y:number,w:number,h:number,c='A')=>{rect(x-1,y-1,w+2,h+2,'O');rect(x,y,w,h,c);};
 const line=(x:number,y:number,xx:number,yy:number,c:string)=>{const n=Math.max(Math.abs(xx-x),Math.abs(yy-y),1);for(let i=0;i<=n;i++)rect(Math.round(x+(xx-x)*i/n),Math.round(y+(yy-y)*i/n),2,2,c);};
 const oval=(cx:number,cy:number,rx:number,ry:number,c:string)=>{for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++)if((x-cx)**2/rx**2+(y-cy)**2/ry**2<=1)rect(x,y,1,1,c);};
 const action=frame===2,windup=frame===1,recover=frame===3,bob=recover?2:0;
 const head=(x=19,y=5)=>{block(x,y+bob,12,14,'S');rect(x,y+bob,12,4,'K');rect(x+6,y+7+bob,6,2,'C');};
 const legs=(wide=false)=>{block(wide?11:16,43,wide?11:7,17,'K');block(wide?29:28,43,wide?11:7,17,'K');rect(wide?9:14,58,wide?14:10,4,'L');rect(wide?28:27,58,wide?14:10,4,'L');};
 const torso=(x=13,y=23,w=23,h=22)=>{block(x,y+bob,w,h);rect(x,y+bob,3,h,'L');};
 if(kind==='oswald'&&phase===2){
  for(let i=0;i<5;i++){const x=5+i*9;line(24,34,x,4+i%2*4,'L');line(24,34,x,59-i%2*3,'C');}
  oval(24,32,23,27,'O');oval(24,32,21,25,'A');oval(24,32,18,20,'L');oval(24,32,17,19,'A');
  oval(24,32,16,windup?5:recover?9:12,'W');oval(26,32,action?9:7,windup?4:10,'C');rect(26,windup?29:24,3,windup?7:17,'O');rect(26,26,1,5,'V');
 }else if(kind==='arisawa'){
  block(9,28,27,22);block(8,44,10,14,'K');block(28,44,10,14,'K');rect(7,57,13,4,'L');rect(28,57,14,4,'L');
  for(let i=0;i<4;i++)block(5+i*4,35+i*3,5,5,'A');
  block(28,action?13:18,18,14);rect(31,action?15:20,14,3,'L');rect(40,action?18:23,3,2,'C');rect(33,action?23:28,14,3,'K');for(let x=34;x<47;x+=4)rect(x,action?23:28,2,3,'W');
  block(18,18,9,12,'K');block(18,10+bob,7,8,'S');rect(17,8+bob,9,3,'W');rect(21,13+bob,6,2,'V');rect(19,19,6,8,'W');block(34,34,4,7,'L');
  if(phase===2){for(let i=0;i<4;i++){block(10+i*5,25-i%2*3,3,6,'C');}rect(11,36,22,3,'C');rect(32,action?17:22,12,1,'V');}
 }else if(kind==='goliath'||kind==='vane'){
  legs(true);torso(9,23,30,24);head(18,6);block(3,20,12,13,'L');block(34,20,11,13,'L');
  rect(17,27,16,7,'K');rect(20,29,10,3,phase===2?'C':'V');rect(16,38,19,2,'L');
  if(kind==='goliath'){block(18,6+bob,12,14,'A');rect(18,10+bob,12,4,'K');rect(20,11+bob,9,2,'C');block(2,action?31:36,11,16,'A');block(35,windup?20:action?31:36,11,16,'A');rect(3,action?42:47,9,3,'L');rect(36,windup?31:action?42:47,9,3,'L');rect(17,4,16,4,'L');}
  else {block(1,action?26:31,11,9,'K');block(36,action?26:31,11,9,'K');rect(1,action?28:33,7,3,'C');rect(40,action?28:33,7,3,'C');rect(16,3,20,4,'L');rect(20,0,11,3,'A');rect(19,40,14,2,'C');}
  if(phase===2){rect(4,23,9,2,'C');rect(36,23,8,2,'C');rect(21,10,11,2,'C');rect(16,46,4,9,'C');rect(30,46,4,9,'C');}
 }else{
  legs();torso();head();
  block(7,windup?15:26,6,17,'A');block(36,action?18:windup?12:26,6,17,'A');
  if(kind==='cipher'){
   rect(18,20+bob,15,4,'L');rect(16,29,18,2,'C');rect(20,35,9,9,'K');rect(23,36,3,6,'C');rect(12,38,4,17,'A');rect(35,38,4,17,'A');rect(15,4+bob,21,2,'L');
   if(phase===2){rect(16,6+bob,3,15,'C');rect(31,6+bob,3,15,'C');rect(18,25,16,2,'V');}
   if(windup||action){rect(3,12,2,10,'V');rect(42,8,2,11,'C');}
  }else if(kind==='valkyrie'){
   for(const side of [-1,1]){const x=side<0?1:38;block(x,windup?12:22,8,23,'L');rect(x+2,windup?14:24,4,16,'K');rect(x+3,windup?16:26,2,12,'V');rect(x+1,windup?36:46,6,action?9:5,'C');}
   rect(15,3,20,4,'L');rect(20,11,14,3,'V');rect(19,27,12,3,'L');
   if(phase===2){line(1,9,12,23,'C');line(46,9,36,23,'C');rect(17,34,17,2,'C');}
  }else if(kind==='twins'){
   rect(20,23,10,5,'W');rect(24,28,3,13,'C');rect(13,44,8,10,'A');rect(31,44,7,10,'A');rect(twin?17:27,4,5,7,'L');
   if(windup||action){oval(6,windup?17:23,4,6,'C');oval(42,windup?13:20,4,6,'V');}
   if(phase===2){rect(17,18,18,2,'C');rect(13,33,22,2,'V');rect(21,7,3,5,'C');}
  }else if(kind==='kusanagi'){
   rect(15,7,20,3,'C');rect(14,10,3,14,'L');for(const y of [27,32,37,42])rect(16,y,20,2,'K');rect(20,25,3,17,'L');
   if(action){line(8,13,46,33,'W');line(8,15,46,35,'V');rect(6,10,3,7,'C');}else{line(43,windup?1:17,42,51,'W');line(44,windup?1:17,43,51,'V');rect(38,48,9,2,'C');}
   if(phase===2){rect(16,1,4,6,'C');rect(30,1,4,6,'C');rect(28,12,8,2,'V');}
  }else{
   rect(19,21,13,5,'W');rect(24,26,3,17,'C');rect(12,42,8,15,'A');rect(32,42,7,15,'A');rect(18,2,17,4,'W');
   if(windup||action){oval(5,windup?14:24,4,4,'C');oval(43,windup?14:24,4,4,'V');}
  }
 }
 return grid.map(row=>row.join(''));
}
export function bossVisualFrame(boss:Pick<BossRuntime,'mind'|'telegraph'>){
 if(boss.mind)return BOSS_FRAME.states.indexOf(boss.mind.state);
 return boss.telegraph?1:0;
}
const cache=new Map<string,HTMLCanvasElement>();
export function getBossSprite(kind:BossKind,phase:1|2,frame:number,twin=false){
 const key=`${kind}:${phase}:${frame}:${twin}`,existing=cache.get(key);if(existing)return existing;
 const c=document.createElement('canvas');c.width=48;c.height=64;const ctx=c.getContext('2d');if(!ctx)throw Error('Boss canvas unavailable');
 const rows=bossRows(kind,phase,frame,twin),palette=bossPalette(kind,phase,twin);ctx.imageSmoothingEnabled=false;
 for(let y=0;y<64;y++)for(let x=0;x<48;x++){const color=palette[rows[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}
 cache.set(key,c);return c;
}
export function drawBossSprite(ctx:CanvasRenderingContext2D,boss:BossRuntime,twin=false){
 const x=twin?boss.twinX:boss.x,y=twin?boss.twinY:boss.y;if(x===undefined||y===undefined)return;
 ctx.save();ctx.translate(x+boss.w/2,y+boss.h/2);ctx.scale(boss.facing,1);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(getBossSprite(boss.behavior,boss.phase,bossVisualFrame(boss),twin),-boss.w/2,-boss.h/2,boss.w,boss.h);ctx.restore();
}
