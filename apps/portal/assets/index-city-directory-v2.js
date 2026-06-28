(()=>{
  'use strict';
  if(window.__GNK_INDEX_CITY_DIRECTORY_V2__)return;
  window.__GNK_INDEX_CITY_DIRECTORY_V2__=true;

  const en=document.documentElement.lang==='en';
  const order=en
    ? ['Europe','North America','South America','Asia','Africa','Oceania']
    : ['Europa','Sjeverna Amerika','Južna Amerika','Azija','Afrika','Oceanija'];

  function render(){
    const directory=document.getElementById('locationDirectory');
    const locations=Array.isArray(window.GNK_INDEX_NETWORK)?window.GNK_INDEX_NETWORK:[];
    if(!directory||!locations.length)return false;
    if(directory.dataset.gnkCityGroups==='v2')return true;

    const groups=new Map(order.map(name=>[name,[]]));
    for(const item of locations){
      const city=en?item[1]:item[0];
      const country=en?item[3]:item[2];
      const continent=en?item[5]:item[4];
      const status=item[8]==='planned'?'planned':'existing';
      if(!groups.has(continent))groups.set(continent,[]);
      groups.get(continent).push({city,country,status});
    }

    const collator=new Intl.Collator(en?'en':'hr',{sensitivity:'base'});
    const fragment=document.createDocumentFragment();

    for(const [continent,items] of groups){
      if(!items.length)continue;
      items.sort((a,b)=>a.status===b.status?collator.compare(a.city,b.city):(a.status==='existing'?-1:1));
      const existing=items.filter(item=>item.status==='existing').length;
      const planned=items.length-existing;

      const section=document.createElement('section');
      section.className='city-region';
      section.innerHTML=`
        <header class="city-region__head">
          <div>
            <span>${en?'Region':'Regija'}</span>
            <h3>${continent}</h3>
          </div>
          <p><strong>${items.length}</strong> ${en?'locations':'lokacija'} · ${existing} ${en?'active':'postojećih'}${planned?` · ${planned} ${en?'planned':'planiranih'}`:''}</p>
        </header>
        <div class="city-region__grid"></div>`;

      const grid=section.querySelector('.city-region__grid');
      for(const item of items){
        const card=document.createElement('article');
        card.className=`location-item${item.status==='planned'?' planned':''}`;
        card.innerHTML=`
          <div class="location-item__copy">
            <strong>${item.city}</strong>
            <span>${item.country}</span>
          </div>
          <b>${item.status==='planned'?(en?'Planned':'Planirano'):(en?'Active':'Postojeće')}</b>`;
        grid.appendChild(card);
      }
      fragment.appendChild(section);
    }

    directory.replaceChildren(fragment);
    directory.dataset.gnkCityGroups='v2';
    directory.setAttribute('aria-label',en?'GNK DINAMO global city directory':'GNK DINAMO globalni direktorij gradova');
    return true;
  }

  if(!render()){
    const directory=document.getElementById('locationDirectory');
    if(directory){
      const observer=new MutationObserver(()=>{if(render())observer.disconnect();});
      observer.observe(directory,{childList:true});
      setTimeout(()=>observer.disconnect(),10000);
    }
    [100,300,700,1400,2600].forEach(delay=>setTimeout(render,delay));
  }
})();
