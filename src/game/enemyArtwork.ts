import type { Enemy, EnemyType } from './types';
import { figureRig, paintFigure, type FigureStyle } from './illustratedFigure';
import { paintEquipment, paintCreature } from './illustratedEquipment';
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
export const ENEMY_FRAME={w:96,h:128,frames:4} as const;
export function enemySourceRect(_type:EnemyType){return{x:0,y:0,w:ENEMY_FRAME.w,h:ENEMY_FRAME.h};}
export const ENEMY_ROLES:Record<EnemyType,string>={mib_gunner:'gunner',mib_shield:'shield',cyber_hound:'hound',jetpack:'jetpack',drone:'drone',mutant:'mutant',sniper:'sniper',suit_martial:'martial',samurai:'samurai',turret_engineer:'engineer',turret:'turret',heavy_trooper:'heavy'};
export function enemyRig(type:EnemyType,frame:number){
 const rig=figureRig(frame===1||frame===2?'run':frame===3?'attack1':'idle',frame===1?1:frame===2?4:frame===3?1:0);
 if(type==='turret_engineer'&&frame===3){rig.elbows[1]=[34,37];rig.hands[1]=[39,48];}
 if(type==='suit_martial'){rig.elbows[0]=[15,26];rig.hands[0]=[17,21];if(frame===0){rig.elbows[1]=[34,25];rig.hands[1]=[37,19];}}
 if(type==='mutant'){rig.elbows[0]=[12,36];rig.hands[0]=[10,46];rig.elbows[1]=[37,frame===3?24:35];rig.hands[1]=[40,frame===3?17:45];}
 return rig;
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
 const c=document.createElement('canvas');c.width=ENEMY_FRAME.w;c.height=ENEMY_FRAME.h;const ctx=c.getContext('2d');if(!ctx)throw Error('Enemy canvas unavailable');ctx.scale(2,2);
 const art=ENEMY_ART[type],role=ENEMY_ROLES[type];
 if(['hound','drone','turret'].includes(role))paintCreature(ctx,role,art.body,art.light,art.accent,frame);
 else {
  const rig=enemyRig(type,frame),s:FigureStyle={body:art.body,light:art.light,accent:art.accent,pants:type==='mutant'?'#384752':'#2c3a4e',skin:type==='mutant'?'#83b985':'#d9b28f',hair:'#2c2733',build:type==='mutant'||type==='heavy_trooper'?'heavy':'athletic',role};
  paintFigure(ctx,rig,s);paintEquipment(ctx,role,rig,s,frame===3);
 }
 cache.set(key,c);return c;
}
