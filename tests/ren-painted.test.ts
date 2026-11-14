import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REN_FRAME,REN_ATLAS,REN_SOURCE_POSES,renSourcePose,renSourceRect,renPlacement,loadRenArtwork,renArtworkStatus} from '../src/game/renPainted';
import {HERO_CLIPS,type HeroPose} from '../src/game/heroAnimation';
test('painted Ren keeps the physical box and pivot while expanding visual padding',()=>{
 assert.equal(REN_FRAME.hurtbox.w*REN_FRAME.scale,32);assert.equal(REN_FRAME.hurtbox.h*REN_FRAME.scale,56);
 assert.equal((REN_FRAME.hurtbox.x-REN_FRAME.pivot.x)*REN_FRAME.scale,-16);
 assert.equal((REN_FRAME.hurtbox.y-REN_FRAME.pivot.y)*REN_FRAME.scale,-56);
 assert.equal(REN_ATLAS.version,3);assert.equal(REN_ATLAS.frameCount,55);
 for(const clip of Object.values(REN_ATLAS.clips))for(const f of clip.frames)assert.ok(f.x+f.w<=REN_ATLAS.width&&f.y+f.h<=REN_ATLAS.height);
});
test('every logical clip resolves to a real painted source without inventing combat events',()=>{
 const used=new Set();for(const pose of Object.keys(HERO_CLIPS) as HeroPose[])for(let frame=0;frame<HERO_CLIPS[pose].durations.length;frame++){
  const name=renSourcePose(pose,frame);assert.ok(REN_SOURCE_POSES[name]);used.add(name);
 }
 assert.equal(used.size,18);assert.equal(renSourcePose('attack1',2),'idle');assert.equal(renSourcePose('stun',0),'hurt');assert.equal(renSourcePose('flight',0),'fall');
 assert.notEqual(renSourcePose('run',0),renSourcePose('run',1));assert.notEqual(renSourcePose('climb',0),renSourcePose('climb',1));
});
test('source rectangles isolate neighboring cells and placement fits the target frame',()=>{
 for(const name of Object.keys(REN_SOURCE_POSES) as (keyof typeof REN_SOURCE_POSES)[]){
  const source=REN_SOURCE_POSES[name],r=renSourceRect(name),p=renPlacement(name),cx=source.cell%3*512,cy=Math.floor(source.cell/3)*512;
  assert.ok(r.x>cx&&r.y>cy&&r.x+r.w<cx+512&&r.y+r.h<cy+512);
  const x=REN_FRAME.pivot.x+(r.x-cx-p.anchorX)*p.scale,y=REN_FRAME.pivot.y+(r.y-cy-p.baseline)*p.scale;
  assert.ok(x>=0&&y>=0&&x+r.w*p.scale<=REN_FRAME.w&&y+r.h*p.scale<=REN_FRAME.h);
 }
});
test('packaged artwork is an alpha WebP with manifest dimensions and fits the default precache budget',()=>{
 const bytes=readFileSync(new URL('../src/assets/ren/ren-painted.webp',import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.toString('ascii',12,16),'VP8X');
 assert.equal(bytes.readUIntLE(24,3)+1,REN_ATLAS.width);assert.equal(bytes.readUIntLE(27,3)+1,REN_ATLAS.height);assert.ok(bytes[20]&16);assert.ok(bytes.length<2*1024*1024);
});
test('loading is safe in non-DOM simulation tests',async()=>{assert.equal(await loadRenArtwork(),false);assert.equal(renArtworkStatus(),'idle');});
test('hero metadata and readiness share one source before a browser image is loaded',async()=>{
 const api=await import('../src/game/heroArtwork');assert.equal(api.isHeroPainted('ren'),false);assert.equal(api.getHeroMetadata('ren').version,2);assert.equal(api.getHeroMetadata('maya').w,96);assert.equal(await api.prepareHeroArtwork('maya'),true);assert.equal(api.getHeroArtworkStatus('ren'),'idle');
});
