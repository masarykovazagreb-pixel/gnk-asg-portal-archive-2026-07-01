/* AKTUAL MEDIA: independent HRT source shelf. Links only; no HRT photos or article bodies. */
(() => {
 'use strict';
 const holder=document.getElementById('hrt-items');
 const status=document.getElementById('hrt-status');
 if(!holder||!status)return;
 const isHrtHost=host=>host==='hrt.hr'||host.endsWith('.hrt.hr');
 const fmt=stamp=>new Intl.DateTimeFormat('hr-HR',{timeZone:'Europe/Zagreb',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(stamp);
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 async function load(){
   try {
     const response=await fetch('/data/hr-news-feed-v1.json',{credentials:'same-origin',cache:'no-store'});
     if(!response.ok)throw new Error('HTTP '+response.status);
     const data=await response.json();
     if(!data||!Array.isArray(data.items))throw new Error('invalid feed');
     const seen=new Set(),articles=[];
     for(const item of data.items){
       if(!item||item.publisherDomain!=='hrt.hr'||item.source!=='HRT Vijesti')continue;
       let u;try{u=new URL(item.url);}catch{continue;}
       if(u.protocol!=='https:'||u.username||u.password||!isHrtHost(u.hostname.toLowerCase()))continue;
       const date=Date.parse(item.publishedAt||'');
       if(!Number.isFinite(date)||date>Date.now()+3600000||Date.now()-date>7*86400000)continue;
       const title=String(item.title||'').trim();
       if(title.length<9||seen.has(u.href))continue;
       seen.add(u.href);articles.push({title:title.slice(0,240),url:u.href,date});
     }
     articles.sort((a,b)=>b.date-a.date);
     const frag=document.createDocumentFragment();
     for(const item of articles.slice(0,50)){
       const li=el('li'),a=el('a'),img=el('img');
       a.href=item.url;a.rel='noopener noreferrer nofollow';a.target='_blank';
       img.src='/assets/editorial/hr-news/hr-news-source-original-v1.svg';
       img.alt='';img.width=1200;img.height=630;img.loading='lazy';
       a.appendChild(img);a.appendChild(el('span','',item.title));
       const meta=el('div','meta');
       meta.appendChild(el('b','','HRT Vijesti'));meta.appendChild(el('time','',fmt(item.date)));
       meta.lastChild.dateTime=new Date(item.date).toISOString();
       meta.appendChild(el('span','','Otvori izvornik'));
       li.appendChild(a);li.appendChild(meta);frag.appendChild(li);
     }
     holder.replaceChildren(frag);
     status.textContent=articles.length?('Dostupno '+articles.length+' stvarno izvorno povezanih HRT naslova. Prikazano '+Math.min(50,articles.length)+'.'):('Trenutačno nema potvrđenih svježih HRT naslova u našoj cache datoteci. Nisu stvoreni zamjenski naslovi.');
   }catch{
     status.textContent='Izvorni HRT naslovi trenutačno nisu dostupni. Posjetite službeni HRT portal.';
   }
 }
 load();
})();
