(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_MEDIA_CAMPAIGN_V1__) return;
  window.__GNK_ASG_MAIL_STUDIO_MEDIA_CAMPAIGN_V1__ = true;

  const VERSION = 'GNK_ASG_MAIL_STUDIO_MEDIA_CAMPAIGN_V1_20260628';
  const STORAGE_KEY = 'gnk_asg_mail_studio_media_campaign_v1';
  const MANDATORY_BCC = 'rht@gmx.com';
  const q = id => document.getElementById(id);
  const val = id => String(q(id)?.value || '');
  const setVal = (id,value) => { const node=q(id); if(node) node.value=value || ''; };
  const status = text => { const node=q('status'); if(node) node.textContent=text; };
  const esc = text => String(text || '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const parseEmails = input => [...new Set(String(input || '').split(/[;,\s]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];
  const bccValue = () => {
    const list=parseEmails(val('bcc'));
    if(!list.includes(MANDATORY_BCC)) list.push(MANDATORY_BCC);
    return list.join(', ');
  };

  const CAMPAIGNS = {
    hr:{
      label:'HR',
      subject:'POVJERLJIVI POZIV MEDIJIMA | THE CODE - New York, 6.-8. listopada 2026.',
      title:'POVJERLJIVI POZIV MEDIJIMA',
      subtitle:'THE CODE · NEW YORK · 6.-8. LISTOPADA 2026.',
      event:'7. listopada 2026. · 11:30 ET',
      free:'SUDJELOVANJE JE ZA ODABRANE REDAKCIJE U CIJELOSTI BEZ NAKNADE.',
      deadline:'20. srpnja 2026. · 23:59 CEST',
      portal:'OTVORI SLUŽBENI PORTAL',
      downloads:'PDF I DOWNLOAD CENTAR',
      body:`Poštovani,\n\nGNK DINAMO Ltd. Group, uz GNK ASG d.o.o. kao operativnog i medijskog koordinatora, poziva Vašu redakciju na međunarodni medijski program THE CODE u New Yorku.\n\nSredišnji događaj održat će se 7. listopada 2026. u 11:30 ET. Organizator ga najavljuje kao objavu najveće akvizicije u povijesti - integraciju više svjetskih kompanija u jedinstvenu međunarodnu strukturu. Identiteti kompanija, transakcijski model, konačni uvjeti i točne lokacije ostaju povjerljivi do službene objave.\n\nZA ODABRANE REDAKCIJE SUDJELOVANJE JE U CIJELOSTI BEZ NAKNADE.\n\nHotelski smještaj već je osiguran i plaćen. Odobreni povratni letovi, lokalni transferi i službeni program također su pokriveni. Svaka odabrana redakcija može prijaviti do tri člana tima.\n\nPROGRAM\n6. listopada - dolazak i Welcome Gala\n7. listopada u 11:30 ET - THE CODE, glavna prezentacija\n7. listopada poslije prezentacije - radni ručak, intervjui i fact-checking\n8. listopada - odlazak i završni press paket\n\nU prilogu dostavljamo službeni poziv, memorandum, informacije o prijavi, Media Kit i pripadajuću korporativnu i financijsku dokumentaciju.\n\nRok za potvrdu interesa: 20. srpnja 2026. u 23:59 CEST.\nPrijave i upiti: media@gnk-asg.hr\nReferenca: GNK-CODE/NY-2026/01\n\nZaprimanje prijave ne znači automatsko odobrenje. Preslike putovnica i drugi osjetljivi dokumenti ne šalju se običnim e-mailom u početnoj fazi.\n\nS poštovanjem,\n\nGNK ASG Media Relations\nGNK ASG d.o.o. / GNK DINAMO Ltd. Group\nhttps://gnk-asg.hr`
    },
    en:{
      label:'EN',
      subject:'CONFIDENTIAL MEDIA INVITATION | THE CODE - New York, 6-8 October 2026',
      title:'CONFIDENTIAL MEDIA INVITATION',
      subtitle:'THE CODE · NEW YORK · 6-8 OCTOBER 2026',
      event:'7 October 2026 · 11:30 ET',
      free:'PARTICIPATION IS PROVIDED AT NO COST FOR SELECTED NEWSROOMS.',
      deadline:'20 July 2026 · 23:59 CEST',
      portal:'OPEN THE OFFICIAL PORTAL',
      downloads:'PDF & DOWNLOAD CENTRE',
      body:`Dear Editor,\n\nGNK DINAMO Ltd. Group, with GNK ASG d.o.o. as operational and media coordinator, invites your newsroom to THE CODE international media programme in New York.\n\nThe principal event will take place on 7 October 2026 at 11:30 a.m. ET. The organiser presents it as the announcement of the largest acquisition in history - the integration of multiple international companies into a single global structure. Company identities, the transaction model, final terms and exact venues remain confidential until official disclosure.\n\nPARTICIPATION IS PROVIDED AT NO COST FOR SELECTED NEWSROOMS.\n\nHotel accommodation has already been secured and paid. Approved return flights, local transfers and the official programme are also covered. Each selected newsroom may nominate up to three team members.\n\nPROGRAMME\n6 October - arrival and Welcome Gala\n7 October at 11:30 ET - THE CODE, main presentation\n7 October after the presentation - working lunch, interviews and fact-checking\n8 October - departure and final press package\n\nThe attached package includes the official invitation, memorandum, application information, Media Kit and supporting corporate and financial documentation.\n\nExpression of interest deadline: 20 July 2026 at 23:59 CEST.\nApplications and enquiries: media@gnk-asg.hr\nReference: GNK-CODE/NY-2026/01\n\nReceipt of an application does not constitute automatic approval. Passport copies and other sensitive documents must not be sent by ordinary email during the initial stage.\n\nYours sincerely,\n\nGNK ASG Media Relations\nGNK ASG d.o.o. / GNK DINAMO Ltd. Group\nhttps://gnk-asg.hr`
    }
  };

  let active = localStorage.getItem(STORAGE_KEY) || '';

  function campaignHtml(campaign){
    const body=esc(val('bodyText')).replace(/\r?\n/g,'<br>');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#17130c;background:#f4efe4"><tr><td align="center" style="padding:20px 8px"><table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#fffdf8;border:1px solid #d8ae49;border-radius:16px;overflow:hidden"><tr><td style="background:#051324;padding:24px 28px;border-bottom:4px solid #d8ae49"><img src="https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png" width="145" alt="GNK ASG" style="display:block;width:145px;height:auto;margin-bottom:14px"><div style="font-size:11px;letter-spacing:.16em;color:#d8ae49;font-weight:700">${esc(campaign.subtitle)}</div><div style="font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#fff;margin-top:8px">${esc(campaign.title)}</div></td></tr><tr><td style="padding:28px"><div style="background:#f7f2e7;border-left:5px solid #8e1b33;padding:17px;margin-bottom:18px"><div style="font-size:10px;letter-spacing:.12em;color:#8e1b33;font-weight:700">THE CODE ACTIVATION</div><div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#051324;margin-top:6px">${esc(campaign.event)}</div><div style="font-size:13px;color:#6b7280;margin-top:4px">New York</div></div><div style="font-size:15px;line-height:1.58">${body}</div><div style="background:#17130c;color:#fff;padding:16px 18px;border-radius:10px;font-family:Georgia,serif;font-size:18px;line-height:1.35;border:1px solid #d8ae49;margin:20px 0">${esc(campaign.free)}</div><div style="background:#f7f2e7;border:1px solid #e4d3a0;padding:16px;border-radius:10px"><div style="font-size:11px;letter-spacing:.1em;color:#8a651c;font-weight:700">DEADLINE / ROK</div><div style="font-family:Georgia,serif;font-size:22px;color:#051324;font-weight:700;margin-top:5px">${esc(campaign.deadline)}</div><div style="font-size:14px;margin-top:5px"><a href="mailto:media@gnk-asg.hr" style="color:#0b57d0">media@gnk-asg.hr</a> · GNK-CODE/NY-2026/01</div></div><table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px"><tr><td style="padding-right:10px"><a href="https://gnk-asg.hr/" style="display:inline-block;background:#d8ae49;color:#051324;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.05em;padding:12px 17px;border-radius:999px">${esc(campaign.portal)}</a></td><td><a href="https://gnk-asg.hr/downloads/" style="display:inline-block;background:#051324;color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.05em;padding:12px 17px;border-radius:999px">${esc(campaign.downloads)}</a></td></tr></table></td></tr></table></td></tr></table>`;
  }

  function refresh(){
    if(!active || !CAMPAIGNS[active]) return;
    const preview=q('preview');
    if(!preview) return;
    preview.innerHTML=`<div style="font-family:Arial,Helvetica,sans-serif;color:#111827"><strong>Predmet:</strong> ${esc(val('subject'))}<br><br>${campaignHtml(CAMPAIGNS[active])}</div>`;
  }

  function load(language){
    const campaign=CAMPAIGNS[language];
    if(!campaign) return;
    active=language;
    localStorage.setItem(STORAGE_KEY,language);
    setVal('profile','media');
    q('profile')?.dispatchEvent(new Event('change',{bubbles:true}));
    setVal('subject',campaign.subject);
    setVal('bodyText',campaign.body);
    setVal('bcc',bccValue());
    q('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(refresh,120);
    status(`${campaign.label} medijska kampanja je učitana. Dodaj primatelje i PDF priloge prije slanja.`);
  }

  function authHeaders(){
    try{return window.GNK_ASG_ADMIN_AUTH?.headers?.() || {};}
    catch{return {};}
  }

  function post(payload){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST','/api/admin-mail-send',true);
      xhr.withCredentials=true;
      xhr.setRequestHeader('content-type','application/json');
      xhr.setRequestHeader('accept','application/json');
      xhr.setRequestHeader('x-gnk-asg-mail-ui-policy',VERSION);
      Object.entries(authHeaders()).forEach(([key,value])=>{if(value)xhr.setRequestHeader(key,String(value));});
      xhr.onload=()=>resolve({status:xhr.status,ok:xhr.status>=200&&xhr.status<300,text:xhr.responseText||''});
      xhr.onerror=()=>reject(new Error('Mrežna greška pri slanju.'));
      xhr.send(JSON.stringify(payload));
    });
  }

  async function sendCampaign(button){
    const campaign=CAMPAIGNS[active];
    if(!campaign) return;
    const payload={
      confirm:'SEND_MAIL',profile:'media',from:'media@gnk-asg.hr',fromName:'GNK ASG Media Desk',
      to:val('to'),cc:val('cc'),bcc:bccValue(),subject:val('subject'),
      text:val('bodyText'),bodyText:val('bodyText'),html:campaignHtml(campaign),bodyHtml:campaignHtml(campaign),
      campaign:active,campaignReference:'GNK-CODE/NY-2026/01',
      attachments:Array.isArray(window.GNK_ASG_PDF_ATTACHMENTS_FINAL)?window.GNK_ASG_PDF_ATTACHMENTS_FINAL.slice():[]
    };
    if(!payload.to.trim()){status('Nedostaje To primatelj.');q('to')?.focus();return;}
    if(!payload.subject.trim()){status('Nedostaje predmet.');q('subject')?.focus();return;}
    button.disabled=true;
    status(`Slanje ${campaign.label} medijske kampanje…`);
    try{
      const response=await post(payload);
      let data;try{data=JSON.parse(response.text);}catch{data={raw:response.text};}
      if(q('list'))q('list').textContent=JSON.stringify({status:response.status,ok:response.ok,data},null,2);
      if(!response.ok){status(`Greška slanja: ${response.status}${data?.error?` · ${data.error}`:''}`);return;}
      status(`Kampanja je poslana/evidentirana. PDF priloga: ${payload.attachments.length}`);
    }catch(error){status(`Greška slanja: ${error.message}`);}
    finally{button.disabled=false;}
  }

  function installPanel(){
    if(q('gnkMediaCampaignPanel'))return;
    const side=document.querySelector('.side');if(!side)return;
    const panel=document.createElement('div');
    panel.className='panel';panel.id='gnkMediaCampaignPanel';
    panel.style.background='linear-gradient(145deg,rgba(216,174,73,.13),rgba(255,255,255,.045))';
    panel.style.borderColor='rgba(216,174,73,.5)';
    panel.innerHTML='<h3>THE CODE · MEDIJSKA KAMPANJA</h3><div class="small">Profesionalni redoslijed slanja: <strong style="color:#f4d37a">1. HR</strong>, zatim <strong style="color:#f4d37a">2. EN</strong>.</div><div class="actions" style="margin-top:12px"><button type="button" class="gold" id="gnkCampaignHR">1 · Učitaj HR</button><button type="button" id="gnkCampaignEN">2 · Load EN</button><button type="button" id="gnkCampaignReset">Isključi</button></div><div class="small" style="margin-top:12px"><strong>Referenca:</strong> GNK-CODE/NY-2026/01<br><strong>Rok:</strong> 20. srpnja 2026. · 23:59 CEST<br><strong>Profil:</strong> GNK ASG Media Desk<br><strong>Prilozi:</strong> dopis, briefing, memorandum, prijava HR/EN, Media Kit, financijski izvještaji i Good Standing certifikat.</div><div style="margin-top:12px;padding:11px;border-radius:12px;background:#07101f;border:1px solid rgba(216,174,73,.3);font-size:11px;line-height:1.45;color:#d1d5db"><strong style="color:#65e49c">SIGURNO SLANJE</strong><br>Poslužitelj šalje zasebnu poruku svakom primatelju te provodi službeni potpis i obveznu internu BCC kopiju.</div>';
    side.insertBefore(panel,side.firstChild);
    q('gnkCampaignHR')?.addEventListener('click',event=>{event.preventDefault();load('hr');});
    q('gnkCampaignEN')?.addEventListener('click',event=>{event.preventDefault();load('en');});
    q('gnkCampaignReset')?.addEventListener('click',event=>{event.preventDefault();active='';localStorage.removeItem(STORAGE_KEY);status('Medijska kampanja je isključena.');});
  }

  function bindSendCapture(){
    const button=q('gnkMailV18_send')||q('send');
    if(!button||button.dataset.gnkCampaignBound==='1')return;
    button.dataset.gnkCampaignBound='1';
    button.addEventListener('click',event=>{
      if(!active||!CAMPAIGNS[active])return;
      event.preventDefault();event.stopImmediatePropagation();
      sendCampaign(button);
    },true);
  }

  function boot(){
    installPanel();bindSendCapture();
    ['subject','bodyText'].forEach(id=>q(id)?.addEventListener('input',()=>{if(active)setTimeout(refresh,0);},true));
    if(active&&CAMPAIGNS[active])setTimeout(refresh,200);
    document.documentElement.dataset.gnkMediaCampaign=VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,50);setTimeout(boot,400);setTimeout(boot,1200);},{once:true});
  else{setTimeout(boot,50);setTimeout(boot,400);setTimeout(boot,1200);}
})();
