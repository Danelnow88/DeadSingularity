// Modelo nuevo de mundo/vista: la cámara no cambia posiciones ni bounds físicos.
export class WorldView {
  constructor(){this.camera={x:0,y:0};this.focus=null;this.resize({width:900,height:520});}
  resize({width=900,height=520,left=0,top=0,mobile=false,portrait=height>width,dpr=1,dynamicOff=false}={}){
    this.box={width,height,left,top};this.mobile=mobile;this.dynamic=mobile&&!portrait&&!dynamicOff;
    this.view={width:this.dynamic?Math.max(900,520*width/height):900,height:520};
    this.arena={width:this.view.width*1.5,height:780};
    this.scale=this.dynamic?height/520:Math.min(width/900,height/520);
    this.offset={x:this.dynamic?0:Math.max(0,(width-this.view.width*this.scale)/2),y:this.dynamic?0:Math.max(0,(height-520*this.scale)/2)};
    this.dpr=mobile?Math.min(dpr||1,2,Math.max(1,Math.sqrt(2000000/Math.max(1,width*height)))):1;
    this.camera.x=this.limitCamera(this.camera.x,this.arena.width,this.view.width);
    this.camera.y=this.limitCamera(this.camera.y,this.arena.height,this.view.height);
    if(this.focus)this.follow(this.focus.x,this.focus.y);
    return this;
  }
  limitCamera(origin,arena,visible){const upper=arena-visible+28;return upper<-28?(arena-visible)/2:Math.max(-28,Math.min(upper,origin));}
  follow(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return this;
    this.focus={x,y};this.camera.x=this.limitCamera(x-this.view.width/2,this.arena.width,this.view.width);
    this.camera.y=this.limitCamera(y-260,this.arena.height,520);return this;
  }
  containsRect(x,y,width,height){return x+width>=this.camera.x&&x<=this.camera.x+this.view.width&&y+height>=this.camera.y&&y<=this.camera.y+this.view.height;}
  toWorld(clientX,clientY){
    const x=clientX-this.box.left,y=clientY-this.box.top;
    if(!this.mobile)return {x:this.camera.x+x/(this.box.width/this.view.width||1),y:this.camera.y+y/(this.box.height/520||1)};
    return {x:this.camera.x+(x-this.offset.x)/this.scale,y:this.camera.y+(y-this.offset.y)/this.scale};
  }
  toScreen(x,y){
    const scaleX=!this.mobile?this.box.width/this.view.width:this.scale;
    const scaleY=!this.mobile?this.box.height/520:this.scale;
    return {x:this.box.left+(this.mobile?this.offset.x:0)+(x-this.camera.x)*scaleX,y:this.box.top+(this.mobile?this.offset.y:0)+(y-this.camera.y)*scaleY};
  }
  confine(position,margin=20){position.x=Math.max(margin,Math.min(this.arena.width-margin,position.x));position.y=Math.max(margin,Math.min(this.arena.height-margin,position.y));return position;}
}
