(()=>{'use strict';
const en=document.documentElement.lang==='en';
const docs=[
  {
    href:'/documents/GNK_ASG_Izvjesce_neovisnog_revizora_i_financijski_izvjestaji_2025.pdf',
    tag:en?'INDEPENDENT AUDIT':'NEOVISNA REVIZIJA',
    title:en?"Independent Auditor's Report and Financial Statements 2025":"Izvješće neovisnog revizora i financijski izvještaji 2025.",
    note:en?'GNK ASG d.o.o. · audited PDF':'GNK ASG d.o.o. · revidirani PDF',
    button:en?'DOWNLOAD PDF':'PREUZMI PDF'
  },
  {
    href:'/documents/GNK_DINAMO_Ltd_Colorado_Filing_Consolidated_Financial_Statements_2025.pdf',
    tag:'FILED IN COLORADO',
    title:'Consolidated Financial Statements for 2025 – GNK DINAMO Ltd.',
    note:en?'GNK DINAMO Ltd. · consolidated PDF':'GNK DINAMO Ltd. · konsolidirani PDF',
    button:en?'DOWNLOAD PDF':'PREUZMI PDF'
  }
];

function card(doc,scope){
  const block=document.createElement('section');
  block.className=`company-document company-document--${scope}`;
  block.innerHTML=`<small>${doc.tag}</small><strong>${doc.title}</strong><span>${doc.note}</span><a href="${doc.href}" download>${doc.button}</a>`;
  return block;
}

function install(){
  let changed=false;
  const left=document.querySelector('.ci-company--left .ci-metrics');
  if(left&&!document.querySelector('.ci-company--left .company-document')){
    left.insertAdjacentElement('afterend',card(docs[0],'code'));
    changed=true;
  }
  const right=document.querySelector('.ci-company--right .ci-metrics');
  if(right&&!document.querySelector('.ci-company--right .company-document')){
    right.insertAdjacentElement('afterend',card(docs[1],'code'));
    changed=true;
  }
  document.querySelectorAll('.finance-card').forEach((financeCard,index)=>{
    if(index>1||financeCard.querySelector('.company-document'))return;
    financeCard.appendChild(card(docs[index],'finance'));
    changed=true;
  });
  return changed;
}

install();
const observer=new MutationObserver(()=>install());
observer.observe(document.documentElement,{childList:true,subtree:true});
window.setTimeout(()=>observer.disconnect(),15000);
})();
