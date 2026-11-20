import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {instantiateRenModel,loadRenModel,renModelStatus} from '../src/game/render3d/renModel';
import {updateHeroRig3D} from '../src/game/render3d/characterRig3d';
import {HERO_CLIPS,type HeroPose} from '../src/game/heroAnimation';
import {disposeMaterialTree} from '../src/game/render3d/materials';

const file=readFileSync(new URL('../src/assets/models/ren-cel-v1.glb',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('../docs/arte/ren3d/manifesto.json',import.meta.url),'utf8'));
async function source(){return(await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'')).scene;}
test('Ren GLB contains a real bounded skin and reproduces the documented source artifact',async()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
 assert.equal(createHash('sha256').update(file).digest('hex'),manifest.sha256);assert.ok(file.length<2*1024*1024);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/ren3d/build_ren.py',import.meta.url))).digest('hex'),manifest.sourceSha256);
 const root=await source();let triangles=0,skins=0;
 root.traverse(o=>{const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh)return;skins++;
  triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;
  const weights=m.geometry.attributes.skinWeight,joints=m.geometry.attributes.skinIndex;
  for(let i=0;i<weights.count;i++){
   assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
   for(const j of [joints.getX(i),joints.getY(i),joints.getZ(i),joints.getW(i)])assert.ok(j<m.skeleton.bones.length);
  }
 });
 assert.equal(triangles,manifest.triangles);assert.equal(skins,13);assert.ok(triangles>8000&&triangles<20000);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);
 assert.ok(box.min.y>=-.02&&box.max.y<1.9);assert.ok(box.max.x-box.min.x<1.2);
});
test('Ren instances share immutable geometry but have independent skeletons and cel materials',async()=>{
 const template=await source(),a=instantiateRenModel(template),b=instantiateRenModel(template);
 assert.notEqual(a.hipR,b.hipR);assert.notEqual(a.materials[0],b.materials[0]);assert.ok(a.materials.every(m=>(m as THREE.MeshToonMaterial).isMeshToonMaterial));
 a.hipR.rotation.x=.5;assert.ok(Math.abs(b.hipR.rotation.x)<1e-8);
 let geometry:THREE.BufferGeometry|undefined,ownSkeleton:THREE.Skeleton|undefined;
 a.root.traverse(o=>{const m=o as THREE.SkinnedMesh;if(m.isSkinnedMesh){geometry=m.geometry;ownSkeleton=m.skeleton;assert.ok(m.userData.sharedGeometry);}});
 let disposedGeometry=0,disposedSkeleton=0;
 geometry!.addEventListener('dispose',()=>disposedGeometry++);const dispose=ownSkeleton!.dispose.bind(ownSkeleton!);
 ownSkeleton!.dispose=()=>{disposedSkeleton++;dispose();};disposeMaterialTree(a.root);
 assert.equal(disposedGeometry,0);assert.equal(disposedSkeleton,1);
 assert.ok(Math.abs(b.hipR.rotation.x)<1e-8);disposeMaterialTree(b.root);
});
test('every existing gameplay pose drives the imported Ren skeleton with finite skin bounds',async()=>{
 const rig=instantiateRenModel(await source());
 for(const pose of Object.keys(HERO_CLIPS) as HeroPose[])for(const facing of [1,-1] as const){
  for(let tick=0;tick<12;tick++)updateHeroRig3D(rig,{characterId:'ren',pose,facing,vx:pose==='run'?6:0,vy:pose==='jump'?-8:0,onWall:pose==='wall'?facing:0,grounded:!['jump','fall','wall'].includes(pose),isDashing:pose==='dash',isSliding:pose==='slide',isFlying:false,slashing:pose.startsWith('attack'),slashTimer:8,comboStep:0,invulnTimer:0,gstTimer:0,atkTimer:0,flameTimer:0,stunTimer:0,hp:100,tickCount:tick,elapsedTicks:tick,idleTicks:0},1/60);
  rig.root.updateMatrixWorld(true);rig.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  assert.ok(rig.root.scale.x>0);assert.equal(rig.hipR.parent,rig.hips);
 }
 disposeMaterialTree(rig.root);
});
test('Ren model loading remains inert in non-DOM simulation',async()=>{
 assert.equal(await loadRenModel(),false);assert.equal(renModelStatus(),'idle');
});
