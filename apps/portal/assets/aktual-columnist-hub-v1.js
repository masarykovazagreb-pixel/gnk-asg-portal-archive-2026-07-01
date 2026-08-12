(()=>{
'use strict';
const cleanPath=(location.pathname||'/').replace(/\/+$/,'')||'/';
if(cleanPath!=='/gnk-aktual'&&cleanPath!=='/en/gnk-aktual')return;
const english=cleanPath.startsWith('/en/');
const archiveUrl=english?'/en/gnk-aktual/columns/':'/gnk-aktual/kolumne/';
const title=english?'Nermin Sefić — columnist':'Nermin Sefić — kolumnist';
const eyebrow=english?'Columnist · archive':'Kolumnist · arhiva';
const description=english?'Open the complete archive of columns by Nermin Sefić. Every column retains its own image, date, canonical URL and article metadata.':'Otvorite cjelovitu arhivu kolumni Nermina Sefića. Svaka kolumna zadržava vlastitu sliku, datum, canonical URL i zasebne SEO metapodatke.';
const cta=english?'Open all columns →':'Otvori sve kolumne →';
const commentaryUrl=english?'/en/commentary/':'/komentari/';
const commentaryTitle=english?'Commentary':'Komentari';
const commentaryEyebrow=english?'Commentary · archive':'Komentari · arhiva';
const commentaryDescription=english?'Open all GNK ASG commentary in one place. The complete commentary archive stays behind this single AKTUAL entry.':'Otvorite sve komentare GNK ASG na jednom mjestu. Cjelovita arhiva komentara ostaje iza ovog jednog AKTUAL ulaza.';
const commentaryCta=english?'Open all commentary →':'Otvori sve komentare →';

function ensureHubStyles(){
  if(!english||document.getElementById('ak-shared-hub-styles'))return;
  const style=document.createElement('style');
  style.id='ak-shared-hub-styles';
  style.textContent='.ak-kolumna{display:none;border:3px solid var(--ak-line);border-radius:4px;margin-bottom:36px;background:var(--ak-panel)}.ak-kolumna.vidljivo{display:grid;grid-template-columns:170px 1fr}.ak-kolumna-autor{background:var(--ak-line);color:var(--ak-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}.ak-kolumna-autor .krug{width:56px;height:56px;border-radius:50%;border:2px solid var(--ak-zlato);display:flex;align-items:center;justify-content:center;font-family:Arial Black,sans-serif;font-size:19px;color:var(--ak-zlato);margin-bottom:8px}.ak-kolumna-autor b{font-family:Arial Black,sans-serif;font-size:.82rem}.ak-kolumna-autor span{font-family:Arial,sans-serif;font-size:.62rem;color:#b8b0a0;margin-top:3px;text-transform:uppercase;letter-spacing:.07em}.ak-kolumna-tijelo{padding:22px 26px}.ak-kolumna-tijelo .oznaka{font-family:Arial,sans-serif;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ak-red);margin-bottom:8px;display:block}.ak-kolumna-tijelo h2{font-family:Arial Black,Impact,sans-serif;font-size:clamp(1.2rem,2.6vw,1.7rem);line-height:1.15;margin:0 0 10px}.ak-kolumna-tijelo p{font-size:1.08rem;line-height:1.65;color:var(--ak-text);margin:0 0 12px}.ak-kolumna-tijelo a{font-family:Arial,sans-serif;font-size:.74rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ak-red);text-decoration:none;border-bottom:2px solid var(--ak-red);padding-bottom:1px}@media(max-width:640px){.ak-kolumna.vidljivo{grid-template-columns:1fr}}';
  document.head.appendChild(style);
}

function hideLegacyGrid(){
  // #akKomentari is intentionally converted into a single hub card below.
}

function renderHub(image,count){
  const card=document.getElementById('akKolumna');
  const author=card&&card.querySelector('.ak-kolumna-autor');
  const body=document.getElementById('akKolumnaTijelo');
  if(!card||!author||!body)return;
  const safeImage=image||'/assets/editorial/aktual-media-800.webp';
  author.innerHTML='<img src="'+safeImage.replace(/"/g,'&quot;')+'" alt="Nermin Sefić" loading="lazy" style="width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid var(--ak-zlato);margin-bottom:10px" onerror="this.src=\'/assets/editorial/aktual-media-800.webp\'"><b>Nermin Sefić</b><span>'+(english?'Columnist, GNK ASG':'Kolumnist, GNK ASG')+'</span>';
  body.innerHTML='<span class="oznaka">'+eyebrow+'</span><h2>'+title+'</h2><p>'+description+'</p><a href="'+archiveUrl+'">'+cta+'</a>';
  card.classList.add('vidljivo');
}

function renderCommentaryHub(){
  const card=document.getElementById('akKomentari');
  if(!card||card.dataset.commentaryHub==='1')return;
  card.dataset.commentaryHub='1';
  card.className='ak-kolumna vidljivo';
  card.innerHTML='<div class="ak-kolumna-autor"><div class="krug">KO</div><b>'+commentaryTitle+'</b><span>'+(english?'GNK ASG editorial':'GNK ASG uredništvo')+'</span></div><div class="ak-kolumna-tijelo"><span class="oznaka">'+commentaryEyebrow+'</span><h2>'+commentaryTitle+'</h2><p>'+commentaryDescription+'</p><a href="'+commentaryUrl+'">'+commentaryCta+'</a></div>';
}

function removeColumnsFromNews(root){
  const scope=root||document;
  scope.querySelectorAll('a[href*="/gnk-aktual/kolumne/"],a[href*="/en/gnk-aktual/columns/"]').forEach(link=>{
    if(link.closest('#akKolumna'))return;
    const row=link.closest('li,article,.ak-featured');
    if(row)row.remove();
  });
}

function boot(){
  ensureHubStyles();
  hideLegacyGrid();
  renderCommentaryHub();
  fetch('/data/kolumne.json?v='+Date.now(),{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      const items=data&&(Array.isArray(data)?data:data.items)||[];
      const first=items.find(item=>item&&item.naslov);
      renderHub(first&&first.slika,items.length);
    })
    .catch(()=>renderHub(null,0));
  removeColumnsFromNews(document);
  new MutationObserver(()=>{
    hideLegacyGrid();
    renderCommentaryHub();
    removeColumnsFromNews(document);
  }).observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
