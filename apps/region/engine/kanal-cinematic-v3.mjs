/* Regional AKTUAL cinematic enhancement. Generator-owned; no remote assets. */
export const CINEMATIC_CSS = `
:root{--cinematic-ink:#0a111e;--cinematic-gold:#ebc781}
.top{position:relative;box-shadow:0 9px 35px rgba(4,13,28,.18)}
.intro--hero{min-height:430px;border-radius:0 0 20px 20px!important;box-shadow:0 28px 56px -27px rgba(5,10,24,.52)}
.intro--hero::after{background:linear-gradient(95deg,rgba(6,13,27,.94) 5%,rgba(10,19,32,.76) 53%,rgba(10,18,31,.24) 100%),radial-gradient(ellipse at 88% 12%,rgba(196,65,55,.35),transparent 44%)!important}
.intro--hero .intro-main,.intro--hero .intro-side{padding:clamp(18px,2.4vw,30px);background:rgba(7,15,29,.49);border:1px solid rgba(255,255,255,.17);border-radius:17px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 22px 55px rgba(0,0,0,.22)}
.intro--hero .intro-main h1{font-size:clamp(2.2rem,5vw,4.8rem);line-height:1.05;letter-spacing:-.045em}
.card{overflow:hidden;border-radius:14px!important;box-shadow:0 15px 38px -24px rgba(13,21,37,.3)!important}
.cardmedia img{width:100%;object-fit:cover;transition:transform .45s ease}
.card:hover .cardmedia img{transform:scale(1.035)}
.article .osvrt p:first-of-type::first-letter{float:left;font:700 3.35em/.86 Georgia,serif;padding:.08em .12em 0 0;color:#a17a2e}
.region-fresh{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:50px;background:rgba(7,15,29,.72);color:#fff;border:1px solid rgba(255,255,255,.25);font:700 12px/1.4 system-ui,sans-serif}
.region-fresh:before{content:"";height:9px;width:9px;border-radius:50%;background:#8290a3}
.region-fresh[data-state="fresh"]:before{background:#31c778}
.region-fresh[data-state="aging"]:before{background:#ffcc54}
.region-fresh[data-state="stale"]:before{background:#ff6471}
.region-clock{display:inline-flex;padding:6px 11px;border:1px solid rgba(255,255,255,.28);border-radius:30px;color:#fff;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap}
.region-read-progress{position:fixed;top:0;left:0;height:4px;width:0;z-index:150;background:linear-gradient(90deg,#bb3845,#e7b969,#fff2c5);pointer-events:none}
.region-share{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:18px 0 26px;padding:12px 14px;background:#f5f0e6;border:1px solid #d9cbb0;border-radius:12px;font:700 12px/1.5 system-ui,sans-serif}
.region-share a,.region-share button{color:#182336;background:#fff;border:1px solid #c6bbab;border-radius:7px;padding:7px 11px;font:inherit;cursor:pointer;text-decoration:none}
.region-share .region-hashtags{color:#8b3b32}
@media(max-width:720px){.intro--hero{min-height:360px}.intro--hero .intro-main,.intro--hero .intro-side{padding:18px;backdrop-filter:none;background:rgba(7,15,29,.77)}.region-clock{font-size:11px}}
@media(prefers-reduced-motion:reduce){.cardmedia img{transition:none}.card:hover .cardmedia img{transform:none}}
@media(forced-colors:active){.region-fresh,.region-share,.intro--hero .intro-main{border:1px solid CanvasText}}
`;
export const CINEMATIC_JS = `(function(){
'use strict';
var clock=document.querySelector('[data-region-clock]');
function tick(){if(!clock)return;try{clock.textContent=new Intl.DateTimeFormat(document.documentElement.lang||'hr',{timeZone:clock.dataset.regionClock||'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}catch(e){clock.textContent='--:--'}}
function fresh(){document.querySelectorAll('[data-region-fresh]').forEach(function(el){var ms=Date.parse(el.dataset.regionFresh||'');var age=Date.now()-ms;var status='unknown';if(Number.isFinite(ms)&&age>=0)status=age<=86400000?'fresh':age<=259200000?'aging':'stale';el.dataset.state=status;el.textContent=status==='fresh'?'● < 24 h':status==='aging'?'● 24–72 h':status==='stale'?'● > 72 h':'● Nema potvrde vremena';el.title='Starost najnovijih podataka; ne potvrđuje da izvor ili izdavački agent radi';});}}
var bar=document.querySelector('.region-read-progress'),article=document.querySelector('main.article .osvrt');function progress(){if(!bar||!article)return;var rect=article.getBoundingClientRect(),distance=Math.max(1,article.offsetHeight-innerHeight*.5);bar.style.width=Math.max(0,Math.min(100,(-rect.top+innerHeight*.3)/distance*100))+'%'}
document.querySelectorAll('[data-region-copy]').forEach(function(b){b.addEventListener('click',function(){var value=b.dataset.regionCopy||location.href;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).then(function(){b.textContent='✓'}).catch(function(){b.textContent='Kopirajte iz adresne trake'})})});
tick();fresh();progress();setInterval(tick,60000);setInterval(fresh,300000);addEventListener('scroll',progress,{passive:true});addEventListener('resize',progress);
})();`;
