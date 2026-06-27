(()=>{
  'use strict';
  const en=document.documentElement.lang==='en';
  const text=(hr,enText)=>en?enText:hr;
  const reports={
    asg:'/documents/GNK_ASG_Financijski_izvjestaj_FY2025.pdf',
    dinamo:'/documents/GNK_DINAMO_Ltd_Konsolidirani_financijski_izvjestaj_FY2025.pdf'
  };
  const panelData={
    asg:[
      [text('Ukupni prihodi','Total revenue'),'€504.00M','FY 2025'],
      [text('Imovina / ukupna aktiva','Assets / total assets'),'€46.40M',text('Revidirano','Audited')],
      [text('Ukupne obveze','Total liabilities'),'€184.50K',text('Bez dugoročnog duga','No long-term debt')],
      [text('Kapital i rezerve','Equity and reserves'),'€46.21M',text('Samostalno','Standalone')]
    ],
    dinamo:[
      [text('Prihod grupe','Group revenue'),'€4.7046B','FY 2025'],
      [text('Imovina / ukupna aktiva','Assets / total assets'),'€3.4830B',text('Konsolidirano','Consolidated')],
      [text('Ukupne obveze','Total liabilities'),'€69.04M',text('Konsolidirano','Consolidated')],
      [text('Kapital i rezerve','Equity and reserves'),'€3.4140B','98.02%']
    ]
  };
  function metricMarkup(items){
    return items.map(([label,value,note])=>`<div class="code-company__metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join('');
  }
  function patchCompany(selector,items,pdf){
    const panel=document.querySelector(selector);
    if(!panel)return;
    const metrics=panel.querySelector('.code-company__metrics');
    if(metrics)metrics.innerHTML=metricMarkup(items);
    if(!panel.querySelector('.code-company__download')){
      const link=document.createElement('a');
      link.className='code-company__download';
      link.href=pdf;
      link.download='';
      link.textContent=text('Preuzmi financijsko izvješće PDF','Download financial report PDF');
      const footer=panel.querySelector('.code-company__footer');
      footer?.before(link);
    }
  }
  patchCompany('.code-company--asg',panelData.asg,reports.asg);
  patchCompany('.code-company--dinamo',panelData.dinamo,reports.dinamo);

  document.querySelectorAll('.finance-card').forEach((card,index)=>{
    if(card.querySelector('.finance-downloads'))return;
    const actions=document.createElement('div');
    actions.className='finance-downloads';
    const link=document.createElement('a');
    link.className='finance-download';
    link.href=index===0?reports.asg:reports.dinamo;
    link.download='';
    link.textContent=text('Preuzmi financijsko izvješće PDF','Download financial report PDF');
    actions.appendChild(link);
    card.appendChild(actions);
  });

  const iframe=document.getElementById('codePreview');
  const button=document.querySelector('.code-launch-button');
  if(!iframe||!button)return;
  let ready=false;
  const ping=()=>iframe.contentWindow?.postMessage({type:'gnk-code-ping'},'*');
  const setReady=state=>{
    ready=true;
    button.disabled=false;
    button.classList.toggle('is-complete',state==='complete');
    button.textContent=state==='complete'?text('Ponovno pokreni','Replay presentation'):text('Pokreni prezentaciju','Start presentation');
  };
  button.disabled=true;
  button.textContent=text('Učitavanje prezentacije','Loading presentation');
  iframe.addEventListener('load',()=>{setTimeout(ping,40);setTimeout(ping,240);setTimeout(ping,700)});
  window.addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow)return;
    if(event.data?.type==='gnk-code-ready')setReady('ready');
    if(event.data?.type==='gnk-code-playback'){
      if(event.data.state==='playing'){
        ready=true;
        button.disabled=true;
        button.classList.remove('is-complete');
        button.textContent=text('Prezentacija traje','Presentation running');
      }else setReady(event.data.state);
    }
  });
  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if(!ready){ping();return;}
    button.disabled=true;
    button.classList.remove('is-complete');
    button.textContent=text('Prezentacija traje','Presentation running');
    iframe.contentWindow?.postMessage({type:'gnk-code-start'},'*');
  },true);
  setTimeout(ping,350);
  setTimeout(ping,1000);
})();
