(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else (root.NV=root.NV||{}).AudioPerimeterMotion=factory();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const TAU=Math.PI*2;
  const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v,0)));
  const unit=(v)=>clamp(v,0,1);
  const follow=(v,target,dt,rise,fall)=>v+(target-v)*(1-Math.exp(-dt/(target>v?rise:fall)));
  const responseFields=['kickPulse','snarePulse','hatPulse','attackPulse','rush','musicLevel','subBass','body','presence','air',
    'toneLow','toneBody','tonePresence','toneAir','intensity','aggression','sustain','brightness','tension','drop','release','dynamics','crest',
    'percussion','visualIntensity'];

  // One reusable envelope per perimeter, not per speaker. The FFT remains owned
  // by rhythm.js. Native preview may read that SAME analyser's waveform once per
  // published revision for RMS/crest, but creates no source, analyser, FFT or loop.
  // All spectrum, waveform and running feature buffers are allocated once.
  function create(){
    return {connected:false,mode:'silence',drive:0,strike:0,pulse:0,stroke:0,sway:0,
      energy:0,bass:0,mids:0,highs:0,phase:0,tempoBpm:120,strikes:0,
      microPulse:0,microHits:0,rotation:0,scan:0,visualActivity:0,spectrum:new Float32Array(24),peaks:new Float32Array(24),
      _spectrumTarget:new Float32Array(24),_revision:-1,_eventSerial:0,_microAge:9,_microStrength:0,
      intensity:0,aggression:0,sustain:0,brightness:0,tension:0,drop:0,release:0,
      kickPulse:0,snarePulse:0,hatPulse:0,attackPulse:0,rush:0,dynamics:0,crest:0,musicLevel:0,
      subBass:0,body:0,presence:0,air:0,toneLow:0,toneBody:0,tonePresence:0,toneAir:0,
      percussion:0,percussionStroke:0,percussionId:0,visualIntensity:0,
      _percussionAge:9,_percussionStrength:0,_lowFluxNoise:0,_midFluxNoise:0,
      bandFlux:new Float32Array(24),toneFlux:new Float32Array(4),
      _spectrumPrefix:new Float32Array(1025),_waveform:new Float32Array(512),
      _previousSpectrum:new Float32Array(24),_toneTarget:new Float32Array(4),_previousTone:new Float32Array(4),
      _waveformSource:null,_waveformFailed:false,_hasWaveform:false,_rms:0,_rmsPeak:0,_waveformReads:0,
      _featureTime:0,_featureLevel:0,_previousLevel:0,_levelFloor:0,_levelCeiling:0,_levelMean:0,
      _fluxBass:0,_fluxBody:0,_fluxPresence:0,_fluxAir:0,_previousFluxBass:0,_previousFluxPresence:0,_previousFluxAir:0,
      _auxKickAge:9,_auxSnareAge:9,_auxHatAge:9,_auxAttackAge:9,
      _auxKickStrength:0,_auxSnareStrength:0,_auxHatStrength:0,_auxAttackStrength:0,
      _auxKickId:0,_auxSnareId:0,_auxHatId:0,_auxOnsetId:0,_rushRate:0,_dropEnergy:0,
      _time:0,_lastOnset:0,_lastPerc:0,_density:0,_hitAge:9,_hitStrength:0,
      _hitReturn:.21,_breadth:.34,
      _sinceHit:9,_sinceMusic:9,_kickMemory:0,_candidate:'silence',_candidateAge:0};
  }

  // Physical-frequency regions are texture descriptors, NOT instrument stems.
  // FFT512 only resolves ~94Hz at 48kHz: low bass is intentionally coarse. A
  // shared prefix buffer permits real-Hz bands plus the original 24-bin display
  // using one bounded read of the existing FFT, rather than a second analysis.
  function sampleFeatures(s,r,len,revision){
    const fresh=len?revision!==s._revision:false;
    if(!fresh)return false;
    s._revision=revision;
    const data=r.data,prefix=s._spectrumPrefix;prefix[0]=0;
    for(let k=0;k<len;k++)prefix[k+1]=prefix[k]+clamp(data[k],0,255);
    for(let i=0;i<24;i++){
      const lo=Math.floor((i/24)**2*len),hi=Math.min(len,Math.max(lo+1,Math.floor(((i+1)/24)**2*len)));
      const value=unit((prefix[hi]-prefix[lo])/((hi-lo)*255)*(1.15+i*.04));
      s.bandFlux[i]=Math.max(0,value-s._previousSpectrum[i]);
      s._previousSpectrum[i]=value;s._spectrumTarget[i]=value;
    }
    const sampleRate=clamp(finite(r.audioCtx?.sampleRate,48000),8000,192000);
    const fftSize=clamp(finite(r.analyser?.fftSize,(r.data?.length||len)*2),32,32768);
    const hz=sampleRate/fftSize;
    for(let i=0;i<4;i++){
      const low=i===0?35:i===1?180:i===2?900:5000;
      const high=i===0?180:i===1?900:i===2?5000:12000;
      // Include bin 0's sub-bass leakage, but use actual frequencies elsewhere.
      const lo=i===0?0:Math.min(len-1,Math.floor(low/hz));
      const hi=Math.min(len,Math.max(lo+1,Math.ceil(high/hz)));
      const value=unit((prefix[hi]-prefix[lo])/((hi-lo)*255));
      s.toneFlux[i]=Math.max(0,value-s._previousTone[i]);
      s._previousTone[i]=value;s._toneTarget[i]=value;
    }
    const analyser=r.analyser;
    if(analyser!==s._waveformSource){s._waveformSource=analyser;s._waveformFailed=false;}
    s._hasWaveform=false;
    if(analyser&&typeof analyser.getFloatTimeDomainData==='function'&&!s._waveformFailed){
      try{
        analyser.getFloatTimeDomainData(s._waveform);s._waveformReads++;
        const n=Math.min(512,Math.max(1,Math.floor(finite(analyser.fftSize,512))));
        let sum=0,peak=0;
        for(let i=0;i<n;i++){const v=clamp(s._waveform[i],-1,1);sum+=v*v;peak=Math.max(peak,Math.abs(v));}
        s._rms=Math.sqrt(sum/n);s._rmsPeak=peak;s._hasWaveform=true;
      }catch(_){s._waveformFailed=true;}
    }
    return true;
  }

  // This secondary motion layer keeps real transients independent: a kick does
  // not swallow a simultaneous snare/hat, and saturation does not slow blast
  // beats down to the old heavy-stroke cooldown. Travel remains absolutely bound.
  function updateMusicResponse(s,r,dt,connected,audible,sampled,len,raw){
    s._auxKickAge+=dt;s._auxSnareAge+=dt;s._auxHatAge+=dt;s._auxAttackAge+=dt;
    const kickId=finite(r.kickId,0),snareId=finite(r.snareId,0),hatId=finite(r.hatId,0),onsetId=finite(r.onsetId,0);
    const kickSerial=kickId>s._auxKickId,snareSerial=snareId>s._auxSnareId;
    const hatSerial=hatId>s._auxHatId,onsetSerial=onsetId>s._auxOnsetId;
    s._auxKickId=kickId;s._auxSnareId=snareId;s._auxHatId=hatId;s._auxOnsetId=onsetId;
    const featureDt=sampled?clamp(s._time-s._featureTime,.001,.1):dt;
    if(sampled)s._featureTime=s._time;
    const low=audible?(len?s._toneTarget[0]:unit(r.bass)):0;
    const body=audible?(len?s._toneTarget[1]:unit(r.mids)):0;
    const presence=audible?(len?s._toneTarget[2]:unit(r.mids)):0;
    const air=audible?(len?s._toneTarget[3]:unit(r.highs)):0;
    if(sampled||!len){
      const previousLow=s._fluxBass,previousPresence=s._fluxPresence,previousAir=s._fluxAir;
      s._fluxBass=len?s.toneFlux[0]:Math.max(0,low-s._previousTone[0]);
      s._fluxBody=len?s.toneFlux[1]:Math.max(0,body-s._previousTone[1]);
      s._fluxPresence=len?s.toneFlux[2]:Math.max(0,presence-s._previousTone[2]);
      s._fluxAir=len?s.toneFlux[3]:Math.max(0,air-s._previousTone[3]);
      s._previousFluxBass=previousLow;s._previousFluxPresence=previousPresence;s._previousFluxAir=previousAir;
      if(!len){s._previousTone[0]=low;s._previousTone[1]=body;s._previousTone[2]=presence;s._previousTone[3]=air;}
    }
    // Unlike AGC energy, this retains honest loud/quiet differences. The RMS
    // branch is native only; deterministic fixtures use published raw energy.
    // A square-root gain previously pushed ordinary mastered music into the
    // highest state. Linear RMS preserves headroom; volume is NOT the size drive.
    const level=audible?unit(s._hasWaveform?s._rms*2.1:raw*1.15):0;
    const crest=s._hasWaveform&&s._rms>.0002?unit((s._rmsPeak/s._rms-1)/3):0;
    const newFeature=sampled||!len;
    const bassFlux=newFeature&&s._fluxBass>Math.max(.006,s._lowFluxNoise*1.65)&&s._fluxBass>s._previousFluxBass*1.08;
    const snareFlux=newFeature&&s._fluxPresence>Math.max(.008,s._midFluxNoise*1.65)&&s._fluxPresence>s._previousFluxPresence*1.08;
    const hatFlux=newFeature&&s._fluxAir>.028&&s._fluxAir>s._previousFluxAir*1.12;
    // True-Hz positive flux validates old broad-band serials where available;
    // fallback synthetic callers can still supply exact independent serials.
    const kickHit=audible&&s._auxKickAge>=.033&&(bassFlux||(kickSerial&&(!len||s._fluxBass>.012)));
    const snareBody=!len||s._fluxBody>.004||s._fluxBass>.003;
    const snareHit=audible&&snareBody&&s._auxSnareAge>=.033&&(snareFlux||(snareSerial&&(!len||s._fluxPresence>.014)));
    const hatHit=audible&&s._auxHatAge>=.025&&(hatFlux||(hatSerial&&(!len||s._fluxAir>.008)));
    const kickStrength=unit(Math.max(s._fluxBass/(.018+low*.11),kickSerial?unit(r.kickEvt||r.kick)*.65:0)*(.25+level*.75));
    const snareStrength=unit(Math.max(s._fluxPresence/(.025+presence*.065),snareSerial?unit(r.snareEvt||r.snare)*.65:0)*(.25+level*.75));
    const hatStrength=unit(Math.max(s._fluxAir*3,hatSerial?unit(r.hats)*.8:0)*(.15+level*.85));
    if(kickHit){s._auxKickAge=0;s._auxKickStrength=kickStrength;}
    if(snareHit){s._auxSnareAge=0;s._auxSnareStrength=snareStrength;}
    if(hatHit){s._auxHatAge=0;s._auxHatStrength=hatStrength;}
    // One main size impulse per confirmed low/mid transient. Hats and steady
    // instruments retain their own detail channels, never inflate the whole area.
    s._percussionAge+=dt;
    if(kickHit||snareHit){
      s._percussionAge=0;s._percussionStrength=Math.max(kickHit?kickStrength:0,snareHit?snareStrength*.92:0);
      s.percussionId++;
    }
    if(newFeature){
      s._lowFluxNoise=follow(s._lowFluxNoise,audible?s._fluxBass:0,featureDt,.3,.7);
      s._midFluxNoise=follow(s._midFluxNoise,audible?s._fluxPresence:0,featureDt,.3,.7);
    }
    const age=s._percussionAge;
    s.percussion=s._percussionStrength*Math.exp(-age/.095);
    // Brief inward compression -> outward attack -> actual release. No free
    // running vibration/metronome, and no stack that pins rapid music at maximum.
    s.percussionStroke=age<.014?-s._percussionStrength*.18*Math.sin(age/.014*Math.PI):
      s._percussionStrength*Math.min(1,(age-.014)/.02)*Math.exp(-Math.max(0,age-.034)/.085);
    if(Math.abs(s.percussionStroke)<.0005)s.percussionStroke=0;
    const realAttack=kickHit||snareHit||hatHit||(audible&&onsetSerial&&(!len||Math.max(s._fluxBass,s._fluxPresence,s._fluxAir)>.022));
    if(realAttack){
      s._auxAttackAge=0;s._auxAttackStrength=unit(Math.max(kickStrength,snareStrength,hatStrength*.7,unit(r.onsetEvt)*level*.5));
      s._rushRate=Math.min(16,s._rushRate+1/.45);
    }
    s._rushRate*=Math.exp(-dt/.45);
    s.kickPulse=s._auxKickStrength*Math.exp(-s._auxKickAge/.12);
    s.snarePulse=s._auxSnareStrength*Math.exp(-s._auxSnareAge/.085);
    s.hatPulse=s._auxHatStrength*Math.exp(-s._auxHatAge/.045);
    s.attackPulse=s._auxAttackStrength*Math.exp(-s._auxAttackAge/.09);
    const rushTarget=audible?unit(s._rushRate/12):0;
    s.rush=follow(s.rush,rushTarget,dt,.045,.28);
    if(newFeature){
      s._levelMean=follow(s._levelMean,level,featureDt,.7,1.8);
      s._levelFloor=level<s._levelFloor?level:follow(s._levelFloor,level,featureDt,4,4);
      s._levelCeiling=level>s._levelCeiling?level:follow(s._levelCeiling,level,featureDt,4,4);
      const fall=Math.max(0,s._previousLevel-level);
      if(fall>.018)s._dropEnergy=Math.max(s._dropEnergy,unit(fall*3));
      s._previousLevel=level;s._featureLevel=level;
    }
    s._dropEnergy*=Math.exp(-dt/.45);
    s.musicLevel=follow(s.musicLevel,level,dt,.022,.13);
    s.subBass=follow(s.subBass,low*level,dt,.022,.18);
    s.body=follow(s.body,body*level,dt,.04,.22);
    s.presence=follow(s.presence,presence*level,dt,.025,.18);
    s.air=follow(s.air,air*level,dt,.018,.12);
    s.toneLow=s.subBass;s.toneBody=s.body;s.tonePresence=s.presence;s.toneAir=s.air;
    s.sustain=follow(s.sustain,audible?unit(level*(.45+body*.25+presence*.3)):0,dt,.14,.30);
    s.brightness=follow(s.brightness,audible?unit((air*.65+presence*.35)*level):0,dt,.022,.18);
    s.crest=follow(s.crest,crest,dt,.04,.20);
    s.dynamics=follow(s.dynamics,unit(s._levelCeiling-s._levelFloor),dt,.12,.60);
    const impact=Math.max(s.kickPulse,s.snarePulse,s.hatPulse*.65);
    s.intensity=follow(s.intensity,audible?unit(level*.62+s.sustain*.20+s.rush*level*.15+impact*.22):0,dt,.035,.20);
    s.aggression=follow(s.aggression,audible?unit(level*(.18+presence*.45+air*.15)+s.rush*level*.27+impact*.22):0,dt,.045,.25);
    const growth=Math.max(0,level-s._levelMean);
    s.tension=follow(s.tension,audible?unit(s.sustain*(.30+presence*.45)*(1-impact*.65)+growth*.7):0,dt,.45,.45);
    s.drop=follow(s.drop,s._dropEnergy,dt,.016,.30);
    // Release is a finite afterglow of actual intensity falls, never a free beat.
    s.release=follow(s.release,unit(s.drop*(.35+s.dynamics*.65)),dt,.045,.50);
    s.visualIntensity=unit(s.percussion*.80+s.sustain*.10+s.brightness*.05+s.rush*s.percussion*.15);
    for(const key of responseFields)
      if(s[key]<.0005)s[key]=0;
    return Math.max(s.intensity,s.attackPulse,s.hatPulse,s.release,s.tension,s.percussion,Math.abs(s.percussionStroke));
  }

  function update(s,rhythm,dtSec){
    const r=rhythm||{},dt=clamp(dtSec,0,.1);
    const connected=!!(r.enabled&&r.active&&r.state==='listening');
    const wasConnected=s.connected;
    s.connected=connected;
    if(!dt)return s;
    s._time+=dt;s._sinceHit+=dt;s._hitAge+=dt;

    const energy=connected?unit(r.energy):0;
    const bass=connected?unit(r.bass):0;
    const mids=connected?unit(r.mids):0;
    const highs=connected?unit(r.highs):0;
    // AGC can retain nonzero relative energy in silence; real band/raw amplitude
    // gates activity independently. Synthetic clients without raw data use bands.
    const raw=Number.isFinite(r.energyRaw)?unit(r.energyRaw):Math.max(energy,bass,mids,highs);
    const data=r.data,len=Math.min(1024,data?.length||0),revision=finite(r.analysisRevision,-1);
    const sampled=connected&&sampleFeatures(s,r,len,revision);
    const audible=connected&&(s._hasWaveform?s._rms>.0002:Math.max(raw,bass,mids,highs)>.018);
    s._sinceMusic=audible?0:s._sinceMusic+dt;
    s.energy=follow(s.energy,audible?energy:0,dt,.16,.30);
    s.bass=follow(s.bass,audible?bass:0,dt,.12,.30);
    s.mids=follow(s.mids,audible?mids:0,dt,.18,.35);
    s.highs=follow(s.highs,audible?highs:0,dt,.15,.25);
    s._density=follow(s._density,audible?clamp(r.density,0,30):0,dt,.45,.80);
    s.tempoBpm=follow(s.tempoBpm,clamp(finite(r.tempoBpm,120)||120,70,180),dt,.7,.7);
    if(s.energy<.0005)s.energy=0;
    if(s.bass<.0005)s.bass=0;
    if(s.mids<.0005)s.mids=0;
    if(s.highs<.0005)s.highs=0;

    const kick=audible?unit(r.kick):0;
    const snare=audible?unit(r.snare):0;
    const onset=audible?unit(r.onset):0;
    const perc=Math.max(kick,snare*.95,onset*.90,audible?unit(r.beat)*.75:0);
    const onsetAt=finite(r.lastOnsetAt,0);
    if(!wasConnected||!connected)s._lastOnset=onsetAt;
    const timestampHit=audible&&onsetAt>0&&onsetAt>s._lastOnset;
    const edgeHit=audible&&perc>.35&&s._lastPerc<=.35;
    const serial=finite(r.kickId,0)+finite(r.snareId,0)+finite(r.onsetId,0)+finite(r.hatId,0);
    const fastEvent=wasConnected&&serial>s._eventSerial;
    s._eventSerial=serial;s._microAge+=dt;
    if(audible&&(fastEvent||timestampHit||edgeHit)&&s._microAge>=.045){
      s._microAge=0;s._microStrength=unit(.35+Math.max(perc,unit(r.hats),unit(r.spectralFlux))*.65);s.microHits++;
    }
    s.microPulse=s._microStrength*Math.exp(-s._microAge/.075);
    if(s.microPulse<.0005)s.microPulse=0;
    // Remember even rejected hits, so a persisted analyser score cannot be replayed.
    if(onsetAt>s._lastOnset)s._lastOnset=onsetAt;
    s._lastPerc=perc;
    s._kickMemory=Math.max(s._kickMemory*Math.exp(-dt/.55),kick);

    let wanted;
    if(!connected||s._sinceMusic>.20)wanted='silence';
    else if(s._density>7.5||s.energy>.88||
      (s.mode==='saturation'&&(s._density>5.5||s.energy>.72)))wanted='saturation';
    else if(s.energy>.32&&s._density<2.3&&s._kickMemory>.48)wanted='breakdown';
    else if(s._density>1.1||s._sinceHit<1.25||perc>.25)wanted='rhythm';
    else wanted='soft';
    if(wanted!==s._candidate){s._candidate=wanted;s._candidateAge=0;}
    else s._candidateAge+=dt;
    if(wanted==='silence'||s._candidateAge>=(wanted==='saturation'?.35:.25))s.mode=wanted;

    const dense=s.mode==='saturation'||s._density>6;
    const heavy=s.mode==='breakdown';
    const cooldown=dense?Math.max(.32,60/s.tempoBpm*.70):heavy?.32:.18;
    const hitScore=timestampHit?Math.max(perc,unit(r.kickEvt),unit(r.snareEvt)*.9,unit(r.onsetEvt)*.9):perc;
    const accent=unit(r.accent);
    // Dense passages choose strong accents at a bounded rate; they never queue
    // hits to dump after the music stops, nor stack displacement beyond full stroke.
    if(audible&&(timestampHit||edgeHit)&&s._sinceHit>=cooldown&&
      (!dense||accent>.62||hitScore>.84)){
      s._hitAge=0;
      s._hitStrength=unit((heavy?.60:.45)+hitScore*(heavy?.50:.55));
      s._hitReturn=heavy?.28:.21;
      s._sinceHit=0;s.strikes++;
      // Partially lock the visual swing to confirmed percussion, without snapping.
      const error=s.phase>Math.PI?TAU-s.phase:-s.phase;
      s.phase=(s.phase+error*.18+TAU)%TAU;
    }

    if(audible)s.phase=(s.phase+dt*s.tempoBpm/60*TAU)%TAU;
    // Fast compression, a finite expansion and a damped elastic return. The pulse
    // is generated by accepted events; estimated tempo only provides soft sway.
    const age=s._hitAge,attack=.045;
    const envelope=age<attack?Math.pow(age/attack,.65):
      Math.exp(-(age-attack)/s._hitReturn)*(1+.07*Math.sin((age-attack)*31));
    s.strike=unit(s._hitStrength*envelope);
    if(s.strike<.0005)s.strike=0;
    s.pulse=s.strike;
    // Brief physical compression before the elastic excursion; continuous join,
    // no frame-dependent random jitter and no stacked displacements.
    const rise=clamp((age-.032)/.04,0,1);
    s.stroke=age<.032?-Math.sin(age/.032*Math.PI)*.24:s.strike*rise*rise*(3-2*rise);
    if(Math.abs(s.stroke)<.0005)s.stroke=0;
    const breadth=s.mode==='soft'?.34:heavy?.22:.16;
    s._breadth=follow(s._breadth,breadth,dt,.25,.25);
    s.sway=clamp(Math.sin(s.phase)*s.energy*s._breadth,-1,1);
    // Strong visible mechanical travel, but one absolute maximum for loud music.
    s.drive=unit(s.energy*.14+s.strike*.85+Math.max(0,s.sway)*.14);
    // Both slow elastic strokes and new independent fast physical features use
    // the same published buffers. No catch-up beat or genre classifier is added.
    const responseActivity=updateMusicResponse(s,r,dt,connected,audible,sampled,len,raw);
    let visualActivity=Math.max(s.energy,s.strike,s.microPulse,responseActivity);
    for(let i=0;i<24;i++){
      const w=i/23;
      const target=!audible?0:len?s._spectrumTarget[i]:unit(
        s.bass*(1-w)**2*1.5+s.mids*Math.sin(w*Math.PI)*.9+s.highs*w+s.microPulse*(.35+w*.3));
      s.spectrum[i]=follow(s.spectrum[i],target,dt,.022,.15);
      if(s.spectrum[i]<.0005)s.spectrum[i]=0;
      s.peaks[i]=Math.max(s.spectrum[i],s.peaks[i]-dt*.7);
      visualActivity=Math.max(visualActivity,s.spectrum[i],s.peaks[i]);
    }
    s.visualActivity=visualActivity;
    if(audible){
      s.rotation=(s.rotation+dt*(.08+s.musicLevel*.38+s.sustain*.8+s.aggression*3+s.hatPulse*6+s.attackPulse*2))%TAU;
      s.scan=(s.scan+dt*(.035+s.intensity*.22+s.attackPulse*.35))%1;
    }
    if(s.drive<.0005)s.drive=0;
    if(Math.abs(s.sway)<.0005)s.sway=0;
    return s;
  }
  return {create,update};
});
