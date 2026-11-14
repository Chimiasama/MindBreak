import {leftAtlasMetadata} from './heroDirections';
import {createDirectionalPaintedAtlasLoader} from './paintedAtlasLoader';
/** Both Leon views use compact, independently painted cells with the shared physical anchor. */
export const LEON_FRAME={w:320,h:320,scale:.25,pivot:{x:160,y:288},hurtbox:{x:96,y:64,w:128,h:224},columns:8};
export const LEON_ATLAS=leftAtlasMetadata('leon',LEON_FRAME);
export const LEON_LEFT_ATLAS=leftAtlasMetadata('leon',LEON_FRAME);
const loader=createDirectionalPaintedAtlasLoader(LEON_ATLAS,new URL('../assets/leon/leon-painted.webp',import.meta.url).href,new URL('../assets/leon/leon-painted-left.webp',import.meta.url).href,LEON_LEFT_ATLAS);
export const getLeonPaintedAtlas=loader.getAtlas;
export const leonArtworkStatus=loader.status;
export const loadLeonArtwork=()=>loader.load();
