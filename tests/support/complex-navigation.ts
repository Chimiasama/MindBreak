import {navigate as local} from './navigation';
import type {GameEngine} from '../../src/game/engine';
/** Region waypoints guide the physical search; every accepted leg is replayed by real input ticks. */
export function navigate(engine:GameEngine,s:any,goal:{x:number;y:number;w:number;h:number}){
 const c=s.stage.exploration?.complex;if(!c)return local(engine,s,goal);
 const scale=c.width/6000,f=c.floor,metrics={jumps:0,left:0,right:0};
 const step=(g:{x:number;y:number;w:number;h:number})=>{const m=local(engine,s,g);metrics.jumps+=m.jumps;metrics.left+=m.left;metrics.right+=m.right;};
 const point=(x:number,level:number)=>({x:x*scale+8,y:f-level-56,w:100,h:56});
 if(s.player.x>=c.width&&goal.x>=c.width){step(goal);return metrics;}
 const hubs:Record<string,{x:number;y:number;w:number;h:number}>={E:point(140,0),WL:point(1400,0),WM:point(1400,300),WH:point(1400,600),CL:point(2900,0),CM:point(2900,300),CH:point(3200,600),EL:point(5000,0),EM:point(5000,300),EH:point(5000,600),END:{x:c.width+80,y:f-56,w:80,h:56}};
 const edges:{a:string;b:string;via:[number,number][];gate?:string}[]=[
 {a:'E',b:'WL',via:[]},{a:'E',b:'WM',via:[[400,100],[550,200],[750,300]]},
 {a:'WL',b:'WM',via:[[750,0],[400,100],[550,200],[750,300]]},
 {a:'WM',b:'WH',via:[[750,300],[400,400],[550,500],[750,600]]},
 {a:'WL',b:'CL',via:[]},{a:'CL',b:'CM',via:[[2100,100],[2300,200],[2550,300]]},
 {a:'WM',b:'CM',via:[[1850,300],[2170,300],[2550,300]]},
 {a:'WH',b:'CH',via:[[1850,600],[2170,600],[2550,600]],gate:'atalho-voo'},
 {a:'CM',b:'CH',via:[[3650,300],[3900,400],[4050,500],[3700,600]]},
 {a:'CM',b:'EM',via:[[3650,300],[3970,300],[4350,300]],gate:'linha'},
 {a:'CH',b:'EH',via:[[3700,600],[3970,600],[4350,600]]},
 {a:'EM',b:'EH',via:[[5500,300],[5700,400],[5850,500],[5500,600]]},
 {a:'EL',b:'EM',via:[[5500,0],[5700,100],[5850,200],[5500,300]]},
 {a:'EL',b:'END',via:[],gate:'complexo'},
 ];
 const closest=(g:any)=>Object.keys(hubs).sort((a,b)=>Math.abs(hubs[a].x-g.x)+Math.abs(hubs[a].y-g.y)*2-Math.abs(hubs[b].x-g.x)-Math.abs(hubs[b].y-g.y)*2)[0];
 if(s.player.x>=c.width)step(hubs.END);
 const cache=goal.x<300*scale&&goal.y<f-700;
 const start=closest(s.player),target=goal.x>=c.width?'END':cache?'WH':closest(goal);
 const queue=[start],back=new Map<string,{from:string;edge:typeof edges[number];reverse:boolean}>(),seen=new Set([start]);
 while(queue.length){const id=queue.shift()!;if(id===target)break;for(const e of edges){const reverse=e.b===id,next=e.a===id?e.b:reverse?e.a:null;if(!next||seen.has(next)||e.gate&&s.platforms.some((p:any)=>p.gateId===e.gate&&!p.broken))continue;seen.add(next);back.set(next,{from:id,edge:e,reverse});queue.push(next);}}
 if(!seen.has(target))throw Error(`No authored regional connection ${start} → ${target}`);
 const path:typeof back extends Map<any,infer T>?T[]:never=[];let cursor=target;while(cursor!==start){const e=back.get(cursor)!;path.unshift(e);cursor=e.from;}
 for(const e of path){for(const[x,y]of e.reverse?[...e.edge.via].reverse():e.edge.via)step(point(x,y));step(hubs[e.reverse?e.edge.a:e.edge.b]);}
 if(cache){step(point(500,700));step(point(320,800));}
 step(goal);return metrics;
}
