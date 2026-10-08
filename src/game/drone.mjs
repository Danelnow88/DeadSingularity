// IA independiente del dron común. Sin importar el motor del prototipo.
export function createDrone(x,y,hp,angle=0){
  return {id:'drone',x,y,hp,angle,arrival:.9,puff:false,contact:0,phase:'formation',timer:0,
    cooldown:.75+Math.abs(Math.sin(angle))*1.15,side:Math.sin(angle)>=0?1:-1,kx:0,ky:0,slow:0,immune:0};
}
export function hitDrone(e,x,y){
  if(e.slow<=0&&e.immune<=0){e.slow=.15;e.immune=.35;}
  const a=Math.atan2(e.y-y,e.x-x);e.kx+=Math.cos(a)*60;e.ky+=Math.sin(a)*60;
}
function confine(e,arena){
  const margin=Math.min(Math.min(arena.width,arena.height)*.5-1,33.1);
  const x=Math.max(margin,Math.min(arena.width-margin,e.x)),y=Math.max(margin,Math.min(arena.height-margin,e.y));
  if(x!==e.x)e.kx=0;if(y!==e.y)e.ky=0;e.x=x;e.y=y;
}
export function stepDrones(enemies,p,arena,speed,dt,onContact){
  // Buckets fijos por frame, posiciones mutables: conserva el orden de separación.
  const grid=new Map();enemies.forEach((e,i)=>{if(e.hp<=0||e.arrival>0)return;const key=`${Math.floor(e.x/96)},${Math.floor(e.y/96)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([e,i]);});
  enemies.forEach((e,index)=>{
    if(e.hp<=0||e.arrival>0)return;confine(e,arena);
    const kx=Math.abs(e.kx)>.1?e.kx:0,ky=Math.abs(e.ky)>.1?e.ky:0;
    e.contact=Math.max(0,e.contact-dt);e.slow=Math.max(0,e.slow-dt);e.immune=Math.max(0,e.immune-dt);
    const velocity=speed*(e.slow>0?.85:1),dx=p.x-e.x,dy=p.y-e.y,d=Math.max(1,Math.hypot(dx,dy));let contact=false;
    e.cooldown=Math.max(0,e.cooldown-dt);
    if(e.phase==='signal'){e.timer=Math.max(0,e.timer-dt);if(e.timer<=1e-9){e.phase='press';e.timer=.72;}}
    else if(e.phase==='press'){contact=true;e.timer=Math.max(0,e.timer-dt);e.x+=dx/d*velocity*1.75*dt+kx*dt;e.y+=dy/d*velocity*1.75*dt+ky*dt;if(e.timer<=1e-9){e.phase='recovery';e.timer=.52;}}
    else if(e.phase==='recovery'){e.timer=Math.max(0,e.timer-dt);e.x+=-dy/d*e.side*velocity*.55*dt+kx*dt;e.y+=dx/d*e.side*velocity*.55*dt+ky*dt;if(e.timer<=1e-9){e.phase='formation';e.cooldown=2.35;e.side=-e.side;}}
    else if(e.cooldown<=1e-9&&d>=94&&d<=192){e.phase='signal';e.timer=.34;}
    else{const radial=d>158?1:d<112?-1:0;e.x+=(dx/d*radial-dy/d*e.side*.34)*velocity*dt+kx*dt;e.y+=(dy/d*radial+dx/d*e.side*.34)*velocity*dt+ky*dt;}
    if(e.phase==='formation'){
      const cx=Math.floor(e.x/96),cy=Math.floor(e.y/96);
      for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++)for(const [other,otherIndex] of grid.get(`${cx+ix},${cy+iy}`)||[]){
        if(other===e||other.hp<=0)continue;const sx=e.x-other.x,sy=e.y-other.y,dist=Math.hypot(sx,sy);
        if(dist<28){const a=dist>0?Math.atan2(sy,sx):(index-otherIndex)*2.399963229728653,push=Math.min(1.6,(28-dist)*7*dt);e.x+=Math.cos(a)*push;e.y+=Math.sin(a)*push;}
      }
    }
    e.kx*=.92;e.ky*=.92;confine(e,arena);
    if(contact&&Math.hypot(e.x-p.x,e.y-p.y)<31&&e.contact<=0)onContact(e);
  });
}
