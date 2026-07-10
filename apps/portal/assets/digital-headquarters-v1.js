(()=>{
  'use strict';
  const button=document.querySelector('[data-dhq-menu-button]');
  const links=document.querySelector('[data-dhq-links]');
  if(button&&links){button.addEventListener('click',()=>{const open=links.classList.toggle('is-open');button.setAttribute('aria-expanded',String(open));});}
  document.querySelectorAll('[data-countdown]').forEach(node=>{
    const target=new Date(node.getAttribute('data-countdown'));
    const active=node.getAttribute('data-active-text')||'THE CODE activated';
    const tick=()=>{const diff=target-Date.now();if(diff<=0){node.textContent=active;return;}const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000);node.textContent=`${d}d ${h}h ${m}m · New York 11:30 ET`;};
    tick();setInterval(tick,60000);
  });
  const authLinks=[...document.querySelectorAll('[data-auth-only]')];
  if(authLinks.length){fetch('/api/operator-auth-check',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(r.ok)authLinks.forEach(el=>el.hidden=false);}).catch(()=>{});}
})();
