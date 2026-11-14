import type { SubstageDefinition } from './types';
export function requiredRouteNodes(stage:SubstageDefinition){return(stage.exploration?.nodes??[]).filter(n=>!n.optional);}
export function routeFinished(stage:SubstageDefinition,active:ReadonlySet<string>){return requiredRouteNodes(stage).every(n=>active.has(n.id));}
export function gateOpened(stage:SubstageDefinition,id:string,active:ReadonlySet<string>){
 const gate=stage.exploration?.gates?.find(g=>g.id===id);
 return gate?gate.requires.every(n=>active.has(n)):routeFinished(stage,active);
}
