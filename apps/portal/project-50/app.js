(()=>{
  'use strict';

  const state={lang:'hr',data:null,playerReady:false,pendingPlay:false,audio:null,musicOn:false};
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

  const dictionary={
    hr:{
      menu:'Izbornik',navProfile:'Profil',navCode:'THE CODE',navFinancials:'Financije',navTimeline:'Razvoj',navNetwork:'Mreža',navNews:'Vijesti',navPublications:'Objave',navContact:'Kontakt',
      heroEyebrow:'GNK ASG d.o.o. & GNK DINAMO Ltd. Group',heroTitle:'Jedna grupa.<br>Jedna jasna slika.',heroLead:'Globalna snaga, jasna strategija i održiva vrijednost — povezana kroz tehnologiju koja postaje dio svakodnevice.',factLocations:'lokacija i tržišta',factContinents:'kontinenata',
      codeEyebrow:'Središnji interaktivni modul',activationLabel:'Aktivacija',openAudit:'Otvori revizorsko izvješće',playCode:'▶ Pokreni',playRunning:'▶ Prezentacija traje',replayCode:'↺ Ponovno pokreni',soundOff:'♫ Zvuk: isključen',soundOn:'♫ Zvuk: uključen',fullscreen:'Cijeli zaslon',playerReady:'Prezentacija je spremna.',playerLoading:'Učitavanje prezentacije…',playerPlaying:'Prezentacija je pokrenuta.',playerComplete:'Prezentacija je završila. Možete je ponovno pokrenuti.',
      financialEyebrow:'Financijska transparentnost',financialTitle:'Dvije razine. Jedan pregled.',financialLead:'Samostalni pokazatelji GNK ASG d.o.o. i konsolidirani pokazatelji GNK DINAMO Ltd. Group prikazani su odvojeno i usporedivo.',standalone:'Samostalno · FY 2025',consolidated:'Konsolidirano · FY 2025',downloadReport:'Financijsko izvješće PDF',downloadCentre:'Download centar',
      timelineEyebrow:'Od ideje do aktivacije',timelineTitle:'Put koda.',timelineLead:'Ideja rođena 1990. godine dobiva tehnološke uvjete za globalnu aktivaciju 2026.',
      networkEyebrow:'Globalna prisutnost',networkTitle:'Mreža na pet kontinenata.',networkLead:'Postojeće i planirane lokacije prikazane su odvojeno. Karta je informativna i bez vanjskih skripti.',locationsLabel:'lokacija',existing:'Postojeće',planned:'Planirane',
      footerLine:'Poslovna grupa · tehnologija · globalna mreža',privacy:'Privatnost',terms:'Uvjeti'
    },
    en:{
      menu:'Menu',navProfile:'Profile',navCode:'THE CODE',navFinancials:'Financials',navTimeline:'Development',navNetwork:'Network',navNews:'News',navPublications:'Publications',navContact:'Contact',
      heroEyebrow:'GNK ASG d.o.o. & GNK DINAMO Ltd. Group',heroTitle:'One group.<br>One clear view.',heroLead:'Global strength, clear strategy and sustainable value — connected through technology that becomes part of everyday life.',factLocations:'locations and markets',factContinents:'continents',
      codeEyebrow:'Central interactive module',activationLabel:'Activation',openAudit:'Open the audit report',playCode:'▶ Start',playRunning:'▶ Presentation running',replayCode:'↺ Replay',soundOff:'♫ Sound: off',soundOn:'♫ Sound: on',fullscreen:'Full screen',playerReady:'The presentation is ready.',playerLoading:'Loading presentation…',playerPlaying:'Presentation started.',playerComplete:'The presentation has finished. You can replay it.',
      financialEyebrow:'Financial transparency',financialTitle:'Two levels. One overview.',financialLead:'Standalone GNK ASG d.o.o. indicators and consolidated GNK DINAMO Ltd. Group indicators are shown separately and comparably.',standalone:'Standalone · FY 2025',consolidated:'Consolidated · FY 2025',downloadReport:'Financial report PDF',downloadCentre:'Download centre',
      timelineEyebrow:'From idea to activation',timelineTitle:'The path of the code.',timelineLead:'An idea born in 1990 gains the technological conditions for global activation in 2026.',
      networkEyebrow:'Global presence',networkTitle:'A network across five continents.',networkLead:'Existing and planned locations are shown separately. The map is informational and uses no external scripts.',locationsLabel:'locations',existing:'Existing',planned:'Planned',
      footerLine:'Business group · technology · global network',privacy:'Privacy',terms:'Terms'
    }
  };

  const text=(obj,key)=>{
    if(!obj)return '';
    const suffix=state.lang==='en'?'En':'Hr';
    return obj[`${key}${suffix}`]??obj[key]??'';
  };

  function translateStatic(){
    const lang=dictionary[state.lang];
    document.documentElement.lang=state.lang;
    $$('[data-i18n]').forEach(el=>{
      const value=lang[el.dataset.i18n];
      if(value===undefined)return;
      if(value.includes('<br>'))el.innerHTML=value;
      else el.textContent=value;
    });
    $('#languageToggle').innerHTML=state.lang==='hr'?'HR <span>|</span> EN':'EN <span>|</span> HR';
  }

  function metricTemplate(metric,compact=false){
    const label=text(metric,'label');
    const note=text(metric,'note');
    if(compact){
      return `<div class="finance-stat"><small>${escapeHtml(label)}</small><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(note)}</span></div>`;
    }
    return `<div class="metric"><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(metric.value)}</strong></div><span>${escapeHtml(note)}</span></div>`;
  }

  function renderCompanies(){
    const {asg,dinamo}=state.data.companies;
    $('#asgLocation').textContent=text(asg,'location');
    $('#dinamoLocation').textContent=text(dinamo,'location');
    $('#asgDescription').textContent=text(asg,'description');
    $('#dinamoDescription').textContent=text(dinamo,'description');
    $('#asgEyebrow').textContent=asg.eyebrow;
    $('#dinamoEyebrow').textContent=dinamo.eyebrow;
    $('#dinamoEntity').textContent=dinamo.entityId;
    $('#asgMetrics').innerHTML=asg.metrics.map(item=>metricTemplate(item)).join('');
    $('#dinamoMetrics').innerHTML=dinamo.metrics.map(item=>metricTemplate(item)).join('');
    $('#asgFinanceBoard').innerHTML=asg.metrics.map(item=>metricTemplate(item,true)).join('');
    $('#dinamoFinanceBoard').innerHTML=dinamo.metrics.map(item=>metricTemplate(item,true)).join('');
    $('#asgReportLink').href=state.data.documents.asgReport;
  }

  function renderActivation(){
    const activation=state.data.activation;
    const date=state.lang==='en'?activation.dateEn:activation.dateHr;
    $('#activationLine').textContent=`${date} · ${activation.time} · ${activation.zone}`;
  }

  function renderTimeline(){
    $('#timelineGrid').innerHTML=state.data.timeline.map(item=>`
      <article class="timeline-card">
        <span class="timeline-card__year">${escapeHtml(item.year)}</span>
        <span class="timeline-card__place">${escapeHtml(item.place)}</span>
        <h3>${escapeHtml(text(item,'title'))}</h3>
        <p>${escapeHtml(text(item,'text'))}</p>
      </article>`).join('');
  }

  function renderLocations(){
    const existing=state.data.locations.existing.map(([city,country])=>({city,country,planned:false}));
    const planned=state.data.locations.planned.map(([city,country])=>({city,country,planned:true}));
    const all=[...existing,...planned];
    $('#networkCount').textContent=String(all.length);
    $('#locationGrid').innerHTML=all.map(item=>`
      <article class="location-card${item.planned?' location-card--planned':''}">
        <b>${escapeHtml(item.city)}</b>
        <small>${escapeHtml(item.country)}</small>
      </article>`).join('');
  }

  function render(){
    translateStatic();
    renderCompanies();
    renderActivation();
    renderTimeline();
    renderLocations();
    updatePlayerLabels();
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function setStatus(key){
    $('#codeStatus').textContent=dictionary[state.lang][key]||key;
  }

  function updatePlayerLabels(mode='ready'){
    const lang=dictionary[state.lang];
    const play=$('#playCode');
    if(mode==='playing')play.textContent=lang.playRunning;
    else if(mode==='complete')play.textContent=lang.replayCode;
    else play.textContent=lang.playCode;
    $('#soundCode').textContent=state.musicOn?lang.soundOn:lang.soundOff;
    $('#fullscreenCode').textContent=lang.fullscreen;
  }

  function sendPlayer(type){
    $('#codePlayer').contentWindow?.postMessage({type},'*');
  }

  function requestPlay(){
    state.pendingPlay=true;
    setStatus('playerLoading');
    sendPlayer('gnk-code-ping');
    sendPlayer('gnk-code-start');
    if(state.playerReady){
      state.pendingPlay=false;
      setStatus('playerPlaying');
      updatePlayerLabels('playing');
    }
    window.setTimeout(()=>sendPlayer('gnk-code-ping'),220);
    window.setTimeout(()=>{if(state.pendingPlay)sendPlayer('gnk-code-start');},650);
  }

  function setupPlayer(){
    const iframe=$('#codePlayer');
    iframe.addEventListener('load',()=>{
      state.playerReady=false;
      [80,300,900].forEach(delay=>window.setTimeout(()=>sendPlayer('gnk-code-ping'),delay));
    });

    window.addEventListener('message',event=>{
      if(event.source!==iframe.contentWindow)return;
      if(event.data?.type==='gnk-code-ready'){
        state.playerReady=true;
        if(state.pendingPlay){
          state.pendingPlay=false;
          sendPlayer('gnk-code-start');
          setStatus('playerPlaying');
          updatePlayerLabels('playing');
        }else{
          setStatus('playerReady');
          updatePlayerLabels('ready');
        }
      }
      if(event.data?.type==='gnk-code-playback'){
        if(event.data.state==='playing'){
          setStatus('playerPlaying');
          updatePlayerLabels('playing');
        }else if(event.data.state==='complete'){
          setStatus('playerComplete');
          updatePlayerLabels('complete');
        }else{
          setStatus('playerReady');
          updatePlayerLabels('ready');
        }
      }
    });

    $('#playCode').addEventListener('click',requestPlay);
    $('#fullscreenCode').addEventListener('click',()=>{
      const shell=$('#codePlayerShell');
      if(document.fullscreenElement)document.exitFullscreen?.();
      else shell.requestFullscreen?.();
    });
  }

  async function toggleMusic(){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor){
      $('#soundCode').disabled=true;
      return;
    }
    if(!state.audio){
      const ctx=new AudioCtor();
      const master=ctx.createGain();
      const oscA=ctx.createOscillator();
      const oscB=ctx.createOscillator();
      const gainA=ctx.createGain();
      const gainB=ctx.createGain();
      master.gain.value=.055;
      oscA.type='sine';
      oscB.type='triangle';
      oscA.frequency.value=55;
      oscB.frequency.value=82.41;
      gainA.gain.value=.18;
      gainB.gain.value=.07;
      oscA.connect(gainA).connect(master);
      oscB.connect(gainB).connect(master);
      master.connect(ctx.destination);
      oscA.start();
      oscB.start();
      state.audio={ctx,master};
    }
    if(state.audio.ctx.state==='suspended')await state.audio.ctx.resume();
    state.musicOn=!state.musicOn;
    state.audio.master.gain.setTargetAtTime(state.musicOn?.055:.0001,state.audio.ctx.currentTime,.08);
    $('#soundCode').setAttribute('aria-pressed',String(state.musicOn));
    updatePlayerLabels();
  }

  function setupInterface(){
    $('#languageToggle').addEventListener('click',()=>{
      state.lang=state.lang==='hr'?'en':'hr';
      render();
    });
    $('#soundCode').addEventListener('click',toggleMusic);
    const menu=$('#siteNav');
    const menuButton=$('#menuToggle');
    menuButton.addEventListener('click',()=>{
      const open=menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded',String(open));
    });
    $$('#siteNav a').forEach(link=>link.addEventListener('click',()=>{
      menu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded','false');
    }));
  }

  async function init(){
    try{
      const response=await fetch('./data.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      state.data=await response.json();
      render();
      setupInterface();
      setupPlayer();
    }catch(error){
      console.error('Project 50 data load failed',error);
      document.body.classList.add('data-error');
      $('#codeStatus').textContent='Podaci stranice nisu učitani / Page data failed to load.';
    }
  }

  init();
})();
