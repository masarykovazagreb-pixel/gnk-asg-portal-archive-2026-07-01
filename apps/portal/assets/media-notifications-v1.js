(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_NOTIFICATIONS_V1__) return;
  window.__GNK_ASG_MEDIA_NOTIFICATIONS_V1__ = true;
  const API='/api/media-command-center/notifications';
  const INTERVAL=30*60*1000;
  const state={items:[],eventCount:0,loading:false,next:Date.now()+INTERVAL};
  const byId=id=>document.getElementById(id);
  const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!=null)element.textContent=text;return element;};

  function createUi(){
    const tabs=document.querySelector('.mcc-tabs');
    if(!tabs||byId('notifications'))return false;
    const tab=node('button','mcc-notification-tab');
    tab.type='button';tab.dataset.tab='notifications';tab.append('Obavijesti ');
    const badge=node('span','mcc-notification-count','10');badge.id='notificationCount';tab.appendChild(badge);tabs.appendChild(tab);
    const panel=node('section','mcc-panel mcc-notification-panel');panel.id='notifications';
    const toolbar=node('div','mcc-notification-toolbar');
    const heading=node('div');heading.append(node('h2','', 'Operativne obavijesti'),node('p','', 'Najmanje 10 aktivnih obavijesti; automatsko osvježavanje svakih 30 minuta.'));
    const actions=node('div','mcc-notification-actions');const countdown=node('span','mcc-notification-refresh','Sljedeća provjera za 30:00');countdown.id='notificationRefreshIn';
    const refresh=node('button','', 'Osvježi sada');refresh.id='refreshNotifications';refresh.type='button';actions.append(countdown,refresh);toolbar.append(heading,actions);
    const summary=node('div','mcc-notification-summary');summary.id='notificationSummary';
    const list=node('div','mcc-notification-list');list.id='notificationList';list.setAttribute('aria-live','polite');panel.append(toolbar,summary,list);
    document.querySelector('.mcc-shell')?.appendChild(panel);
    tab.addEventListener('click',()=>{document.querySelectorAll('.mcc-tabs button').forEach(item=>item.classList.remove('active'));document.querySelectorAll('.mcc-panel').forEach(item=>item.classList.remove('active'));tab.classList.add('active');panel.classList.add('active');load(false);});
    refresh.addEventListener('click',()=>load(true));
    return true;
  }

  function formatTime(value){if(!value)return'Aktivno';try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return String(value);}}
  function summaryCard(label,value){const card=node('article');card.append(node('small','',label),node('strong','',String(value)));return card;}
  function render(){
    const list=byId('notificationList'),summary=byId('notificationSummary'),badge=byId('notificationCount');if(!list||!summary)return;
    const levels=state.items.reduce((out,item)=>{out[item.level]=(out[item.level]||0)+1;return out;},{});
    summary.replaceChildren(summaryCard('Ukupno',state.items.length),summaryCard('Novi događaji',state.eventCount),summaryCard('Upozorenja',(levels.warn||0)+(levels.bad||0)),summaryCard('Osvježavanje','30 min'));
    if(badge)badge.textContent=String(Math.max(10,state.items.length));
    const cards=state.items.map(item=>{const card=node('article',`mcc-notification-item ${item.level||'info'}`);const dot=node('span','mcc-notification-dot');dot.setAttribute('aria-hidden','true');const copy=node('div','mcc-notification-copy');copy.append(node('strong','',item.title||'Obavijest'),node('p','',item.message||''));const meta=node('div','mcc-notification-meta');meta.append(document.createTextNode(item.source||'SYSTEM'),document.createElement('br'),document.createTextNode(formatTime(item.createdAt)));card.append(dot,copy,meta);return card;});
    list.replaceChildren(...(cards.length?cards:[node('div','mcc-notification-empty','Nema obavijesti.')]));
  }

  async function load(){
    if(state.loading)return;state.loading=true;const button=byId('refreshNotifications');if(button){button.disabled=true;button.textContent='Provjera…';}
    try{const response=await fetch(`${API}?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||`HTTP ${response.status}`);state.items=Array.isArray(data.items)?data.items:[];state.eventCount=Number(data.eventCount||0);state.next=Date.parse(data.nextRefreshAt)||Date.now()+INTERVAL;render();}
    catch(error){const list=byId('notificationList');if(list)list.replaceChildren(node('div','mcc-notification-error',`Obavijesti se trenutačno ne mogu učitati: ${error.message}`));state.next=Date.now()+INTERVAL;}
    finally{state.loading=false;if(button){button.disabled=false;button.textContent='Osvježi sada';}}
  }

  function tick(){const target=byId('notificationRefreshIn');if(!target)return;const seconds=Math.max(0,Math.floor((state.next-Date.now())/1000));target.textContent=`Sljedeća provjera za ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  function boot(){if(!createUi())return;load();tick();setInterval(load,INTERVAL);setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()>=state.next)load();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
