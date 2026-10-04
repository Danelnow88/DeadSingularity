const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const gold=process.argv.includes('--gold');
const polish=process.argv.includes('--polish');
const original=fs.readFileSync('previews/trailer-metal-2026-10-03/'+(polish?'before-mirror.html':gold?'before-gold.html':'original.html'),'utf8').replace(/\r\n/g,'\n');
const current=fs.readFileSync('dev/TRAILER CINEMATIC.HTML','utf8').replace(/\r\n/g,'\n');
const scripts=current.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
for(const script of scripts)new vm.Script(script[1],{filename:'TRAILER CINEMATIC.HTML'});
const section=(source,name)=>{
  const start=source.indexOf('function '+name+'(');assert(start>=0,name);
  const next=source.indexOf('\nfunction ',start+1);
  return source.slice(start,next<0?source.length:next).replace(/\/\*[\s\S]*?\*\//g,'').trim();
};
const protectedFunctions=['resize','fillHoles','projX','projY','updateVP','camera','layer','drawAt','start','update','frame',
  'initAudio','noiseSrc','noiseBurst','tone','boom','riser','guitar','scheduleBar','pump','scheduleAudio','drawTV','drawShard','titleSurface','drawSpaced','drawText']
  .filter(name=>!polish||!['resize','titleSurface'].includes(name));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const hashes={};
for(const name of protectedFunctions){assert.equal(section(current,name),section(original,name),'contrato '+name);hashes[name]=sha(section(current,name));}
if(gold||polish) {
  const extra=['renderTitle','makeIslands','drawIslands','drawSun','drawClouds','drawStars','drawGround','drawCracks','spawnSparks','spawnDust','spawnShards','buildEvents','slab','draw'];
  if(polish)extra.push('build');
  for(const name of extra.filter(name=>!polish||!['renderTitle','slab','draw'].includes(name))) {
    assert.equal(section(current,name),section(original,name),'escena/material renderer '+name);
    hashes[name]=sha(section(current,name));
  }
}
const controlsStartCurrent=current.indexOf("overlay.addEventListener('click'");
const controlsStartOriginal=original.indexOf("overlay.addEventListener('click'");
assert.equal(current.slice(controlsStartCurrent).trim(),original.slice(controlsStartOriginal).trim(),'controles y boot');
const colorNeutral=source=>section(source,'drawTitles').replace(/glowColor: '[^']*'/g,"glowColor: 'MATERIAL'");
assert.equal(colorNeutral(current),colorNeutral(original),'física y poses de los títulos');
const volume=source=>source.slice(source.indexOf('// ---- caras del volumen'),source.indexOf(polish?'    const K =':'    const tmp =',source.indexOf('// ---- caras del volumen')));
assert.equal(volume(current),volume(original),'máscaras, agujeros y extrusión');
assert(!/https?:\/\//.test(current),'HTML autónomo sin recursos externos');
fs.writeFileSync('previews/trailer-metal-2026-10-03/'+(polish?'contracts-mirror.json':gold?'contracts-gold.json':'contracts.json'),JSON.stringify({pass:true,protectedFunctions,hashes,
  unchanged:['audio','controls','boot','timeline','title poses','camera','projection','extrusion masks'],originalSha256:sha(original),finalSha256:sha(current)},null,2));
console.log('PASS trailer contracts: '+protectedFunctions.length+' funciones protegidas; audio, controles, cámara, caída y máscaras intactos');
