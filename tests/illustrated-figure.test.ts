import test from 'node:test';
import assert from 'node:assert/strict';
import {figureRig,figureGeometry} from '../src/game/illustratedFigure';
test('standing anatomy has a short neck, tapered torso and human shoulder/head ratio',()=>{
 const r=figureRig('idle',0);
 for(const build of ['lean','athletic','heavy'] as const){const g=figureGeometry(r,build);assert.ok(g.shoulder>g.waist);assert.ok(g.shoulder/g.headRadius>1.8);}
 const neckGap=r.chest[1]-7-(r.head[1]+5);assert.ok(neckGap>=0&&neckGap<=3);assert.ok(r.hip[1]>r.chest[1]);assert.ok(r.knees[0][1]>r.hip[1]);
});
test('traversal, recovery and combat keep distinct articulated silhouettes',()=>{
 for(const pose of ['jump','fall','wall','climb','hang','vault','dash','slide','hurt','stun','attack1','attack2','attack3','special','flight','death'])assert.notDeepEqual(figureRig('idle',0),figureRig(pose,0),pose);
 assert.notDeepEqual(figureRig('run',1),figureRig('run',4));
});
