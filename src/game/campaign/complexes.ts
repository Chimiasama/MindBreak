import { enemyAt } from './authoring';
import type { Platform } from '../types';
import type { SubstageDefinition } from './types';

const THEMES:Record<number,[string,string,string,string]>={
 1:['Arquivo de segurança','Central de contenção','Rede dos telhados','Distribuidor do distrito'],
 3:['Cabine de içamento','Oficina de fundação','Central das vigas','Controle dos guindastes'],
 4:['Bomba de refrigeração','Válvula dos tanques','Distribuidor das esteiras','Controle de descarte'],
 5:['Servidor de credenciais','Recepção de segurança','Arquivo de auditoria','Comando do cofre'],
 6:['Projetor do acervo','Arquivo de restauração','Irrigação do jardim','Catálogo restrito'],
 7:['Servidor de contenção','Posto da doca','Rede de comunicações','Autorização da base'],
 8:['Estabilizador orbital','Comando da fundação','Distribuidor Zero','Controle estratosférico'],
};
/** Expanded connected complex precedes the original authored encounter zone, inside the same sector. */
export function withComplex(source:SubstageDefinition):SubstageDefinition{
 if(!source.exploration)return source; // Train: action/obstacles, never converted into a maze.
 const shift=6000,f=source.spawnY+56,labels=THEMES[source.id];
 const area:SubstageDefinition={...source,boundsWidth:source.boundsWidth+shift,boundsTop:Math.min(source.boundsTop,f-1520),boundsBottom:Math.max(source.boundsBottom,f+300),
  spawnX:140,spawnY:f-56,goalX:source.goalX+shift,
  platforms:source.platforms.map(p=>({...p,x:p.x+shift})),props:source.props.map(p=>({...p,x:p.x+shift})),
  enemies:source.enemies.map(e=>({...e,x:e.x+shift,...(e.patrolMinX!==undefined?{patrolMinX:e.patrolMinX+shift}:{}),...(e.patrolMaxX!==undefined?{patrolMaxX:e.patrolMaxX+shift}:{})})),
  ceilingPipes:source.ceilingPipes.map(p=>({...p,x:p.x+shift})),checkpoints:source.checkpoints.map(p=>({...p,x:p.x+shift})),
  exits:source.exits.map(e=>({...e,x:e.x<100?e.x:e.x+shift,y:e.x<100?f-e.h:e.y})),
  ambushArenas:source.ambushArenas?.map(a=>({...a,triggerX:a.triggerX+shift,minX:a.minX+shift,maxX:a.maxX+shift})),
  ...(source.boss?{boss:{...source.boss,x:source.boss.x+shift}}:{}),
 };
 const floor=(x:number,y:number,w:number,h=20,type:Platform['type']='solid',extra:Partial<Platform>={})=>area.platforms.push({x,y,w,h,type,...extra});
 if(source.id===4){floor(-100,f,1100,280);floor(1000,f+40,120,240,'acid');floor(1120,f,shift-1020+200,280);}else floor(-100,f,shift+200,280);
 if(source.id===7)floor(1800,f-100,16,100,'laser_gate');
 if(source.id===3)floor(1000,f-800,160,18,'moving',{moveAxis:'y',moveRange:40,moveSpeed:.025});
 const rooms=[{id:'oeste',x:700,w:1300},{id:'central',x:2500,w:1300},{id:'leste',x:4300,w:1300}];
 for(const room of rooms){floor(room.x,f-300,room.w);floor(room.x,f-600,room.w);floor(room.x,f-1160,room.w,24);}
 // Shafts connect different floors, with staggered landings and optional precision routes.
 for(const x of [400,2100,3900,5700]){
  floor(x,f-100,160);floor(x+150,f-200,170);floor(x,f-400,160);floor(x+150,f-500,170);
 }
 for(const x of [2170,3970]){floor(x,f-300,180);floor(x,f-600,180);}
 floor(5700,f-300,180);floor(5700,f-600,180);
 // Skill/secret wings: wall-grip tower, suspended flight island, sealed breakable chamber.
 floor(1520,f-1000,20,400,'wall');floor(1700,f-1000,20,400,'wall');
 floor(1540,f-940,580);floor(2460,f-940,1440);
 floor(2300,f-1320,180);
 floor(3300,f-300,20,300,'wall',{gateId:'brecha',breakNode:'brecha-leon'});floor(3800,f-300,20,300,'wall');
 floor(2470,f-1000,20,400,'wall',{gateId:'atalho-voo'});
 floor(3800,f-1140,20,200,'wall',{gateId:'atalho-cinetico'});
 floor(4300,f-600,20,300,'wall',{gateId:'linha'});
 floor(5880,f-1160,20,1160,'wall',{gateId:'complexo'});
 // Optional universal cache: a real off-route ascent, not a chest sitting along the main corridor.
 for(const [x,y]of [[500,f-700],[320,f-800],[80,f-900]])floor(x,y,180);
 const originalChest=area.props.find(p=>p.kind==='chest');if(originalChest){originalChest.x=110;originalChest.y=f-944;}
 let propId=Math.max(0,...area.props.map(p=>p.id))+1;
 for(const [x,y,dropType]of [[3850,f-984,'secret_a'],[2370,f-1364,'full_heal'],[3500,f-44,'secret_b'],[2160,f-644,'psy']] as const)
  area.props.push({id:propId++,x,y,w:46,h:44,hp:25,kind:'chest',dropType});
 const guardIndex=area.enemies.length;
 area.enemies.push(enemyAt('mib_gunner',3330,f-600,75,{requiredGuard:true}),enemyAt('mib_shield',1550,f,90),enemyAt('mutant',4900,f-300,75),enemyAt('sniper',4600,f-600,55),enemyAt('cyber_hound',1000,f,60),enemyAt('drone',4100,f-150,45),enemyAt('mib_gunner',2850,f-300,60));
 const node=(id:string,label:string,x:number,y:number,requires:string[],extra:Record<string,unknown>={})=>({id,label,x,y:y-44,w:28,h:44,requires,...extra});
 const old=source.exploration.nodes.map((n,i)=>({...n,id:i===0?'setor-rele':'setor-comando',x:n.x+shift,requires:i===0?['logistica']:['setor-rele']}));
 const nodes=[node('rele',labels[0],3200,f-600,[],{guardIndex}),node('comando',labels[1],1400,f,['rele']),node('distribuicao',labels[2],5000,f-300,['comando']),node('logistica',labels[3],2900,f-300,['distribuicao']),...old,
  node('trava-ren','Trava cinética — Ren',1590,f-940,[],{optional:true,requiredHero:'ren'}),
  node('nucleo-maya','Núcleo suspenso — Maya',2320,f-1320,[],{optional:true,requiredHero:'maya'}),
  node('brecha-leon','Parede frágil — Leon',3250,f,[],{optional:true,requiredHero:'leon',action:'smash'}),
 ];
 const entrance=area.checkpoints.find(p=>p.id===area.entryCheckpoint)!;entrance.x=140;entrance.y=f-56;
 area.checkpoints.splice(1,0,{id:'complexo-centro',label:'Galeria central',x:2800,y:f-356},{id:'complexo-leste',label:'Ala leste',x:4700,y:f-356});
 area.exploration={...source.exploration,nodes,gates:[{id:'linha',requires:['comando']},{id:'complexo',requires:['logistica']},{id:'rota',requires:old.map(n=>n.id)},{id:'atalho-cinetico',requires:['trava-ren']},{id:'atalho-voo',requires:['nucleo-maya']},{id:'brecha',requires:['brecha-leon']}],
  complex:{width:shift,floor:f,rooms:rooms.map(room=>({...room,label:`${room.id==='oeste'?'Ala oeste':room.id==='central'?'Galeria central':'Ala leste'} · ${source.title}`})),shafts:[400,2100,3900,5700]},
 };
 const scale=source.id===4?1.2:source.exploration.style==='vertical'?.85:source.id===1?.95:source.id===5||source.id===8?1.1:1;
 const dx=6000*(scale-1),oldPlatforms=source.platforms.length,oldEnemies=source.enemies.length,oldProps=source.props.length;
 area.platforms.forEach((p,i)=>{if(i<oldPlatforms)p.x+=dx;else{p.x*=scale;p.w*=scale;}});
 area.enemies.forEach((e,i)=>{e.x=i<oldEnemies?e.x+dx:e.x*scale;if(e.patrolMinX!==undefined)e.patrolMinX+=dx;if(e.patrolMaxX!==undefined)e.patrolMaxX+=dx;});
 area.props.forEach((p,i)=>{p.x=i<oldProps&&p!==originalChest?p.x+dx:p.x*scale;});
 area.checkpoints.forEach(p=>{p.x=p.x<6000?p.x*scale:p.x+dx;});area.exits.forEach(e=>{e.x=e.x<100?e.x*scale:e.x+dx;});
 area.ceilingPipes.forEach(p=>p.x+=dx);area.ambushArenas?.forEach(a=>{a.triggerX+=dx;a.minX+=dx;a.maxX+=dx;});if(area.boss)area.boss.x+=dx;
 area.exploration.nodes.forEach(n=>{n.x=n.x<6000?n.x*scale:n.x+dx;});area.exploration.complex!.width*=scale;area.exploration.complex!.rooms.forEach(r=>{r.x*=scale;r.w*=scale;});area.exploration.complex!.shafts=area.exploration.complex!.shafts.map(x=>x*scale);
 area.boundsWidth+=dx;area.goalX+=dx;area.spawnX*=scale;
 area.description=`${source.description} Complexo amplo com três níveis, alas interligadas, retornos e depósitos; passagens de Ren, Maya e Leon são opcionais.`;
 if(source.substageId==='1A')area.introDialogue=[{speaker:'REN',line:'A saída está bloqueada. As alas oeste, central e leste se conectam por galerias e poços.'},{speaker:'MAYA',line:'Explore a parte alta, volte à contenção e restabeleça a distribuição. Os comandos liberam passagens diferentes; CIMA examina.'},{speaker:'LEON',line:'Paredes frágeis cedem aos meus golpes. Há atalhos cinéticos para Ren e depósitos suspensos para Maya; todos têm uma rota principal.'}];
 return area;
}
