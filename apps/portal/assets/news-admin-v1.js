(()=>{
  'use strict';
  if(window.__GNK_ASG_NEWS_ADMIN_V1__)return;
  window.__GNK_ASG_NEWS_ADMIN_V1__=true;

  const byId=id=>document.getElementById(id);
  const checks=[
    {id:'status',label:'Automatizacija vijesti',path:'/data/news-automation-status.json'},
    {id:'deployment',label:'Aktivni Worker',path:'/data/deployment-status.json'},
    {id:'feed',label:'Aktivni news feed',path:'/data/news.json'},
    {id:'archive',label:'Arhiva vijesti',path:'/data/news_archive.json'}
  ];

  async function request(entry){
    const started=performance.now();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const url=new URL(entry.path,location.origin);
      url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});
      let data=null;
      try{data=await response.json()}catch(_){data=null}
      return Object.assign({},entry,{ok:response.ok&&data!==null,status:response.status,ms:Math.round(performance.now()-started),data});
    }catch(error){
      return Object.assign({},entry,{ok:false,status:0,ms:Math.round(performance.now()-started),error:error&&error.name==='AbortError'?'Istek vremena':String(error&&error.message||error)});
    }finally{
      clearTimeout(timeout);
    }
  }

  function itemCount(data){
    if(Array.isArray(data))return data.length;
    if(data&&Array.isArray(data.items))return data.items.length;
    if(data&&Array.isArray(data.news))return data.news.length;
    if(data&&Array.isArray(data.articles))return data.articles.length;
    return Number(data&&((data.count||data.total)))||0;
  }

  function metric(label,value,detail){
    const article=document.createElement('article');
    article.className='metric';
    const small=document.createElement('small');small.textContent=label;
    const strong=document.createElement('strong');strong.textContent=String(value||'—');
    const span=document.createElement('span');span.textContent=detail;
    article.append(small,strong,span);
    return article;
  }

  function resultRow(result){
    const row=document.createElement('div');row.className='result-row '+(result.ok?'ok':'bad');
    const strong=document.createElement('strong');strong.textContent=result.label;
    const code=document.createElement('code');code.textContent=result.path;
    const status=document.createElement('em');status.textContent=result.ok?'SPREMNO · '+result.ms+' ms':'GREŠKA · '+(result.error||('HTTP '+result.status));
    row.append(strong,code,status);
    return row;
  }

  async function load(){
    const button=byId('refreshNewsAdmin');
    const chip=byId('newsAdminStatus');
    if(button)button.disabled=true;
    chip.className='status-chip warn';chip.textContent='Provjera u tijeku…';

    const results=await Promise.all(checks.map(request));
    const resultBox=byId('newsAdminResults');
    resultBox.replaceChildren(...results.map(resultRow));
    const map=Object.fromEntries(results.map(result=>[result.id,result]));
    const status=map.status&&map.status.data||{};
    const schedule=Array.isArray(status.newsSchedule)?status.newsSchedule.join(' · '):String(status.schedule||'Nije navedeno');
    const runtime=String(status.newsRuntime||status.version||(map.deployment&&map.deployment.data&&map.deployment.data.newsRuntime)||'Nije navedeno');
    byId('newsMetrics').replaceChildren(
      metric('Raspored',schedule,(status.newsRefreshesPerDay||3)+' osvježavanja dnevno'),
      metric('Aktivne vijesti',itemCount(map.feed&&map.feed.data),'Trenutno učitane stavke'),
      metric('Arhiva',itemCount(map.archive&&map.archive.data),'Arhivirane stavke'),
      metric('Runtime',runtime.slice(0,28),runtime)
    );
    byId('newsAdminRaw').textContent=JSON.stringify({status:map.status&&map.status.data||null,deployment:map.deployment&&map.deployment.data||null},null,2);
    const failed=results.filter(result=>!result.ok).length;
    chip.className='status-chip '+(failed?'bad':'ok');
    chip.textContent=failed?failed+' provjera nije prošla':'Svi read-only izvori odgovaraju';
    if(button)button.disabled=false;
  }

  byId('refreshNewsAdmin')&&byId('refreshNewsAdmin').addEventListener('click',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();