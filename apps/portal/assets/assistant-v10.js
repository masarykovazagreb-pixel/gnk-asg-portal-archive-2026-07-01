(()=>{
  'use strict';
  const en=document.documentElement.lang==='en';
  const t=(hr,enText)=>en?enText:hr;
  const q=document.getElementById('aiQuestion');
  const send=document.getElementById('aiSend');
  const messages=document.getElementById('aiMessages');
  const count=document.getElementById('aiCount');
  const clear=document.getElementById('aiClear');
  const copy=document.getElementById('aiCopy');
  if(!q||!send||!messages||!count||!clear||!copy)return;
  const history=[];
  let lastAnswer='';

  const topics=en?[
    ['THE CODE','Explain THE CODE and its activation date'],
    ['Company profile','Explain the profile of GNK ASG and GNK DINAMO Ltd. Group'],
    ['Financials','Explain the financial indicators shown on the portal'],
    ['Markets and network','Which markets and global locations are presented on the portal?'],
    ['News and publications','Where can I find the latest news and verified publications?'],
    ['Gallery and contact','Where can I find the gallery and official contact page?']
  ]:[
    ['THE CODE','Objasni što je THE CODE i kada se aktivira'],
    ['Profil kompanija','Objasni profil GNK ASG i GNK DINAMO Ltd. Group'],
    ['Financije','Objasni financijske pokazatelje prikazane na portalu'],
    ['Tržišta i mreža','Koja tržišta i globalne lokacije prikazuje portal?'],
    ['Vijesti i objave','Gdje su najnovije vijesti i provjerene objave?'],
    ['Galerija i kontakt','Gdje su galerija i službeni kontakt?']
  ];
  document.querySelectorAll('.ai-v10__topic').forEach((button,index)=>{
    const item=topics[index];
    if(!item)return;
    button.textContent=item[0];
    button.dataset.aiPrompt=item[1];
  });

  const sources=document.querySelector('.ai-v10__source-list');
  if(sources){
    const list=en?[
      ['THE CODE','/en/#the-code'],['Financials','/en/#financials'],['Markets','/markets/'],['News','/news/'],['Publications','/publications/'],['Gallery','/visual-index/?lang=en'],['Contact','/contact/']
    ]:[
      ['THE CODE','/#the-code'],['Financije','/#financije'],['Tržišta','/trzista/'],['Vijesti','/vijesti/'],['Objave','/objave/'],['Galerija','/visual-index/'],['Kontakt','/contact/']
    ];
    sources.innerHTML=list.map(([label,url])=>`<a href="${url}">${label}</a>`).join('');
  }

  function addMessage(role,text,links=[]){
    const row=document.createElement('div');row.className=`ai-v10__message ai-v10__message--${role}`;
    const avatar=document.createElement('div');avatar.className='ai-v10__avatar';avatar.textContent=role==='user'?(en?'YOU':'VI'):'AI';
    const bubble=document.createElement('div');bubble.className='ai-v10__bubble';bubble.textContent=text;
    if(links.length){const list=document.createElement('div');list.className='ai-v10__links';links.forEach(item=>{const a=document.createElement('a');a.href=item.url;a.textContent=item.label;a.target=item.external?'_blank':'_self';if(item.external)a.rel='noopener';list.appendChild(a)});bubble.appendChild(list)}
    row.append(avatar,bubble);messages.appendChild(row);messages.scrollTop=messages.scrollHeight;return row;
  }
  function loading(){const row=addMessage('assistant','');row.querySelector('.ai-v10__bubble').innerHTML='<span class="ai-v10__loading"><i></i><i></i><i></i></span>';return row}
  async function ask(text){
    text=String(text||'').trim();if(!text||send.disabled)return;
    addMessage('user',text);history.push({role:'user',content:text});q.value='';count.textContent='0 / 2000';send.disabled=true;
    const wait=loading();
    try{
      const response=await fetch('/api/public-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,language:en?'en':'hr',history:history.slice(-6),page:location.pathname})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'AI_REQUEST_FAILED');
      wait.remove();lastAnswer=data.answer||t('Odgovor nije dostupan.','Answer unavailable.');addMessage('assistant',lastAnswer,Array.isArray(data.links)?data.links:[]);history.push({role:'assistant',content:lastAnswer});
    }catch(error){wait.remove();lastAnswer=t('AI usluga trenutačno nije dostupna. Koristite javne poveznice ili kontaktnu formu.','The AI service is temporarily unavailable. Use the public links or contact form.');addMessage('assistant',lastAnswer,[{label:t('Kontakt','Contact'),url:'/contact/'}]);}
    finally{send.disabled=false;q.focus()}
  }
  document.querySelectorAll('[data-ai-prompt]').forEach(button=>button.addEventListener('click',()=>{q.value=button.dataset.aiPrompt;count.textContent=`${q.value.length} / 2000`;ask(q.value)}));
  send.addEventListener('click',()=>ask(q.value));
  q.addEventListener('input',()=>{if(q.value.length>2000)q.value=q.value.slice(0,2000);count.textContent=`${q.value.length} / 2000`});
  q.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();ask(q.value)}});
  const ready=t('Spreman sam. Pitajte o THE CODE-u, profilu, financijama, tržištima, mreži, vijestima, objavama, galeriji ili kontaktu.','Ready. Ask about THE CODE, company profile, financials, markets, network, news, publications, gallery or contact.');
  clear.addEventListener('click',()=>{history.length=0;messages.innerHTML='';lastAnswer='';addMessage('assistant',ready)});
  copy.addEventListener('click',async()=>{if(!lastAnswer)return;try{await navigator.clipboard.writeText(lastAnswer);copy.textContent='✓';setTimeout(()=>copy.textContent='⧉',1000)}catch{}});
  addMessage('assistant',ready);
})();
