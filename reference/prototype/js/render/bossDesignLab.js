// Render fiel del laboratorio autorizado jefesV11.txt, en coordenadas de mundo.
(() => {
'use strict';
const NV = window.NV;
function hexToRgb(hex){
  hex = String(hex || '#7cf8ff').replace('#','');
  if(hex.length === 3) hex = hex.split('').map(function(x){ return x+x; }).join('');
  var num = parseInt(hex, 16);
  return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
}
function rgba(hex, a){
  var c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
}

function drawGrid(ctx, W, H){
  ctx.save();
  ctx.strokeStyle = 'rgba(124, 248, 255, 0.05)';
  ctx.lineWidth = 1;
  for(var x=0; x<=W; x+=28){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(var y=0; y<=H; y+=28){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  
  ctx.strokeStyle = 'rgba(124, 248, 255, 0.12)';
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
  ctx.restore();
}

function drawEnergyFlare(ctx, r, color, time, count){
  const budget = NV.getVisualBudget ? NV.getVisualBudget() : null;
  if (budget && budget.tier === 'minimal') return;
  if (budget && budget.tier === 'reduced') count = Math.ceil(count / 2);
  ctx.save();
  ctx.rotate(time * 0.005);
  for(var i=0; i<count; i++){
    var ang = (i / count) * Math.PI * 2;
    var len = r * (1.3 + Math.sin(time*0.08 + i)*0.25);
    var g = ctx.createLinearGradient(0,0, Math.cos(ang)*len, Math.sin(ang)*len);
    g.addColorStop(0, rgba(color, 0.8));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(ang)*len, Math.sin(ang)*len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnergyPulseRings(ctx, r, color, time){
  const budget = NV.getVisualBudget ? NV.getVisualBudget() : null;
  if (budget && budget.tier !== 'full') return;
  ctx.save();
  for(var i=0; i<3; i++){
    var pulseR = ((time * 0.8 + i * 35) % 100) / 100 * (r * 1.8);
    var alpha = Math.max(0, 1 - (pulseR / (r * 1.8)));
    ctx.strokeStyle = rgba(color, alpha * 0.6);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHyperCore(ctx, r, colorA, colorB, time){
  ctx.save();
  var pulse = Math.sin(time * 0.1) * (r * 0.08);
  var coreR = r * 0.35 + pulse;
  
  var g = ctx.createRadialGradient(0,0,0, 0,0,coreR*1.8);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, rgba(colorA, 0.95));
  g.addColorStop(0.7, rgba(colorB, 0.6));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0,0,coreR*1.8,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0,0,coreR*0.5,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawEye(ctx, x, y, rx, ry, irisColor, pupilX, pupilY){
  ctx.save();
  ctx.fillStyle = 'rgba(240, 248, 255, 0.96)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = irisColor || '#06131f';
  ctx.beginPath();
  ctx.arc(x + (pupilX||0)*rx*0.3, y + (pupilY||0)*ry*0.3, Math.max(2, rx*0.35), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - rx*0.28, y - ry*0.28, Math.max(1, rx*0.14), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDetailedSpikeStar(ctx, r, count, innerR, outerR, mainColor, edgeColor, rot){
  ctx.save();
  ctx.rotate(rot || 0);
  for(var i=0; i<count; i++){
    var a1 = (i / count) * Math.PI * 2;
    var a2 = ((i + 0.5) / count) * Math.PI * 2;
    var a3 = ((i + 1) / count) * Math.PI * 2;
    
    var xOut = Math.cos(a2) * outerR;
    var yOut = Math.sin(a2) * outerR;
    var xIn1 = Math.cos(a1) * innerR;
    var yIn1 = Math.sin(a1) * innerR;
    var xIn2 = Math.cos(a3) * innerR;
    var yIn2 = Math.sin(a3) * innerR;

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(xIn1, yIn1);
    ctx.lineTo(xOut, yOut);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(edgeColor, 0.45);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(xOut, yOut);
    ctx.lineTo(xIn2, yIn2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(xOut, yOut);
    ctx.stroke();
  }
  ctx.restore();
}

// Dibujado de filamentos ultra-finitos para contorno
function drawFineOuterSpikes(ctx, r, count, innerMul, outerMul, color, rot, width){
  const budget = NV.getVisualBudget ? NV.getVisualBudget() : null;
  if (budget && budget.tier === 'minimal') return;
  if (budget && budget.tier === 'reduced') count = Math.ceil(count / 2);
  ctx.save();
  ctx.rotate(rot || 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 0.8;
  for(var i=0; i<count; i++){
    var a = (i / count) * Math.PI * 2;
    var r1 = r * innerMul;
    var r2 = r * outerMul;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*r1, Math.sin(a)*r1);
    ctx.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderBoss(ctx, boss, time, options){
  options = options || {};
  var cx = boss.x || 0, cy = boss.y || 0;
  var r = boss.visual ? boss.visual.radius : boss.radius;
  var c = boss.visual ? boss.visual.color : boss.color;
  
  ctx.save();
  ctx.translate(cx, cy);
  var scale = options.scale || 1.15;
  ctx.scale(scale, scale);

  drawEnergyPulseRings(ctx, r, c, time);
  drawEnergyFlare(ctx, r, c, time, 8);

  switch(boss.visual ? boss.visual.bossIndex : boss.bossIndex){
    case 1: // JEFE 1
      drawDetailedSpikeStar(ctx, r, 16, r*0.7, r*1.3, rgba('#1a3f99', 0.85), '#6ba0ff', time * 0.005);
      drawDetailedSpikeStar(ctx, r, 12, r*0.5, r*1.1, rgba('#3a72ff', 0.9), '#ffffff', -time * 0.008);
      
      var g1 = ctx.createRadialGradient(0,0,2, 0,0,r*0.6);
      g1.addColorStop(0, '#000000');
      g1.addColorStop(0.75, '#05112e');
      g1.addColorStop(1, '#6ba0ff');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(0, 0, r*0.6, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = '#99c2ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawHyperCore(ctx, r*0.6, '#7cf8ff', '#3a72ff', time);
      drawEye(ctx, 0, 0, r*0.18, r*0.18, '#031024', Math.sin(time*0.04)*0.2, 0);
      break;

    case 2: // TITÁN 2
      ctx.save();
      ctx.rotate(time * 0.01);
      for(var k2=0; k2<6; k2++){
        var ak2 = (k2/6)*Math.PI*2;
        var rx2 = Math.cos(ak2)*r*1.55, ry2 = Math.sin(ak2)*r*1.55;
        ctx.fillStyle = '#b3d9ff';
        ctx.beginPath();
        ctx.arc(rx2, ry2, 3, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      drawDetailedSpikeStar(ctx, r, 8, r*0.35, r*1.45, rgba('#4d88ff', 0.9), '#e6f0ff', time * 0.004);
      drawDetailedSpikeStar(ctx, r, 8, r*0.45, r*1.15, rgba('#1e3d80', 0.85), '#99c2ff', time * 0.004 + Math.PI/8);
      drawDetailedSpikeStar(ctx, r, 16, r*0.6, r*0.9, rgba('#89b8ff', 0.95), '#ffffff', -time * 0.006);
      
      drawHyperCore(ctx, r*0.5, '#ffffff', '#89b8ff', time);
      drawEye(ctx, 0, 0, r*0.22, r*0.16, '#020b18', 0, 0);
      break;

    case 3: // SEÑOR DEL VACÍO 3 - REFINADO CON DETALLES FINOS
      // Filamentos finos de atracción gravitatoria externa
      drawFineOuterSpikes(ctx, r, 48, 0.8, 1.55, rgba('#80bfff', 0.45), -time*0.01, 0.6);
      drawFineOuterSpikes(ctx, r, 32, 0.6, 1.35, rgba('#338eff', 0.6), time*0.015, 0.8);

      ctx.save();
      ctx.rotate(time * 0.02);
      for(var i3=0; i3<12; i3++){
        var ang3 = (i3/12) * Math.PI*2;
        ctx.strokeStyle = rgba('#3b8eff', 0.5 - (i3*0.035));
        ctx.lineWidth = 4.5 - (i3*0.3);
        ctx.beginPath();
        ctx.arc(0, 0, r*(0.35 + i3*0.11), ang3, ang3 + 2.8);
        ctx.stroke();
      }
      ctx.restore();

      // Relámpagos del vacío ultrafinos
      ctx.save();
      ctx.strokeStyle = '#b3d9ff';
      ctx.lineWidth = 0.9;
      for(var l3=0; l3<8; l3++){
        var al3 = (l3/8)*Math.PI*2 + time*0.04;
        ctx.beginPath();
        ctx.moveTo(Math.cos(al3)*r*0.35, Math.sin(al3)*r*0.35);
        ctx.lineTo(Math.cos(al3)*r*1.4, Math.sin(al3)*r*1.4);
        ctx.stroke();
      }
      ctx.restore();
      
      var g3 = ctx.createRadialGradient(0,0,1, 0,0,r*0.75);
      g3.addColorStop(0, '#000000');
      g3.addColorStop(0.7, '#040d24');
      g3.addColorStop(1, '#3b8eff');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(0,0,r*0.75,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#80c1ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawHyperCore(ctx, r*0.4, '#a6d2ff', '#0044cc', time);
      drawEye(ctx, 0, 0, r*0.2, r*0.2, '#000814', Math.cos(time*0.04)*0.18, Math.sin(time*0.04)*0.18);
      break;

    case 4: // GUARDIÁN 4 - REFINADO SAGRADO CON GEOMETRÍA ULTRA-FINA
      // Red de trazos geométricos extendidos exteriores
      ctx.save();
      ctx.rotate(time * 0.003);
      ctx.strokeStyle = 'rgba(176, 200, 255, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for(var h4=0; h4<12; h4++){
        var ah4 = (h4/12)*Math.PI*2;
        var ah4_next = ((h4+4)/12)*Math.PI*2;
        ctx.moveTo(Math.cos(ah4)*r*1.5, Math.sin(ah4)*r*1.5);
        ctx.lineTo(Math.cos(ah4_next)*r*1.5, Math.sin(ah4_next)*r*1.5);
      }
      ctx.stroke();
      ctx.restore();

      // Anillos rúnicos concéntricos
      ctx.save();
      ctx.rotate(-time * 0.008);
      ctx.strokeStyle = 'rgba(176, 200, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0,0, r*1.4, 0, Math.PI*2);
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0,0, r*1.28, 0, Math.PI*2);
      ctx.stroke();

      for(var g4=0; g4<8; g4++){
        var ag4 = (g4/8)*Math.PI*2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.cos(ag4)*r*1.4 - 2.5, Math.sin(ag4)*r*1.4 - 2.5, 5, 5);
      }
      ctx.restore();

      // Caras cristalinas del icosaedro
      ctx.save();
      ctx.rotate(time * 0.005);
      ctx.strokeStyle = 'rgba(210, 230, 255, 0.95)';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(25, 60, 115, 0.65)';
      
      ctx.beginPath();
      for(var j4=0; j4<6; j4++){
        var a4 = (j4/6)*Math.PI*2;
        var x4 = Math.cos(a4)*r*1.18, y4 = Math.sin(a4)*r*1.18;
        if(j4===0) ctx.moveTo(x4,y4); else ctx.lineTo(x4,y4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.0;
      for(var k4=0; k4<6; k4++){
        var ak4 = (k4/6)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(ak4)*r*1.18, Math.sin(ak4)*r*1.18);
        ctx.stroke();
      }
      ctx.restore();

      drawHyperCore(ctx, r*0.48, '#ffffff', '#b0c8ff', time);
      drawEye(ctx, 0, 0, r*0.3, r*0.2, '#041226', 0, 0);
      break;

    case 5: // DESTRUCTOR 5 - REFINADO MÁXIMO CON MICRO-ESPINAS PUNTUALES
      // Capa extra de agujas periféricas hiper-finitas de alta densidad
      drawFineOuterSpikes(ctx, r, 64, 0.35, 1.7, rgba('#ff1a6c', 0.6), time*0.006, 0.6);
      drawFineOuterSpikes(ctx, r, 48, 0.45, 1.45, rgba('#33d6ff', 0.75), -time*0.01, 0.8);

      drawDetailedSpikeStar(ctx, r, 24, r*0.35, r*1.55, rgba('#ff1a6c', 0.85), '#ff99c2', time * 0.008);
      drawDetailedSpikeStar(ctx, r, 16, r*0.45, r*1.3, rgba('#33d6ff', 0.9), '#ffffff', -time * 0.012);
      drawDetailedSpikeStar(ctx, r, 12, r*0.3, r*1.05, '#ffffff', '#ffccd9', time * 0.016);
      
      var g5 = ctx.createRadialGradient(0,0,0, 0,0,r*0.42);
      g5.addColorStop(0, '#000000');
      g5.addColorStop(0.7, '#330014');
      g5.addColorStop(1, '#ff2a7a');
      ctx.fillStyle = g5;
      ctx.beginPath();
      ctx.arc(0,0,r*0.42,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawHyperCore(ctx, r*0.35, '#ffffff', '#ff2a7a', time);
      break;

    case 6: // NÉMESIS 6
      drawDetailedSpikeStar(ctx, r, 4, r*0.25, r*1.6, rgba('#33c6ff', 0.95), '#ffffff', time * 0.004);
      drawDetailedSpikeStar(ctx, r, 4, r*0.3, r*1.25, rgba('#0077b3', 0.85), '#99e6ff', time * 0.004 + Math.PI/4);
      drawDetailedSpikeStar(ctx, r, 8, r*0.5, r*0.88, rgba('#b3f0ff', 0.9), '#ffffff', -time * 0.008);
      
      drawHyperCore(ctx, r*0.45, '#ffffff', '#5cd2ff', time);
      drawEye(ctx, 0, 0, r*0.22, r*0.22, '#031728', 0, 0);
      break;

    case 7: // COLOSO 7
      drawDetailedSpikeStar(ctx, r, 14, r*0.45, r*1.45, rgba('#cc1111', 0.9), '#ff9933', time * 0.006);
      drawDetailedSpikeStar(ctx, r, 10, r*0.55, r*1.18, rgba('#ff6600', 0.85), '#ffff66', -time * 0.009);
      
      var g7 = ctx.createRadialGradient(0,0,2, 0,0,r*0.58);
      g7.addColorStop(0, '#110000');
      g7.addColorStop(0.7, '#660000');
      g7.addColorStop(1, '#ff4400');
      ctx.fillStyle = g7;
      ctx.beginPath();
      ctx.arc(0,0,r*0.58,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      drawHyperCore(ctx, r*0.4, '#ffffaa', '#ff3300', time);
      drawEye(ctx, 0, 0, r*0.24, r*0.16, '#200000', Math.sin(time*0.05)*0.12, 0);
      break;

    case 8: // FANTASMA 8
      ctx.save();
      ctx.rotate(Math.sin(time*0.025)*0.12);
      
      for(var m=0; m<7; m++){
        var tailL = r * (1.35 + m*0.22);
        var offY = (m - 3) * 7;
        ctx.strokeStyle = rgba('#84e1ff', 0.48 - m*0.06);
        ctx.lineWidth = 4.5 - m*0.6;
        ctx.beginPath();
        ctx.moveTo(0, offY);
        ctx.bezierCurveTo(
          tailL*0.4, offY + Math.sin(time*0.08 + m)*20,
          tailL*0.85, offY - Math.sin(time*0.08 + m)*20,
          tailL*1.4, offY
        );
        ctx.stroke();
      }
      
      drawDetailedSpikeStar(ctx, r*0.8, 10, r*0.5, r*0.95, rgba('#b8f0ff', 0.9), '#ffffff', time*0.008);
      drawHyperCore(ctx, r*0.4, '#ffffff', '#84e1ff', time);
      drawEye(ctx, -r*0.08, 0, r*0.28, r*0.22, '#021824', 0.12, 0);
      ctx.restore();
      break;

    case 9: // MUTANTE 9
      drawDetailedSpikeStar(ctx, r, 18, r*0.4, r*1.42, rgba('#b31aff', 0.85), '#ff99f0', time * 0.01);
      drawDetailedSpikeStar(ctx, r, 12, r*0.55, r*1.15, rgba('#ff33aa', 0.8), '#ffffff', -time * 0.014);
      
      drawHyperCore(ctx, r*0.4, '#ffffff', '#d662ff', time);
      drawEye(ctx, 0, 0, r*0.2, r*0.2, '#1a0026', 0, 0);
      drawEye(ctx, -r*0.35, -r*0.22, r*0.12, r*0.1, '#1a0026', -0.2, -0.2);
      drawEye(ctx, r*0.35, r*0.22, r*0.12, r*0.1, '#1a0026', 0.2, 0.2);
      drawEye(ctx, -r*0.1, r*0.35, r*0.1, r*0.08, '#1a0026', 0, 0.3);
      break;

    case 10: // APOCALIPSIS 10 - REFINADO SOLAR CON CORONA CONTINUA
      // Corona de destellos de agujas ultra-finitas radiantes en el perímetro exterior
      drawFineOuterSpikes(ctx, r, 72, 0.5, 1.65, rgba('#ff9900', 0.65), time*0.006, 0.7);
      drawFineOuterSpikes(ctx, r, 48, 0.65, 1.4, rgba('#ffcc00', 0.85), -time*0.01, 0.9);

      ctx.save();
      ctx.rotate(time * 0.01);
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.8)';
      ctx.lineWidth = 1.5;
      for(var p=0; p<14; p++){
        var ap = (p/14)*Math.PI*2;
        ctx.beginPath();
        ctx.arc(0,0, r*1.45, ap, ap+0.22);
        ctx.stroke();
      }
      ctx.restore();

      drawDetailedSpikeStar(ctx, r, 20, r*0.35, r*1.55, rgba('#ff3300', 0.9), '#ffcc00', time * 0.008);
      drawDetailedSpikeStar(ctx, r, 14, r*0.5, r*1.28, rgba('#ff9900', 0.95), '#ffffff', -time * 0.012);
      
      var g10 = ctx.createRadialGradient(0,0,0, 0,0,r*0.55);
      g10.addColorStop(0, '#000000');
      g10.addColorStop(0.65, '#1f0800');
      g10.addColorStop(1, '#ff5500');
      ctx.fillStyle = g10;
      ctx.beginPath();
      ctx.arc(0,0,r*0.55,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      
      drawHyperCore(ctx, r*0.45, '#ffffff', '#ff5500', time);
      drawEye(ctx, 0, 0, r*0.22, r*0.22, '#2b0a00', Math.sin(time*0.06)*0.2, Math.cos(time*0.06)*0.2);
      break;
  }

  // Hitbox
  if(options.showHitbox){
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 96, 151, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius / scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}


NV.drawBossDesign = function(ctx, boss, frame, options) {
  if (!boss || boss.isBoss !== true || boss.dead || boss.hp <= 0 || !boss.visual) return false;
  ctx.save();
  try { renderBoss(ctx, boss, frame, options); } finally { ctx.restore(); }
  return true;
};
})();
