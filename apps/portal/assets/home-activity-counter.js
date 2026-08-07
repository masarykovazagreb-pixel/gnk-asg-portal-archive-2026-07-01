(function(){
  var HOUR_MS=3600000;
  var ZAGREB_HOUR_FORMATTER=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',hour12:false});
  var NUMBER_FORMATTERS={hr:new Intl.NumberFormat('hr-HR'),en:new Intl.NumberFormat('en-US')};
  var cachedHours=-1;
  var cachedTotal=6792;
  function isHome(){var p=location.pathname.replace(/\/+$/,'/');return p==='/'||p==='/index.html'||p==='/en/'||p==='/en/index.html';}
  function purgeIfNotHome(){if(isHome())return false;var el=document.getElementById('readerCounter');if(el)el.remove();document.querySelectorAll('.reader-counter').forEach(function(n){n.remove();});return true;}
  if(purgeIfNotHome()){new MutationObserver(purgeIfNotHome).observe(document.body,{childList:true,subtree:true});return;}
  function isEnglish(){return /\/en\/?$/.test(location.pathname)||/\/en\//.test(location.pathname)||(window.GNK_LANG&&window.GNK_LANG.get&&window.GNK_LANG.get()==='en');}
  function growth(hour,index){if(hour>=0&&hour<7)return index%2===0?6:5;if(hour>=7&&hour<9)return 48;if(hour>=9&&hour<14)return 27;if(hour>=14&&hour<17)return 19;if(hour>=17&&hour<19)return 22;if(hour>=19&&hour<23)return 31;return 6;}
  function fullHourTotal(baseTime,hours){if(hours===cachedHours)return cachedTotal;var total=(cachedHours>=0&&hours>cachedHours)?cachedTotal:6792;var start=(cachedHours>=0&&hours>cachedHours)?cachedHours+1:1;for(var i=start;i<=hours;i++){var h=Number(ZAGREB_HOUR_FORMATTER.format(new Date(baseTime+i*HOUR_MS)));total+=growth(h,i);}cachedHours=hours;cachedTotal=total;return total;}
  function value(){var base=6792;var baseTime=Date.parse('2026-05-31T15:22:00+02:00');var now=Date.now();if(!baseTime||now<=baseTime)return base;var elapsed=now-baseTime;var hours=Math.floor(elapsed/HOUR_MS);return fullHourTotal(baseTime,hours)+Math.floor(((elapsed%HOUR_MS)/HOUR_MS)*3);}
  function update(){var el=document.getElementById('readerCounterValue');if(!el)return;el.textContent=(isEnglish()?NUMBER_FORMATTERS.en:NUMBER_FORMATTERS.hr).format(value());}
  function ensure(){if(!isHome())return;if(document.getElementById('readerCounter')){update();return;}var anchor=document.querySelector('.profile-board .quick-data')||document.querySelector('.hero .hero-actions')||document.querySelector('.hero .container');if(!anchor)return;var en=isEnglish();var box=document.createElement('div');box.className='reader-counter';box.id='readerCounter';box.innerHTML='<div class="reader-icon">◎</div><div><small>'+(en?'Public activity model':'Indikativni javni model aktivnosti')+'</small><strong id="readerCounterValue">—</strong><span>'+(en?'Indicative public activity model; not measured analytics.':'Indikativni javni model aktivnosti; nije mjerena analitika.')+'</span></div>';anchor.insertAdjacentElement(anchor.classList&&anchor.classList.contains('quick-data')?'afterend':'beforeend',box);update();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
  window.addEventListener('gnk-language-change',function(){var c=document.getElementById('readerCounter');if(c)c.remove();ensure();});
  setInterval(update,60000);
})();
