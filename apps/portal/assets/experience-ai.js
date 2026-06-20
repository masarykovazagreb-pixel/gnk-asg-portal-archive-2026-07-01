(() => {
  if (window.__GNK_ASG_AI_AUGMENT__) return;
  window.__GNK_ASG_AI_AUGMENT__ = true;
  const path = location.pathname.toLowerCase();
  const isEn = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');
  const isAdmin = /\/(operator-dashboard|operator-mobile|mail-studio|mail-center|command-center|admin)\//.test(path);
  const labels = isEn ? {
    ai:'AI Assistant',home:'Home',quick:'Quick actions',ask:'Ask AI',close:'Close',
    summarize:'Summarize page',explain:'Explain section',latest:'Latest publications',market:'Market context',translate:'Translate summary',
    improve:'Improve selected text',seo:'SEO check',admin:'Admin help',note:'AI uses the connected API and page context. It does not perform administrative actions automatically.'
  } : {
    ai:'AI Pomoć',home:'Početna',quick:'Brze funkcije',ask:'Pitaj AI',close:'Zatvori',
    summarize:'Sažmi stranicu',explain:'Objasni sekciju',latest:'Zadnje objave',market:'Kontekst tržišta',translate:'Prevedi sažetak',
    improve:'Poboljšaj označeni tekst',seo:'SEO provjera',admin:'Admin pomoć',note:'AI koristi povezani API i kontekst stranice. Administrativne radnje ne provodi automatski.'
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const context=()=>String(document.querySelector('main')?.innerText||document.body.innerText||'').replace(/\s+/g,' ').trim().slice(0,12000);
  const selected=()=>String(window.getSelection?.().toString()||'').trim().slice(0,5000);
  const actions=()=>{
    const list=[
      [labels.summarize,isEn?'Summarize this page in five clear points using only visible information.':'Sažmi ovu stranicu u pet jasnih točaka koristeći samo vidljive informacije.'],
      [labels.explain,isEn?'Explain the purpose and key information of this page in clear business language.':'Objasni svrhu i ključne informacije ove stranice jasnim poslovnim jezikom.'],
      [labels.latest,isEn?'Identify the latest publications and explain why they matter.':'Izdvoji najnovije objave i objasni zašto su važne.'],
      [labels.market,isEn?'Explain visible market data and whether it is live, delayed, snapshot or fallback.':'Objasni vidljive tržišne podatke i jesu li live, delayed, snapshot ili fallback.'],
      [labels.translate,isEn?'Translate the page summary into Croatian.':'Prevedi sažetak stranice na engleski jezik.']
    ];
    if(isAdmin) list.push(
      [labels.improve,isEn?'Improve the selected text professionally without changing facts.':'Profesionalno poboljšaj označeni tekst bez promjene činjenica.'],
      [labels.seo,isEn?'Review the current draft for title, description, keywords, internal links and structured data.':'Provjeri trenutačni nacrt za naslov, opis, ključne riječi, interne poveznice i strukturirane podatke.'],
      [labels.admin,isEn?'Explain the safest next administrative action. Do not execute actions.':'Objasni najsigurniju sljedeću administrativnu radnju. Ne izvršavaj radnje.']
    );
    return list;
  };
  async function ask(prompt){
    const output=document.getElementById('gnk-asg-ai-output');
    const input=document.getElementById('gnk-asg-ai-question');
    const question=String(prompt||input?.value||'').trim();
    if(!question||!output)return;
    if(input&&prompt)input.value=question;
    output.textContent='...';
    try{
      const response=await fetch('/api/ai-assist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,message:question,prompt:question,pageUrl:location.href,pageTitle:document.title,pageContext:context(),selectedText:selected(),publicOnly:!isAdmin,mode:isAdmin?'private-assistant':'public-assistant'})});
      const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data={answer:raw}}
      const answer=data.answer||data.response||data.message||data.text||data.result;
      if(!response.ok||!answer)throw new Error('AI endpoint');
      output.textContent=String(answer)+'\n\n'+labels.note;
    }catch(error){output.textContent=labels.note+'\n\n'+error.message}
  }
  function ensureHome(){
    if(document.getElementById('gnk-asg-float-home'))return;
    const a=document.createElement('a');a.id='gnk-asg-float-home';a.href=isEn?'/en/':'/';a.textContent='⌂';a.setAttribute('aria-label',labels.home);document.body.appendChild(a);
  }
  function enhance(){
    let button=document.getElementById('gnk-asg-float-ai');
    let panel=document.getElementById('gnk-asg-ai-panel');
    if(!button){button=document.createElement('button');button.id='gnk-asg-float-ai';button.type='button';button.dataset.status='online';button.innerHTML=`<span class="dot"></span><span><strong>${esc(labels.ai)}</strong><small>API</small></span>`;document.body.appendChild(button)}
    if(!panel){panel=document.createElement('aside');panel.id='gnk-asg-ai-panel';panel.innerHTML=`<h3>${esc(labels.ai)}</h3><p>${esc(labels.note)}</p><textarea id="gnk-asg-ai-question"></textarea><div id="gnk-asg-ai-actions"><button id="gnk-asg-ai-ask" type="button">${esc(labels.ask)}</button><button id="gnk-asg-ai-close" type="button">${esc(labels.close)}</button></div><div id="gnk-asg-ai-output">${esc(labels.note)}</div>`;document.body.appendChild(panel)}
    if(!panel.querySelector('.gnk-asg-ai-quick')){const quick=document.createElement('div');quick.className='gnk-asg-ai-quick';quick.innerHTML=`<strong>${esc(labels.quick)}</strong><div>${actions().map(([label,prompt])=>`<button type="button" data-ai-prompt="${esc(prompt)}">${esc(label)}</button>`).join('')}</div>`;panel.insertBefore(quick,panel.querySelector('textarea'))}
    button.onclick=()=>document.body.classList.toggle('gnk-asg-ai-open');
    panel.querySelector('#gnk-asg-ai-close')?.addEventListener('click',()=>document.body.classList.remove('gnk-asg-ai-open'));
    panel.querySelector('#gnk-asg-ai-ask')?.addEventListener('click',()=>ask());
    panel.querySelectorAll('[data-ai-prompt]').forEach(el=>el.addEventListener('click',()=>ask(el.dataset.aiPrompt)));
  }
  function init(){ensureHome();let n=0;const timer=setInterval(()=>{n+=1;enhance();if(n>=12)clearInterval(timer)},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
