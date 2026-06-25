(()=>{
const state=window.GNKMediaTripState=window.GNKMediaTripState||{delegateCount:1,documents:[]};
const q=id=>document.getElementById(id),v=id=>String(q(id)?.value||'').trim();
const human=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(t,k=''){window.GNKMediaTripDelegates?.status(t,k)}
function base64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',').pop());r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
function render(){const box=q('documentList');if(!box)return;if(!state.documents.length){box.innerHTML='<div class="document-row">Dokumenti još nisu odabrani.</div>';return}box.innerHTML=state.documents.map((d,i)=>`<div class="document-row"><b>${esc(d.filename)}</b><br><span>${esc(d.category)} · ${human(d.size)}</span> <button type="button" data-remove-doc="${i}">Ukloni</button></div>`).join('')+`<div class="document-row"><b>Ukupno:</b> ${human(state.documents.reduce((s,d)=>s+d.size,0))}</div>`;}
async function add(files){let total=state.documents.reduce((s,d)=>s+d.size,0);for(const file of [...files]){if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){status('Preskočena datoteka: '+file.name,'bad');continue}if(total+file.size>18000000){status('Dokumenti prelaze limit od 18 MB.','bad');break}state.documents.push({category:v('documentCategory')||'other',filename:file.name,mimeType:file.type,size:file.size,base64:await base64(file)});total+=file.size}render();status('Dokumenti su pripremljeni: '+state.documents.length,state.documents.length?'ok':'');}
function bind(){q('documentFiles').addEventListener('change',async e=>{await add(e.target.files);e.target.value=''});q('documentList').addEventListener('click',e=>{const b=e.target.closest('[data-remove-doc]');if(!b)return;state.documents.splice(Number(b.dataset.removeDoc),1);render();});render();}
window.GNKMediaTripDocuments={bind};
})();
