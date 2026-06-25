(() => {
  'use strict';
  if (window.__GNK_ASG_GROUP_NETWORK_V2__) return;
  window.__GNK_ASG_GROUP_NETWORK_V2__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const text = lang === 'en' ? {
    kicker:'Global infrastructure',title:'Group network',positions:'positions',active:'active positions',planned:'2026 expansion',total:'total after expansion',connected:'Connected corporate network',coverage:'International coverage',activeLegend:'Active',plannedLegend:'Planned',hub:'Operational centre'
  } : {
    kicker:'Globalna infrastruktura',title:'Mreža grupe',positions:'pozicija',active:'postojeće pozicije',planned:'širenje 2026.',total:'ukupno nakon širenja',connected:'Povezana korporativna mreža',coverage:'Međunarodna pokrivenost',activeLegend:'Aktivno',plannedLegend:'Planirano',hub:'Operativno središte'
  };

  const anchors={
    europe:[430,120],'southeast europe':[460,155],'north america':[175,135],'south america':[275,245],asia:[620,145],africa:[430,245],mena:[520,195],'middle east':[520,195],oceania:[680,250],international:[390,180]
  };
  const fallbackRegions=['north america','europe','southeast europe','mena','asia','africa','south america','oceania'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const hash=value=>[...String(value||'')].reduce((sum,char)=>(sum*33+char.charCodeAt(0))>>>0,5381);

  function count(card,index,fallback){
    const value=Number((card.querySelectorAll('.group-counts strong')[index]?.textContent||'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(value)&&value>0?value:fallback;
  }

  function fallbackNodes(active,planned){
    return Array.from({length:active+planned},(_,index)=>({
      id:`node-${index}`,name:`Position ${index+1}`,region:fallbackRegions[index%fallbackRegions.length],status:index<active?'active':'planned'
    }));
  }

  function point(node,index){
    const key=String(node?.region||'international').toLowerCase();
    const base=anchors[key]||anchors.international;
    const seed=hash(node?.id||node?.name||index);
    const angle=(seed%360)*Math.PI/180;
    const radius=12+((seed>>>8)%34);
    return [Math.max(34,Math.min(766,base[0]+Math.cos(angle)*radius)),Math.max(34,Math.min(306,base[1]+Math.sin(angle)*radius))];
  }

  function renderMap(map,nodes){
    const regions=[...new Set(nodes.map(node=>String(node?.region||'international').toLowerCase()))];
    const links=regions.map((region,index)=>{
      const [x,y]=anchors[region]||anchors.international;
      const bend=index%2?-44:44;
      return `<path class="link" d="M175 135 Q${(175+x)/2} ${(135+y)/2+bend} ${x} ${y}" style="animation-delay:${index*.45}s"/>`;
    }).join('');
    const dots=nodes.slice(0,60).map((node,index)=>{
      const [x,y]=point(node,index);
      const planned=String(node?.status||'').toLowerCase()==='planned';
      const label=node?.name_hr||node?.name_en||node?.name||`${text.positions} ${index+1}`;
      return `<circle class="${planned?'planned-node':'active-node'}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${planned?2.7:2.3}"><title>${esc(label)}</title></circle>`;
    }).join('');

    map.classList.add('gnk-network-map');
    map.innerHTML=`
      <svg viewBox="0 0 800 340" role="img" aria-label="${esc(text.title)}">
        <defs>
          <linearGradient id="netLink" x1="0" x2="1"><stop stop-color="#31d47c"/><stop offset=".48" stop-color="#2b8fe6"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>
          <filter id="goldGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="blueGlow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="greenGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse class="orbit" cx="400" cy="169" rx="334" ry="134"/><ellipse class="orbit" cx="400" cy="169" rx="258" ry="98" opacity=".6"/>
        <path class="land" d="M91 113l31-28 54-16 49 12 23 26-10 24-31 4-18 28-40 11-28-18-22-5z"/>
        <path class="land" d="M245 190l28 8 22 28-5 47-22 31-17-17-8-44z"/>
        <path class="land" d="M344 94l42-22 73 3 37 18 19 27-27 17-34-8-26 18-17 35-33-7-8-29-34-12z"/>
        <path class="land" d="M402 181l38-9 31 20 16 44-25 56-35-17-23-44z"/>
        <path class="land" d="M491 107l52-22 97 7 48 24 14 31-31 18-39-4-21 25-44-7-30-27-42-8z"/>
        <path class="land" d="M649 236l38-13 41 18-6 28-41 12-29-18z"/>
        ${links}
        <circle class="hub-node" cx="175" cy="135" r="5.3"><title>Boulder, Colorado</title></circle>
        ${dots}
      </svg>
      <div class="gnk-network-scan"></div>
      <div class="gnk-network-legend"><span class="a"><i></i>${text.activeLegend}</span><span class="p"><i></i>${text.plannedLegend}</span><span class="h"><i></i>${text.hub}</span></div>`;
  }

  function updateCounts(card,active,planned,total){
    const blocks=[...card.querySelectorAll('.group-counts>div')];
    const values=[active,planned,total];
    const labels=[text.active,text.planned,text.total];
    blocks.slice(0,3).forEach((block,index)=>{
      const strong=block.querySelector('strong');
      const span=block.querySelector('span');
      if(strong)strong.textContent=String(values[index]);
      if(span)span.textContent=labels[index];
    });
  }

  function addInsight(card,active,planned,total,regions){
    card.querySelector('.gnk-network-insight')?.remove();
    const share=total?Math.round(active/total*100):0;
    const items=[...new Set(regions.filter(Boolean))].slice(0,5);
    const box=document.createElement('div');
    box.className='gnk-network-insight';
    box.innerHTML=`<div class="gnk-network-insight-head"><span>${text.connected}</span><span>${active} + ${planned} = ${total}</span></div><div class="gnk-network-progress"><i style="width:${share}%"></i></div><div class="gnk-network-regions"><span>${text.coverage}</span>${items.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`;
    card.querySelector('.group-counts')?.after(box);
  }

  function decorate(card){
    card.classList.add('gnk-network-v2');
    if(card.querySelector('.gnk-network-head'))return;
    const title=card.querySelector('h3');
    const head=document.createElement('div');
    head.className='gnk-network-head';
    const left=document.createElement('div');
    left.innerHTML=`<span class="gnk-network-kicker">${text.kicker}</span>`;
    if(title){title.textContent=text.title;left.appendChild(title)}else left.insertAdjacentHTML('beforeend',`<h3>${text.title}</h3>`);
    head.appendChild(left);
    head.insertAdjacentHTML('beforeend',`<span class="gnk-network-badge"><i></i><span>45 ${text.positions}</span></span>`);
    card.prepend(head);
  }

  async function boot(){
    const card=document.querySelector('#mreza-grupe .map-card');
    const map=card?.querySelector('.world-map');
    if(!card||!map)return;
    decorate(card);
    let active=count(card,0,33),planned=count(card,1,12),total=count(card,2,active+planned);
    let nodes=fallbackNodes(active,planned);
    let regions=fallbackRegions;
    renderMap(map,nodes);updateCounts(card,active,planned,total);addInsight(card,active,planned,total,regions);
    try{
      const response=await fetch(`/data/group_network.json?cb=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      if(!Array.isArray(data?.nodes)||!data.nodes.length)return;
      nodes=data.nodes;
      active=nodes.filter(node=>String(node?.status||'active').toLowerCase()!=='planned').length||active;
      planned=nodes.filter(node=>String(node?.status||'').toLowerCase()==='planned').length||planned;
      total=active+planned;
      regions=nodes.map(node=>node?.region).filter(Boolean);
      renderMap(map,nodes);updateCounts(card,active,planned,total);addInsight(card,active,planned,total,regions);
      const badge=card.querySelector('.gnk-network-badge span');
      if(badge)badge.textContent=`${total} ${text.positions}`;
    }catch{}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [400,1200,2600].forEach(delay=>setTimeout(boot,delay));
})();
