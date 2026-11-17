import {navigate as local} from './navigation';
import type {GameEngine} from '../../src/game/engine';

interface GraphEdge {
  a: string;
  b: string;
  via: [number, number][];
  gate?: string;
}

const pt = (x: number, y: number, w = 110, h = 56) => ({ x, y: y - h, w, h });

function stage1Graph(substageId: string): { hubs: Record<string, { x: number; y: number; w: number; h: number }>; edges: GraphEdge[] } | null {
  if (substageId === '1A') {
    return {
      hubs: {
        ENTRY: pt(120, 660),
        WG: pt(520, 660),
        WM: pt(1400, 420),
        WH: pt(140, 180, 140),
        CENT: pt(2300, 660),
        CM: pt(3100, 420),
        CH: pt(3940, 180),
        CE: pt(4240, 660),
        EW: pt(4620, 660),
        E_GAL: pt(5400, 400),
        E_MID: pt(5700, 660),
        E_WALL: pt(6860, 660),
        EM: pt(7180, 180),
        EE: pt(7620, 660),
        EXIT: pt(8000, 660),
      },
      edges: [
        { a: 'ENTRY', b: 'WG', via: [] },
        { a: 'WG', b: 'WM', via: [[680, 420]] },
        { a: 'WM', b: 'WH', via: [[650, 420], [400, 180]] },
        { a: 'WM', b: 'CENT', via: [[1960, 420]] },
        { a: 'WG', b: 'CENT', via: [[1100, 660], [1700, 660]] },
        { a: 'CENT', b: 'CM', via: [[2460, 420]] },
        { a: 'CM', b: 'CH', via: [[3320, 420], [3680, 180]] },
        { a: 'CM', b: 'CE', via: [[3860, 420]] },
        { a: 'CE', b: 'EW', via: [], gate: 'linha' },
        { a: 'EW', b: 'E_MID', via: [] },
        { a: 'EW', b: 'E_GAL', via: [[4780, 400]] },
        { a: 'E_GAL', b: 'E_MID', via: [] },
        { a: 'E_MID', b: 'E_WALL', via: [] },
        { a: 'E_WALL', b: 'EM', via: [[6720, 400], [7040, 180]] },
        { a: 'EM', b: 'EE', via: [] },
        { a: 'E_WALL', b: 'EE', via: [] },
        { a: 'EE', b: 'EXIT', via: [], gate: 'rota' },
      ],
    };
  }
  if (substageId === '1B') {
    return {
      hubs: {
        ENTRY: pt(120, 660),
        B1W: pt(530, 660),
        B1M: pt(1100, 420),
        B1R: pt(1860, 660),
        B2L: pt(2460, 660),
        B2M: pt(3340, 420),
        B2H: pt(3940, 180),
        B2R: pt(4240, 660),
        B3L: pt(4720, 660),
        B3G: pt(4940, 660),
        B3M: pt(5800, 400),
        B3R: pt(6620, 660),
        B4L: pt(7120, 660),
        B4M: pt(7380, 380),
        B4H: pt(7900, 140),
        B4R: pt(8060, 660),
        EXIT: pt(8400, 660),
      },
      edges: [
        { a: 'ENTRY', b: 'B1W', via: [] },
        { a: 'B1W', b: 'B1M', via: [[700, 420]] },
        { a: 'B1M', b: 'B2M', via: [[1880, 420], [2120, 380], [2720, 420]] },
        { a: 'B2M', b: 'B2H', via: [[3540, 420], [3880, 180]] },
        { a: 'B2M', b: 'B2R', via: [[3860, 660]] },
        { a: 'B2L', b: 'B2M', via: [[2720, 420]] },
        { a: 'B2M', b: 'B3L', via: [[4420, 420]] },
        { a: 'B2R', b: 'B3L', via: [[3860, 660], [3880, 180], [4280, 420], [4420, 420]] },
        { a: 'B3L', b: 'B3G', via: [], gate: 'linha' },
        { a: 'B3G', b: 'B3M', via: [[5200, 400]] },
        { a: 'B3G', b: 'B3R', via: [[5600, 660]] },
        { a: 'B3M', b: 'B4M', via: [[6420, 160], [6820, 380]] },
        { a: 'B4L', b: 'B4M', via: [[7280, 380]] },
        { a: 'B4M', b: 'B4H', via: [[7600, 380], [7860, 140]] },
        { a: 'B4L', b: 'B4R', via: [[7600, 660]] },
        { a: 'B4R', b: 'EXIT', via: [], gate: 'rota' },
      ],
    };
  }
  if (substageId === '1C') {
    return {
      hubs: {
        ENTRY: pt(120, 720),
        W1: pt(520, 720),
        W2: pt(1380, 440),
        W3: pt(2080, 440),
        C1: pt(2480, 720),
        C2: pt(3540, 440),
        C3: pt(4000, 200),
        C_END: pt(4580, 720),
        E1: pt(4900, 720),
        E_GAL: pt(5500, 420),
        E_MID: pt(6460, 720),
        E_WALL: pt(7160, 720),
        E2: pt(7520, 180),
        E3: pt(7880, 720),
        EXIT: pt(8300, 720),
      },
      edges: [
        { a: 'ENTRY', b: 'W1', via: [] },
        { a: 'W1', b: 'W2', via: [[680, 440]] },
        { a: 'W2', b: 'W3', via: [] },
        { a: 'W3', b: 'C1', via: [] },
        { a: 'W1', b: 'C1', via: [[1240, 720], [1800, 720]] },
        { a: 'C1', b: 'C2', via: [[2760, 440]] },
        { a: 'C2', b: 'C3', via: [[3580, 440], [3920, 200]] },
        { a: 'C2', b: 'C_END', via: [[3600, 440], [3920, 720]] },
        { a: 'C_END', b: 'E1', via: [], gate: 'linha' },
        { a: 'E1', b: 'E_GAL', via: [[5180, 420]] },
        { a: 'E1', b: 'E_MID', via: [[5900, 720]] },
        { a: 'E_GAL', b: 'E_MID', via: [] },
        { a: 'E_MID', b: 'E_WALL', via: [] },
        { a: 'E_WALL', b: 'E2', via: [[7040, 420], [7340, 180]] },
        { a: 'E2', b: 'E3', via: [] },
        { a: 'E_WALL', b: 'E3', via: [] },
        { a: 'E3', b: 'EXIT', via: [], gate: 'rota' },
      ],
    };
  }
  if (substageId === '1D') {
    return {
      hubs: {
        ENTRY: pt(120, 700),
        W1: pt(560, 700),
        VM: pt(1480, 440),
        VME: pt(3520, 440),
        VH: pt(4000, 200),
        AVC: pt(3200, 700),
        AVE: pt(4680, 700),
        EG: pt(5060, 700),
        EM: pt(5320, 440),
        EH: pt(5900, 190),
        E_PRE: pt(6520, 700),
        GOAL: pt(8380, 700),
      },
      edges: [
        { a: 'ENTRY', b: 'W1', via: [] },
        { a: 'W1', b: 'VM', via: [[720, 440]] },
        { a: 'VM', b: 'VME', via: [[2500, 440]] },
        { a: 'VME', b: 'VH', via: [[3880, 200]] },
        { a: 'VME', b: 'AVC', via: [] },
        { a: 'ENTRY', b: 'AVC', via: [[840, 700], [1500, 700], [2200, 700], [2860, 700]] },
        { a: 'AVC', b: 'AVE', via: [] },
        { a: 'AVE', b: 'EG', via: [], gate: 'linha' },
        { a: 'EG', b: 'EM', via: [[5180, 440]] },
        { a: 'EM', b: 'EH', via: [[5840, 190]] },
        { a: 'EG', b: 'E_PRE', via: [[5800, 700]] },
        { a: 'E_PRE', b: 'GOAL', via: [[7500, 700]], gate: 'rota' },
      ],
    };
  }
  return null;
}

/** Region waypoints guide the physical search; every accepted leg is replayed by real input ticks. */
export function navigate(engine:GameEngine,s:any,goal:{x:number;y:number;w:number;h:number}){
 const custom=stage1Graph(s.stage.substageId);
 if(custom){
  const metrics={jumps:0,left:0,right:0};
  const step=(g:{x:number;y:number;w:number;h:number})=>{const m=local(engine,s,g);metrics.jumps+=m.jumps;metrics.left+=m.left;metrics.right+=m.right;};
  const closest=(g:any)=>Object.keys(custom.hubs).sort((a,b)=>Math.abs(custom.hubs[a].x-g.x)+Math.abs(custom.hubs[a].y-g.y)*2-Math.abs(custom.hubs[b].x-g.x)-Math.abs(custom.hubs[b].y-g.y)*2)[0];
  const start=closest(s.player),target=closest(goal);
  const queue=[start],back=new Map<string,{from:string;edge:GraphEdge;reverse:boolean}>(),seen=new Set([start]);
  while(queue.length){
   const id=queue.shift()!;if(id===target)break;
   for(const e of custom.edges){
    const reverse=e.b===id,next=e.a===id?e.b:reverse?e.a:null;
    if(!next||seen.has(next)||e.gate&&s.platforms.some((p:any)=>p.gateId===e.gate&&!p.broken))continue;
    seen.add(next);back.set(next,{from:id,edge:e,reverse});queue.push(next);
   }
  }
  if(!seen.has(target))throw Error(`No authored regional connection ${start} -> ${target} in ${s.stage.substageId}`);
  const path:{from:string;edge:GraphEdge;reverse:boolean}[]=[];let cursor=target;
  while(cursor!==start){const e=back.get(cursor)!;path.unshift(e);cursor=e.from;}
  for(const e of path){
   for(const [x,y] of e.reverse?[...e.edge.via].reverse():e.edge.via)step(pt(x,y,140));
   step(custom.hubs[e.reverse?e.edge.a:e.edge.b]);
  }
  step(goal);return metrics;
 }
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
