// Approved nine-enemy family. Tank articulation is presentation only; simulation is untouched.
(() => {
  'use strict';
  const NV = window.NV;
  const cache = new Map();
  // Material-only palette transfer, compiled once into each cached body/part.
  // SVG primitives work with file:// sprites without reading their pixels.
  // No filter is used by draw(), and the original PNGs remain untouched.
  const basaltFilters = Object.create(null);
  function basaltFilter(profile = 'family') {
    const key = profile === 'core' ? 'core' : profile === 'elite' ? 'elite' : 'family';
    if (basaltFilters[key]) return basaltFilters[key];
    if (typeof document === 'undefined' || typeof document.createElementNS !== 'function' || !document.documentElement) return null;
    const ns = 'http://www.w3.org/2000/svg';
    const make = (name, attrs) => { const e = document.createElementNS(ns, name); for (const [k,v] of Object.entries(attrs || {})) e.setAttribute(k,String(v)); return e; };
    const svg = make('svg', { width:0, height:0, 'aria-hidden':'true' });
    svg.style.position='absolute';svg.style.pointerEvents='none';
    const id = 'nv-'+key+'-basalt-v1';
    const defs = make('defs'), f = make('filter', { id, x:0, y:0, width:1, height:1, 'color-interpolation-filters':'sRGB' });
    function matrix(result, alpha) { f.appendChild(make('feColorMatrix', { in:'SourceGraphic', result, type:'matrix', values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  '+alpha })); }
    // Warm low-chroma stone: R>G>B; reject saturated yellow/orange and all
    // cyan/green/rose/violet membranes, neutral white light and indigo flesh.
    // Elite stone includes neutral highlights and reflected purple/rose light.
    // Reject dark organic tissue and saturated energy; eyes are drawn separately.
    matrix('warmRG',key !== 'family' ? '8 0 0 0 -2.4' : '24 -24 0 0 -0.02');
    matrix('warmGB',key !== 'family' ? '-8 8 0 0 2.2' : '0 24 -24 0 -0.02');
    matrix('lowChroma',key !== 'family' ? '0 8 -8 0 2.2' : '-3.6 -11.52 24 0 -0.05');
    matrix('notOrange',key !== 'family' ? '8 0 -8 0 1.4' : '-12 12 0 0 2.64');
    for (const [a,b,out] of [['warmRG','warmGB','maskA'],['maskA','lowChroma','maskB'],['maskB','notOrange',key === 'core' ? 'maskC' : 'stoneMask']]) f.appendChild(make('feComposite',{in:a,in2:b,operator:'in',result:out}));
    // Core II's amber inscriptions and thruster light are not stone.
    if(key === 'core'){
      matrix('notYellow','0 -12 12 0 2.2');
      f.appendChild(make('feComposite',{in:'maskC',in2:'notYellow',operator:'in',result:'stoneMask'}));
    }
    f.appendChild(make('feColorMatrix',{in:'SourceGraphic',result:'luma',type:'matrix',values:'.2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0'}));
    const tones=make('feComponentTransfer',{in:'luma',result:'basaltTone'});
    for(const channel of ['R','G','B']) tones.appendChild(make('feFunc'+channel,{type:'gamma',amplitude:.58,exponent:1.6,offset:.005}));
    f.appendChild(tones);
    f.appendChild(make('feColorMatrix',{in:'basaltTone',result:'basalt',type:'matrix',values:'1 0 0 0 0  0 1 0 0 .035  0 0 1 0 .075  0 0 0 1 0'}));
    f.appendChild(make('feComposite',{in:'basalt',in2:'stoneMask',operator:'in',result:'newStone'}));
    f.appendChild(make('feComposite',{in:'SourceGraphic',in2:'stoneMask',operator:'out',result:'unchanged'}));
    // Sum disjoint premultiplied contributions: alpha stays the source alpha.
    f.appendChild(make('feComposite',{in:'newStone',in2:'unchanged',operator:'arithmetic',k1:0,k2:1,k3:1,k4:0}));
    defs.appendChild(f);svg.appendChild(defs);document.documentElement.appendChild(svg);
    basaltFilters[key]='url(#'+id+')';return basaltFilters[key];
  }
  // Cache preparation only: never apply this material to a live frame context.
  NV.cachedBasaltMaterialFilter = basaltFilter;
  const script = typeof document !== 'undefined' ? document.currentScript : null;
  const base = script && script.src
    ? new URL('../../assets/singularity-family/', script.src).href
    : 'assets/singularity-family/';
  // World-space visible extents are measured from the previous production bodies.
  // Common drawers already apply the listed local scale; spectral bodies do not.
  const specs = {
    runner: { size: 45.5, scale: .46, color: '#36d6fa' },
    tank: { size: 51, scale: .50, color: '#ff9b32' },
    swarmlet: { size: 29, scale: .58, color: '#ed71a4' },
    spitter: { size: 52, scale: .48, color: '#b0e52a' },
    wisp: { size: 44.25, scale: .56, color: '#edf5ff' },
    kamikaze: { size: 27.75 * 1.10, scale: .54, color: '#ff646e' },
    specter_archer: { size: 44.5 * 1.15, scale: 1, color: '#f4cd40' },
    specter_guard: { size: 56.75, scale: 1, color: '#36c797' },
    specter_core: { size: 50.5, scale: 1, color: '#965cff' }
  };
  const sourceBounds = {
    "runner": {
      "x": 72,
      "y": 80,
      "width": 1152,
      "height": 1058,
      "sourceWidth": 1254,
      "sourceHeight": 1254,
      "transparent": 0.5602512152499561
    },
    "tank": {
      "x": 73,
      "y": 45,
      "width": 1394,
      "height": 930,
      "sourceWidth": 1536,
      "sourceHeight": 1024,
      "transparent": 0.4281241099039714
    },
    "swarmlet": {
      "x": 61,
      "y": 196,
      "width": 1173,
      "height": 923,
      "sourceWidth": 1254,
      "sourceHeight": 1254,
      "transparent": 0.6665744577479656
    },
    "spitter": {
      "x": 108,
      "y": 115,
      "width": 1329,
      "height": 817,
      "sourceWidth": 1536,
      "sourceHeight": 1024,
      "transparent": 0.5711085001627604
    },
    "wisp": {
      "x": 226,
      "y": 42,
      "width": 1113,
      "height": 887,
      "sourceWidth": 1536,
      "sourceHeight": 1024,
      "transparent": 0.5553029378255209
    },
    "kamikaze": {
      "x": 61,
      "y": 57,
      "width": 1145,
      "height": 1102,
      "sourceWidth": 1254,
      "sourceHeight": 1254,
      "transparent": 0.5216557414996096
    },
    "specter_archer": {
      "x": 46,
      "y": 112,
      "width": 1467,
      "height": 830,
      "sourceWidth": 1536,
      "sourceHeight": 1024,
      "transparent": 0.6019121805826823
    },
    "specter_guard": {
      "x": 67,
      "y": 98,
      "width": 1140,
      "height": 998,
      "sourceWidth": 1254,
      "sourceHeight": 1254,
      "transparent": 0.46187892523828056
    },
    "specter_core": {
      "x": 84,
      "y": 43,
      "width": 1090,
      "height": 1159,
      "sourceWidth": 1254,
      "sourceHeight": 1254,
      "transparent": 0.39069236815396474
    }
  };
  NV.isSingularityFamilyEnemy = e => !!e && !e.isElite && !e.isBoss && Object.prototype.hasOwnProperty.call(specs, e.enemyTypeId);
  NV.drawWispPhaseReticle=function(ctx,e,t,seed,invScale){

    const progress=Math.max(0,Math.min(1,1-(e.wispPhaseTimer||0)/.48)),r=68*invScale,outer=(91-progress*23)*invScale;
    ctx.save();ctx.translate((e.wispTargetX-e.x)*invScale,(e.wispTargetY-e.y)*invScale);ctx.shadowBlur=0;
    ctx.strokeStyle='#d94b55';ctx.lineWidth=1.5*invScale;ctx.lineCap='round';ctx.globalAlpha*=.58+progress*.32;
    ctx.beginPath();
    for(let i=0;i<4;i++){const a=i*(Math.PI*2)/4;ctx.moveTo(Math.cos(a+.18)*outer,Math.sin(a+.18)*outer);ctx.arc(0,0,outer,a+.18,a+(Math.PI*2)/4-.18);}
    ctx.stroke();ctx.globalAlpha*=.68;ctx.lineWidth=1*invScale;ctx.beginPath();
    // Separate subpaths avoid joins across the gaps in the orbital ring.
    for(let i=0;i<4;i++){const a=i*(Math.PI*2)/4+.32;ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.arc(0,0,r,a,a+.91);}
    ctx.stroke();ctx.globalAlpha= .7+progress*.25;ctx.lineWidth=1.8*invScale;ctx.beginPath();
    for(let i=0;i<4;i++){const a=i*(Math.PI*2)/4,c=Math.cos(a),s=Math.sin(a),tip=outer-7*invScale;
      ctx.moveTo(c*(outer+3*invScale)-s*4*invScale,s*(outer+3*invScale)+c*4*invScale);
      ctx.lineTo(c*tip,s*tip);ctx.lineTo(c*(outer+3*invScale)+s*4*invScale,s*(outer+3*invScale)-c*4*invScale);}
    ctx.stroke();ctx.restore();return true;
  };

  function eligible(e) {
    return !!e && !e.dead && !e.waveCleanup && !e.isElite && !e.isBoss && NV.__singularityFamily !== false
      && Object.prototype.hasOwnProperty.call(specs, e.enemyTypeId);
  }
  function prepare(image, spec) {
    // Precomputed alpha bounds avoid forbidden canvas pixel reads on file://.
    // Cropping/drawing local images is supported; reading their pixels is not.
    const bounds = sourceBounds[Object.keys(specs).find(id => specs[id] === spec)];
    if (!bounds || image.naturalWidth !== bounds.sourceWidth || image.naturalHeight !== bounds.sourceHeight) {
      throw Error('Sprite dimensions do not match approved crop metadata');
    }
    const { x: left, y: top, width: sw, height: sh } = bounds;
    const k = spec.size / Math.max(sw, sh);
    const w = sw * k, h = sh * k;
    const body = document.createElement('canvas');
    const density = Math.min(4, 512 / Math.max(w, h));
    body.width = Math.ceil(w * density) + 2;
    body.height = Math.ceil(h * density) + 2;
    const b = body.getContext('2d');
    b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high';
    const materialFilter = basaltFilter();
    const materialReady = !!materialFilter && typeof b.filter === 'string';
    if (materialReady) b.filter = materialFilter;
    b.drawImage(image, left, top, sw, sh, 1, 1, body.width - 2, body.height - 2);
    if (materialReady) b.filter = 'none';
    return { body, w, h, materialReady, transparent: bounds.transparent,
      sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight,
      crop: { x: left, y: top, width: sw, height: sh },
      textureBytes: body.width * body.height * 4 };
  }
  NV.prewarmSingularityFamily = function () {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return;
    for (const [id, spec] of Object.entries(specs)) {
      if (cache.has(id)) continue;
      const entry = { ready: false, error: false, draws: 0 };
      cache.set(id, entry);
      const img = new Image();
      img.onload = () => {
        try { Object.assign(entry, prepare(img, spec), { ready: true }); }
        catch (error) { entry.error = true; entry.reason = error.message; }
      };
      img.onerror = () => { entry.error = true; entry.reason = 'Missing sprite: ' + id; };
      img.src = base + id + '.png';
      const light = new Image();
      light.onload = () => { entry.light = light; entry.lightReady = true; };
      light.onerror = () => { entry.lightError = true; };
      light.src = base + 'lighting/' + id + '.png?nv=' + (id === 'tank' ? 'tank-light-v3' : 'core-light-v2');
      if (id === 'tank') {
        entry.tankParts = {};
        for (const part of ['body-retracted', 'sleeve-middle', 'sleeve-front']) {
          const asset = new Image();
          asset.onload = () => {
            try { entry.tankParts[part] = prepare(asset, spec).body;
              entry.tankAnimationReady = Object.keys(entry.tankParts).length === 3;
            } catch (_) { entry.tankAnimationError = true; }
          };
          asset.onerror = () => { entry.tankAnimationError = true; };
          asset.src = base + 'tank-animation/' + part + '.png?nv=tank-telescope-v1';
        }
      }
    }
  };
  NV.singularityFamilyStats = () => ({ revision: 'basalt-nine-v1', material: 'basalt', species: [...cache].map(([id, a]) => ({
    id, ready: a.ready, tankAnimationReady: !!a.tankAnimationReady, tankAnimationError: !!a.tankAnimationError, error: a.error, reason: a.reason, draws: a.draws, lightReady: !!a.lightReady, lightError: !!a.lightError, lightDraws: a.lightDraws || 0,
    width: a.w, height: a.h, targetSize: specs[id].size, localScale: specs[id].scale,
    color: specs[id].color, materialReady: !!a.materialReady, transparent: a.transparent, crop: a.crop,
    sourceWidth: a.sourceWidth, sourceHeight: a.sourceHeight, textureBytes: (a.textureBytes || 0) + Object.values(a.tankParts || {}).reduce((sum, part) => sum + part.width * part.height * 4, 0) + (a.light ? a.light.naturalWidth * a.light.naturalHeight * 4 : 0)
  })) });
  NV.hasSingularityCoreLight = e => eligible(e) && NV.__singularityCoreLighting !== false && !!cache.get(e.enemyTypeId)?.lightReady;
  function blitPart(ctx, part, w, h, offset = 0) {
    ctx.drawImage(part, 1, 1, part.width - 2, part.height - 2, -w / 2 + offset, -h / 2, w, h);
  }
  function draw(ctx, e, angle, localScale, time, hook) {
    const a = cache.get(e.enemyTypeId);
    if (!eligible(e) || !a || !a.ready) return false;
    ctx.save();
    try {
      ctx.shadowBlur = 0;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (angle) ctx.rotate(angle);
      const w = a.w / localScale, h = a.h / localScale;
      if (e.enemyTypeId === 'tank' && a.tankAnimationReady && NV.tankArticulationPose) {
        const pose = NV.tankArticulationPose(e), extension = pose.extension;
        if (extension >= .999 && pose.recoil === 0) blitPart(ctx, a.body, w, h);
        else {
          blitPart(ctx, a.tankParts['body-retracted'], w, h);
          if (extension > .001) {
            const unit = w / sourceBounds.tank.width;
            ctx.save();
            // Sleeves slide into a fixed socket. Clipping hides their buried ends.
            ctx.beginPath();ctx.rect(-w / 2, -h / 2, (350 + 220 * extension - sourceBounds.tank.x) * unit, h);ctx.clip();
            blitPart(ctx, a.tankParts['sleeve-middle'], w, h, ((1 - extension) * 120 + pose.recoil * 280) * unit);
            blitPart(ctx, a.tankParts['sleeve-front'], w, h, ((1 - extension) * 280 + pose.recoil * 280) * unit);
            ctx.restore();
          }
        }
      } else blitPart(ctx, a.body, w, h);
      const bodyAlpha = ctx.globalAlpha;
      const intensity = NV.singularityCoreIntensity ? NV.singularityCoreIntensity(e, time, hook) : 0;
      if (a.lightReady && intensity > .005) {
        // One pre-baked light/spill draw. No readbacks, frame-time blur, filters or particle allocations.
        const padX = w * 48 / (a.light.naturalWidth - 96);
        const padY = h * 48 / (a.light.naturalHeight - 96);
        const strength = NV.settings?.graphics?.heavyVfx === false ? .80 : 1.0;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= intensity * strength;
        ctx.drawImage(a.light, -w / 2 - padX, -h / 2 - padY, w + padX * 2, h + padY * 2);
        a.lightDraws = (a.lightDraws || 0) + 1;
      }
      if (e.enemyTypeId === 'tank' && a.tankAnimationReady && NV.drawTankMuzzleFlame && e.tankCannonShotEmitted) {
        const pose = NV.tankArticulationPose(e), unit = w / sourceBounds.tank.width;
        ctx.save();ctx.globalAlpha = bodyAlpha;ctx.globalCompositeOperation = 'source-over';
        ctx.translate(-w / 2 + pose.recoil * 280 * unit, -h / 2 + (606 - sourceBounds.tank.y) * unit);
        ctx.rotate(Math.PI);ctx.scale(1 / localScale, 1 / localScale);
        NV.drawTankMuzzleFlame(ctx, e);ctx.restore();
      }
    } finally { ctx.restore(); }
    a.draws++;
    return true;
  }
  NV.drawSingularityCommon = function (ctx, e, dx, dy, time) {
    if (!eligible(e) || e.enemyTypeId.startsWith('specter_')) return false;
    let angle = 0;
    if (e.enemyTypeId === 'tank' && e.tankCannonState && (e.tankCannonState === 'windup' || e.tankCannonState === 'recovery')
      && Number.isFinite(e.tankCannonTargetX) && Number.isFinite(e.tankCannonTargetY)) {
      dx = e.tankCannonTargetX - e.x; dy = e.tankCannonTargetY - e.y;
    }
    if (e.enemyTypeId === 'runner' && (e.intent?.state === 'attack' || e.flankState === 'attack')
      && Math.hypot(e.commitDirX || 0, e.commitDirY || 0) > .001) {
      dx = e.commitDirX; dy = e.commitDirY;
    }
    // Facing and articulation are presentation only; simulation timers are read-only.
    if (Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > .001) {
      angle = Math.atan2(dy, dx) + Math.PI;
    }
    return draw(ctx, e, angle, specs[e.enemyTypeId].scale, time);
  };
  NV.drawSingularitySpecter = function (ctx, e, player, time, hook) {
    if (!eligible(e) || !e.enemyTypeId.startsWith('specter_')) return false;
    const a = cache.get(e.enemyTypeId);
    if (!a?.ready) return false;
    ctx.save();
    try {
      ctx.translate(e.x, e.y);
      let angle = 0;
      if (e.enemyTypeId === 'specter_archer' && player) {
        angle = Math.atan2(player.y - e.y, player.x - e.x) + Math.PI;
      }
      return draw(ctx, e, angle, 1, time, hook);
    } finally { ctx.restore(); }
  };
  NV.prewarmSingularityFamily();
})();
