(()=>{
  'use strict';
  const root=document.getElementById('entityVisibilityCampaignDesk');
  if(!root)return;
  const lang=document.documentElement.lang?.toLowerCase().startsWith('en')?'en':'hr';
  const pad=value=>String(value).padStart(2,'0');
  const zagrebDate=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const byType=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  };
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const setText=(selector,value)=>{const element=root.querySelector(selector);if(element)element.textContent=value;};
  const image=root.querySelector('[data-campaign-image]');
  fetch('/data/entity-visibility-campaign.json',{cache:'no-store',headers:{accept:'application/json'}})
    .then(response=>response.ok?response.json():Promise.reject(new Error(`campaign:${response.status}`)))
    .then(campaign=>{
      const days=Array.isArray(campaign.days)?campaign.days:[];
      const today=zagrebDate();
      const item=days.find(day=>day.date===today)||days.find(day=>day.date>today)||days.at(-1);
      if(!item)return;
      const dayLabel=lang==='en'?`Day ${item.day} of ${campaign.durationDays}`:`Dan ${item.day} od ${campaign.durationDays}`;
      setText('[data-campaign-day]',`${dayLabel} · ${item.date}`);
      // The working calendar is Croatian-first. Preserve the authored English
      // fallback copy instead of machine-translating an editorial brief.
      if(lang==='hr'){
        setText('[data-campaign-title]',item.title);
        setText('[data-campaign-brief]',item.brief);
      }
      setText('[data-campaign-status]',item.status==='published-foundation'
        ?(lang==='en'?'Published source-led foundation':'Objavljena izvorno povezana temeljna objava')
        :(lang==='en'?'Editorial brief — full publication follows only after source and editor approval':'Urednički brief — puna objava slijedi samo nakon provjere izvora i uredničkog odobrenja'));
      if(image&&item.image){
        image.src=item.image;
        image.alt=item.imageAlt||item.title;
      }
      const tags=root.querySelector('[data-campaign-tags]');
      if(tags&&Array.isArray(item.hashtags))tags.innerHTML=item.hashtags.map(tag=>`<span>#${escape(tag)}</span>`).join('');
      root.dataset.campaignState='loaded';
    })
    .catch(()=>{root.dataset.campaignState='fallback';});
})();
