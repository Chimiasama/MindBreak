import { writeFileSync, mkdirSync } from 'node:fs';
import { getSubstage } from '../src/game/campaign';
import type { SubstageId } from '../src/game/campaign';
const esc = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
mkdirSync('docs/mapas',{recursive:true});
for (const id of ['1A','4B','8C'] as SubstageId[]) {
 const a=getSubstage(id), top=a.boundsTop-80, height=a.boundsBottom-top+150;
 const shapes: string[]=[];
 const text=(x:number,y:number,label:string,color='#e2e8f0',size=30)=>shapes.push(`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="sans-serif">${esc(label)}</text>`);
 for(const p of a.platforms){const color=p.gateId?'#f59e0b':p.type==='acid'?'#16a34a':p.type==='laser_gate'?'#fb7185':p.type==='moving'?'#a78bfa':'#334155';shapes.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${color}" stroke="#64748b" stroke-width="2"/>`);}
 for(const p of a.props){shapes.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.kind==='chest'?'#facc15':'#94a3b8'}"/>`);if(p.kind==='chest')text(p.x-10,p.y-12,'★','#facc15');}
 const nodes=a.exploration?.nodes??[];
 const route=[{x:a.spawnX,y:a.spawnY},...nodes,...a.exits.filter(e=>e.x>a.boundsWidth/2)];
 shapes.push(`<polyline points="${route.map(p=>`${p.x+12},${p.y-65}`).join(' ')}" stroke="#22d3ee" stroke-width="4" stroke-dasharray="14 10" fill="none"/>`);
 for(const[i,n]of nodes.entries()){shapes.push(`<circle cx="${n.x+14}" cy="${n.y+20}" r="24" fill="#0891b2"/>`);text(n.x+4,n.y+30,String(i+1),'#fff',28);text(n.x-25,n.y-90,n.label,'#67e8f9',26);}
 for(const p of a.enemies)if(p.requiredGuard){shapes.push(`<circle cx="${p.x+17}" cy="${p.y+28}" r="20" fill="#ef4444"/>`);}
 for(const e of a.exits){shapes.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="#a855f7"/>`);text(Math.min(e.x,a.boundsWidth-360),e.y-20,e.label,'#d8b4fe',25);}
 for(const p of a.checkpoints){shapes.push(`<path d="M${p.x},${p.y+56}v-46h28v20h-28" fill="none" stroke="#38bdf8" stroke-width="4"/>`);}
 text(a.spawnX-30,a.spawnY-40,'Entrada','#fff',26);
 text(20,top+45,`${id} · ${a.title}`,'#fff',38);
 text(20,a.boundsBottom+70,'1 → 2 → passagem · ★ depósito · vermelho: guarda · âmbar: portão','#cbd5e1',26);
 text(20,a.boundsBottom+110,'Setas indicam a ordem dos objetivos. Geometria exportada do catálogo de campanha.','#94a3b8',23);
 writeFileSync(`docs/mapas/${id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 ${top} ${a.boundsWidth+220} ${height}" width="1120" role="img" aria-label="${esc(a.title)}"><rect x="-110" y="${top}" width="${a.boundsWidth+220}" height="${height}" fill="#0f172a"/>${shapes.join('')}</svg>\n`);
}
