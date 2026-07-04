(()=>{
  'use strict';
  if(window.__GNK_EDITORIAL_RELEASE_QUEUE_V1__)return;
  window.__GNK_EDITORIAL_RELEASE_QUEUE_V1__=true;

  const API='/api/editorial-operations';
  const $=id=>document.getElementById(id);

  function setStatus(message,mode=''){
    const node=$('status');
    node.className=`status ${mode}`.trim();
    node.textContent=message;
  }

  async function request(path,options={}){
    const response=await fetch(`${API}${path}`,{credentials:'same-origin',cache:'no-store',...options});
    if(response.status===401||response.status===403){
      setStatus('Admin session required. Redirecting to secure login.','bad');
      location.href=`/admin-login/?next=${encodeURIComponent(location.pathname)}`;
      throw new Error('unauthorized');
    }
    return response;
  }

  function createMeta(text){
    const span=document.createElement('span');
    span.textContent=text;
    return span;
  }

  async function openPreview(item,button){
    const original=button.textContent;
    button.disabled=true;
    button.textContent='Opening…';
    try{
      const response=await request('/slot/preview',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({date:item.date,id:item.id})
      });
      if(!response.ok){
        const payload=await response.json().catch(()=>({}));
        throw new Error(payload.error||`preview_http_${response.status}`);
      }
      const blob=await response.blob(),url=URL.createObjectURL(blob);
      window.open(url,'_blank','noopener');
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }finally{
      button.disabled=false;
      button.textContent=original;
    }
  }

  function render(items){
    const queue=$('queue');
    queue.replaceChildren();
    if(!items.length){
      const empty=document.createElement('div');
      empty.className='empty';
      empty.textContent='No publications are waiting for Executive Office release.';
      queue.appendChild(empty);
      return;
    }
    for(const item of items){
      const article=document.createElement('article');
      article.className='item';
      const copy=document.createElement('div');
      const title=document.createElement('h2');
      title.textContent=item.title||item.id;
      const meta=document.createElement('div');
      meta.className='meta';
      meta.append(
        createMeta(item.publicationType||'publication'),
        createMeta(item.date||'—'),
        createMeta(item.attribution?.author?.name||'—'),
        createMeta(`Queued ${item.queuedAt||'—'}`)
      );
      const state=document.createElement('span');
      state.className='pill';
      state.textContent=item.state||'awaiting-executive-release';
      copy.append(title,meta,state);
      const button=document.createElement('button');
      button.type='button';
      button.className='btn primary';
      button.textContent='Open noindex preview';
      button.addEventListener('click',()=>openPreview(item,button).catch(error=>setStatus(String(error.message||error),'bad')));
      article.append(copy,button);
      queue.appendChild(article);
    }
  }

  async function load(){
    const response=await request('/publication/queue');
    if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(payload.error||`queue_http_${response.status}`);}
    const payload=await response.json();
    render(payload.items||[]);
    setStatus(`Loaded ${(payload.items||[]).length} queued item(s). Automatic public publication is disabled.`,'ok');
  }

  load().catch(error=>{if(error.message!=='unauthorized')setStatus(String(error.message||error),'bad');});
})();
