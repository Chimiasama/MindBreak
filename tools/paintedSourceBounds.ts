/** Locate one connected figure in a source cell, without changing any source pixels. */
export function paintedSourceBounds(pixels:Uint8ClampedArray,width:number,height:number){
 const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
 let best:{x:number;y:number;w:number;h:number;pixels:number}|undefined,fragments=0;
 for(let start=0;start<visited.length;start++){
  if(visited[start]||pixels[start*4+3]<=32)continue;
  let head=0,tail=1,left=width,top=height,right=-1,bottom=-1;queue[0]=start;visited[start]=1;
  while(head<tail){
   const point=queue[head++],x=point%width,y=Math.floor(point/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   for(const next of [x>0?point-1:-1,x+1<width?point+1:-1,y>0?point-width:-1,y+1<height?point+width:-1]){
    if(next>=0&&!visited[next]&&pixels[next*4+3]>32){visited[next]=1;queue[tail++]=next;}
   }
  }
  if(!best||tail>best.pixels){if(best&&best.pixels>5)fragments++;best={x:left,y:top,w:right-left+1,h:bottom-top+1,pixels:tail};}
  else if(tail>5)fragments++;
 }
 if(!best)throw Error('Empty authored figure');
 // Rectangular extraction preserves anatomy; it cannot remove an attached extra limb.
 return{...best,fragments};
}
