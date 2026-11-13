import type { Enemy, EnemyType } from './types';

/** Native raster canvas; visual poses never change enemy physics or AI. */
export const ENEMY_ART = {
 mib_gunner:{label:'Agente armado',body:'#334155',light:'#7185a3',accent:'#ef4444'},
 mib_shield:{label:'Agente de escudo',body:'#1e3a5f',light:'#6096bd',accent:'#38bdf8'},
 cyber_hound:{label:'Cão cibernético',body:'#475569',light:'#a0aec0',accent:'#ef4444'},
 jetpack:{label:'Soldado de jetpack',body:'#155e75',light:'#67b8cc',accent:'#fb923c'},
 drone:{label:'Drone',body:'#475569',light:'#a5b4c8',accent:'#f43f5e'},
 mutant:{label:'Mutante',body:'#15803d',light:'#86efac',accent:'#c084fc'},
 sniper:{label:'Atirador de precisão',body:'#4c1d5f',light:'#a78bba',accent:'#ff4596'},
 suit_martial:{label:'Agente marcial',body:'#4b5563',light:'#d1d5db',accent:'#f43f5e'},
 samurai:{label:'Samurai',body:'#991b1b',light:'#f87171',accent:'#facc15'},
 turret_engineer:{label:'Instalador de torreta',body:'#a16207',light:'#fbbf24',accent:'#67e8f9'},
 turret:{label:'Torreta montada',body:'#334155',light:'#94a3b8',accent:'#ef4444'},
 heavy_trooper:{label:'Soldado pesado',body:'#475569',light:'#cbd5e1',accent:'#60a5fa'},
} satisfies Record<EnemyType,{label:string;body:string;light:string;accent:string}>;
export const ENEMY_FRAME={w:24,h:32,frames:4} as const;
/** Crop sparse non-humanoid source art to its existing physical draw rectangle. */
export function enemySourceRect(type:EnemyType){
 if(type==='cyber_hound')return{x:0,y:10,w:24,h:22};
 if(type==='drone')return{x:0,y:8,w:24,h:24};
 if(type==='turret')return{x:0,y:4,w:24,h:25};
 return{x:0,y:0,w:24,h:32};
}
export function enemyPalette(type:EnemyType):Record<string,string>{
 const art=ENEMY_ART[type];return{O:'#070c18',A:art.body,L:art.light,C:art.accent,S:type==='mutant'?'#86efac':'#fed7aa',K:'#243047',W:'#f1f5f9',V:'#67e8f9'};
}
/** 0 idle, 1/2 locomotion, 3 anticipation/action. Barrels, shields and aim remain dynamic overlays. */
export function enemyRows(type:EnemyType,frame=0):string[]{
 const grid=Array.from({length:32},()=>Array<string>(24).fill('.'));
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(grid[yy]?.[xx]!==undefined)grid[yy][xx]=color;};
 const block=(x:number,y:number,w:number,h:number,color='A')=>{rect(x-1,y-1,w+2,h+2,'O');rect(x,y,w,h,color);};
 const stride=frame===1?-2:frame===2?2:0,action=frame===3;
 const legs=(x=8,y=22,w=4)=>{block(x-stride,y,w,8,'K');block(x+7+stride,y,w,8,'K');rect(x-stride-1,29,w+2,2,'L');rect(x+6+stride,29,w+2,2,'L');};
 const head=(x=9,y=3,helmet=false)=>{block(x,y,7,8,'S');rect(x-1,y-1,9,3,helmet?'L':'K');rect(x+3,y+3,4,2,'C');};
 const torso=(x=7,y=12,w=11,h=10)=>{block(x,y,w,h);rect(x,y,2,h,'L');};
 const rifle=(long=false)=>{block(long?12:15,action?14:17,long?11:8,3,'K');rect(long?13:16,action?13:16,long?5:3,1,'L');rect(17,action?17:20,2,3,'K');};
 if(type==='cyber_hound'){
  for(const x of [4,16]){block(x,22,3,7,'K');block(x+stride,27,5,3,'L');}
  block(3,16,15,8);rect(4,16,12,2,'L');block(17,12,6,9);rect(19,11,2,4,'L');rect(21,15,2,2,'C');block(20,20,4,3,'K');rect(1,13,3,6,'L');rect(0,12,2,4,'C');rect(9,18,4,2,'C');
  if(action){rect(20,22,4,2,'W');rect(21,24,2,2,'W');}
 }else if(type==='drone'){
  const bob=frame===2?1:0;block(5,11+bob,14,10);block(0,13+bob,5,4,'L');block(19,13+bob,5,4,'L');rect(0,9+bob,8,1,'L');rect(16,9+bob,8,1,'L');rect(3,10+bob,1,4,'K');rect(20,10+bob,1,4,'K');block(9,14+bob,7,4,'C');rect(10,14+bob,2,2,'W');block(11,22+bob,4,4,'K');rect(7,24+bob,2,action?6:3,'V');rect(17,24+bob,2,action?6:3,'V');
 }else if(type==='turret'){
  block(3,5,18,23);rect(4,6,3,20,'L');rect(8,7,11,2,'L');block(7,12,11,11,'K');rect(9,14,7,7,'A');rect(11,16,3,3,'C');rect(4,25,16,2,'L');for(const y of [9,23])for(const x of [5,18])rect(x,y,1,1,'W');
 }else if(type==='mutant'){
  legs(6,22,5);torso(4,12,15,11);head(8,5);block(1,15,5,10,'S');block(18,action?10:16,5,10,'S');rect(2,24,1,4,'W');rect(4,24,1,4,'W');rect(20,action?18:25,1,4,'W');rect(22,action?18:25,1,4,'W');rect(6,10,3,4,'L');rect(13,14,2,7,'C');rect(8,17,2,3,'L');
 }else if(type==='heavy_trooper'){
  legs(6,23,5);torso(3,11,18,12);head(8,2,true);rect(7,5,12,3,'K');rect(9,6,8,1,'V');block(1,11,5,6,'L');block(18,11,5,6,'L');rect(8,13,9,3,'L');rect(9,18,7,2,'C');block(17,19,7,5,'K');rect(21,19,2,5,'L');
 }else if(type==='sniper'){
  legs(8,23,3);torso(7,11,9,13);head(9,3);block(6,1,11,3,'A');rect(5,9,3,17,'A');rect(4,17,2,9,'L');rect(9,13,2,9,'K');block(5,14,6,3,'S');rifle(true);block(15,action?10:13,4,2,'C');
 }else if(type==='suit_martial'){
  legs(7,22,4);torso(7,12,10,11);head(9,3);rect(11,12,2,8,'W');rect(12,14,1,7,'C');block(3,action?10:14,4,5,'A');block(2,action?6:10,4,4,'S');block(17,action?12:17,5,4,'A');block(20,action?9:14,3,4,'S');rect(6,20,12,2,'K');
 }else if(type==='samurai'){
  legs(7,23,4);torso(5,12,14,12);head(9,4,true);rect(4,5,16,2,'C');rect(5,2,2,4,'C');rect(17,2,2,4,'C');block(3,12,4,5,'L');block(17,12,4,5,'L');for(const y of [16,19,22])rect(7,y,10,1,'K');rect(11,11,2,3,'C');rect(21,action?1:8,1,19,'W');rect(20,action?2:9,1,18,'L');rect(18,action?19:26,6,1,'C');
 }else if(type==='jetpack'){
  legs(8,22,3);torso(7,12,10,10);head(9,3,true);block(1,12,4,12,'L');rect(2,14,2,6,'C');rect(1,25,4,frame===1?5:3,'C');rect(2,25,2,frame===1?3:2,'W');block(17,15,4,5);rifle();rect(8,13,8,2,'L');
 }else if(type==='turret_engineer'){
  legs(8,23,3);torso(7,13,10,10);head(9,4,true);rect(7,4,12,2,'C');rect(8,1,9,3,'L');block(1,12,5,14,'K');rect(1,14,4,7,'L');rect(2,16,2,3,'C');rect(9,15,7,1,'L');rect(9,19,7,1,'L');block(17,action?21:17,4,4,'S');rect(21,action?22:15,2,7,'L');rect(20,action?21:14,4,2,'L');rect(21,action?21:14,2,1,'.');
 }else if(type==='mib_shield'){
  legs(8,23,4);torso(6,12,12,11);head(9,3,true);rect(8,6,10,2,'K');rect(9,7,8,1,'V');block(3,13,3,9);rect(2,19,2,8,'L');rect(8,14,8,2,'L');rect(10,18,5,3,'C');block(18,17,4,6,'L');
 }else{
  legs();torso();head();rect(11,12,2,7,'W');rect(12,14,1,7,'C');block(4,14,3,8);block(17,14,3,6);rifle();
 }
 return grid.map(row=>row.join(''));
}
/** Read state only: no damage events, timers, RNG or writes from rendering. */
export function enemyVisualFrame(enemy:Pick<Enemy,'vx'|'telegraph'|'stunTimer'|'ai'>,tick:number):number{
 if((enemy.stunTimer??0)>0||enemy.ai?.state==='stunned'||enemy.ai?.state==='dead')return 0;
 if(enemy.telegraph>0||enemy.ai?.state==='attack')return 3;
 return Math.abs(enemy.vx)>0.2?1+Math.floor(tick/6)%2:0;
}
const cache=new Map<string,HTMLCanvasElement>();
export function getEnemyPixelSprite(type:EnemyType,frame=0):HTMLCanvasElement{
 const key=`${type}:${frame}`,cached=cache.get(key);if(cached)return cached;
 const canvas=document.createElement('canvas');canvas.width=24;canvas.height=32;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Enemy canvas unavailable');
 const rows=enemyRows(type,frame),palette=enemyPalette(type);ctx.imageSmoothingEnabled=false;
 for(let y=0;y<32;y++)for(let x=0;x<24;x++){const color=palette[rows[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}
 cache.set(key,canvas);return canvas;
}
