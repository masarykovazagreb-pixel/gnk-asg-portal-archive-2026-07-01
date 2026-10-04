(()=>{
  'use strict';
  const root=document.getElementById('entityVisibilityCampaignDesk');
  if(!root)return;
  const lang=document.documentElement.lang?.toLowerCase().startsWith('en')?'en':'hr';
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
      // The working calendar is Croatian-first. Preserve authored English
      // fallback copy instead of machine-translating an editorial brief.
      if(lang==='hr'){
        setText('[data-campaign-title]',item.title);
        setText('[data-campaign-brief]',item.brief);
      }
      const published=item.status==='published-foundation';
      setText('[data-campaign-status]',published
        ?(lang==='en'?'Published source-led foundation':'Objavljena izvorno povezana temeljna objava')
        :(lang==='en'?'Editorial brief — full publication follows only after source and editor approval':'Urednički brief — puna objava slijedi samo nakon provjere izvora i uredničkog odobrenja'));
      const sourceState=item.sourceLedger?.humanVerified
        ?(lang==='en'?'Source-linked foundation record':'Izvorno povezana temeljna objava')
        :(lang==='en'?'Source verification required before full publication':'Provjera izvora obvezna prije pune objave');
      setText('[data-campaign-report]',`${lang==='en'?'Daily oversight':'Dnevni kontrolni zapis'}: ${sourceState}.`);
      const signalCount=Number(campaign.orchestration?.dailyQualityCadence?.requiredSignalsPerDay)||10;
      setText('[data-campaign-governance]',lang==='en'
        ?`${signalCount} distinct quality signals per day · human approval required · modeled Workforce support is not autonomous publishing.`
        :`${signalCount} različitih signala kvalitete dnevno · ljudsko odobrenje je obvezno · modelirana podrška Digitalne radne snage nije autonomna objava.`);
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
