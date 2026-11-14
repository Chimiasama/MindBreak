/** Shared lazy loader: image failure leaves simulation and procedural fallback available. */
export function createPaintedAtlasLoader(metadata:{width:number;height:number},url:string){
 let atlas:HTMLCanvasElement|null=null,state:'idle'|'loading'|'ready'|'error'='idle',pending:Promise<boolean>|undefined;
 return{
  getAtlas:()=>atlas,status:()=>state,
  load():Promise<boolean>{
   if(pending)return pending;if(typeof Image==='undefined')return Promise.resolve(false);
   state='loading';pending=new Promise(resolve=>{
    const image=new Image();image.decoding='async';
    image.onload=()=>{try{
     if(image.naturalWidth!==metadata.width||image.naturalHeight!==metadata.height)throw Error('Painted atlas dimensions do not match manifest');
     const c=document.createElement('canvas');c.width=metadata.width;c.height=metadata.height;const ctx=c.getContext('2d');if(!ctx)throw Error('Painted canvas unavailable');ctx.drawImage(image,0,0);atlas=c;state='ready';image.src='';resolve(true);
    }catch{state='error';image.src='';resolve(false);}};
    image.onerror=()=>{state='error';resolve(false);};image.src=url;
   });return pending;
  },
 };
}
