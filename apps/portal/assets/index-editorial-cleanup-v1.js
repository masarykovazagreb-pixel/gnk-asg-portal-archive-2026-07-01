(()=>{
'use strict';
if(window.__GNK_INDEX_EDITORIAL_CLEANUP_V1__)return;window.__GNK_INDEX_EDITORIAL_CLEANUP_V1__=true;

function parseLocalizedTimestamp(value){
  const match=String(value||'').match(/(\d{1,2})[.\/]\s*(\d{1,2})[.\/]\s*(\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(!match)return null;
  const [,day,month,year,hour='0',minute='0',second='0']=match;
  const timestamp=new Date(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute),Number(second)).getTime();
  return Number.isFinite(timestamp)?timestamp:null;
}

function hideStaleCrossAssetMonitor(){
  document.querySelectorAll('.macro-dashboard').forEach(panel=>{
    const timestampNode=panel.querySelector('time,[datetime],.timestamp,.updated-at,p,small,span');
    const source=timestampNode?.getAttribute?.('datetime')||timestampNode?.textContent||panel.textContent||'';
    const timestamp=parseLocalizedTimestamp(source);
    if(timestamp!==null&&Date.now()-timestamp>24*60*60*1000){
      panel.remove();
      document.documentElement.dataset.gnkStaleCrossAsset='removed';
    }
  });
}

let attempts=0;
const run=()=>{
  const current=document.getElementById('gnk-index-editorial-v6');
  const legacy=document.querySelector('#gnk-index-zone .gnk-index-panel');
  if(current&&legacy){
    legacy.remove();
    document.documentElement.dataset.gnkLegacyEditorial='removed';
  }
  hideStaleCrossAssetMonitor();
  if(++attempts<30)setTimeout(run,200);
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
