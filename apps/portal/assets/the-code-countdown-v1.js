(()=>{
  const TARGET=Date.parse('2026-10-07T11:30:00-04:00');
  const PREFIX='THE CODE · NEW YORK · 7 OCTOBER 2026 · CODE ACTIVATION AT 11:30 AM ET';
  const SUFFIX='GNK ASG / GNK DINAMO LTD. GROUP';
  const pad=value=>String(value).padStart(2,'0');
  const render=()=>{
    const node=document.querySelector('#gnk-event-bar .gnk-event-message');
    if(!node)return false;
    const remaining=Math.max(0,TARGET-Date.now());
    if(remaining<=0){
      node.textContent=`${PREFIX} · CODE ACTIVATED · ${SUFFIX}`;
      node.setAttribute('aria-label','THE CODE activated in New York on 7 October 2026 at 11:30 AM Eastern Time');
      return true;
    }
    const totalSeconds=Math.floor(remaining/1000);
    const days=Math.floor(totalSeconds/86400);
    const hours=Math.floor((totalSeconds%86400)/3600);
    const minutes=Math.floor((totalSeconds%3600)/60);
    const seconds=totalSeconds%60;
    node.textContent=`${PREFIX} · COUNTDOWN ${days} DAYS ${pad(hours)} HOURS ${pad(minutes)} MINUTES ${pad(seconds)} SECONDS · ${SUFFIX}`;
    node.setAttribute('aria-label',`THE CODE activation countdown: ${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`);
    return true;
  };
  const start=()=>{
    if(!render()){
      let attempts=0;
      const wait=setInterval(()=>{attempts+=1;if(render()||attempts>=40)clearInterval(wait);},100);
    }
    setInterval(render,1000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();