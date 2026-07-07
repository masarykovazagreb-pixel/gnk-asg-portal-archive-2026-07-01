(()=>{
  'use strict';
  if(window.__GNK_ASG_SAFE_ATTACHMENTS_V1__)return;
  window.__GNK_ASG_SAFE_ATTACHMENTS_V1__=true;

  const VERSION='GNK_ASG_SAFE_ATTACHMENTS_V1_20260707';
  const MAX_FILES=8;
  const MAX_BYTES=3200000;
  const EXT=['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','csv','txt','png','jpg','jpeg','webp'];
  const MIME={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip',csv:'text/csv',txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  const state={items:[]};
  const $=id=>document.getElementById(id);
  const clean=value=>String(value||'').trim();
  const extOf=name=>(String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1]||'';
  const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const status=text=>{const node=$('status');if(node)node.textContent=text;};
  const fileToBase64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',').pop()||'');reader.onerror=()=>reject(reader.error||new Error('Unable to read file'));reader.readAsDataURL(file);});
  function render(){
    const node=$('attachmentList');
    if(!node)return;
    if(!state.items.length){node.textContent=`No attachments selected. Allowed: ${EXT.join(', ')}.`;return;}
    node.innerHTML=state.items.map((item,index)=>`<div>${index+1}. ${esc(item.filename)} · ${esc(item.ext.toUpperCase())} · ${(item.sizeBytes/1024).toFixed(1)} KB</div>`).join('');
  }
  async function readFiles(files){
    const selected=[...(files||[])];
    if(!selected.length)return;
    if(state.items.length+selected.length>MAX_FILES){status(`Maximum ${MAX_FILES} attachments.`);return;}
    for(const file of selected){
      const ext=extOf(file.name);
      if(!EXT.includes(ext)){status(`${file.name} is not an allowed attachment type.`);continue;}
      if(file.size>MAX_BYTES){status(`${file.name} exceeds the attachment limit.`);continue;}
      const base64=await fileToBase64(file);
      state.items.push({filename:file.name,ext,type:file.type||MIME[ext]||'application/octet-stream',sizeBytes:file.size,base64});
    }
    window.GNK_ASG_MAIL_ATTACHMENTS=state.items.slice();
    window.GNK_ASG_PDF_ATTACHMENTS_FINAL=state.items.slice();
    render();
    status(`${state.items.length} attachment(s) ready.`);
  }
  function patchUi(){
    const button=$('pdfFileButton');
    if(button)button.textContent='Add attachments';
    const input=$('pdfFiles');
    if(input){
      input.accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt,.png,.jpg,.jpeg,.webp,application/pdf,application/zip,text/plain,text/csv,image/png,image/jpeg,image/webp';
      input.addEventListener('change',event=>readFiles(event.target.files).catch(error=>status(`Attachment error: ${error.message}`)),true);
    }
    const clear=$('clearAttachments');
    if(clear)clear.addEventListener('click',()=>{state.items=[];window.GNK_ASG_MAIL_ATTACHMENTS=[];window.GNK_ASG_PDF_ATTACHMENTS_FINAL=[];render();},true);
    render();
  }
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init={})=>{
    const url=typeof input==='string'?input:String(input?.url||'');
    if(url.includes('/api/studio-message/send')||url.includes('/api/admin-mail-send')){
      try{
        const body=typeof init.body==='string'?JSON.parse(init.body):null;
        if(body&&state.items.length){
          body.attachments=state.items.map(item=>({filename:item.filename,type:item.type,base64:item.base64,sizeBytes:item.sizeBytes}));
          body.attachmentCount=body.attachments.length;
          init={...init,body:JSON.stringify(body)};
        }
      }catch(_){ }
    }
    return nativeFetch(input,init);
  };
  const boot=()=>{patchUi();document.documentElement.dataset.gnkSafeAttachments=VERSION;};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
