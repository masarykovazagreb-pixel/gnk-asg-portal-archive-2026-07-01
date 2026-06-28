(()=>{
  'use strict';
  const en=document.documentElement.lang==='en';
  const text=(hr,enText)=>en?enText:hr;

  const menu=document.querySelector('.index-nav .menu');
  if(menu){
    const items=en
      ? [['#the-code','THE CODE'],['#financials','Financials'],['#network','Network'],['/markets/','Markets'],['/en/contact/','Contact'],['/admin-center/','Admin'],['/','HR','lang']]
      : [['#the-code','THE CODE'],['#financije','Financije'],['#mreza','Mreža'],['/trzista/','Tržišta'],['/contact/','Kontakt'],['/admin-center/','Admin'],['/en/','EN','lang']];
    menu.replaceChildren(...items.map(([href,label,className])=>{
      const link=document.createElement('a');
      link.href=href;
      link.textContent=label;
      if(className)link.className=className;
      if(href==='/admin-center/')link.rel='nofollow';
      return link;
    }));
    document.body.dataset.gnkIndexMenu='minimum-v1';
  }

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
  const metricMarkup=items=>items.map(([label,value,note])=>`<div class="code-company__metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join('');

  const frame=document.querySelector('.code-frame');
  const iframe=document.getElementById('codePreview');
  const codeStage=document.querySelector('.code-stage');
  if(frame&&iframe){
    frame.classList.add('code-frame--editorial');
    if(!document.querySelector('.code-launch-bar')&&codeStage){
      const launch=document.createElement('div');
      launch.className='code-launch-bar';
      launch.innerHTML=`<div class="code-launch-copy"><small>THE CODE · 390 × 844 · ${text('šest scena','six scenes')}</small><strong>${text('Pokreni prezentaciju od prve scene','Start the presentation from scene one')}</strong></div><button class="code-launch-button" type="button">${text('Pokreni prezentaciju','Start presentation')}</button>`;
      frame.before(launch);
    }
    if(!frame.querySelector('.code-company--asg')){
      const left=document.createElement('aside');
      left.className='code-company code-company--asg';
      left.innerHTML=`<div><span class="code-company__eyebrow">01 · Zagreb · ${text('Hrvatska','Croatia')}</span><h3>GNK ASG<br>d.o.o.</h3><p class="code-company__intro">${text('Samostalni revidirani financijski pokazatelji za poslovnu 2025. godinu.','Standalone audited financial indicators for fiscal year 2025.')}</p><div class="code-company__metrics"></div></div><div class="code-company__footer">GNK ASG d.o.o. · Zagreb · FY 2025</div>`;
      frame.insertBefore(left,iframe);
    }
    if(!frame.querySelector('.code-company--dinamo')){
      const right=document.createElement('aside');
      right.className='code-company code-company--dinamo';
      right.innerHTML=`<div><span class="code-company__eyebrow">02 · Boulder · Colorado</span><h3>GNK DINAMO<br>Ltd. Group</h3><p class="code-company__intro">${text('Konsolidirana snaga grupe, globalna mreža i aktivacija u New Yorku.','Consolidated group strength, global network and New York activation.')}</p><div class="code-company__metrics"></div><div class="code-company__event"><small>${text('Aktivacija koda','Code activation')}</small><strong>07 OCT 2026</strong><span>11:30 AM · New York ET</span></div></div><div class="code-company__footer">GNK DINAMO Ltd. · Entity ID 20238180649</div>`;
      frame.appendChild(right);
    }
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
      panel.querySelector('.code-company__footer')?.before(link);
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

  if(!document.querySelector('.public-float--home')){
    const home=document.createElement('a');
    home.className='public-float public-float--home';
    home.href='#top';
    home.setAttribute('aria-label',text('Početna','Home'));
    home.innerHTML=`<span>${text('Početna','Home')}</span>`;
    document.body.appendChild(home);
  }
  if(!document.querySelector('.public-float--ai')){
    const ai=document.createElement('a');
    ai.className='public-float public-float--ai';
    ai.href=en?'/en/assistant/':'/assistant/';
    ai.setAttribute('aria-label',text('AI pomoć','AI Help'));
    ai.innerHTML=`<span>${text('AI pomoć','AI Help')}</span>`;
    document.body.appendChild(ai);
  }

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
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(!ready){ping();return;}
    button.disabled=true;
    button.classList.remove('is-complete');
    button.textContent=text('Prezentacija traje','Presentation running');
    iframe.contentWindow?.postMessage({type:'gnk-code-start'},'*');
  },true);
  setTimeout(ping,350);setTimeout(ping,1000);
})();