(()=>{
  'use strict';
  const select=document.getElementById('mailbox');
  if(!select)return;
  const english=document.documentElement.lang==='en';
  const labels={
    info:english?'Information — info@gnk-asg.hr':'Info — info@gnk-asg.hr',
    contact:english?'Contact — contact@gnk-asg.hr':'Kontakt — contact@gnk-asg.hr',
    media:'Media — media@gnk-asg.hr',
    press:'Press — press@gnk-asg.hr',
    legal:'Legal — legal@gnk-asg.hr',
    privacy:'Privacy — privacy@gnk-asg.hr',
    it:'IT — it@gnk-asg.hr',
    ubo:'UBO — ubo@gnk-asg.hr',
    sefic:'Sefić — sefic@gnk-asg.hr',
    assistant:'Assistant — assistant@gnk-asg.hr'
  };
  const selected=select.value;
  const options=['info','contact','media','press','legal','privacy','it','ubo','sefic','assistant'].map(value=>{
    const option=document.createElement('option');
    option.value=value;
    option.textContent=labels[value];
    return option;
  });
  select.replaceChildren(...options);
  if(labels[selected])select.value=selected;
  select.dataset.parity='hr-en-identical';
})();
