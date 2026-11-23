/* AKTUAL MEDIA HR NEWS: a fast, source-linked Croatian newsroom shelf.
 * No third-party image or article body is downloaded. External links always
 * open their original publisher. Date and source are visibly displayed.
 */
(function(){
 'use strict';
 const MAX=200,PAGE_SIZE=32,FRESH_MS=7*86400000;
 const allowed=['hrt.hr','index.hr','24sata.hr','jutarnji.hr','vecernji.hr','n1info.hr','tportal.hr','net.hr','dnevnik.hr','poslovni.hr','lider.hr','lidermedia.hr','dalmacijadanas.hr','zagreb.info'];
 let all=[],visible=PAGE_SIZE,hours=0,query='',lastRefresh=0,loading=false;
 const $=id=>document.getElementById(id);
 const status=$('status'),items=$('items'),more=$('more');
 const safe=item=>{
   try{
     const u=new URL(String(item.url||''));
     if(u.protocol!=='https:'||u.username||u.password)return null;
     const host=u.hostname.toLowerCase(),ok=allowed.some(d=>host===d||host.endsWith('.'+d));
     if(!ok)return null;
     const when=Date.parse(item.publishedAt||item.published_at||'');
     if(!Number.isFinite(when)||when>Date.now()+3600000||when<Date.now()-FRESH_MS)return null;
     const title=String(item.title||'').trim(),source=String(item.source||'').trim();
     if(title.length<9||!source)return null;
     u.hash='';
     for(const key of [...u.searchParams.keys()])if(/^(utm_.*|fbclid|gclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);
     return {title:title.slice(0,250),source:source.slice(0,90),url:u.href,when};
   }catch{return null;}
 };
 function merge(){
   const seen=new Set(),result=[];
   for(const entry of [...arguments].flat()){
     const x=safe(entry);
     if(!x||seen.has(x.url))continue;
     seen.add(x.url);
     result.push(x);
   }
   result.sort((a,b)=>b.when-a.when);
   return result.slice(0,MAX);
 }
 const fmt=t=>new Intl.DateTimeFormat('hr-HR',{timeZone:'Europe/Zagreb',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
 function node(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
 function draw(){
   const matches=all.filter(x=>(!hours||Date.now()-x.when<=hours*3600000)&&(!query||(x.title+' '+x.source).toLocaleLowerCase('hr').includes(query)));
   const list=matches.slice(0,visible),frag=document.createDocumentFragment();
   for(const x of list){
     const li=node('li','item');
     const a=node('a','',x.title);a.href=x.url;a.target='_blank';a.rel='noopener noreferrer nofollow';
     const meta=node('div','meta');
     meta.appendChild(node('strong','source',x.source));
     const time=node('time','',fmt(x.when));time.dateTime=new Date(x.when).toISOString();meta.appendChild(time);
     const mark=node('span','','Izvorni članak');meta.appendChild(mark);
     li.appendChild(a);li.appendChild(meta);frag.appendChild(li);
   }
   if(!list.length)frag.appendChild(node('li','item',all.length?'Nema vijesti za odabrani filtar.':'Izvori zasad nemaju dovoljno svježih poveznica.'));
   items.replaceChildren(frag);
   more.hidden=matches.length<=visible;
   more.textContent='Prikaži još ('+(matches.length-visible)+')';
   $('count').textContent=String(all.length);
   $('publishers').textContent=String(new Set(all.map(x=>x.source)).size);
   $('fresh').textContent=String(all.filter(x=>Date.now()-x.when<=86400000).length);
 }
 async function json(path){
   const response=await fetch(path,{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   return response.json();
 }
 function rows(body){return Array.isArray(body)?body:(body&&Array.isArray(body.items)?body.items:[]);}
 async function update(){
   if(loading)return;
   loading=true;$('refresh').disabled=true;status.textContent='Provjera hrvatskih izvora…';
   try{
     let data=null;
     try{data=await json('/data/hr-news-feed-v1.json');}catch{}
     if(data&&Array.isArray(data.items)){
       all=merge(data.items);
       $('lastUpdate').textContent=data.fetchedAt?fmt(Date.parse(data.fetchedAt)):'—';
       status.textContent='Izvori: '+all.length+' poveznica · uspješno dohvaćenih RSS kanala: '+(data.successfulFeeds||0)+'/'+(data.sourceFeedsConfigured||0);
     }else{
       const fallback=await Promise.allSettled([json('/data/news.json'),json('/data/news_archive.json')]);
       const [fresh,archive]=fallback.map(x=>x.status==='fulfilled'?rows(x.value):[]);
       all=merge(fresh,archive);
       $('lastUpdate').textContent='pohranjena arhiva';
       status.textContent='Prikaz iz postojeće arhive. Novi HR News feed još nije objavljen; broj vijesti nije umjetno nadopunjen.';
     }
     visible=PAGE_SIZE;lastRefresh=Date.now();draw();
   }catch{
     status.textContent='Trenutačno nije moguće dohvatiti izvore. Zadnji dostupni sadržaj ostaje prikazan.';
     draw();
   }finally{loading=false;$('refresh').disabled=false;}
 }
 $('search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('hr');visible=PAGE_SIZE;draw();});
 document.querySelectorAll('[data-hours]').forEach(b=>b.addEventListener('click',()=>{
   hours=Number(b.dataset.hours);visible=PAGE_SIZE;
   document.querySelectorAll('[data-hours]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();
 }));
 more.addEventListener('click',()=>{visible=Math.min(MAX,visible+PAGE_SIZE);draw();});
 $('refresh').addEventListener('click',update);
 window.setInterval(()=>{if(!document.hidden&&Date.now()-lastRefresh>240000)update();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRefresh>240000)update();});
 update();
})();
