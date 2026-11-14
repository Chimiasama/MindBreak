import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HERO_CLIPS,type HeroPose} from '../src/game/heroAnimation';
import {leftSourceKey,leftSourceCell,leftSourceSheets,type PaintedHero} from '../src/game/heroDirections';
import {REN_ATLAS,REN_LEFT_ATLAS} from '../src/game/renPainted';
import {MAYA_ATLAS,MAYA_LEFT_ATLAS} from '../src/game/mayaPainted';
import {createDirectionalPaintedAtlasLoader} from '../src/game/paintedAtlasLoader';

for(const hero of ['ren','maya'] as PaintedHero[])test(`${hero}: both views preserve timing and physical anchors, and every left pose has authored pixels`,()=>{
 const right=hero==='ren'?REN_ATLAS:MAYA_ATLAS,left=hero==='ren'?REN_LEFT_ATLAS:MAYA_LEFT_ATLAS,used=new Set();
 assert.deepEqual(left.pivot,right.pivot);assert.deepEqual(left.hurtbox,right.hurtbox);assert.equal(left.scale,right.scale);
 assert.equal(left.frameCount,right.frameCount);assert.ok(left.height<right.height);
 for(const pose of Object.keys(HERO_CLIPS) as HeroPose[]){
  assert.deepEqual(left.clips[pose].durations,right.clips[pose].durations);assert.equal(left.clips[pose].loop,right.clips[pose].loop);
  for(const[i,frame]of left.clips[pose].frames.entries()){
   const key=leftSourceKey(hero,pose,i),source=leftSourceCell(hero,key);used.add(key);
   assert.ok(source.row<source.rows&&source.column<source.columns);assert.ok(frame.x+frame.w<=left.width&&frame.y+frame.h<=left.height);
   assert.equal(frame.event,right.clips[pose].frames[i].event);
  }
 }
 assert.equal(used.size,left.uniqueFrameCount);assert.equal(used.size,leftSourceSheets(hero).flatMap(s=>s.keys).length);
 assert.equal(new Set(Array.from({length:6},(_,i)=>leftSourceKey(hero,'run',i))).size,6);
 assert.equal(leftSourceKey(hero,'attack1',2),'idle');
});

for(const hero of ['ren','maya'] as PaintedHero[])test(`${hero}: packaged left asset and source provenance match the directional manifest`,()=>{
 const meta=hero==='ren'?REN_LEFT_ATLAS:MAYA_LEFT_ATLAS,bytes=readFileSync(new URL(`../src/assets/${hero}/${hero}-painted-left.webp`,import.meta.url));
 const manifest=JSON.parse(readFileSync(new URL(`../docs/arte/${hero}/manifesto-esquerda.json`,import.meta.url),'utf8'));
 assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes[20]&16);
 assert.equal(bytes.readUIntLE(24,3)+1,meta.width);assert.equal(bytes.readUIntLE(27,3)+1,meta.height);assert.ok(bytes.length<2*1024*1024);
 assert.equal(manifest.canonicalFacing,'left');assert.equal(manifest.mirrored,false);assert.equal(manifest.asset.sha256,createHash('sha256').update(bytes).digest('hex'));
 for(const source of manifest.sourceFiles)assert.equal(source.sha256,createHash('sha256').update(readFileSync(new URL(`../${source.file}`,import.meta.url))).digest('hex'));
});

test('directional loader exposes a pair atomically and fails safely if the opposite view is missing',async()=>{
 const originalImage=globalThis.Image,originalDocument=globalThis.document,images:any[]=[];
 class FakeImage{naturalWidth=8;naturalHeight=4;onload?:()=>void;onerror?:()=>void;private source='';constructor(){images.push(this);}
  get src(){return this.source;}set src(value:string){this.source=value;if(!value)queueMicrotask(()=>this.onerror?.());}
 }
 try{
  globalThis.Image=FakeImage as any;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}})})} as any;
  const loader=createDirectionalPaintedAtlasLoader({width:8,height:4},'right','left'),pending=loader.load();assert.equal(loader.load(),pending);
  images[0].onload();await Promise.resolve();assert.equal(loader.status(),'loading');assert.equal(loader.getAtlas(1),null);assert.equal(loader.getAtlas(-1),null);
  images[1].onload();assert.equal(await pending,true);assert.equal(loader.status(),'ready');assert.notEqual(loader.getAtlas(1),loader.getAtlas(-1));
  const failed=createDirectionalPaintedAtlasLoader({width:8,height:4},'right','missing'),failure=failed.load();images[2].onload();images[3].onerror();
  assert.equal(await failure,false);assert.equal(failed.status(),'error');assert.equal(failed.getAtlas(-1),null);assert.equal(failed.getAtlas(1),null);
 }finally{globalThis.Image=originalImage;globalThis.document=originalDocument;}
});
