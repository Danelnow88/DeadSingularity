'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const Service=require('../js/core/services.js'),Content=require('../js/core/content.js');
const base=JSON.parse(fs.readFileSync('content/catalog.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const data=new Map(),storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v))};
 const local={kind:'dead-singularity-progress',version:1,meta:{metaShards:5},career:{}};
 const remote=structuredClone(local);remote.meta.metaShards=9;
 let imported=false;
 const plan=Service.stub({loadManifest:[{value:{schemaVersion:1,catalogVersion:base.id,transport:'offline'}}],
 fetchCatalog:[{value:base},{value:{schemaVersion:999}}],
 syncProgress:[{value:{schemaVersion:1,revision:1,progress:remote}}],
 submitTelemetry:[{value:{accepted:true}}]});
 const client=Service.create({adapter:plan,storage,validateCatalog:Content.validateCatalog,
 exportProgress:()=>local,importProgress:p=>{imported=p;return true;},canActivate:()=>true});
 assert.equal((await client.fetchCatalog()).status,'current');assert.equal((await client.fetchCatalog()).status,'rollback');
 assert.equal((await client.submitTelemetry({event:'test'})).reason,'consent-required');assert(!plan.calls.some(c=>c.method==='submitTelemetry'));
 client.consent(true);assert((await client.submitTelemetry({event:'test',secret:'must-not-send'})).accepted);
 assert(!('secret' in plan.calls.at(-1).payload));
 assert.equal((await client.syncProgress()).status,'conflict');assert.equal(imported,false);
 assert.equal((await client.syncProgress('remote')).status,'resolved');assert.deepEqual(imported,remote);assert(data.has('deadSingularityProgressBeforeSync'));
 const retry=Service.stub({loadManifest:[{error:'offline',transient:true},{value:{schemaVersion:1,catalogVersion:base.id,transport:'offline'}}]});
 const recovered=Service.create({adapter:retry,storage,validateCatalog:Content.validateCatalog,retries:1});
 assert.equal((await recovered.loadManifest()).catalogVersion,base.id);assert.equal(retry.calls.length,2);
 const timeout=Service.create({adapter:Service.stub({loadManifest:[{delay:100,value:base}]}),storage,timeoutMs:10});
 await assert.rejects(()=>timeout.loadManifest());
 const oversized=Service.create({adapter:Service.stub({loadManifest:[{value:{padding:'x'.repeat(300000)}}]}),storage});
 await assert.rejects(()=>oversized.loadManifest());
 const keys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const payload=JSON.stringify(base),signature=Buffer.from(await webcrypto.subtle.sign('Ed25519',keys.privateKey,Buffer.from(payload))).toString('base64');
 assert.deepEqual(await client.verifySignedCatalog({payload,signature},keys.publicKey,webcrypto.subtle),base);
 await assert.rejects(()=>client.verifySignedCatalog({payload:payload+' ',signature},keys.publicKey,webcrypto.subtle));
 await assert.rejects(()=>client.verifySignedCatalog({payload,signature},null,webcrypto.subtle));
 console.log('PASS growth services: offline retry/timeout, corrupt rollback, consent, conflicts, trusted signature and tamper rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});

