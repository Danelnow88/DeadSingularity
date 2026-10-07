const fs = require('fs');

const source = fs.readFileSync('js/render/enemies.js', 'utf8');
const tankStart = source.indexOf('function drawTank(');
const tankEnd = source.indexOf('function drawShielder(', tankStart);
const tank = source.slice(tankStart, tankEnd);

if (tankStart < 0 || tankEnd < 0) throw new Error('No se encontró el renderer del tanque');
if (tank.includes('TANK_CRACK_BODY')) throw new Error('El tanque todavía dibuja grietas decorativas en el cuerpo');
if (tank.includes('const pulse =')) throw new Error('El tanque todavía conserva un pulso visual decorativo');

const windupStart = source.indexOf("e.enemyTypeId === 'tank' && !e.isElite && e.tankCannonState");
const windupEnd = source.indexOf('// Rally del comandante:', windupStart);
const windup = source.slice(windupStart, windupEnd);
if (windupStart < 0 || windupEnd < 0) throw new Error('No se encontró el telégrafo del cañón del tanque');
if (windup.includes('setLineDash') || windup.includes('ctx.lineTo(x2, y2)')) throw new Error('El telégrafo del tanque sigue cubriendo la arena con una línea larga');
if (!windup.includes('const mark = 5 + progress * 2')) throw new Error('El telégrafo compacto del punto de impacto no está presente');

console.log('PASS limpieza visual: tanque con lectura compacta y sin telemetría sobrante');
