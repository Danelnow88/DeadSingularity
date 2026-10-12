'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {installSystemAudio}=require('../desktop/system-audio.cjs');
async function fixture(options={}){
  const frame={url:'dsv1://project/index.html?dimensionEvents=preview'},web={mainFrame:null};web.mainFrame=frame;
  const win={webContents:web,isDestroyed:()=>false};const handlers={},calls={consent:0,sources:0,music:[]};
  const session={setPermissionRequestHandler(fn){handlers.permission=fn;},setPermissionCheckHandler(fn){handlers.check=fn;},setDisplayMediaRequestHandler(fn){handlers.display=fn;}};
  installSystemAudio({session,getWindow:()=>win,platform:options.platform||'win32',
    ipcMain:{handle(_name,fn){handlers.open=fn;}},shell:{async openExternal(url){calls.music.push(url);}},
    dialog:{async showMessageBox(){calls.consent++;if(options.blockDialog)await options.blockDialog;if(options.navigate)frame.url='https://evil.example/';return {response:options.response??1};}},
    desktopCapturer:{async getSources(){calls.sources++;return options.noSources?[]:[{id:'screen:0',name:'test'}];}}});
  const request={frame,userGesture:true,audioRequested:true,videoRequested:true};
  const acquire=async overrides=>{let result='unset';await handlers.display({...request,...overrides},value=>result=value);return result;};
  return {frame,web,calls,handlers,acquire};
}
(async()=>{
  let f=await fixture();assert.equal((await f.acquire()).audio,'loopback');assert.equal(f.calls.consent,1);
  assert(f.handlers.check(f.web,'display-capture'));assert(!f.handlers.check(f.web,'media'));assert(!f.handlers.check(f.web,'geolocation'));
  assert(!f.handlers.check({mainFrame:f.frame},'display-capture'));
  for(const mediaTypes of [[],['audio'],['video'],['audio','video']]){
    let grant;f.handlers.permission(f.web,'media',value=>grant=value,{isMainFrame:true,mediaTypes,requestingUrl:f.frame.url});
    assert.equal(grant,mediaTypes.length===0,'physical microphone/camera access incorrectly allowed');
  }
  let grantUnknown;f.handlers.permission(f.web,'media',value=>grantUnknown=value,{});assert.equal(grantUnknown,false);
  const event={sender:f.web,senderFrame:f.frame};
  assert.equal((await f.handlers.open(event,'youtube')).ok,true);assert.equal((await f.handlers.open(event,'spotify')).ok,true);
  assert.deepEqual(f.calls.music,['https://music.youtube.com/','https://open.spotify.com/']);
  for(const service of ['file:///private','https://evil.example/','__proto__',{}])assert.equal((await f.handlers.open(event,service)).ok,false);
  assert.equal((await f.handlers.open({sender:{},senderFrame:f.frame},'youtube')).ok,false);
  for(const overrides of [{userGesture:false},{audioRequested:false},{frame:{url:f.frame.url}}, {frame:null}])assert.equal(await f.acquire(overrides),null);
  assert.equal(f.calls.consent,1,'unauthorized request prompted');
  f=await fixture({response:0});assert.equal(await f.acquire(),null);assert.equal(f.calls.sources,0,'cancelled request enumerated screens');
  f=await fixture({navigate:true});assert.equal(await f.acquire(),null);assert.equal(f.calls.sources,0);
  f=await fixture({noSources:true});assert.equal(await f.acquire(),null);
  f=await fixture({platform:'linux'});assert.equal(await f.acquire(),null);assert.equal(f.calls.consent,0);
  f=await fixture();f.frame.url='dsv1://project/index.html';assert.equal((await f.acquire()).audio,'loopback');
  f.frame.url='dsv1://project/index.html?combatLab=1';assert.equal(await f.acquire(),null);
  let release;
  f=await fixture({blockDialog:new Promise(resolve=>release=resolve)});
  const first=f.acquire();assert.equal(await f.acquire(),null,'parallel request opened a second dialog');
  release();assert.equal((await first).audio,'loopback');assert.equal(f.calls.consent,1);
  // Renderer retains live audio only and never connects the analysed stream to output.
  const audio={kind:'audio',stopped:false,stop(){this.stopped=true;},addEventListener(){}},video={kind:'video',stopped:false,stop(){this.stopped=true;},addEventListener(){}};
  let tracks=[audio,video],constraints;
  const stream={getTracks:()=>tracks,getAudioTracks:()=>[audio],getVideoTracks:()=>tracks.filter(t=>t.kind==='video'),removeTrack(t){tracks=tracks.filter(x=>x!==t);},addEventListener(){}};
  function AC(){this.createMediaStreamSource=()=>({connect(){},disconnect(){}});this.createAnalyser=()=>({frequencyBinCount:256});this.close=()=>{};}
  const box={window:{NV:{},deadSingularityDesktopAudio:{systemAudio:true},AudioContext:AC},navigator:{mediaDevices:{getDisplayMedia(c){constraints=c;return Promise.resolve(stream);}}},console,localStorage:{getItem(){return null;},setItem(){}},Uint8Array,Promise};
  vm.runInNewContext(fs.readFileSync('js/engine/rhythm.js','utf8'),box);
  const NV=box.window.NV;NV.rhythmToggleEnabled(true);await NV.externalAudio.startDisplayCapture();
  assert.equal(NV.rhythm.state,'listening');assert(video.stopped&&!audio.stopped);assert.equal(tracks.length,1);assert.equal(constraints.audio.restrictOwnAudio,true);
  NV.externalAudio.stop();assert(audio.stopped);
  let grant;
  box.navigator.mediaDevices.getDisplayMedia=()=>new Promise(resolve=>grant=resolve);
  const late=NV.externalAudio.startDisplayCapture();NV.externalAudio.stop();grant(stream);await late;
  assert.equal(NV.rhythm.active,false,'late grant restarted a stopped capture');
  assert.equal(NV.rhythm.stream,null);
  console.log('PASS native system audio: consent, gesture, origin/frame restrictions, cancelled/unsupported flows, only-audio retention and stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
