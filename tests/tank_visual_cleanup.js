const fs = require('fs');

const source = fs.readFileSync('js/render/enemies.js', 'utf8');
const tankStart = source.indexOf('function drawTank(');
const tankEnd = source.indexOf('function drawShielder(', tankStart);
const tank = source.slice(tankStart, tankEnd);

if (tankStart < 0 || tankEnd < 0) throw new Error('No se encontró el renderer del tanque');
if (tank.includes('TANK_CRACK_BODY')) throw new Error('El tanque todavía dibuja grietas decorativas en el cuerpo');
if (tank.includes('const pulse =')) throw new Error('El tanque todavía conserva un pulso visual decorativo');

if (source.includes('ctx.translate(r*.95,0)') || source.includes('2 + progress * 2.5')) throw Error('Old displaced tank wedge/dot remains');
const family=fs.readFileSync('js/render/singularityFamily.js','utf8');
if(!family.includes('NV.drawTankMuzzleFlame(ctx, e)') || !family.includes('606 - sourceBounds.tank.y'))throw Error('Muzzle flame must use the actual sprite mouth');
console.log('PASS tank: no displaced atkFlash wedge/dot; muzzle flame belongs to articulated sprite.');
