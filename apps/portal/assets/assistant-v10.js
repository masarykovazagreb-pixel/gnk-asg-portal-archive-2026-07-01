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
  const history=[];
  let lastAnswer='';
  function addMessage(role,text,links=[]){
    const row=document.createElement('div');row.className=`ai-v10__message ai-v10__message--${role}`;
    const avatar=document.createElement('div');avatar.className='ai-v10__avatar';avatar.textContent=role==='user'?'ME':'AI';
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
    }catch(error){wait.remove();lastAnswer=t('AI usluga trenutačno nije dostupna. Koristite ponuđene javne poveznice ili kontaktnu formu.','The AI service is temporarily unavailable. Use the public links or contact form.');addMessage('assistant',lastAnswer,[{label:t('Kontakt','Contact'),url:'/contact/'}]);}
    finally{send.disabled=false;q.focus()}
  }
  document.querySelectorAll('[data-ai-prompt]').forEach(button=>button.addEventListener('click',()=>{q.value=button.dataset.aiPrompt;count.textContent=`${q.value.length} / 2000`;ask(q.value)}));
  send.addEventListener('click',()=>ask(q.value));
  q.addEventListener('input',()=>{if(q.value.length>2000)q.value=q.value.slice(0,2000);count.textContent=`${q.value.length} / 2000`});
  q.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();ask(q.value)}});
  clear.addEventListener('click',()=>{history.length=0;messages.innerHTML='';lastAnswer='';addMessage('assistant',t('Spreman sam. Pitajte o profilu, financijama, tržištima, vijestima, objavama, Media Kitu ili kontaktu.','Ready. Ask about the profile, financials, markets, news, publications, Media Kit or contact.'))});
  copy.addEventListener('click',async()=>{if(!lastAnswer)return;try{await navigator.clipboard.writeText(lastAnswer);copy.textContent='✓';setTimeout(()=>copy.textContent='⧉',1000)}catch{}});
  addMessage('assistant',t('Spreman sam. Pitajte o profilu, financijama, tržištima, vijestima, objavama, Media Kitu ili kontaktu.','Ready. Ask about the profile, financials, markets, news, publications, Media Kit or contact.'));
})();
