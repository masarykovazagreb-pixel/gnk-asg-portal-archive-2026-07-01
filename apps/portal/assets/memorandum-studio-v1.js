(()=>{
  'use strict';
  if(window.__GNK_MEMORANDUM_STUDIO_V1__)return;
  window.__GNK_MEMORANDUM_STUDIO_V1__=true;

  const $=id=>document.getElementById(id);
  const STORE_KEY='gnk-asg-memorandum-studio-v1';
  const BRAND={
    asg:{
      name:'GNK ASG d.o.o.',
      logo:'/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png',
      line1:'Zagrebačka cesta 130 · 10000 Zagreb · Hrvatska',
      line2:'OIB 75227917632 · MBS 081512375',
      footer:'GNK ASG d.o.o. · Zagrebačka cesta 130 · Zagreb',
      email:'office@gnk-asg.hr',place:'Zagreb'
    },
    dinamo:{
      name:'GNK DINAMO Ltd. Group',
      logo:'/assets/brand/media-kit/GNK_DINAMO_Ltd_logo_gold_transparent.png',
      line1:'1942 Broadway Street, STE 314C · Boulder, CO 80302 · United States',
      line2:'Colorado Entity ID 20238180649 · EIN 36-5127187',
      footer:'GNK DINAMO Ltd. · Boulder, Colorado · United States',
      email:'office@gnk-asg.hr',place:'Boulder'
    }
  };
  const FIELD_IDS=['language','documentDate','documentPlace','documentReference','recipientName','recipientAddress','documentSubject','documentBody','signatoryName','signatoryTitle','mailProfile','mailTo','mailCc','mailSubject','mailMessage'];
  const state={zoom:.82,pdfBlob:null,pdfFileName:'',pdfSignature:'',toastTimer:null};

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const selectedBrand=()=>document.querySelector('input[name="brand"]:checked')?.value||'asg';
  const value=id=>$(id)?.value||'';
  const text=value=>String(value??'').replace(/\r\n/g,'\n').trim();
  const today=()=>new Date().toISOString().slice(0,10);

  function showToast(message){
    const node=$('toast');if(!node)return;
    node.textContent=message;node.hidden=false;
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{node.hidden=true},3200);
  }
  function setResult(message,type=''){
    const node=$('sendResult');node.textContent=message;node.className=`send-result${type?` ${type}`:''}`;
  }
  function markPdfStale(){state.pdfBlob=null;state.pdfSignature='';state.pdfFileName=''}
  function bodySignature(){return JSON.stringify(snapshot())}

  function snapshot(){
    const data={brand:selectedBrand()};
    FIELD_IDS.forEach(id=>data[id]=value(id));
    return data;
  }
  function applySnapshot(data){
    if(!data||typeof data!=='object')return;
    const brand=data.brand==='dinamo'?'dinamo':'asg';
    const radio=document.querySelector(`input[name="brand"][value="${brand}"]`);if(radio)radio.checked=true;
    FIELD_IDS.forEach(id=>{if($(id)&&typeof data[id]==='string')$(id).value=data[id]});
    refreshBrandChoice();updatePreview();
  }
  function saveDraft(){
    localStorage.setItem(STORE_KEY,JSON.stringify({...snapshot(),savedAt:new Date().toISOString()}));
    showToast('Nacrt memoranduma je spremljen u ovom pregledniku.');
  }
  function loadDraft(){
    try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(saved)applySnapshot(saved)}catch(_){ }
  }
  function newDocument(){
    if(!confirm('Očistiti trenutačni dokument i započeti novi memorandum?'))return;
    const keep={language:value('language'),mailProfile:value('mailProfile')};
    document.querySelector('input[name="brand"][value="asg"]').checked=true;
    FIELD_IDS.forEach(id=>{if($(id))$(id).value=''});
    $('language').value=keep.language||'hr';$('mailProfile').value=keep.mailProfile||'office';$('documentDate').value=today();$('documentPlace').value='Zagreb';$('documentSubject').value='Službena obavijest';$('signatoryName').value='Nermin Sefić';$('signatoryTitle').value='Direktor / Authorized Representative';$('mailSubject').value='Službeni dokument GNK ASG';$('mailMessage').value='Poštovani,\n\nu privitku dostavljamo službeni dokument.\n\nSrdačan pozdrav';
    localStorage.removeItem(STORE_KEY);refreshBrandChoice();updatePreview();setResult('Dokument još nije poslan.');showToast('Otvoren je novi dokument.');
  }

  function formatDate(raw,lang){
    if(!raw)return '—';
    const parsed=new Date(`${raw}T12:00:00`);
    if(Number.isNaN(parsed.getTime()))return raw;
    return new Intl.DateTimeFormat(lang==='en'?'en-US':'hr-HR',{day:'2-digit',month:'long',year:'numeric'}).format(parsed);
  }
  function refreshBrandChoice(){
    const brand=selectedBrand();
    document.querySelectorAll('.brand-option').forEach(label=>label.classList.toggle('active',label.querySelector('input')?.checked));
    if(!value('documentPlace')||['Zagreb','Boulder'].includes(value('documentPlace')))$('documentPlace').value=BRAND[brand].place;
  }
  function updatePreview(){
    const data=snapshot(),brand=BRAND[data.brand],en=data.language==='en';
    $('documentPreview').className=`document-page brand-${data.brand}`;
    $('previewLogo').src=brand.logo;$('previewLogo').alt=`${brand.name} logo`;
    $('previewCompany').textContent=brand.name;$('previewCompanyLine1').textContent=brand.line1;$('previewCompanyLine2').textContent=brand.line2;
    $('previewRecipient').textContent=text(data.recipientName)||'—';$('previewRecipientAddress').textContent=text(data.recipientAddress)||'—';
    $('previewPlaceDate').textContent=`${text(data.documentPlace)||brand.place}, ${formatDate(data.documentDate,data.language)}`;
    $('previewReference').textContent=text(data.documentReference)||'—';$('previewSubject').textContent=text(data.documentSubject)||(en?'Official notice':'Službena obavijest');
    $('previewSignatory').textContent=text(data.signatoryName)||'Nermin Sefić';$('previewSignatoryTitle').textContent=text(data.signatoryTitle)||'Authorized Representative';
    $('previewFooterLeft').textContent=brand.footer;
    $('labelRecipient').textContent=en?'Recipient':'Primatelj';$('labelPlaceDate').textContent=en?'Place and date':'Mjesto i datum';$('labelReference').textContent=en?'Reference':'Broj / referenca';$('labelSubject').textContent=en?'Subject':'Predmet';$('closingText').textContent=en?'Sincerely,':'S poštovanjem,';
    const body=$('previewBody');body.replaceChildren();
    const paragraphs=text(data.documentBody).split(/\n\s*\n/).filter(Boolean);
    (paragraphs.length?paragraphs:[en?'Document text will appear here.':'Tekst dokumenta pojavit će se ovdje.']).forEach(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;body.appendChild(p)});
    const estimated=Math.max(1,Math.ceil(Math.max(1,text(data.documentBody).length)/2700));$('pageCount').textContent=`${estimated} ${estimated===1?(en?'page':'stranica'):(en?'pages':'stranice')}`;
    markPdfStale();
  }
  function setZoom(next){
    state.zoom=Math.min(1,Math.max(.42,next));
    $('documentPreview').style.setProperty('--preview-scale',state.zoom.toFixed(2));$('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Logo se nije mogao učitati.'));image.src=src});
  }
  function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
  function wrapLines(ctx,input,maxWidth){
    const result=[];
    String(input||'').split(/\n\s*\n/).forEach((paragraph,pIndex)=>{
      const words=paragraph.replace(/\s+/g,' ').trim().split(' ').filter(Boolean);let line='';
      words.forEach(word=>{const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){result.push({text:line,gap:false});line=word}else line=test});
      if(line)result.push({text:line,gap:false});
      if(pIndex<String(input||'').split(/\n\s*\n/).length-1)result.push({text:'',gap:true});
    });
    return result.length?result:[{text:'',gap:false}];
  }
  function drawHeader(ctx,data,brand,logo,pageNumber,totalPages){
    ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,1240,1754);
    ctx.strokeStyle='rgba(184,137,47,.20)';ctx.lineWidth=2;ctx.strokeRect(28,28,1184,1698);
    const maxW=255,maxH=160,ratio=Math.min(maxW/logo.width,maxH/logo.height);ctx.drawImage(logo,72,64,logo.width*ratio,logo.height*ratio);
    ctx.textAlign='right';ctx.fillStyle='#17130c';ctx.font='600 38px Georgia';ctx.fillText(brand.name,1165,104);
    ctx.fillStyle='#665e52';ctx.font='20px Arial';ctx.fillText(brand.line1,1165,145);ctx.fillText(brand.line2,1165,176);
    const gradient=ctx.createLinearGradient(75,0,1165,0);gradient.addColorStop(0,'#8a5a0b');gradient.addColorStop(.5,'#e6c66c');gradient.addColorStop(1,'#8a5a0b');ctx.fillStyle=gradient;ctx.fillRect(75,216,1090,5);
    if(totalPages>1){ctx.fillStyle='#8f6a28';ctx.font='700 17px Arial';ctx.fillText(`${pageNumber} / ${totalPages}`,1165,252)}
    ctx.textAlign='left';
  }
  function drawFooter(ctx,brand){
    ctx.fillStyle='#f2ead7';ctx.fillRect(0,1644,1240,110);ctx.fillStyle='#c59a42';ctx.fillRect(75,1644,1090,2);
    ctx.fillStyle='#6c6254';ctx.font='16px Arial';ctx.textAlign='left';ctx.fillText(brand.footer,75,1690);ctx.textAlign='right';ctx.fillText(`+385 0916104398 · ${brand.email} · gnk-asg.hr`,1165,1690);ctx.textAlign='left';
  }
  async function renderCanvases(){
    const data=snapshot(),brand=BRAND[data.brand],en=data.language==='en',logo=await loadImage(brand.logo);
    const measure=document.createElement('canvas').getContext('2d');measure.font='28px Georgia';
    const lines=wrapLines(measure,text(data.documentBody),1090);
    const firstCapacity=25,nextCapacity=35;const chunks=[];let cursor=0;
    while(cursor<lines.length){const capacity=chunks.length?nextCapacity:firstCapacity;chunks.push(lines.slice(cursor,cursor+capacity));cursor+=capacity}
    if(!chunks.length)chunks.push([]);
    const last=chunks[chunks.length-1],used=last.reduce((sum,line)=>sum+(line.gap?22:43),0);if(used>1120)chunks.push([]);
    const total=chunks.length,canvases=[];
    for(let index=0;index<total;index+=1){
      const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;const ctx=canvas.getContext('2d');drawHeader(ctx,data,brand,logo,index+1,total);
      let y=292;
      if(index===0){
        ctx.fillStyle='#9a7127';ctx.font='700 16px Arial';ctx.fillText(en?'RECIPIENT':'PRIMATELJ',75,y);ctx.fillStyle='#17130c';ctx.font='600 29px Georgia';ctx.fillText(text(data.recipientName)||'—',75,y+42);ctx.fillStyle='#665e52';ctx.font='20px Arial';
        const address=(text(data.recipientAddress)||'—').split('\n');address.slice(0,3).forEach((line,i)=>ctx.fillText(line,75,y+78+i*28));
        ctx.textAlign='right';ctx.fillStyle='#9a7127';ctx.font='700 16px Arial';ctx.fillText(en?'PLACE AND DATE':'MJESTO I DATUM',1165,y);ctx.fillStyle='#17130c';ctx.font='600 23px Georgia';ctx.fillText(`${text(data.documentPlace)||brand.place}, ${formatDate(data.documentDate,data.language)}`,1165,y+38);ctx.fillStyle='#9a7127';ctx.font='700 16px Arial';ctx.fillText(en?'REFERENCE':'BROJ / REFERENCA',1165,y+88);ctx.fillStyle='#17130c';ctx.font='600 23px Georgia';ctx.fillText(text(data.documentReference)||'—',1165,y+126);ctx.textAlign='left';
        y=520;ctx.strokeStyle='rgba(184,137,47,.25)';ctx.beginPath();ctx.moveTo(75,y-25);ctx.lineTo(1165,y-25);ctx.stroke();ctx.fillStyle='#9a7127';ctx.font='700 16px Arial';ctx.fillText(en?'SUBJECT':'PREDMET',75,y);ctx.fillStyle='#17130c';ctx.font='600 34px Georgia';ctx.fillText(text(data.documentSubject)||(en?'Official notice':'Službena obavijest'),75,y+48);ctx.beginPath();ctx.moveTo(75,y+76);ctx.lineTo(1165,y+76);ctx.stroke();y=650;
      }else{ctx.fillStyle='#9a7127';ctx.font='700 16px Arial';ctx.fillText(en?'CONTINUATION':'NASTAVAK DOKUMENTA',75,y);ctx.fillStyle='#17130c';ctx.font='600 27px Georgia';ctx.fillText(text(data.documentSubject)||(en?'Official notice':'Službena obavijest'),75,y+42);y=385}
      ctx.fillStyle='#272117';ctx.font='28px Georgia';
      chunks[index].forEach(line=>{if(line.gap){y+=22}else{ctx.fillText(line.text,75,y);y+=43}});
      if(index===total-1){y=Math.max(y+70,1320);ctx.fillStyle='#5f5648';ctx.font='24px Georgia';ctx.fillText(en?'Sincerely,':'S poštovanjem,',790,y);ctx.fillStyle='#17130c';ctx.font='600 29px Georgia';ctx.fillText(text(data.signatoryName)||'Nermin Sefić',790,y+82);ctx.fillStyle='#6f6658';ctx.font='19px Arial';ctx.fillText(text(data.signatoryTitle)||'Authorized Representative',790,y+116)}
      drawFooter(ctx,brand);canvases.push(canvas);
    }
    $('pageCount').textContent=`${total} ${total===1?(en?'page':'stranica'):(en?'pages':'stranice')}`;
    return canvases;
  }
  const encode=value=>new TextEncoder().encode(value);
  function concatBytes(chunks){const size=chunks.reduce((sum,item)=>sum+item.length,0),out=new Uint8Array(size);let offset=0;chunks.forEach(item=>{out.set(item,offset);offset+=item.length});return out}
  async function canvasJpeg(canvas){return new Promise((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(new Error('PDF stranica nije generirana.')),'image/jpeg',.88))}
  async function buildPdf(canvases){
    const images=await Promise.all(canvases.map(canvasJpeg));const objects=[];const pageNumbers=[];
    canvases.forEach((_,index)=>pageNumbers.push(3+index*3));
    objects[1]=encode('<< /Type /Catalog /Pages 2 0 R >>');objects[2]=encode(`<< /Type /Pages /Kids [${pageNumbers.map(n=>`${n} 0 R`).join(' ')}] /Count ${canvases.length} >>`);
    canvases.forEach((canvas,index)=>{const page=3+index*3,image=page+1,content=page+2,jpeg=images[index],commands='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';objects[page]=encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);objects[image]=concatBytes([encode(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,encode('\nendstream')]);objects[content]=encode(`<< /Length ${encode(commands).length} >>\nstream\n${commands}endstream`) });
    const parts=[encode('%PDF-1.4\n% GNK ASG Memorandum Studio\n')],offsets=[0];let cursor=parts[0].length;for(let n=1;n<objects.length;n+=1){offsets[n]=cursor;const object=concatBytes([encode(`${n} 0 obj\n`),objects[n],encode('\nendobj\n')]);parts.push(object);cursor+=object.length}
    const xrefOffset=cursor;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let n=1;n<objects.length;n+=1)xref+=`${String(offsets[n]).padStart(10,'0')} 00000 n \n`;xref+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;parts.push(encode(xref));return new Blob(parts,{type:'application/pdf'})
  }
  function safeFilename(value){return String(value||'memorandum').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,90)||'memorandum'}
  async function ensurePdf(){
    const signature=bodySignature();if(state.pdfBlob&&state.pdfSignature===signature)return state.pdfBlob;
    showToast('Generiranje PDF dokumenta…');const canvases=await renderCanvases();const blob=await buildPdf(canvases);const data=snapshot(),brand=data.brand==='dinamo'?'GNK_DINAMO_Ltd':'GNK_ASG';state.pdfFileName=`${brand}_${safeFilename(data.documentSubject)}_${data.documentDate||today()}.pdf`;state.pdfBlob=blob;state.pdfSignature=signature;return blob;
  }
  async function downloadPdf(){
    try{const blob=await ensurePdf(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=state.pdfFileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);showToast('PDF dokument je preuzet.')}catch(error){setResult(`PDF nije generiran: ${error.message}`,'bad')}
  }
  function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error||new Error('PDF nije pročitan.'));reader.readAsDataURL(blob)})}
  async function sharePdf(){
    try{const blob=await ensurePdf(),file=new File([blob],state.pdfFileName,{type:'application/pdf'});if(navigator.canShare?.({files:[file]})){await navigator.share({title:value('documentSubject')||'GNK ASG dokument',text:'Službeni dokument u PDF formatu.',files:[file]});showToast('PDF je predan odabranoj aplikaciji.')}else{await downloadPdf();setResult('PDF je preuzet. Na ovom uređaju dijeljenje datoteke nije podržano; dodajte preuzeti PDF kao privitak.')} }catch(error){if(error.name!=='AbortError')setResult(`Dijeljenje nije uspjelo: ${error.message}`,'bad')}
  }
  async function sendPdf(){
    const to=text(value('mailTo')),subject=text(value('mailSubject'));if(!to){setResult('Upišite e-mail primatelja.','bad');$('mailTo').focus();return}if(!subject){setResult('Upišite predmet e-maila.','bad');$('mailSubject').focus();return}
    const button=$('sendPdf');button.disabled=true;setResult('Generiranje i sigurno slanje PDF privitka…');
    try{const blob=await ensurePdf();if(blob.size>3200000)throw new Error('PDF prelazi dopuštenu veličinu od 3,2 MB. Skratite dokument.');const base64=await blobToBase64(blob),message=text(value('mailMessage'))||'U privitku dostavljamo službeni dokument.';const response=await fetch('/api/admin-mail-send',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({confirm:'SEND_MAIL',profile:value('mailProfile')||'office',to,cc:text(value('mailCc')),subject,text:message,html:`<p>${escapeHtml(message).replace(/\n/g,'<br>')}</p>`,attachments:[{filename:state.pdfFileName,type:'application/pdf',base64}]})});const raw=await response.text();let payload;try{payload=JSON.parse(raw)}catch{payload={message:raw}}if(!response.ok||payload.ok===false)throw new Error(payload.message||payload.error||`HTTP ${response.status}`);setResult(`PDF je poslan. Evidencijski broj: ${payload.id||payload.messageId||'zabilježen u Mail Studio evidenciji'}.`,'ok');showToast('Memorandum je poslan kao PDF privitak.')}catch(error){setResult(`Slanje nije uspjelo: ${error.message}`,'bad')}finally{button.disabled=false}
  }
  async function checkAuth(){
    const chip=$('authState');try{const response=await fetch(`/api/operator-auth-check?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);chip.textContent='Sigurna sesija aktivna';chip.classList.add('ok');$('lockPanel').hidden=true;$('studioWorkspace').hidden=false}catch(_){chip.textContent='Prijava je potrebna';chip.classList.add('bad');$('lockPanel').hidden=false;$('studioWorkspace').hidden=true}
  }
  function bind(){
    document.querySelectorAll('input[name="brand"]').forEach(radio=>radio.addEventListener('change',()=>{refreshBrandChoice();updatePreview()}));
    FIELD_IDS.forEach(id=>$(id)?.addEventListener(id==='language'||id==='documentDate'?'change':'input',()=>{if(id==='documentSubject'&&(!value('mailSubject')||value('mailSubject').startsWith('Službeni dokument'))) $('mailSubject').value=`Službeni dokument: ${value('documentSubject')}`;updatePreview()}));
    $('newDocument').addEventListener('click',newDocument);$('saveDraft').addEventListener('click',saveDraft);$('downloadPdf').addEventListener('click',downloadPdf);$('sharePdf').addEventListener('click',sharePdf);$('sendPdf').addEventListener('click',sendPdf);$('zoomOut').addEventListener('click',()=>setZoom(state.zoom-.06));$('zoomIn').addEventListener('click',()=>setZoom(state.zoom+.06));
  }
  function boot(){
    $('documentDate').value=today();bind();loadDraft();refreshBrandChoice();updatePreview();setZoom(innerWidth<760?.49:innerWidth<1280?.68:.82);checkAuth();
  }
  boot();
})();
