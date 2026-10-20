'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync('js/render/singularityCoreLight.js','utf8');
function load(reduced=false){const NV={};vm.runInNewContext(source,{window:{NV,matchMedia:()=>({matches:reduced})},Math,Number});return NV;}
const NV=load(),light=(e,t=0,h)=>NV.singularityCoreIntensity(e,t,h);
const ids=['runner','tank','swarmlet','spitter','wisp','kamikaze','specter_archer','specter_guard','specter_core'];
for(const id of ids)assert.equal(light({enemyTypeId:id}),0,id+': no idle attack warnings');
const ranged=(id,p)=>({enemyTypeId:id,intent:{state:'windup',stateTimer:(1-p)*.6}});
assert(light({enemyTypeId:'runner',intent:{state:'windup',stateTimer:.26*(1-.18)}})>light({enemyTypeId:'runner',intent:{state:'windup',stateTimer:.26*(1-.43)}}));
assert(light({enemyTypeId:'tank',tankCannonState:'windup',tankCannonTimer:.05})>light({enemyTypeId:'tank',tankCannonState:'windup',tankCannonTimer:.6}));
for(const [peak,gap]of [[.15,.31],[.46,.61],[.78,.99]])assert(light(ranged('spitter',peak))>light(ranged('spitter',gap)),'spitter distinct bursts');
assert.equal(light({enemyTypeId:'swarmlet',swarmState:'form',swarmStateTimer:.5}),0);
assert(light({enemyTypeId:'swarmlet',swarmState:'form',swarmStateTimer:.1,swarmReady:true})>.3);
assert(light({enemyTypeId:'swarmlet',swarmState:'commit'})>.6);
assert.equal(light({enemyTypeId:'swarmlet',swarmState:'regroup'}),0);
assert.equal(light({enemyTypeId:'wisp',wispPhaseState:'mark'}),0);
assert(light({enemyTypeId:'wisp',wispPhaseState:'phase_out',wispPhaseTimer:.1})>.5);
assert(light({enemyTypeId:'wisp',wispPhaseState:'pulse'})>.8);
assert.equal(light({enemyTypeId:'kamikaze',armed:false,fuse:.1}),0);
assert(light({enemyTypeId:'kamikaze',armed:true,fuse:.05})>.9);
const owner=ranged('specter_archer',1),hook={srcEnemy:owner,phase:'windup',windupTimer:.55};
assert(light(owner,0,hook)<.2,'hook preparation overrides stale projectile state');
const guard={enemyTypeId:'specter_guard',guardProtectionActive:true,guardTarget:{dead:false}};
assert(light(guard,.336)>light(guard,2.1));
assert.equal(light({...guard,guardTarget:{dead:true}}),0);
let previous=-1;for(let i=0;i<=120;i++){const v=light({enemyTypeId:'specter_core',coreZoneState:'windup',coreZoneTimer:.55*(1-i/120)});assert(v>=previous);previous=v;}
const fixtures=[ranged('runner',.5),{enemyTypeId:'tank',tankCannonState:'windup',tankCannonTimer:.5},{enemyTypeId:'swarmlet',swarmState:'form',swarmReady:true,swarmStateTimer:.1},ranged('spitter',.5),{enemyTypeId:'wisp',wispPhaseState:'phase_out',wispPhaseTimer:.1},{enemyTypeId:'kamikaze',armed:true,fuse:.2},ranged('specter_archer',.5),guard,{enemyTypeId:'specter_core',coreZoneState:'windup',coreZoneTimer:.2}];
for(const e of fixtures){if(e.intent)Object.freeze(e.intent);if(e.guardTarget)Object.freeze(e.guardTarget);Object.freeze(e);const before=JSON.stringify(e);
 for(const hz of [30,60,120,165])for(let i=0;i<20;i++){const v=light(e,i/hz);assert(Number.isFinite(v)&&v>=0&&v<=1);assert.equal(v,light(e,i/hz));}
 assert.equal(JSON.stringify(e),before);assert.equal(light({...e,dead:true}),0);assert.equal(light({...e,isElite:true}),0);
}
const calm=load(true);for(let i=0,last=0;i<=100;i++){const v=calm.singularityCoreIntensity(ranged('spitter',i/100),0);assert(v>=last);last=v;}
NV.__singularityCoreLighting=false;assert.equal(light(fixtures[0]),0);
for(const id of ids){const png=fs.readFileSync(path.join('assets/singularity-family/lighting',id+'.png'));assert.equal(png[25],6);assert(png.readUInt32BE(16)<=352&&png.readUInt32BE(20)<=352);}
assert(!/getImageData|createRadialGradient|shadowBlur|\.filter\s*=|Math\.random|Date\.now/.test(source));
console.log('PASS core lighting: nine real-state cadences; no false idle warnings; hook priority; hidden wisp; protection semantics; immutable data; deterministic sampling; reduced motion; bounded RGBA maps.');
