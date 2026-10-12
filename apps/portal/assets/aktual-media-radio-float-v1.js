(() => {
  'use strict';
  if (window.__AKTUAL_MEDIA_RADIO_FLOAT__) return;
  window.__AKTUAL_MEDIA_RADIO_FLOAT__=true;
  // The persistent player window is the radio itself — it never shows a second, floating controller.
  if (/^\/radio\/player(?:\/|$)/.test(location.pathname)) return;

  const en=(document.documentElement.lang||'').toLowerCase().startsWith('en')||location.pathname.startsWith('/en/');
  // Mirrors the station order of the player engine (first = the station that opens).
  const STATIONS=[
    {id:'synthwave-energy',label:'Synthwave'},
    {id:'usa-rock',label:'USA Rock'},
    {id:'usa-hits',label:'USA Hits'},
    {id:'lofi-lounge',label:'Lo-Fi'},
    {id:'usa-country-roots',label:'Country'},
    {id:'usa-jazz-soul',label:'Jazz & Soul'}
  ];
  const text={
    title:'AKTUAL MEDIA RADIO',
    standby:en?'Player ready':'Player spreman',
    disconnected:en?'Radio player is not open':'Radio player nije otvoren',
    opening:en?'Opening persistent player…':'Otvaram stalni player…',
    play:en?'▶ PLAY':'▶ PLAY',
    pause:en?'❚❚ PAUSE':'❚❚ PAUZA',
    detach:en?'Open persistent player':'Otvori stalni player',
    app:en?'Install / desktop app':'Instaliraj / desktop aplikacija',
    hide:en?'Hide':'Sakrij',
    volDown:en?'Volume down':'Tiše',
    volUp:en?'Volume up':'Glasnije',
    volume:en?'Volume':'Glasnoća',
    stations:en?'Stations':'Stanice',
    drag:en?'Drag to move the radio (double-click resets)':'Povucite za pomicanje radija (dvoklik vraća na mjesto)',
    defaultStation:'AKTUAL MEDIA RADIO'
  };

  let channel=null;
  let state={playing:false,stationName:text.defaultStation,stationTag:text.standby,connected:false,stationId:STATIONS[0].id,volume:0.8};
  let playerWindow=null;
  let pendingAutoPlay=false;
  let pendingStation=null;
  let pendingVolume=null;
  let movedByUser=false;
  let posApplied=false;

  try{channel=new BroadcastChannel('aktual-media-radio-v1')}catch(_){}

  function post(type,payload){try{channel?.postMessage({type,payload,source:'portal-controller'})}catch(_){}}
  const clampVol=v=>Math.round(Math.max(0,Math.min(1,v))*100)/100;

  function openPlayer(autoPlay=false,stationId=null){
    pendingAutoPlay=!!autoPlay;
    pendingStation=stationId||null;
    const params=new URLSearchParams();
    if(en)params.set('lang','en');
    if(stationId)params.set('station',stationId);
    const qs=params.toString();
    const url='/radio/player/'+(qs?'?'+qs:'');
    try{
      playerWindow=window.open(url,'aktual-media-radio-player','popup=yes,width=420,height=640,resizable=yes,scrollbars=yes');
      if(playerWindow){
        state.stationTag=text.opening;render();
        setTimeout(()=>post('COMMAND',{action:autoPlay?'PLAY':'SYNC'}),650);
        return true;
      }
    }catch(_){}
    location.href=url;
    return false;
  }

  function render(){
    const root=document.getElementById('aktualMediaRadioFloat'); if(!root)return;
    root.querySelector('.amr-dot')?.classList.toggle('live',!!state.playing);
    const stateEl=root.querySelector('[data-amr-state]');if(stateEl)stateEl.textContent=state.connected?(state.playing?(en?'LIVE · persistent player':'UŽIVO · stalni player'):(en?'Connected · paused':'Povezano · pauzirano')):text.disconnected;
    const station=root.querySelector('[data-amr-station]');if(station)station.textContent=state.stationName||text.defaultStation;
    const tag=root.querySelector('[data-amr-tag]');if(tag)tag.textContent=state.stationTag||text.standby;
    const play=root.querySelector('[data-amr-play]');if(play)play.textContent=state.playing?text.pause:text.play;
    root.querySelectorAll('[data-amr-chip]').forEach(b=>{const on=b.dataset.amrChip===state.stationId;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')});
    const vol=pendingVolume!=null&&!state.connected?pendingVolume:state.volume;
    const level=root.querySelector('[data-amr-level]');if(level)level.textContent=Math.round((vol??0.8)*100)+'%';
    const bar=root.querySelector('[data-amr-bar]');if(bar)bar.style.width=Math.round((vol??0.8)*100)+'%';
  }

  // ---------- drag to move (memory only; shared with the open player window) ----------
  function placeAt(root,x,y){
    const r=root.getBoundingClientRect(),m=6;
    const maxX=Math.max(m,window.innerWidth-r.width-m),maxY=Math.max(m,window.innerHeight-r.height-m);
    root.style.left=Math.round(Math.min(Math.max(m,x),maxX))+'px';
    root.style.top=Math.round(Math.min(Math.max(m,y),maxY))+'px';
    root.style.right='auto';root.style.bottom='auto';
    root.classList.add('amr-moved');
  }
  function reclamp(root){if(root.classList.contains('amr-moved')){const r=root.getBoundingClientRect();placeAt(root,r.left,r.top)}}
  function resetPos(root){root.style.left=root.style.top=root.style.right=root.style.bottom='';root.classList.remove('amr-moved')}
  function sharePos(root){
    if(!root.classList.contains('amr-moved')){post('FLOAT_POS',null);return}
    const r=root.getBoundingClientRect();
    post('FLOAT_POS',{fx:+(r.left/Math.max(1,window.innerWidth-r.width)).toFixed(4),fy:+(r.top/Math.max(1,window.innerHeight-r.height)).toFixed(4)});
  }
  function applyPos(pos){
    if(posApplied||movedByUser)return;
    posApplied=true;
    const root=document.getElementById('aktualMediaRadioFloat');
    if(!root||!pos||!Number.isFinite(pos.fx)||!Number.isFinite(pos.fy))return;
    const r=root.getBoundingClientRect();
    placeAt(root,pos.fx*(window.innerWidth-r.width),pos.fy*(window.innerHeight-r.height));
  }
  function enableDrag(root){
    const handle=root.querySelector('[data-amr-drag]'); if(!handle)return;
    let drag=null;
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,a'))return;
      const r=root.getBoundingClientRect();
      drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,x0:e.clientX,y0:e.clientY,moved:false};
      try{handle.setPointerCapture(e.pointerId)}catch(_){}
      e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<4)return;
      if(!drag.moved){drag.moved=true;root.classList.add('amr-dragging')}
      placeAt(root,e.clientX-drag.dx,e.clientY-drag.dy);
    });
    const end=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const moved=drag.moved;drag=null;root.classList.remove('amr-dragging');
      try{handle.releasePointerCapture(e.pointerId)}catch(_){}
      if(moved){movedByUser=true;sharePos(root)}
    };
    handle.addEventListener('pointerup',end);
    handle.addEventListener('pointercancel',end);
    handle.addEventListener('dblclick',e=>{if(e.target.closest('button,a'))return;resetPos(root);movedByUser=true;sharePos(root)});
    handle.addEventListener('keydown',e=>{
      const s=e.shiftKey?64:16,d={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,-s],ArrowDown:[0,s]}[e.key];
      if(!d||e.target!==handle)return;
      e.preventDefault();const r=root.getBoundingClientRect();placeAt(root,r.left+d[0],r.top+d[1]);movedByUser=true;sharePos(root);
    });
    window.addEventListener('resize',()=>reclamp(root),{passive:true});
  }

  function build(){
    if(document.getElementById('aktualMediaRadioFloat'))return;
    const root=document.createElement('aside');
    root.id='aktualMediaRadioFloat';
    root.setAttribute('aria-label',text.title);
    const chips=STATIONS.map(s=>'<button type="button" class="amr-chip" data-amr-chip="'+s.id+'" aria-pressed="false">'+s.label.replace('&','&amp;')+'</button>').join('');
    root.innerHTML='<div class="amr-float"><div class="amr-head" data-amr-drag tabindex="0" title="'+text.drag+'" aria-label="'+text.drag+'"><div class="amr-brand"><span class="amr-dot"></span><div><div class="amr-title">AKTUAL MEDIA RADIO</div><div class="amr-state" data-amr-state></div></div></div><span class="amr-grip" aria-hidden="true">⠿</span><button class="amr-close" type="button" data-amr-collapse aria-label="'+(en?'Collapse radio':'Sažmi radio')+'">−</button></div><div class="amr-body"><div class="amr-station"><strong data-amr-station>AKTUAL MEDIA RADIO</strong><span data-amr-tag>'+text.standby+'</span></div><div class="amr-chips" role="group" aria-label="'+text.stations+'">'+chips+'</div><div class="amr-actions"><button class="amr-btn amr-vol" type="button" data-amr-voldown aria-label="'+text.volDown+'" title="'+text.volDown+'">−</button><button class="amr-btn primary" type="button" data-amr-play>'+text.play+'</button><button class="amr-btn amr-vol" type="button" data-amr-volup aria-label="'+text.volUp+'" title="'+text.volUp+'">+</button><span class="amr-level" aria-label="'+text.volume+'"><span class="amr-level-track"><span class="amr-level-bar" data-amr-bar></span></span><span data-amr-level>80%</span></span><button class="amr-btn" type="button" data-amr-open>↗ PLAYER</button></div></div><div class="amr-foot"><button type="button" data-amr-install>'+text.app+'</button><a href="'+(en?'/en/radio/':'/radio/')+'">'+(en?'Radio page':'Radio stranica')+'</a></div></div>';
    document.body.appendChild(root);
    root.querySelector('[data-amr-play]')?.addEventListener('click',()=>{
      if(!state.connected){openPlayer(true,state.stationId!==STATIONS[0].id?state.stationId:null);return}
      post('COMMAND',{action:state.playing?'PAUSE':'PLAY'});
    });
    root.querySelector('.amr-chips')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-amr-chip]');if(!b)return;
      const id=b.dataset.amrChip;
      state.stationId=id;render();
      if(!state.connected){openPlayer(true,id);return}
      post('COMMAND',{action:'STATION',id,play:true});
    });
    const stepVolume=d=>{
      if(state.connected){state.volume=clampVol((state.volume??0.8)+d);render();post('COMMAND',{action:d>0?'VOLUME_UP':'VOLUME_DOWN'});return}
      pendingVolume=clampVol((pendingVolume??state.volume??0.8)+d);render();
    };
    root.querySelector('[data-amr-voldown]')?.addEventListener('click',()=>stepVolume(-0.1));
    root.querySelector('[data-amr-volup]')?.addEventListener('click',()=>stepVolume(0.1));
    root.querySelector('[data-amr-open]')?.addEventListener('click',()=>openPlayer(false));
    root.querySelector('[data-amr-install]')?.addEventListener('click',()=>openPlayer(false));
    root.querySelector('[data-amr-collapse]')?.addEventListener('click',e=>{
      root.classList.toggle('amr-collapsed');
      e.currentTarget.textContent=root.classList.contains('amr-collapsed')?'+':'−';
      reclamp(root);
    });
    enableDrag(root);
    render();
    post('PING',{});
  }

  if(channel){
    channel.addEventListener('message',event=>{
      const msg=event.data||{};
      if(msg.type==='STATE'&&msg.payload){
        const p=msg.payload;
        state={...state,...p,connected:true};
        if(typeof p.volume==='number')state.volume=p.volume;
        render();
        if(p.floatPos!==undefined)applyPos(p.floatPos);
      }
      if(msg.type==='PLAYER_READY'){
        state.connected=true;render();
        if(pendingVolume!=null){post('COMMAND',{action:'VOLUME',value:pendingVolume});pendingVolume=null}
        if(pendingStation){post('COMMAND',{action:'STATION',id:pendingStation,play:pendingAutoPlay});pendingStation=null;pendingAutoPlay=false}
        else if(pendingAutoPlay){post('COMMAND',{action:'PLAY'});pendingAutoPlay=false}
        else post('COMMAND',{action:'SYNC'});
      }
      if(msg.type==='PLAYER_CLOSED'){
        state.connected=false;state.playing=false;render();
      }
    });
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',build,{once:true}):build();
})();
