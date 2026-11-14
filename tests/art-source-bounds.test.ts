import test from 'node:test';
import assert from 'node:assert/strict';
import{paintedSourceBounds}from'../tools/paintedSourceBounds';
function canvas(w:number,h:number){const pixels=new Uint8ClampedArray(w*h*4);return{pixels,fill:(x:number,y:number,width:number,height:number,alpha=255)=>{for(let j=y;j<y+height;j++)for(let i=x;i<x+width;i++)pixels[(j*w+i)*4+3]=alpha;}};}
test('source extraction rejects a disconnected neighboring boot and keeps the full figure rectangle',()=>{
 const c=canvas(40,50);c.fill(10,5,12,36);c.fill(33,44,5,5);assert.deepEqual(paintedSourceBounds(c.pixels,40,50),{x:10,y:5,w:12,h:36,pixels:432,fragments:1});
});
test('connected scarf and arms remain inside the extracted figure, including thin attachments',()=>{
 const c=canvas(40,50);c.fill(15,5,10,38);c.fill(5,15,30,2);c.fill(24,7,15,1);const b=paintedSourceBounds(c.pixels,40,50);assert.equal(b.x,5);assert.equal(b.y,5);assert.equal(b.w,34);assert.equal(b.h,38);assert.equal(b.fragments,0);
});
test('faint transparent matte is not a figure and an empty cell is rejected',()=>{
 const c=canvas(40,50);c.fill(0,0,40,50,2);assert.throws(()=>paintedSourceBounds(c.pixels,40,50),/Empty/);c.fill(10,10,5,10);assert.equal(paintedSourceBounds(c.pixels,40,50).w,5);
});
