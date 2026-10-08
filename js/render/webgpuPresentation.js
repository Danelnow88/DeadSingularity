// Optional compositor of the complete Canvas2D frame; NOT a faster simulation.
// Canvas2D remains authoritative and is restored on any unsupported/lost device.
(() => {
 'use strict';
 const NV=window.NV;
 let device=null,context=null,overlay=null,texture=null,pipeline=null,sampler=null,source=null,active=false;
 let dirty=true,generation=0,observer=null,testing=false;
 const status={mode:'canvas2d',reason:'not-enabled',frames:0};
 function disable(reason='disabled'){
  generation++;active=false;status.mode='canvas2d';status.reason=reason;
  if(source)source.style.opacity='';
  if(observer){observer.disconnect();observer=null;}
  if(overlay){overlay.remove();overlay=null;}
  if(texture){texture.destroy();texture=null;}
  const previous=device;device=null;context=null;
  if(previous)previous.destroy();
 }
 async function enable(canvas){
  disable();const token=generation;source=canvas;
  if(!navigator.gpu){status.reason='unsupported';return false;}
  try{
   const adapter=await navigator.gpu.requestAdapter();if(!adapter){status.reason='no-adapter';return false;}
   const next=await adapter.requestDevice();
   if(token!==generation){next.destroy();return false;}
   device=next;
   overlay=document.createElement('canvas');overlay.setAttribute('aria-hidden','true');
   overlay.style.cssText='position:absolute;pointer-events:none;z-index:1';
   source.parentElement.insertBefore(overlay,source.nextSibling);
   context=overlay.getContext('webgpu');if(!context)throw new Error('Contexto no disponible');
   const format=navigator.gpu.getPreferredCanvasFormat();
   context.configure({device,format,alphaMode:'premultiplied'});
   const code=`
    @group(0) @binding(0) var image: texture_2d<f32>;
    @group(0) @binding(1) var imageSampler: sampler;
    struct V { @builtin(position) p: vec4f, @location(0) uv: vec2f };
    @vertex fn vs(@builtin(vertex_index) i:u32)->V {
      var points=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
      let p=points[i];var o:V;o.p=vec4f(p,0.,1.);o.uv=vec2f((p.x+1.)*.5,(1.-p.y)*.5);return o;
    }
    @fragment fn fs(v:V)->@location(0) vec4f {return textureSample(image,imageSampler,v.uv);}
   `;
   device.pushErrorScope('validation');
   const module=device.createShaderModule({code});
   pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
   sampler=device.createSampler({magFilter:'nearest',minFilter:'nearest'});
   const error=await device.popErrorScope();if(error)throw new Error(error.message);
   if(token!==generation)return false;
   next.addEventListener('uncapturederror',()=>{if(device===next)disable('gpu-error');});
   next.lost.then(()=>{if(device===next)disable('device-lost');});
   observer=new ResizeObserver(()=>dirty=true);observer.observe(source);dirty=true;
   active=true;status.mode='webgpu-compositor';status.reason=null;return true;
  }catch(error){disable(error.message);return false;}
 }
 function present(canvas){
  if(!active||canvas!==source||testing)return;
  try{
   const w=canvas.width,h=canvas.height;if(w<=0||h<=0)return;
   if(!texture||overlay.width!==w||overlay.height!==h){
    if(texture)texture.destroy();overlay.width=w;overlay.height=h;
    texture=device.createTexture({size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});dirty=true;
   }
   if(dirty){overlay.style.left=source.offsetLeft+'px';overlay.style.top=source.offsetTop+'px';overlay.style.width=source.offsetWidth+'px';overlay.style.height=source.offsetHeight+'px';dirty=false;}
   overlay.style.transform=source.style.transform;
   device.queue.copyExternalImageToTexture({source:canvas},{texture,premultipliedAlpha:true},[w,h]);
   const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler}]});
   const encoder=device.createCommandEncoder();
   const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);
   source.style.opacity='0';status.frames++;
  }catch(error){disable(error.message);}
 }

 async function verifyFrame(){
  if(!active)throw new Error('GPU no activa');
  present(source);testing=true;
  const w=source.width,h=source.height,current=device;
  let target=null,buffer=null;
  try{
   const expected=source.getContext('2d').getImageData(0,0,w,h).data;
   const format=navigator.gpu.getPreferredCanvasFormat();
   target=current.createTexture({size:[w,h],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
   const stride=Math.ceil(w*4/256)*256;
   buffer=current.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
   const bind=current.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler}]});
   const encoder=current.createCommandEncoder();
   const pass=encoder.beginRenderPass({colorAttachments:[{view:target.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
   encoder.copyTextureToBuffer({texture:target},{buffer,bytesPerRow:stride,rowsPerImage:h},[w,h]);
   current.queue.submit([encoder.finish()]);await buffer.mapAsync(GPUMapMode.READ);
   const bytes=new Uint8Array(buffer.getMappedRange()),swap=format.startsWith('bgra');
   let maxError=0,different=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++){
    const actual=bytes[y*stride+x*4+(swap&&c<3?2-c:c)],wanted=expected[(y*w+x)*4+c];
    const difference=Math.abs(actual-wanted);maxError=Math.max(maxError,difference);if(difference)different++;
   }
   buffer.unmap();return {width:w,height:h,maxChannelError:maxError,differingChannels:different,channels:w*h*4};
  }finally{if(buffer)buffer.destroy();if(target)target.destroy();testing=false;}
 }

 NV.webgpuPresentation=Object.freeze({enable,disable,present,verifyFrame,destroyDevice:()=>device&&device.destroy(),diagnostics:()=>Object.assign({},status)});
})();

