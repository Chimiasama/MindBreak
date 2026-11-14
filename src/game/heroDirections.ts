import {heroAtlasMetadata,type HeroFrameDefinition,type HeroPose} from './heroAnimation';

export type PaintedHero='ren'|'maya';
export const LEFT_MOVEMENT_KEYS=['idle','runA','runB','runC','runD','runE','runF','jump','fall'] as const;
const renActions=['wall','climb','hang','vault','dash','slide','attack1','attack2','attack3','hurt','special','death'];
const mayaActions=['wall','climb','hang','vault','dash','slide','attack1','attack2','attack3','hurt','stun','special','flightA','flightB','death'];
/** Explicit directional art contract; these are opposite views, never reflected source cells. */
export function leftSourceKey(hero:PaintedHero,pose:HeroPose,frame:number):string{
 if(pose==='run')return LEFT_MOVEMENT_KEYS[1+frame%6];
 if(pose.startsWith('attack')&&frame===2)return 'idle';
 if(pose==='climb')return frame%2?'climb':'wall';
 if(pose==='flight')return hero==='maya'?(frame%2?'flightB':'flightA'):'fall';
 if(pose==='stun'&&hero==='ren')return'hurt';
 return pose;
}
export function leftSourceSheets(hero:PaintedHero){
 return[
  {file:'05-esquerda-locomocao',columns:3,rows:3,keys:[...LEFT_MOVEMENT_KEYS]},
  {file:'06-esquerda-acoes',columns:3,rows:hero==='ren'?4:5,keys:hero==='ren'?renActions:mayaActions},
 ];
}
export function leftSourceCell(hero:PaintedHero,key:string){
 for(const[sheet,definition]of leftSourceSheets(hero).entries()){
  const index=definition.keys.indexOf(key);if(index>=0)return{sheet,column:index%definition.columns,row:Math.floor(index/definition.columns),columns:definition.columns,rows:definition.rows};
 }
 throw Error(`Missing authored left-facing ${hero} pose: ${key}`);
}

/** Two generated cells contain a neighbor's extremity in their unused margin. Crop it out. */
export function leftSourceCrop(hero:PaintedHero,key:string,imageWidth:number,imageHeight:number){
 const cell=leftSourceCell(hero,key),w=Math.floor(imageWidth/cell.columns),h=Math.floor(imageHeight/cell.rows);
 return{x:cell.column*w,y:cell.row*h,w:w-(hero==='ren'&&(key==='runD'||key==='jump')?40:0),h:h-(hero==='ren'&&key==='jump'?110:0)};
}

/** Reused holds share pixels, keeping the additional directional atlas small on Android. */
export function leftAtlasMetadata(hero:PaintedHero,definition:HeroFrameDefinition){
 const metadata=heroAtlasMetadata(definition,4),slots=new Map<string,number>();
 for(const[pose,clip]of Object.entries(metadata.clips))for(const[index,frame]of clip.frames.entries()){
  const key=leftSourceKey(hero,pose as HeroPose,index);if(!slots.has(key))slots.set(key,slots.size);
  const slot=slots.get(key)!;frame.x=slot%definition.columns*definition.w;frame.y=Math.floor(slot/definition.columns)*definition.h;
 }
 return{...metadata,height:Math.ceil(slots.size/definition.columns)*definition.h,uniqueFrameCount:slots.size};
}
