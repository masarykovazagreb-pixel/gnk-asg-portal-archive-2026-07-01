(()=>{
  'use strict';
  if(window.__GNK_ASG_MOBILE_APP_V2__)return;
  window.__GNK_ASG_MOBILE_APP_V2__=true;

  const $=id=>document.getElementById(id);
  const MODE_KEY='gnk-asg-mobile-mode-v2';
  const STANDARD=[
    {icon:'⌂',title:'Početna',detail:'Korporativni pregled i ključni pokazatelji.',url:'/'},
    {icon:'◆',title:'THE CODE',detail:'Prezentacija, film i aktivacijsko odbrojavanje.',url:'/the-code/'},
    {icon:'◫',title:'Vijesti',detail:'Provjerene poslovne vijesti i izvorne poveznice.',url:'/vijesti/'},
    {icon:'✦',title:'Objave',detail:'GNK ASG Insights, analize i autorski sadržaj.',url:'/objave/'},
    {icon:'↗',title:'Tržišta',detail:'Globalni tržišni pokazatelji i javni podatci.',url:'/trzista/'},
    {icon:'▧',title:'Media Kit',detail:'Korporativni materijali i službeni dokumenti.',url:'/media-kit/'},
    {icon:'✉',title:'Kontakt',detail:'Sigurna komunikacija i usmjeravanje upita.',url:'/contact/'},
    {icon:'●',title:'AI pomoć',detail:'Javni inteligentni asistent GNK ASG.',url:'/assistant/'}
  ];
  const ADMIN=[
    {icon:'▣',title:'Admin Center',detail:'Jedinstvena sigurna kontrolna ploča.',url:'/admin-center/?mobile=1'},
    {icon:'✉',title:'Mail Studio',detail:'Pošta, potpisi, PDF privici i evidencija.',url:'/admin-center/?module=mail&mobile=1'},
    {icon:'▧',title:'Memorandum',detail:'Luksuzni memorandum, PDF pregled i slanje.',url:'/admin-center/?module=memorandum&mobile=1'},
    {icon:'◎',title:'Operator',detail:'Operativni status i upravljanje sustavom.',url:'/admin-center/?module=operator&mobile=1'},
    {icon:'◉',title:'Medijski centar',detail:'Kampanje, prijave i medijski kanali.',url:'/admin-center/?module=media&mobile=1'},
    {icon:'◫',title:'News Admin',detail:'Izvori, raspored i kontrola vijesti.',url:'/admin-center/?module=news&mobile=1'},
    {icon:'✎',title:'Auto Editor',detail:'Objave i urednički radni proces.',url:'/admin-center/?module=editor&mobile=1'},
    {icon:'▤',title:'PDF Publisher',detail:'Službeni dokumenti i PDF objava.',url:'/admin-center/?module=pdf&mobile=1'}
  ];
  const state={mode:'standard',authenticated:false,authChecked:false,installPrompt:null,toastTimer:null};

  function showToast(message){
    const toast=$('toast');
    toast.textContent=message;toast.hidden=false;
    clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>{toast.hidden=true},3200);
  }

  function card(item,{admin=false,locked=false}={}){
    const node=document.createElement(locked?'div':'a');
    node.className=`module-card ${admin?'admin':'standard'}${locked?' locked':''}`;
    if(!locked){node.href=item.url;node.setAttribute('aria-label',`${item.title}: ${item.detail}`)}
    const icon=document.createElement('span');icon.className='module-icon';icon.textContent=item.icon;
    const title=document.createElement('strong');title.textContent=item.title;
    const detail=document.createElement('small');detail.textContent=locked?`${item.detail} Prijava je potrebna.`:item.detail;
    const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent=locked?'Zaključano':'Otvori ›';
    node.append(icon,title,detail,arrow);
    return node;
  }

  function updateModeButtons(){
    document.querySelectorAll('[data-mode]').forEach(button=>{
      const active=button.dataset.mode===state.mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
    });
  }

  function render(){
    const admin=state.mode==='admin';
    $('modeTitle').textContent=admin?'Admin':'Standard';
    $('heroDescription').textContent=admin
      ?'Admin način otvara zaštićene operativne module tek nakon provjere sigurne administratorske sesije.'
      :'Standard način pruža brz pristup javnom portalu, vijestima, tržištima, dokumentima i AI pomoći.';
    $('authChip').hidden=!admin;
    const items=admin?ADMIN:STANDARD;
    $('moduleGrid').replaceChildren(...items.map((item,index)=>card(item,{admin,locked:admin&&state.authChecked&&!state.authenticated&&index>0})));
    if(admin&&state.authChecked&&!state.authenticated){
      const first=$('moduleGrid').firstElementChild;
      first.querySelector('small').textContent='Otvorite sigurnu prijavu i zatim se vratite u aplikaciju.';
      first.querySelector('.arrow').textContent='Prijava ›';
    }
  }

  async function checkAdminSession(){
    const chip=$('authChip');
    state.authChecked=false;state.authenticated=false;
    chip.className='auth-chip';chip.textContent='Provjera administratorske sesije…';
    render();
    try{
      const response=await fetch(`/api/operator-auth-check?cb=${Date.now()}`,{
        credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','cache-control':'no-cache'}
      });
      let payload={};try{payload=await response.json()}catch(_){ }
      state.authenticated=response.ok&&payload.authenticated!==false&&payload.ok!==false;
    }catch(_){state.authenticated=false}
    state.authChecked=true;
    chip.className=`auth-chip ${state.authenticated?'ok':'bad'}`;
    chip.textContent=state.authenticated?'Sigurna administratorska sesija aktivna':'Administratorska prijava je potrebna';
    render();
  }

  function setMode(mode,{updateUrl=true}={}){
    state.mode=mode==='admin'?'admin':'standard';
    localStorage.setItem(MODE_KEY,state.mode);
    updateModeButtons();render();
    if(updateUrl){
      const url=new URL(location.href);
      url.searchParams.set('mode',state.mode);
      history.replaceState({mode:state.mode},'',url);
    }
    if(state.mode==='admin')checkAdminSession();
  }

  function updateNetwork(){
    const online=navigator.onLine;
    const chip=$('networkChip');
    chip.className=`status-chip ${online?'online':'offline'}`;
    chip.textContent=online?'Mreža dostupna':'Izvan mreže';
    $('offlineBanner').hidden=online;
  }

  async function installApp(){
    if(state.installPrompt){
      state.installPrompt.prompt();
      const choice=await state.installPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
      if(choice.outcome==='accepted')showToast('Instalacija GNK ASG aplikacije je pokrenuta.');
      state.installPrompt=null;
      $('installButton').hidden=true;
      return;
    }
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(ios?'Na iPhoneu: Dijeli → Dodaj na početni zaslon.':'U izborniku preglednika odaberite Instaliraj aplikaciju ili Dodaj na početni zaslon.');
  }

  function registerWorker(){
    if(!('serviceWorker' in navigator))return;
    addEventListener('load',()=>navigator.serviceWorker.register('/app-sw.js',{scope:'/'}).catch(()=>null),{once:true});
  }

  function bind(){
    $('standardMode').addEventListener('click',()=>setMode('standard'));
    $('adminMode').addEventListener('click',()=>setMode('admin'));
    $('installButton').addEventListener('click',installApp);
    $('installButtonLarge').addEventListener('click',installApp);
    addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();state.installPrompt=event;$('installButton').hidden=false;
      $('installHint').textContent='Aplikacija je spremna za instalaciju. Pritisnite „Instaliraj aplikaciju“.';
    });
    addEventListener('appinstalled',()=>{
      state.installPrompt=null;$('installButton').hidden=true;
      $('installHint').textContent='GNK ASG aplikacija je instalirana na ovom uređaju.';
      showToast('GNK ASG aplikacija je uspješno instalirana.');
    });
    addEventListener('online',()=>{updateNetwork();showToast('Mrežna veza je ponovno dostupna.');if(state.mode==='admin')checkAdminSession()});
    addEventListener('offline',updateNetwork);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'&&state.mode==='admin')checkAdminSession();
    });
  }

  function boot(){
    bind();updateNetwork();registerWorker();
    const requested=new URL(location.href).searchParams.get('mode');
    const remembered=localStorage.getItem(MODE_KEY);
    setMode(requested||remembered||'standard',{updateUrl:Boolean(requested)});
  }

  boot();
})();
