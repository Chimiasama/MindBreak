import { loadMayaArtwork, getMayaPaintedAtlas, mayaArtworkStatus, MAYA_ATLAS } from './mayaPainted';
import { loadRenArtwork, getRenPaintedAtlas, renArtworkStatus, REN_ATLAS } from './renPainted';
import type { CharacterId } from './types';
import { HERO_FRAME, HERO_CLIPS, type HeroPose, HERO_ATLAS } from './heroAnimation';
import { figureRig, paintFigure, type FigureStyle } from './illustratedFigure';
export const HERO_STYLES:Record<CharacterId,FigureStyle>={
 ren:{body:'#293b52',light:'#607b99',accent:'#dc3078',pants:'#29384e',skin:'#e9b998',hair:'#202533',build:'lean',role:'ren'},
 maya:{body:'#176c68',light:'#57a79a',accent:'#d9b765',pants:'#ccd6da',skin:'#ebc4a5',hair:'#144b50',build:'athletic',role:'maya'},
 leon:{body:'#7d2d39',light:'#bb5960',accent:'#dd7c35',pants:'#2b3a50',skin:'#d99b77',hair:'#4c3031',build:'heavy',role:'leon'},
};
export function heroRig(hero:CharacterId,pose:HeroPose,frame:number){
 const rig=figureRig(pose,frame);
 // A weightier guard and stance for Leon; Maya's hands stay open for psychic casting.
 if(hero==='leon'&&pose==='idle'){rig.elbows=[[14,28],[35,26]];rig.hands=[[17,26],[36,22]];rig.feet=[[15,61],[35,61]];}
 if(hero==='maya'&&pose==='idle'){rig.hands=[[14,36],[37,31]];rig.elbows=[[16,31],[33,29]];}
 return rig;
}
const atlases=new Map<CharacterId,HTMLCanvasElement>();
const painted={
 ren:{load:loadRenArtwork,getAtlas:getRenPaintedAtlas,status:renArtworkStatus,metadata:REN_ATLAS},
 maya:{load:loadMayaArtwork,getAtlas:getMayaPaintedAtlas,status:mayaArtworkStatus,metadata:MAYA_ATLAS},
};
function paintedEntry(hero:CharacterId){return hero==='leon'?undefined:painted[hero];}
export function isHeroPainted(hero:CharacterId){return Boolean(paintedEntry(hero)?.getAtlas());}
export function prepareHeroArtwork(hero:CharacterId){return paintedEntry(hero)?.load()??Promise.resolve(true);}
export function getHeroArtworkStatus(hero:CharacterId){return paintedEntry(hero)?.status()??'procedural-v2';}
export function getHeroMetadata(hero:CharacterId){const entry=paintedEntry(hero);return entry?.getAtlas()?entry.metadata:HERO_ATLAS;}
export function getHeroAtlas(hero:CharacterId){
 const entry=paintedEntry(hero);if(entry){void entry.load();const canvas=entry.getAtlas();if(canvas){atlases.delete(hero);return canvas;}}
 const cached=atlases.get(hero);if(cached)return cached;
 const meta=HERO_ATLAS,canvas=document.createElement('canvas');canvas.width=meta.width;canvas.height=meta.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Hero atlas canvas unavailable');
 for(const pose of Object.keys(HERO_CLIPS)as HeroPose[])for(const[i,f]of meta.clips[pose].frames.entries()){
  ctx.save();ctx.beginPath();ctx.rect(f.x,f.y,f.w,f.h);ctx.clip();ctx.translate(f.x,f.y);ctx.scale(2,2);
  const rig=heroRig(hero,pose,i);paintFigure(ctx,rig,HERO_STYLES[hero]);
  if(hero==='ren'&&pose.startsWith('attack')&&i<2){const hand=rig.hands[1];ctx.beginPath();ctx.moveTo(...hand);ctx.lineTo(Math.min(47,hand[0]+3),Math.max(1,hand[1]-10));ctx.lineTo(hand[0]+1,hand[1]-1);ctx.fillStyle='#b7faff';ctx.fill();ctx.strokeStyle='#4fdae6';ctx.lineWidth=.5;ctx.stroke();}
  if(pose==='special'||hero==='maya'&&pose==='flight')for(const hand of rig.hands){const glow=ctx.createRadialGradient(...hand,.2,...hand,3.3);glow.addColorStop(0,'#efffff');glow.addColorStop(.35,'#68e8df');glow.addColorStop(1,'#36d4df00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(...hand,3.3,0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 atlases.set(hero,canvas);return canvas;
}
export function drawHeroFrame(ctx:CanvasRenderingContext2D,hero:CharacterId,pose:HeroPose,frame:number,centerX:number,feetY:number,facing:number){
 const atlas=getHeroAtlas(hero),meta=getHeroMetadata(hero),f=meta.clips[pose].frames[frame];ctx.save();ctx.translate(Math.round(centerX),Math.round(feetY));ctx.scale(facing,1);ctx.imageSmoothingEnabled=true;
 ctx.drawImage(atlas,f.x,f.y,f.w,f.h,-meta.pivot.x*meta.scale,-meta.pivot.y*meta.scale,meta.w*meta.scale,meta.h*meta.scale);ctx.restore();
}
