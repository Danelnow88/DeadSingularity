'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),Content=require('../js/core/content.js');
function snapshot(source=root){
 const sandbox={window:{NV:{}},console};
 for(const file of ['js/core/state.js','js/data/gameData.js','js/data/balance.js','js/data/consumables.js','js/render/sectors.js'])
   vm.runInNewContext(fs.readFileSync(path.join(source,file),'utf8'),sandbox,{filename:file});
 const n=sandbox.window.NV,toEntries=(values,id)=>values.map((data,i)=>({id:id(data,i),data}));
 return JSON.parse(JSON.stringify({schemaVersion:1,id:'dead-singularity-alpha-1',
 pilots:Object.entries(n.CHARACTERS).map(([id,data])=>({id,data})),
 weapons:toEntries(n.WEAPONS,x=>x.id),enemies:toEntries(n.ENEMY_TYPES,x=>x.id),
 elites:toEntries(n.ELITE_TYPES,x=>x.id||x.visualId),
 bosses:toEntries(n.BOSS_TYPES,(x,i)=>'boss-'+i),
 sectors:toEntries(n.SECTOR_VISUALS,x=>x.id),
 consumables:Object.entries(n.CONSUMABLES).map(([id,data])=>({id,data}))}));
}
function generated(catalog){return '// Generated from content/catalog.json. Run npm run content:build.\nNV.Content.setBase('+JSON.stringify(catalog)+');\n';}
function run(){
 const file=path.join(root,'content/catalog.json');
 if(process.argv.includes('--extract')){
   fs.mkdirSync(path.dirname(file),{recursive:true});
   fs.writeFileSync(file,JSON.stringify(snapshot(),null,2)+'\n');
 }
 const catalog=Content.validateCatalog(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
 const target=path.join(root,'js/data/catalog.js');
 if(process.argv.includes('--build'))fs.writeFileSync(target,generated(catalog));
 else assert.equal(fs.readFileSync(target,'utf8'),generated(catalog),'Catalogo generado desactualizado: npm run content:build');
 for(const group of Content.GROUPS)for(const entry of catalog[group])if(entry.data.asset)assert(fs.existsSync(path.join(root,entry.data.asset)),'Recurso faltante');
 const packageDir=path.join(root,'content/packages');
 for(const name of fs.readdirSync(packageDir).filter(x=>x.endsWith('.json')))
   Content.validatePackage(JSON.parse(fs.readFileSync(path.join(packageDir,name),'utf8').replace(/^\uFEFF/,'')),catalog);
 console.log('PASS catalogo v1: '+Content.GROUPS.map(g=>g+' '+catalog[g].length).join(', '));
}
if(require.main===module)run();
module.exports={snapshot,generated};

