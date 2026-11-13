import { SWINGS } from './combat';
export const HERO_FRAME = { w:24, h:32, scale:2, pivot:{x:12,y:32}, hurtbox:{x:4,y:4,w:16,h:28}, columns:8 } as const;
const clip=(durations:number[],loop=true)=>({durations,loop});
export const HERO_CLIPS = {
 idle:clip([12,12,12,12]), run:clip([5,5,5,5,5,5]), jump:clip([6,8],false), fall:clip([8,8]),
 wall:clip([10,10]), climb:clip([5,5,5,5]), hang:clip([12,12]), vault:clip([3,3,4],false),
 dash:clip([3,3,4],false), slide:clip([6,6]),
 attack1:clip([1,SWINGS[0].activeTicks-1,SWINGS[0].totalTicks-SWINGS[0].activeTicks],false),
 attack2:clip([1,SWINGS[1].activeTicks-1,SWINGS[1].totalTicks-SWINGS[1].activeTicks],false),
 attack3:clip([1,SWINGS[2].activeTicks-1,SWINGS[2].totalTicks-SWINGS[2].activeTicks],false),
 hurt:clip([5,7],false), stun:clip([7,7]), special:clip([5,5,5,5]), flight:clip([7,7,7,7]), death:clip([5,5,6,8],false),
};
export type HeroPose = keyof typeof HERO_CLIPS;
export interface HeroVisualInput {
 hp:number; vx:number; vy:number; grounded:boolean; onWall:number; hangingCeiling:boolean;
 isDashing:boolean; isSliding:boolean; isFlying:boolean; slashTimer:number; comboStep:number; stunTimer:number;
 climbHeld?:boolean; hurtTicks?:number; specialTicks?:number; vaultTicks?:number;
}
export function heroPose(p:HeroVisualInput):HeroPose {
 if(p.hp<=0)return'death';if(p.stunTimer>0)return'stun';if(p.hurtTicks)return'hurt';if(p.specialTicks)return'special';
 if(p.isSliding)return'slide';if(p.slashTimer>0)return(['attack1','attack2','attack3'] as const)[p.comboStep];
 if(p.isDashing)return'dash';if(p.hangingCeiling)return'hang';if(p.vaultTicks)return'vault';if(p.isFlying)return'flight';
 if(p.onWall&&!p.grounded)return p.climbHeld?'climb':'wall';
 if(!p.grounded)return p.vy<0?'jump':'fall';return Math.abs(p.vx)>0.6?'run':'idle';
}
export function clipFrame(pose:HeroPose,elapsed:number) {
 const c=HERO_CLIPS[pose],total=c.durations.reduce((a,b)=>a+b,0);
 let time=Math.max(0,Math.floor(elapsed));time=c.loop?time%total:Math.min(time,total-1);
 for(let frame=0;frame<c.durations.length;frame++){if(time<c.durations[frame])return frame;time-=c.durations[frame];}
 return c.durations.length-1;
}
export class HeroAnimator {
 private pose:HeroPose='idle';private startedAt=0;
 reset(tick=0){this.pose='idle';this.startedAt=tick;}
 sample(p:HeroVisualInput,tick:number){
  const pose=heroPose(p);if(pose!==this.pose){this.pose=pose;this.startedAt=tick;}
  const elapsed=pose.startsWith('attack')?SWINGS[p.comboStep].totalTicks-p.slashTimer:tick-this.startedAt;
  return{pose,frame:clipFrame(pose,elapsed)};
 }
}
export function heroAtlasMetadata(){
 let index=0;
 const clips=Object.fromEntries((Object.keys(HERO_CLIPS)as HeroPose[]).map(pose=>[pose,{...HERO_CLIPS[pose],frames:HERO_CLIPS[pose].durations.map((duration,i)=>{
  const slot=index++;return{x:slot%HERO_FRAME.columns*HERO_FRAME.w,y:Math.floor(slot/HERO_FRAME.columns)*HERO_FRAME.h,w:HERO_FRAME.w,h:HERO_FRAME.h,duration,
   ...(pose.startsWith('attack')&&i===0?{event:'impact'}:{})};
 })}]));
 return{version:1,...HERO_FRAME,width:HERO_FRAME.columns*HERO_FRAME.w,height:Math.ceil(index/HERO_FRAME.columns)*HERO_FRAME.h,frameCount:index,clips};
}

export const HERO_ATLAS = heroAtlasMetadata();
