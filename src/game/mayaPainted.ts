import {heroAtlasMetadata,type HeroPose} from './heroAnimation';
import {createPaintedAtlasLoader} from './paintedAtlasLoader';
export const MAYA_FRAME={w:320,h:320,scale:.25,pivot:{x:160,y:288},hurtbox:{x:96,y:64,w:128,h:224},columns:8};
export const MAYA_ATLAS=heroAtlasMetadata(MAYA_FRAME,3);
export const MAYA_SOURCE_POSES={
 idle:{sheet:0,cell:0},runA:{sheet:0,cell:1},runB:{sheet:0,cell:2},runC:{sheet:0,cell:3},jump:{sheet:0,cell:4},fall:{sheet:0,cell:5},
 attack1:{sheet:1,cell:0},attack2:{sheet:1,cell:1},attack3:{sheet:1,cell:2},dash:{sheet:1,cell:3},slide:{sheet:1,cell:4},hurt:{sheet:1,cell:5},
 wall:{sheet:2,cell:0},climb:{sheet:2,cell:1},hang:{sheet:2,cell:2},vault:{sheet:2,cell:3},flightA:{sheet:2,cell:4},death:{sheet:2,cell:5},
 runD:{sheet:3,cell:0},runE:{sheet:3,cell:1},runF:{sheet:3,cell:2},special:{sheet:3,cell:3},flightB:{sheet:3,cell:4},stun:{sheet:3,cell:5},
} as const;
export type MayaSourcePose=keyof typeof MAYA_SOURCE_POSES;
export function mayaSourcePose(pose:HeroPose,frame:number):MayaSourcePose{
 if(pose==='run')return(['runA','runB','runC','runD','runE','runF']as const)[frame%6];
 if(pose==='flight')return frame%2?'flightB':'flightA';
 if(pose==='climb')return frame%2?'climb':'wall';
 if(pose.startsWith('attack'))return frame===2?'idle':pose as MayaSourcePose;
 return pose as MayaSourcePose;
}
export function mayaSourceRect(name:MayaSourcePose){
 const s=MAYA_SOURCE_POSES[name],edge=name==='slide'?0:6;
 if(name==='death')return{x:1030,y:662,w:500,h:200};
 return{x:s.cell%3*512+edge,y:Math.floor(s.cell/3)*512+6,w:512-2*edge,h:500};
}
export function mayaPlacement(name:MayaSourcePose){
 const anchors:Partial<Record<MayaSourcePose,number>>={idle:266,runA:296,runB:286,runC:300,runD:272,runE:298,runF:300,jump:296,fall:300,attack2:248,attack3:280,dash:286,hurt:285,wall:270,climb:290,hang:280,vault:280};
 return{scale:.45,anchorX:anchors[name]??266,baseline:name==='death'?325:500,sourceFacing:1 as const};
}
const loader=createPaintedAtlasLoader(MAYA_ATLAS,new URL('../assets/maya/maya-painted.webp',import.meta.url).href);
export const getMayaPaintedAtlas=loader.getAtlas;
export const mayaArtworkStatus=loader.status;
export const loadMayaArtwork=()=>loader.load();
