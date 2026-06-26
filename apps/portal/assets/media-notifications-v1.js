(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_NOTIFICATIONS_V1__) return;
  window.__GNK_ASG_MEDIA_NOTIFICATIONS_V1__ = true;
  const STATUS='/api/media-command-center/status';
  const APPLICATIONS='/api/media-command-center/applications?limit=20';
  const INTERVAL=30*60*1000;
  const state={items:[],eventCount:0,loading:false,next:Date.now()+INTERVAL};
  const byId=id=>document.getElementById(id);
  const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!=null)element.textContent=text;return element;};

  function createUi(){
    const tabs=document.querySelector('.mcc-tabs');
    if(!tabs||byId('notifications'))return false;
    const tab=node('button','mcc-notification-tab');tab.type='button';tab.dataset.tab='notifications';tab.append('Obavijesti ');
    const badge=node('span','mcc-notification-count','10');badge.id='notificationCount';tab.appendChild(badge);tabs.appendChild(tab);
    const panel=node('section','mcc-panel mcc-notification-panel');panel.id='notifications';
    const toolbar=node('div','mcc-notification-toolbar');const heading=node('div');heading.append(node('h2','', 'Operativne obavijesti'),node('p','', 'Najmanje 10 aktivnih obavijesti; automatsko osvježavanje svakih 30 minuta.'));
    const actions=node('div','mcc-notification-actions');const countdown=node('span','mcc-notification-refresh','Sljedeća provjera za 30:00');countdown.id='notificationRefreshIn';const refresh=node('button','', 'Osvježi sada');refresh.id='refreshNotifications';refresh.type='button';actions.append(countdown,refresh);toolbar.append(heading,actions);
    const summary=node('div','mcc-notification-summary');summary.id='notificationSummary';const list=node('div','mcc-notification-list');list.id='notificationList';list.setAttribute('aria-live','polite');panel.append(toolbar,summary,list);document.querySelector('.mcc-shell')?.appendChild(panel);
    tab.addEventListener('click',()=>{document.querySelectorAll('.mcc-tabs button').forEach(item=>item.classList.remove('active'));document.querySelectorAll('.mcc-panel').forEach(item=>item.classList.remove('active'));tab.classList.add('active');panel.classList.add('active');load();});
    refresh.addEventListener('click',load);return true;
  }

  function formatTime(value){if(!value)return'Aktivno';try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return String(value);}}
  function summaryCard(label,value){const card=node('article');card.append(node('small','',label),node('strong','',String(value)));return card;}
  function policyItems(status){
    const applications=status.applications||{},readiness=status.readiness||{},contacts=status.contacts||{};
    return[
      {level:'ok',title:'Prijavno sučelje je aktivno',message:'Pozvane redakcije prijavljuju predstavnika na /media-application/.',source:'PORTAL'},
      {level:'ok',title:'Službeni media mailbox',message:`Odgovori i dopune zaprimaju se na ${status.applicationMailbox||'media@gnk-asg.hr'}.`,source:'MAIL'},
      {level:status.autoAcknowledgement?'ok':'warn',title:'Automatska potvrda zaprimanja',message:status.autoAcknowledgement?'Potvrda se šalje nakon uspješnog zaprimanja prijave.':'Automatska potvrda trenutačno je isključena.',source:'MAIL'},
      {level:'info',title:'Karta se ne kupuje unaprijed',message:'Redakcija predlaže let; GNK ASG ili ovlaštena agencija odobrava, organizira i plaća kartu.',source:'TRAVEL'},
      {level:'ok',title:'Smještaj je osiguran',message:'Smještaj u New Yorku rezerviran je i plaćen za odobrene predstavnike.',source:'TRAVEL'},
      {level:Number(applications.total||0)>0?'ok':'info',title:'Zaprimljene prijave',message:`Ukupno prijava: ${applications.total||0}; za ljudsku provjeru: ${applications.ready||0}.`,source:'APPLICATIONS'},
      {level:Number(applications.incomplete||0)>0?'warn':'ok',title:'Potrebne dopune',message:`Nepotpunih prijava: ${applications.incomplete||0}.`,source:'APPLICATIONS'},
      {level:'info',title:'Ljudska odluka je obvezna',message:`Odobrene prijave: ${applications.approved||0}. Automatizacija ne donosi konačnu odluku.`,source:'GOVERNANCE'},
      {level:Number(readiness.ready||0)>0?'ok':'warn',title:'Spremnost medijskih kontakata',message:`Operativno spremni kontakti: ${readiness.ready||0}; ukupno kontakata: ${contacts.total||0}.`,source:'CONTACTS'},
      {level:'warn',title:'Rok prijave',message:`Rok: ${formatTime(status.deadline||'2026-07-20T21:59:59.000Z')}.`,source:'DEADLINE'}
    ];
  }
  function applicationItems(applications){return applications.slice(0,5).map(app=>({level:app.status==='INCOMPLETE'?'warn':app.status==='LATE'?'bad':'ok',title:`Prijava ${app.applicationId||''}`,message:[app.outletName,app.applicantName,app.status].filter(Boolean).join(' · '),source:'NEW',createdAt:app.receivedAt}));}
  function render(){
    const list=byId('notificationList'),summary=byId('notificationSummary'),badge=byId('notificationCount');if(!list||!summary)return;
    const levels=state.items.reduce((out,item)=>{out[item.level]=(out[item.level]||0)+1;return out;},{});
    summary.replaceChildren(summaryCard('Ukupno',state.items.length),summaryCard('Nove prijave',state.eventCount),summaryCard('Upozorenja',(levels.warn||0)+(levels.bad||0)),summaryCard('Osvježavanje','30 min'));
    if(badge)badge.textContent=String(Math.max(10,state.items.length));
    const cards=state.items.map(item=>{const card=node('article',`mcc-notification-item ${item.level||'info'}`);const dot=node('span','mcc-notification-dot');dot.setAttribute('aria-hidden','true');const copy=node('div','mcc-notification-copy');copy.append(node('strong','',item.title||'Obavijest'),node('p','',item.message||''));const meta=node('div','mcc-notification-meta');meta.append(document.createTextNode(item.source||'SYSTEM'),document.createElement('br'),document.createTextNode(formatTime(item.createdAt)));card.append(dot,copy,meta);return card;});
    list.replaceChildren(...(cards.length?cards:[node('div','mcc-notification-empty','Nema obavijesti.')]));
  }

  async function getJson(url){const response=await fetch(`${url}${url.includes('?')?'&':'?'}cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});const data=await response.json();if(!response.ok||data.ok===false)throw new Error(data.error||`HTTP ${response.status}`);return data;}
  async function load(){
    if(state.loading)return;state.loading=true;const button=byId('refreshNotifications');if(button){button.disabled=true;button.textContent='Provjera…';}
    try{const [status,applicationData]=await Promise.all([getJson(STATUS),getJson(APPLICATIONS)]);const applications=Array.isArray(applicationData.applications)?applicationData.applications:[];const events=applicationItems(applications);state.items=[...events,...policyItems(status)].slice(0,15);while(state.items.length<10)state.items.push({level:'info',title:'Operativna provjera',message:'Media Command Center je dostupan i čeka sljedeći događaj.',source:'SYSTEM'});state.eventCount=events.length;state.next=Date.now()+INTERVAL;render();}
    catch(error){const list=byId('notificationList');if(list)list.replaceChildren(node('div','mcc-notification-error',`Obavijesti se trenutačno ne mogu učitati: ${error.message}`));state.next=Date.now()+INTERVAL;}
    finally{state.loading=false;if(button){button.disabled=false;button.textContent='Osvježi sada';}}
  }
  function tick(){const target=byId('notificationRefreshIn');if(!target)return;const seconds=Math.max(0,Math.floor((state.next-Date.now())/1000));target.textContent=`Sljedeća provjera za ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  function boot(){if(!createUi())return;load();tick();setInterval(load,INTERVAL);setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()>=state.next)load();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
