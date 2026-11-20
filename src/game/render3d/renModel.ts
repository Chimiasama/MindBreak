import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {makeToonMaterial} from './materials';
import type {HumanoidRigParts} from './characterRig3d';

const url=new URL('../../assets/models/ren-cel-v1.glb',import.meta.url).href;
const required=['bodyPivot','hips','torso','head','shoulderL','elbowL','shoulderR','elbowR','hipL','kneeL','hipR','kneeR'] as const;
let template:THREE.Group|null=null,pending:Promise<boolean>|undefined;
let status:'idle'|'loading'|'ready'|'error'='idle';
export const renModelStatus=()=>status;
/** One immutable geometry template per application; instances own skeletons/materials. */
export function loadRenModel():Promise<boolean>{
 if(pending)return pending;
 if(typeof window==='undefined'||typeof document==='undefined')return Promise.resolve(false);
 status='loading';
 pending=new GLTFLoader().loadAsync(url).then(gltf=>{
  for(const name of required)if(!gltf.scene.getObjectByName(name))throw Error(`Ren model missing joint ${name}`);
  let skins=0;gltf.scene.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)skins++;});
  if(!skins)throw Error('Ren model must have a real skin');
  template=gltf.scene;status='ready';return true;
 }).catch(()=>{status='error';return false;});
 return pending;
}

export function createRenModelInstance():HumanoidRigParts|null{
 if(!template)return null;
 return instantiateRenModel(template);
}

/** Independent instance, also usable by offline asset validation. */
export function instantiateRenModel(sourceScene:THREE.Group):HumanoidRigParts{
 const root=cloneSkeleton(sourceScene) as THREE.Group;
 root.name='Ren_Cel_V1_Instance';root.userData.externalCharacter='ren-cel-v1';
 const materials:THREE.Material[]=[],baseColors=new Map<THREE.Material,THREE.Color>(),baseEmissive=new Map<THREE.Material,THREE.Color>();
 const materialMap=new Map<THREE.Material,THREE.MeshToonMaterial>();
 const meshes:THREE.SkinnedMesh[]=[];
 root.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)meshes.push(o as THREE.SkinnedMesh);});
 for(const mesh of meshes){
  const source=mesh.material as THREE.MeshStandardMaterial;
  let material=materialMap.get(source);
  if(!material){
   material=makeToonMaterial(source.color,{emissive:source.emissive,emissiveIntensity:source.emissive?.getHex()?0.4:0,
    side:source.side,transparent:source.name==='cyan',opacity:source.name==='cyan'?.8:1});
   if(source.name==='cyan'){material.color.set('#00adc6');material.emissive.set('#008ba7');}
   material.name=source.name;materialMap.set(source,material);materials.push(material);
   baseColors.set(material,material.color.clone());baseEmissive.set(material,material.emissive.clone());
  }
  mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  // Shared template geometry stays alive; per-instance materials/skeletons are released separately.
  mesh.userData.sharedGeometry=true;
  const outlineMaterial=new THREE.MeshBasicMaterial({color:'#080c18',side:THREE.BackSide});
  outlineMaterial.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * 0.0035;');
  };
  outlineMaterial.customProgramCacheKey=()=> 'ren-skinned-outline-v1';
  const outline=new THREE.SkinnedMesh(mesh.geometry,outlineMaterial);
  outline.name='Ren_Skinned_Outline';outline.bind(mesh.skeleton,mesh.bindMatrix);outline.frustumCulled=false;
  outline.userData.sharedGeometry=true;outline.userData.isRenOutline=true;
  mesh.add(outline);
 }
 const joints=Object.fromEntries(required.map(name=>[name,root.getObjectByName(name)!])) as unknown as Pick<HumanoidRigParts,typeof required[number]>;
 return{root,...joints,materials,baseColors,baseEmissive,heightUnits:1.75,runPhase:0,turnAngle:1.18,lastSlashKey:0,
  stealthOpacity:1,meditationFactor:0};
}
