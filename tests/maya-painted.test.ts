import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAYA_FRAME,MAYA_ATLAS,MAYA_SOURCE_POSES,mayaSourcePose,mayaSourceRect,mayaPlacement,loadMayaArtwork,mayaArtworkStatus} from '../src/game/mayaPainted';
import {HERO_CLIPS,type HeroPose} from '../src/game/heroAnimation';
test('Maya painted padding keeps the original physical box and feet pivot',()=>{
 assert.equal(MAYA_FRAME.hurtbox.w*MAYA_FRAME.scale,32);assert.equal(MAYA_FRAME.hurtbox.h*MAYA_FRAME.scale,56);
 assert.equal((MAYA_FRAME.hurtbox.x-MAYA_FRAME.pivot.x)*MAYA_FRAME.scale,-16);assert.equal((MAYA_FRAME.hurtbox.y-MAYA_FRAME.pivot.y)*MAYA_FRAME.scale,-56);
 assert.equal(MAYA_ATLAS.frameCount,55);for(const c of Object.values(MAYA_ATLAS.clips))for(const f of c.frames)assert.ok(f.x+f.w<=MAYA_ATLAS.width&&f.y+f.h<=MAYA_ATLAS.height);
});
test('all 24 paintings are used with six run keys, two flight keys and dedicated stun',()=>{
 const used=new Set();for(const pose of Object.keys(HERO_CLIPS) as HeroPose[])for(let frame=0;frame<HERO_CLIPS[pose].durations.length;frame++){const name=mayaSourcePose(pose,frame);assert.ok(MAYA_SOURCE_POSES[name]);used.add(name);}
 assert.equal(used.size,24);assert.equal(new Set(Array.from({length:6},(_,i)=>mayaSourcePose('run',i))).size,6);
 assert.notEqual(mayaSourcePose('flight',0),mayaSourcePose('flight',1));assert.notEqual(mayaSourcePose('stun',0),mayaSourcePose('hurt',0));assert.equal(mayaSourcePose('attack3',2),'idle');
});
test('all Maya keys use the same right-facing convention and isolated valid source crops',()=>{
 for(const name of Object.keys(MAYA_SOURCE_POSES) as (keyof typeof MAYA_SOURCE_POSES)[]){const source=MAYA_SOURCE_POSES[name],r=mayaSourceRect(name),p=mayaPlacement(name),cx=source.cell%3*512,cy=Math.floor(source.cell/3)*512;
  assert.equal(p.sourceFacing,1);assert.ok(r.x>=cx&&r.y>=cy&&r.x+r.w<=cx+512&&r.y+r.h<=cy+512);
  const x=MAYA_FRAME.pivot.x+(r.x-cx-p.anchorX)*p.scale,y=MAYA_FRAME.pivot.y+(r.y-cy-p.baseline)*p.scale;
  assert.ok(x>=0&&y>=0&&x+r.w*p.scale<=320&&y+r.h*p.scale<=320,name);
 }
});
test('Maya alpha WebP dimensions match metadata and stay inside the precache limit',()=>{
 const b=readFileSync(new URL('../src/assets/maya/maya-painted.webp',import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16);assert.equal(b.readUIntLE(24,3)+1,MAYA_ATLAS.width);assert.equal(b.readUIntLE(27,3)+1,MAYA_ATLAS.height);assert.ok(b.length<2*1024*1024);
});
test('Maya loader stays independent and safe without DOM',async()=>{assert.equal(await loadMayaArtwork(),false);assert.equal(mayaArtworkStatus(),'idle');});
