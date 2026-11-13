import type { BossConfig, BossRuntime } from './types';
import { figureRig, paintFigure, type FigureStyle } from './illustratedFigure';
import { paintEquipment, paintCreature } from './illustratedEquipment';
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
export const BOSS_FRAME={w:144,h:192,states:['ready','windup','active','recover'] as const};
export function bossStyle(kind:BossKind,phase:1|2,twin=false):FigureStyle{
 const a=BOSS_ART[kind];return{body:twin?'#146781':a.body,light:twin?'#8ac6dd':a.light,accent:phase===2?'#ead47b':a.accent,pants:'#29394e',skin:kind==='goliath'?'#92a7b5':'#deb18d',hair:twin?'#385c75':'#332d42',build:kind==='goliath'||kind==='vane'?'heavy':'athletic',role:kind,phase};
}
export function bossRig(kind:BossKind,frame:number,twin=false){
 const pose=frame===1?'special':frame===2?'attack1':frame===3?'hurt':'idle',rig=figureRig(pose,frame===2?1:0);
 if(kind==='vane'){rig.elbows=[[12,30],[36,30]];rig.hands=[[12,36],[37,36]];if(frame===2)rig.hands=[[14,28],[42,28]];}
 if(kind==='goliath'){rig.feet=[[13,61],[36,61]];rig.hands=[[12,frame===1?19:frame===2?42:39],[38,frame===1?19:frame===2?42:39]];}
 if(twin){rig.head[0]-=1;rig.hands[0][1]-=1;}
 return rig;
}
export function bossVisualFrame(boss:Pick<BossRuntime,'mind'|'telegraph'>){
 if(boss.mind)return BOSS_FRAME.states.indexOf(boss.mind.state);
 return boss.telegraph?1:0;
}
const cache=new Map<string,HTMLCanvasElement>();
export function getBossSprite(kind:BossKind,phase:1|2,frame:number,twin=false){
 const key=`${kind}:${phase}:${frame}:${twin}`,cached=cache.get(key);if(cached)return cached;
 const c=document.createElement('canvas');c.width=BOSS_FRAME.w;c.height=BOSS_FRAME.h;const ctx=c.getContext('2d');if(!ctx)throw Error('Boss canvas unavailable');ctx.scale(3,3);
 const s=bossStyle(kind,phase,twin);
 if(kind==='goliath'||kind==='arisawa'||kind==='oswald'&&phase===2)paintCreature(ctx,kind==='goliath'?'mecha':kind==='arisawa'?'dino':'eye',s.body,s.light,s.accent,frame,phase);
 else {const rig=bossRig(kind,frame,twin);paintFigure(ctx,rig,s);paintEquipment(ctx,kind,rig,s,frame===1||frame===2);}
 cache.set(key,c);return c;
}
export function drawBossSprite(ctx:CanvasRenderingContext2D,boss:BossRuntime,twin=false){
 const x=twin?boss.twinX:boss.x,y=twin?boss.twinY:boss.y;if(x===undefined||y===undefined)return;
 ctx.save();ctx.translate(x+boss.w/2,y+boss.h/2);ctx.scale(boss.facing,1);ctx.imageSmoothingEnabled=true;
 ctx.drawImage(getBossSprite(boss.behavior,boss.phase,bossVisualFrame(boss),twin),-boss.w/2,-boss.h/2,boss.w,boss.h);ctx.restore();
}
