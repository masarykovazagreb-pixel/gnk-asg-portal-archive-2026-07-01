(()=>{
'use strict';
if(window.__GNK_ASG_MEDIA_CENTER_ENGLISH_UI_V2__)return;
window.__GNK_ASG_MEDIA_CENTER_ENGLISH_UI_V2__=true;
const replacements=[
  [/XLSX parser nije dostupan/gi,'The XLSX parser is unavailable'],
  [/Nije pronađen list sa stupcima Medij\/Outlet i Email\./gi,'No worksheet containing Outlet and Email columns was found.'],
  [/Nedostaje medij/gi,'Outlet is missing'],
  [/Neispravan email/gi,'Invalid email address'],
  [/Duplikat/gi,'Duplicate'],
  [/NIJE POSLANO/gi,'NOT SENT'],
  [/POSLANO/gi,'SENT'],
  [/ŠALJE SE/gi,'SENDING'],
  [/U REDU/gi,'QUEUED'],
  [/PONOVNI POKUŠAJ/gi,'RETRY'],
  [/NEUSPJELO/gi,'FAILED'],
  [/PROVJERA/gi,'REVIEW'],
  [/Nema učitanih kontakata\./gi,'No contacts have been loaded.'],
  [/Pregled/gi,'Preview'],
  [/Kontakti/gi,'Contacts'],
  [/Spremni/gi,'Ready'],
  [/UČITAN/gi,'LOADED'],
  [/NEDOSTAJE/gi,'MISSING'],
  [/Stanje osvježeno/gi,'Status refreshed'],
  [/kontakata/gi,'contacts'],
  [/Odaberite Excel datoteku\./gi,'Select a spreadsheet file.'],
  [/Excel provjeren/gi,'Spreadsheet validated'],
  [/jedinstvenih kontakata/gi,'unique contacts'],
  [/Prvo provjerite Excel\./gi,'Validate the spreadsheet first.'],
  [/Uvezeno/gi,'Imported'],
  [/Svi su spremni za kontrolirani test i red slanja\./gi,'All contacts are ready for the controlled test and delivery queue.'],
  [/Odaberite HTML datoteku\./gi,'Select an HTML file.'],
  [/Odaberite PDF datoteku\./gi,'Select a PDF file.'],
  [/je učitan, provjeren i spremljen\./gi,'was uploaded, validated and stored.'],
  [/Najprije učitajte kontakte\./gi,'Load the contacts first.'],
  [/Prikazan je pregled poruke za odabranog primatelja\./gi,'The email preview is displayed for the selected recipient.'],
  [/Testna poruka poslana na/gi,'Control test sent to'],
  [/U red je dodano/gi,'Added to the queue'],
  [/poruka; postojećih/gi,'messages; already existing'],
  [/Poslana poruka/gi,'Message sent'],
  [/Status je označen kao SENT\./gi,'The status is marked as SENT.'],
  [/Rezultat/gi,'Result'],
  [/provjereno/gi,'checked'],
  [/nije učitan/gi,'has not been loaded'],
  [/nije pronađen/gi,'was not found'],
  [/PREVIEW PRIJE SLANJA/gi,'FINAL PRE-SEND PREVIEW']
];
function translate(value){let text=String(value??'');for(const [pattern,replacement] of replacements)text=text.replace(pattern,replacement);return text;}
function translateNode(node){
  if(node.nodeType===Node.TEXT_NODE){const next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  if(node.matches('input[placeholder]'))node.placeholder=translate(node.placeholder);
  if(node.matches('input[value]')&&node.type!=='email'&&node.type!=='file')node.value=translate(node.value);
  if(node.matches('pre,.fresh-notice,.delivery-status,.fresh-state')){const next=translate(node.textContent);if(next!==node.textContent)node.textContent=next;}
  node.childNodes.forEach(translateNode);
}
function applyHtmlOnlyMode(){
  document.documentElement.lang='en';
  const sendTest=document.getElementById('sendTest');if(sendTest)sendTest.textContent='SEND HTML-ONLY CONTROL TEST';
  const openPdf=document.getElementById('openPdf');if(openPdf)openPdf.hidden=true;
  document.querySelectorAll('article.fresh-card').forEach(card=>{
    const heading=card.querySelector('h2');
    const title=String(heading?.textContent||'').trim();
    if(/PDF attachment/i.test(title)){card.hidden=true;return;}
    if(/^4\.\s*Recipient preview/i.test(title))heading.textContent='3. Recipient preview';
    if(/^5\.\s*Test and controlled delivery/i.test(title))heading.textContent='4. Test and controlled delivery';
  });
  document.querySelectorAll('#freshKpis > div').forEach(item=>{if(/^PDF$/i.test(String(item.querySelector('small')?.textContent||'').trim()))item.hidden=true;});
  const hero=document.querySelector('.fresh-hero p');if(hero)hero.textContent='Strict English-only HTML delivery with one greeting, no PDF and no other attachments.';
  if(!document.getElementById('htmlOnlyModeNotice')){
    const notice=document.createElement('section');
    notice.id='htmlOnlyModeNotice';notice.className='fresh-notice';
    notice.textContent='HTML-ONLY MODE — Production delivery is paused until the final preview and control test are approved. Subject: CODE. Attachments: NONE.';
    const anchor=document.getElementById('freshNotice');anchor?.parentNode?.insertBefore(notice,anchor?.nextSibling||null);
  }
}
function run(){translateNode(document.body);applyHtmlOnlyMode();}
const observer=new MutationObserver(records=>{for(const record of records){record.addedNodes.forEach(translateNode);if(record.type==='characterData')translateNode(record.target);}applyHtmlOnlyMode();});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{run();observer.observe(document.body,{subtree:true,childList:true,characterData:true});},{once:true}):(()=>{run();observer.observe(document.body,{subtree:true,childList:true,characterData:true});})();
})();