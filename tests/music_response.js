'use strict';
// Synthetic signals only. This validates the response plumbing/limits; it does
// not assert separation of real instruments, perfect tempo or an artist match.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Motion=require('../js/engine/audioPerimeterMotion.js');
const features=['intensity','aggression','sustain','brightness','tension','drop','release',
  'kickPulse','snarePulse','hatPulse','attackPulse','rush','dynamics','crest','musicLevel'];
function source(){
  const r={enabled:true,active:true,state:'listening',energy:0,energyRaw:0,bass:0,mids:0,highs:0,
    density:0,tempoBpm:120,kick:0,snare:0,onset:0,hats:0,beat:0,accent:0,punch:0,
    kickId:0,snareId:0,onsetId:0,hatId:0,lastOnsetAt:0,analysisRevision:0,
    data:new Uint8Array(256),audioCtx:{sampleRate:48000},_amplitude:0,reads:0};
  r.analyser={fftSize:512,getFloatTimeDomainData(target){
    r.reads++;for(let i=0;i<target.length;i++)target[i]=Math.sin(i*Math.PI/16)*r._amplitude;
  }};
  return r;
}
function arrangement(fps,kind,seconds=8){
  const state=Motion.create(),r=source(),spectrum=state.spectrum,peaks=state.peaks,flux=state.bandFlux;
  const config=kind==='calm'?{level:.055,k:0,s:0,h:0,density:0,bpm:74}:
    kind==='trap'?{level:.33,k:2,s:1,h:12,density:8,bpm:96}:
    {level:.66,k:8,s:4,h:14,density:14,bpm:174};
  let analysis=-1,previousKick=-1,previousSnare=-1,previousHat=-1,count=0;
  const sums=Object.fromEntries(features.map(key=>[key,0]));
  for(let frame=0;frame<seconds*fps;frame++){
    const time=(frame+1)/fps,revision=Math.floor(time*60+1e-7);
    if(revision!==analysis){
      analysis=revision;const t=revision/60;
      const kickEvent=Math.floor(t*config.k+1e-7),snareEvent=Math.floor(t*config.s+1e-7),hatEvent=Math.floor(t*config.h+1e-7);
      const kick=config.k?Math.exp(-(t-kickEvent/config.k)/.065):0;
      const snare=config.s?Math.exp(-(t-snareEvent/config.s)/.05):0;
      const hat=config.h?Math.exp(-(t-hatEvent/config.h)/.024):0;
      if(config.k&&kickEvent!==previousKick){r.kickId++;r.onsetId++;r.lastOnsetAt=t;previousKick=kickEvent;}
      if(config.s&&snareEvent!==previousSnare){r.snareId++;previousSnare=snareEvent;}
      if(config.h&&hatEvent!==previousHat){r.hatId++;previousHat=hatEvent;}
      const level=config.level*(kind==='calm'?1:.77+.23*kick);
      r._amplitude=level;
      for(let bin=0;bin<r.data.length;bin++){
        const tone=kind==='calm'?Math.exp(-(((bin-12)/3)**2))*.35:
          bin<3?(kind==='trap'?.5:.18)+kick*.48:bin<45?(kind==='dense'?.7:.14)+snare*.28:
          bin<150?(kind==='dense'?.3:.025)+hat*.38:.015;
        r.data[bin]=Math.max(0,Math.min(255,Math.round(tone*config.level*255)));
      }
      Object.assign(r,{analysisRevision:revision,energy:level,energyRaw:level,bass:level*(.6+kick*.35),
        mids:level*(kind==='dense'?.85:.3),highs:level*(.1+hat*.6),kick,snare,onset:Math.max(kick,snare),
        hats:hat,beat:kick,accent:kick>.5?1:.2,punch:kick,density:config.density,tempoBpm:config.bpm});
    }
    Motion.update(state,r,1/fps);
    assert.equal(state.spectrum,spectrum);assert.equal(state.peaks,peaks);assert.equal(state.bandFlux,flux);
    for(const key of features)assert(Number.isFinite(state[key])&&state[key]>=0&&state[key]<=1,key+' escaped its bound');
    for(const value of state.bandFlux)assert(Number.isFinite(value)&&value>=0&&value<=1,'invalid shared band flux');
    if(time>seconds-3){count++;for(const key of features)sums[key]+=state[key];}
  }
  for(const key of features)sums[key]/=count;
  return {state,r,means:sums};
}
const calm=arrangement(144,'calm'),trap=arrangement(144,'trap'),dense=arrangement(144,'dense');
assert(dense.means.intensity>calm.means.intensity+.15,'dense music is visually indistinguishable from calm music');
assert(dense.means.aggression>calm.means.aggression+.2,'dense music did not gain stronger controlled movement');
assert(trap.means.hatPulse>calm.means.hatPulse+.015,'rapid subdivisions were discarded');
assert(dense.means.rush>calm.means.rush+.05,'dense percussion lacks a fast response layer');
assert(calm.means.attackPulse<.01,'sustained quiet tone creates fake percussion');
const disconnected={...dense.r,active:false};
for(let frame=0;frame<12*120;frame++)Motion.update(dense.state,disconnected,1/120);
assert.equal(dense.state.mode,'silence');assert.equal(dense.state.visualActivity,0);
for(const key of ['intensity','aggression','kickPulse','snarePulse','hatPulse','attackPulse','rush','musicLevel'])
  assert(dense.state[key]<.001,key+' persisted after disconnect');
const frame30=arrangement(30,'trap'),frame144=trap;
for(const key of ['intensity','aggression','sustain','musicLevel','brightness'])
  assert(Math.abs(frame30.means[key]-frame144.means[key])<.09,key+' depends on screen refresh');
// The waveform read belongs to an analysis revision, never to each display.
const reused=source(),state=Motion.create();reused.energy=.5;reused.energyRaw=.3;reused._amplitude=.4;reused.data.fill(80);
Motion.update(state,reused,1/60);const reads=reused.reads;
for(let i=0;i<20;i++)Motion.update(state,reused,1/144);
assert.equal(reused.reads,reads,'waveform was reread without an analysis revision');
reused.analysisRevision++;Motion.update(state,reused,1/60);assert.equal(reused.reads,reads+1);
// Analyzer waveform silence wins over AGC tails and cached FFT/signal values.
reused._amplitude=0;reused.energy=.9;reused.energyRaw=.8;reused.bass=.8;reused.mids=.8;reused.highs=.8;
for(let i=0;i<12*120;i++){reused.analysisRevision++;Motion.update(state,reused,1/120);}
assert.equal(state.mode,'silence');assert.equal(state.visualActivity,0,'AGC or FFT tails prevent silence');
// End-to-end synthetic FFT -> existing rhythmAnalyze -> shared motion. No IDs
// or broad-band envelopes are manually supplied here; flux must remain useful
// in a fast full-band passage even if the legacy heavy stroke rejects a hit.
const sandbox={window:{NV:{}},console,localStorage:{getItem(){return null;},setItem(){}},Uint8Array,Promise};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/engine/rhythm.js'),'utf8'),sandbox);
function pipeline(heavy){
  const NV=sandbox.window.NV,r=NV.rhythmFreshState(),s=Motion.create();
  const bins=new Uint8Array(256);let amplitude=heavy?.66:.055;
  Object.assign(r,{enabled:true,active:true,state:'listening',data:bins,audioCtx:{sampleRate:48000},
    analyser:{fftSize:512,getFloatTimeDomainData(target){for(let i=0;i<target.length;i++)target[i]=Math.sin(i*Math.PI/16)*amplitude;}}});
  let intensity=0,aggression=0,hat=0,kick=0,snare=0,frames=0;
  for(let frame=0;frame<600;frame++){
    const t=(frame+1)/60,k=Math.exp(-(t-Math.floor(t*8)/8)/.028),h=Math.exp(-(t-Math.floor(t*14)/14)/.015),
      n=Math.exp(-(t-Math.floor(t*4)/4)/.035);
    for(let bin=0;bin<256;bin++)bins[bin]=heavy?Math.min(255,Math.round(bin<3?35+k*220:
      bin<52?135+n*95:bin<151?35+h*175:3)):bin>8&&bin<15?23:0;
    NV.rhythmAnalyze(r,bins,t);Motion.update(s,r,1/120);Motion.update(s,r,1/120);
    if(frame>300){intensity+=s.intensity;aggression+=s.aggression;frames++;}
    hat=Math.max(hat,s.hatPulse);kick=Math.max(kick,s.kickPulse);snare=Math.max(snare,s.snarePulse);
  }
  amplitude=0;bins.fill(0);
  for(let frame=0;frame<600;frame++){NV.rhythmAnalyze(r,bins,10+(frame+1)/60);Motion.update(s,r,1/60);}
  assert.equal(s.visualActivity,0,'real pipeline never settled after silence');
  return {intensity:intensity/frames,aggression:aggression/frames,hat,kick,snare};
}
const realCalm=pipeline(false),realDense=pipeline(true);
assert(realDense.intensity>realCalm.intensity+.15);assert(realDense.aggression>realCalm.aggression+.2);
assert(realDense.hat>.08&&realDense.kick>.08&&realDense.snare>.08,'real pipeline dropped independent percussion channels');
// Suspense/swells use actual level and sustain, not a made-up metronome. A
// sudden intensity reduction emits a bounded release, then reaches true rest.
const swellSource=source(),swell=Motion.create();swellSource.data.fill(55,4,45);
swellSource.energy=.35;swellSource.energyRaw=.2;swellSource._amplitude=.07;
for(let frame=0;frame<180;frame++){swellSource.analysisRevision++;Motion.update(swell,swellSource,1/60);}
const initialTension=swell.tension;let maxTension=0,maxDrop=0,maxRelease=0;
for(let frame=0;frame<240;frame++){
  swellSource._amplitude=.07+frame/240*.5;swellSource.analysisRevision++;
  Motion.update(swell,swellSource,1/60);maxTension=Math.max(maxTension,swell.tension);
  assert(swell.attackPulse<.001,'a level-only crescendo manufactured percussion');
}
assert(maxTension>initialTension+.05,'sustained crescendo lacks a suspense response');
swellSource._amplitude=0;
for(let frame=0;frame<600;frame++){
  swellSource.analysisRevision++;Motion.update(swell,swellSource,1/60);
  maxDrop=Math.max(maxDrop,swell.drop);maxRelease=Math.max(maxRelease,swell.release);
}
assert(maxDrop>.1&&maxRelease>.01,'intensity drop has no release envelope');
assert.equal(swell.visualActivity,0,'a release keeps animating after silence');
// A partial/unsupported waveform API must fail once, fall back to existing raw
// analysis and never create an exception on every frame/revision.
const fallbackSource=source(),fallback=Motion.create();let failedReads=0;
fallbackSource.energy=.5;fallbackSource.energyRaw=.3;fallbackSource.data.fill(70);
fallbackSource.analyser.getFloatTimeDomainData=()=>{failedReads++;throw Error('unsupported synthetic waveform');};
for(let i=0;i<120;i++){fallbackSource.analysisRevision++;Motion.update(fallback,fallbackSource,1/60);}
assert.equal(failedReads,1,'unsupported waveform API is retried indefinitely');assert(fallback.musicLevel>0);
const src=fs.readFileSync(require.resolve('../js/engine/audioPerimeterMotion.js'),'utf8');
for(const forbidden of ['getByteFrequencyData','requestAnimationFrame','AudioContext(','Math.random('])assert(!src.includes(forbidden),'response added '+forbidden);
console.log('PASS music response: dense/calm contrast, rapid subdivisions, sustained tone, bounded envelopes, shared reusable features, revision-only waveform read, silence and refresh invariance');
