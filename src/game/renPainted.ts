import {leftAtlasMetadata} from './heroDirections';
import { createDirectionalPaintedAtlasLoader } from './paintedAtlasLoader';
import { heroAtlasMetadata, type HeroPose } from './heroAnimation';
/** Extra transparent padding contains painted scarf/weapons; physical reference stays 32 × 56. */
export const REN_FRAME={w:320,h:320,scale:.25,pivot:{x:160,y:288},hurtbox:{x:96,y:64,w:128,h:224},columns:8};
export const REN_ATLAS=heroAtlasMetadata(REN_FRAME,3);
export const REN_LEFT_ATLAS=leftAtlasMetadata('ren',REN_FRAME);
export const REN_SOURCE_POSES={
 idle:{sheet:0,cell:0},runA:{sheet:0,cell:1},runB:{sheet:0,cell:2},runC:{sheet:0,cell:3},jump:{sheet:0,cell:4},fall:{sheet:0,cell:5},
 attack1:{sheet:1,cell:0},attack2:{sheet:1,cell:1},attack3:{sheet:1,cell:2},dash:{sheet:1,cell:3},slide:{sheet:1,cell:4},hurt:{sheet:1,cell:5},
 wall:{sheet:2,cell:0},climb:{sheet:2,cell:1},hang:{sheet:2,cell:2},vault:{sheet:2,cell:3},special:{sheet:2,cell:4},death:{sheet:2,cell:5},
} as const;
export type RenSourcePose=keyof typeof REN_SOURCE_POSES;
/** Deliberate reuse is explicit: three painted run keys, static authored holds, recovery to idle. */
export function renSourcePose(pose:HeroPose,frame:number):RenSourcePose{
 if(pose==='run')return(['runA','runB','runC','runA','runB','runC'] as const)[frame%6];
 if(pose.startsWith('attack'))return frame===2?'idle':pose as RenSourcePose;
 if(pose==='climb')return frame%2?'climb':'wall';
 if(pose==='stun')return'hurt';if(pose==='flight')return'fall';
 return pose as RenSourcePose;
}
/** Crop margins remove source cell guides; every figure stays within its own source cell. */
export function renSourceRect(name:RenSourcePose){
 const s=REN_SOURCE_POSES[name];return{x:s.cell%3*512+6,y:Math.floor(s.cell/3)*512+6,w:500,h:500};
}
/** The idle painting faces left; normalize it before the runtime facing transform. */
export function renSourceFacing(name:RenSourcePose):1|-1{return name==='idle'?-1:1;}
export function renPlacement(name:RenSourcePose){
 // Shared scale across keys preserves character size; uppercut gets a small anatomy correction.
 const anchors:Partial<Record<RenSourcePose,number>>={runA:286,runB:282,runC:284,jump:296,fall:300,attack2:280,attack3:300,dash:286,hurt:285,wall:270,climb:290,hang:280,vault:280};
 return{scale:name==='attack3'?.51:.47,anchorX:anchors[name]??256,baseline:496,sourceFacing:renSourceFacing(name)};
}
const loader=createDirectionalPaintedAtlasLoader(REN_ATLAS,new URL('../assets/ren/ren-painted.webp',import.meta.url).href,new URL('../assets/ren/ren-painted-left.webp',import.meta.url).href,REN_LEFT_ATLAS);
export const getRenPaintedAtlas=loader.getAtlas;
export const renArtworkStatus=loader.status;
export const loadRenArtwork=()=>loader.load();
