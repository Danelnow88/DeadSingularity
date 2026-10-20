'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{NV:{}}};vm.createContext(box);vm.runInContext(fs.readFileSync('js/ui/weaponFusionPresentation.js','utf8'),box);
const NV=box.window.NV;
for(let tier=0;tier<=3;tier++){
 const p=NV.weaponFusionPresentation(tier);assert.equal(p.tier,tier);assert.equal(p.fused,tier>0);
 const html=NV.weaponFusionBadgeHTML(tier);assert.equal((html.match(/fusion-step active/g)||[]).length,tier);
 assert(!/Fusión|Nv[0-9]/.test(html),'No miniature fusion text on weapon icon');
 let saves=0,ops=0;const ctx=new Proxy({}, {get(t,k){if(k==='save')return()=>saves++;if(k==='restore')return()=>saves--;return()=>ops++;},set(t,k,v){t[k]=v;return true;}});
 NV.drawWeaponFusionBadge(ctx,0,0,12,tier);assert.equal(saves,0);assert.equal(ops>0,tier>0);
}
assert.equal(NV.weaponFusionPresentation(99).tier,3);assert.equal(NV.weaponFusionPresentation(-1).tier,0);assert.equal(NV.weaponFusionPresentation(NaN).tier,0);
const game=fs.readFileSync('js/game.js','utf8'),hud=fs.readFileSync('js/render/hud.js','utf8');
assert(!game.includes('class="inv-fuse"'));assert(game.includes('NV.applyWeaponFusionPresentation(slot, fusLevel)'));assert(hud.includes('NV.drawWeaponFusionBadge(ctx'));
assert(game.includes('fusionPreviewLevel: canFuse ? fus + 1 : 0'));
console.log('PASS weapon fusion presentation: base and three tiers, wordless icons, shared HUD/shop semantics, preserved Canvas state and prospective offers');
