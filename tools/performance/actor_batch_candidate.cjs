'use strict';
const assert = require('node:assert/strict');
// Served-source experiment only. Original geometry and stroke style are retained.
module.exports = function batchArms(source) {
  source = source.replaceAll('\r\n', '\n');
  const loop = `    for (let i = 0; i < DRONE_ROTORS.length; i++) {
      const arm = commonPath(ctx, 'drone-arm-' + i);
      ctx.strokeStyle = rgba(color, 0.62); ctx.lineWidth = 3.3; ctx.lineCap = 'round'; strokePath(ctx, arm);
    }`;
  assert(source.includes(loop), 'Drone arm hook changed');
  return source.replace('  function commonPath(ctx, key) {',
    `  COMMON_PATH_BUILDERS['drone-arms'] = p => { for(let i=0;i<DRONE_ROTORS.length;i++) COMMON_PATH_BUILDERS['drone-arm-'+i](p); };
  function commonPath(ctx, key) {`).replace(loop, `    if(NV.__auditOmit==='batcharms'){
      const arms=commonPath(ctx,'drone-arms');
      ctx.strokeStyle=rgba(color,0.62);ctx.lineWidth=3.3;ctx.lineCap='round';strokePath(ctx,arms);
    }else{
${loop}
    }`);
};
