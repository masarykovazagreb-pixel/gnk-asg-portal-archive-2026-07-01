(()=>{
  'use strict';
  const RELEASE='GNK_ASG_THE_CODE_STABLE_V22_20260627';
  if(document.documentElement.dataset.gnkTheCodePlayer===RELEASE)return;
  document.documentElement.dataset.gnkTheCodePlayer=RELEASE;

  const stage=document.querySelector('.code-stage');
  if(!stage)return;
  const en=document.documentElement.lang==='en';
  const t=(hr,enText)=>en?enText:hr;

  const toolbar=stage.querySelector('.code-tools');
  if(toolbar){
    toolbar.innerHTML=`
      <button class="code-tool" id="codeFullscreen" type="button">${t('Cijeli zaslon','Full screen')}</button>
      <button class="code-tool" id="codeReload" type="button">${t('Ponovno učitaj','Reload')}</button>
      <a class="code-tool" href="/the-code/" target="_blank" rel="noopener">${t('Otvori zasebno','Open separately')}</a>
      <a class="code-tool" href="/the-code/index.html?v=22" download="THE_CODE_english_corrected_2026-10-07.html">${t('Preuzmi HTML','Download HTML')}</a>`;
  }

  stage.querySelectorAll('.code-launch-bar').forEach(node=>node.remove());
  const oldHost=stage.querySelector('.code-inline-host,#codeInlineHost,.code-frame');
  const frame=document.createElement('div');
  frame.className='code-frame code-frame--editorial code-frame--stable-v22';
  frame.id='codeFrame';
  frame.innerHTML=`
    <aside class="code-company code-company--asg" aria-label="GNK ASG d.o.o.">
      <div>
        <span class="code-company__eyebrow">01 · Zagreb · ${t('Hrvatska','Croatia')}</span>
        <h3>GNK ASG<br>d.o.o.</h3>
        <p class="code-company__intro">${t('Samostalni revidirani financijski pokazatelji za poslovnu 2025. godinu.','Standalone audited financial indicators for fiscal year 2025.')}</p>
        <div class="code-company__metrics">
          <div class="code-company__metric"><small>${t('Ukupni prihodi','Total revenue')}</small><strong>€504.00M</strong><span>FY 2025</span></div>
          <div class="code-company__metric"><small>${t('Ukupna aktiva','Total assets')}</small><strong>€46.40M</strong><span>${t('Revidirano','Audited')}</span></div>
          <div class="code-company__metric"><small>${t('Kapital i rezerve','Equity and reserves')}</small><strong>€46.21M</strong><span>${t('Samostalno','Standalone')}</span></div>
        </div>
      </div>
      <div class="code-company__footer">GNK ASG d.o.o. · Zagreb · FY 2025</div>
    </aside>
    <iframe id="codePreview" src="/the-code/?embed=1&amp;v=22" title="THE CODE" loading="eager" allow="autoplay; fullscreen" referrerpolicy="same-origin"></iframe>
    <aside class="code-company code-company--dinamo" aria-label="GNK DINAMO Ltd.">
      <div>
        <span class="code-company__eyebrow">02 · Boulder · Colorado</span>
        <h3>GNK DINAMO<br>Ltd. Group</h3>
        <p class="code-company__intro">${t('Konsolidirana snaga grupe, globalna mreža i aktivacija u New Yorku.','Consolidated group strength, global network and New York activation.')}</p>
        <div class="code-company__metrics">
          <div class="code-company__metric"><small>${t('Prihod grupe','Group revenue')}</small><strong>€4.7046B</strong><span>FY 2025</span></div>
          <div class="code-company__metric"><small>${t('Neto dobit','Net income')}</small><strong>€982.48M</strong><span>${t('Konsolidirano','Consolidated')}</span></div>
          <div class="code-company__metric"><small>${t('Udio kapitala','Equity ratio')}</small><strong>98.02%</strong><span>45 ${t('lokacija','locations')}</span></div>
        </div>
        <div class="code-company__event"><small>${t('Aktivacija koda','Code activation')}</small><strong>07 OCT 2026</strong><span>11:30 AM · New York ET</span></div>
      </div>
      <div class="code-company__footer">GNK DINAMO Ltd. · Entity ID 20238180649</div>
    </aside>`;

  if(oldHost)oldHost.replaceWith(frame);
  else stage.appendChild(frame);

  const launch=document.createElement('div');
  launch.className='code-launch-bar code-launch-bar--stable-v22';
  launch.innerHTML=`
    <div class="code-launch-copy">
      <small>THE CODE · 390 × 844 · ${t('šest scena','six scenes')}</small>
      <strong>${t('Pokreni prezentaciju od prve scene','Start the presentation from scene one')}</strong>
      <span>${t('LIVE odbrojavanje ostaje stalni početni i završni prikaz.','The live countdown remains the permanent default and final screen.')}</span>
    </div>
    <div class="code-launch-actions">
      <button class="code-launch-button" id="codePlayStable" type="button">▶ ${t('Pokreni prezentaciju','Start presentation')}</button>
      <button class="code-sound-button" id="codeSoundStable" type="button" aria-pressed="false">♫ ${t('Glazba: isključena','Music: off')}</button>
    </div>`;
  frame.before(launch);

  if(!document.querySelector('style[data-the-code-stable-v22]')){
    const style=document.createElement('style');
    style.dataset.theCodeStableV22='';
    style.textContent=`
      body.gnk-public-route-home .code-stage{position:relative!important;isolation:isolate!important}
      body.gnk-public-route-home .code-launch-bar--stable-v22{position:relative!important;z-index:8!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;margin:0 0 14px!important;padding:16px 18px!important;border:1px solid rgba(168,133,55,.22)!important;border-radius:18px!important;background:linear-gradient(135deg,#fffefb 0%,#fbf5e8 48%,#f1e2bd 100%)!important;box-shadow:0 14px 34px rgba(103,72,10,.10)!important}
      body.gnk-public-route-home .code-launch-actions{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:8px!important;min-width:min(100%,330px)!important}
      body.gnk-public-route-home .code-launch-button,body.gnk-public-route-home .code-sound-button{position:relative!important;z-index:9!important;min-height:42px!important;padding:10px 15px!important;border:1px solid rgba(127,88,16,.28)!important;border-radius:999px!important;cursor:pointer!important;font:700 10px/1.15 Arial,sans-serif!important;letter-spacing:.07em!important;text-transform:uppercase!important;touch-action:manipulation!important}
      body.gnk-public-route-home .code-launch-button{background:#17130c!important;color:#fff!important}
      body.gnk-public-route-home .code-sound-button{background:#fffaf0!important;color:#6c4a0b!important}
      body.gnk-public-route-home .code-launch-button:disabled{cursor:progress!important;opacity:.72!important}
      body.gnk-public-route-home .code-frame--stable-v22{position:relative!important;z-index:5!important;overflow:hidden!important;background:linear-gradient(90deg,#fffdf8 0%,#f7edda 31%,#ead6a6 50%,#f7edda 69%,#fffdf8 100%)!important;border:1px solid rgba(168,133,55,.24)!important;border-radius:22px!important;box-shadow:0 24px 60px rgba(92,62,10,.14),inset 0 0 80px rgba(255,255,255,.58)!important}
      body.gnk-public-route-home .code-frame--stable-v22 iframe{position:relative!important;z-index:4!important;display:block!important;pointer-events:auto!important;background:#000!important}
      body.gnk-public-route-home :is(#financije,#financials).panel{background:linear-gradient(145deg,#fffefb 0%,#faf3e5 58%,#f0dfba 100%)!important;border:1px solid rgba(168,133,55,.20)!important;box-shadow:0 22px 52px rgba(103,72,10,.09)!important}
      @media(max-width:760px){body.gnk-public-route-home .code-launch-bar--stable-v22{align-items:stretch!important;flex-direction:column!important;padding:13px!important}body.gnk-public-route-home .code-launch-actions{display:grid!important;grid-template-columns:1fr!important;min-width:0!important;width:100%!important}body.gnk-public-route-home .code-launch-button,body.gnk-public-route-home .code-sound-button{width:100%!important}body.gnk-public-route-home .code-frame--stable-v22{border-radius:15px!important}}
    `;
    document.head.appendChild(style);
  }

  const iframe=frame.querySelector('#codePreview');
  const play=launch.querySelector('#codePlayStable');
  const sound=launch.querySelector('#codeSoundStable');
  let ready=false;
  let pendingStart=false;
  let startGuard=0;

  const setPlay=(state)=>{
    if(state==='loading'){
      play.disabled=true;
      play.textContent=`… ${t('Učitavanje prezentacije','Loading presentation')}`;
    }else if(state==='playing'){
      play.disabled=true;
      play.textContent=`▶ ${t('Prezentacija traje','Presentation running')}`;
    }else if(state==='complete'){
      play.disabled=false;
      play.textContent=`↺ ${t('Ponovno pokreni','Replay presentation')}`;
    }else{
      play.disabled=false;
      play.textContent=`▶ ${t('Pokreni prezentaciju','Start presentation')}`;
    }
  };
  const send=(type)=>iframe.contentWindow?.postMessage({type},'*');
  const ping=()=>send('gnk-code-ping');
  const start=()=>{
    pendingStart=false;
    clearTimeout(startGuard);
    send('gnk-code-start');
    setPlay('playing');
    startGuard=window.setTimeout(()=>{
      if(play.disabled){
        ready=false;
        setPlay('idle');
      }
    },4500);
  };
  const requestStart=()=>{
    pendingStart=true;
    setPlay('loading');
    ping();
    send('gnk-code-start');
    if(ready)start();
    window.setTimeout(ping,180);
    window.setTimeout(()=>{if(pendingStart){ping();send('gnk-code-start');}},650);
  };

  play.addEventListener('click',requestStart);
  iframe.addEventListener('load',()=>{
    ready=false;
    [60,260,800].forEach(delay=>window.setTimeout(ping,delay));
  });
  window.addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow)return;
    if(event.data?.type==='gnk-code-ready'){
      ready=true;
      if(pendingStart)start();
    }
    if(event.data?.type==='gnk-code-playback'){
      clearTimeout(startGuard);
      if(event.data.state==='playing')setPlay('playing');
      else if(event.data.state==='complete')setPlay('complete');
      else setPlay('idle');
    }
  });
  [100,500,1200].forEach(delay=>window.setTimeout(ping,delay));

  document.getElementById('codeFullscreen')?.addEventListener('click',()=>frame.requestFullscreen?.());
  document.getElementById('codeReload')?.addEventListener('click',()=>{
    ready=false;
    pendingStart=false;
    setPlay('idle');
    const url=new URL('/the-code/',location.href);
    url.searchParams.set('embed','1');
    url.searchParams.set('v','22');
    url.searchParams.set('reload',Date.now().toString());
    iframe.src=url.href;
  });

  let audioContext=null;
  let master=null;
  let droneA=null;
  let droneB=null;
  let heartbeatTimer=null;
  let musicOn=false;
  const heartbeat=()=>{
    if(!musicOn||!audioContext||!master)return;
    const pulse=(offset,freq,volume,duration)=>{
      const now=audioContext.currentTime+offset;
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      osc.type='sine';
      osc.frequency.setValueAtTime(freq,now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.55),now+duration);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(volume,now+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now+duration+.03);
    };
    pulse(0,58,.20,.18);
    pulse(.17,44,.13,.22);
  };
  const startMusic=async()=>{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor){sound.disabled=true;return;}
    if(!audioContext){
      audioContext=new AudioCtor();
      master=audioContext.createGain();
      master.gain.value=.075;
      master.connect(audioContext.destination);
      droneA=audioContext.createOscillator();
      droneB=audioContext.createOscillator();
      const gainA=audioContext.createGain();
      const gainB=audioContext.createGain();
      droneA.type='sine';
      droneB.type='triangle';
      droneA.frequency.value=55;
      droneB.frequency.value=82.41;
      gainA.gain.value=.16;
      gainB.gain.value=.035;
      droneA.connect(gainA).connect(master);
      droneB.connect(gainB).connect(master);
      droneA.start();
      droneB.start();
    }
    await audioContext.resume();
    master.gain.cancelScheduledValues(audioContext.currentTime);
    master.gain.setTargetAtTime(.075,audioContext.currentTime,.08);
    musicOn=true;
    heartbeat();
    heartbeatTimer=window.setInterval(heartbeat,920);
    sound.setAttribute('aria-pressed','true');
    sound.textContent=`♫ ${t('Glazba: uključena','Music: on')}`;
  };
  const stopMusic=()=>{
    musicOn=false;
    clearInterval(heartbeatTimer);
    heartbeatTimer=null;
    if(audioContext&&master){
      master.gain.cancelScheduledValues(audioContext.currentTime);
      master.gain.setTargetAtTime(.0001,audioContext.currentTime,.08);
    }
    sound.setAttribute('aria-pressed','false');
    sound.textContent=`♫ ${t('Glazba: isključena','Music: off')}`;
  };
  sound.addEventListener('click',async()=>{
    if(musicOn)stopMusic();
    else await startMusic();
  });
})();
