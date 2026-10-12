(() => {
  'use strict';
  if (window.__AKTUAL_MEDIA_RADIO_FLOAT__) return;
  window.__AKTUAL_MEDIA_RADIO_FLOAT__=true;

  const en=(document.documentElement.lang||'').toLowerCase().startsWith('en')||location.pathname.startsWith('/en/');
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
    defaultStation:'AKTUAL MEDIA RADIO'
  };

  let channel=null;
  let state={playing:false,stationName:text.defaultStation,stationTag:text.standby,connected:false};
  let playerWindow=null;
  let pendingAutoPlay=false;

  try{channel=new BroadcastChannel('aktual-media-radio-v1')}catch(_){}

  function post(type,payload){try{channel?.postMessage({type,payload,source:'portal-controller'})}catch(_){}}

  function openPlayer(autoPlay=false){
    pendingAutoPlay=!!autoPlay;
    const url=(en?'/radio/player/?lang=en':'/radio/player/');
    try{
      playerWindow=window.open(url,'aktual-media-radio-player','popup=yes,width=430,height=690,resizable=yes,scrollbars=yes');
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
  }

  function build(){
    if(document.getElementById('aktualMediaRadioFloat'))return;
    const root=document.createElement('aside');
    root.id='aktualMediaRadioFloat';
    root.setAttribute('aria-label',text.title);
    root.innerHTML='<div class="amr-float"><div class="amr-head"><div class="amr-brand"><span class="amr-dot"></span><div><div class="amr-title">AKTUAL MEDIA RADIO</div><div class="amr-state" data-amr-state></div></div></div><button class="amr-close" type="button" data-amr-collapse aria-label="'+(en?'Collapse radio':'Sažmi radio')+'">−</button></div><div class="amr-body"><div class="amr-station"><strong data-amr-station>AKTUAL MEDIA RADIO</strong><span data-amr-tag>'+text.standby+'</span></div><div class="amr-actions"><button class="amr-btn primary" type="button" data-amr-play>'+text.play+'</button><button class="amr-btn" type="button" data-amr-open>↗ '+(en?'PLAYER':'PLAYER')+'</button></div></div><div class="amr-foot"><button type="button" data-amr-install>'+text.app+'</button><a href="'+(en?'/en/radio/':'/radio/')+'">'+(en?'Radio page':'Radio stranica')+'</a></div></div>';
    document.body.appendChild(root);
    root.querySelector('[data-amr-play]')?.addEventListener('click',()=>{
      if(!state.connected){openPlayer(true);return}
      post('COMMAND',{action:state.playing?'PAUSE':'PLAY'});
    });
    root.querySelector('[data-amr-open]')?.addEventListener('click',()=>openPlayer(false));
    root.querySelector('[data-amr-install]')?.addEventListener('click',()=>openPlayer(false));
    root.querySelector('[data-amr-collapse]')?.addEventListener('click',e=>{
      root.classList.toggle('amr-collapsed');
      e.currentTarget.textContent=root.classList.contains('amr-collapsed')?'+':'−';
    });
    render();
    post('PING',{});
  }

  if(channel){
    channel.addEventListener('message',event=>{
      const msg=event.data||{};
      if(msg.type==='STATE'&&msg.payload){
        state={...state,...msg.payload,connected:true};render();
      }
      if(msg.type==='PLAYER_READY'){
        state.connected=true;render();
        if(pendingAutoPlay){post('COMMAND',{action:'PLAY'});pendingAutoPlay=false}
        else post('COMMAND',{action:'SYNC'});
      }
      if(msg.type==='PLAYER_CLOSED'){
        state.connected=false;state.playing=false;render();
      }
    });
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',build,{once:true}):build();
})();