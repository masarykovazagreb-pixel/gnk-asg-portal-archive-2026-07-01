(() => {
  'use strict';
  const en=new URLSearchParams(location.search).get('lang')==='en'||(document.documentElement.lang||'').startsWith('en');
  let installPrompt=null;
  const button=document.getElementById('radioInstallBtn');
  const help=document.getElementById('radioInstallHelp');

  function setHelp(){
    if(!help)return;
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches;
    if(standalone){
      help.textContent=en?'AKTUAL MEDIA RADIO is running as an installed app.':'AKTUAL MEDIA RADIO radi kao instalirana aplikacija.';
      if(button)button.hidden=true;
      return;
    }
    help.textContent=en
      ?'Chrome/Edge: use Install when offered. Safari on macOS: File → Add to Dock. Other browsers may offer a shortcut instead.'
      :'Chrome/Edge: koristite Instaliraj kada je ponuđeno. Safari na macOS-u: File → Add to Dock. Drugi preglednici mogu ponuditi prečac.';
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installPrompt=event;
    if(button)button.hidden=false;
  });
  window.addEventListener('appinstalled',()=>{installPrompt=null;if(button)button.hidden=true;setHelp()});

  button?.addEventListener('click',async()=>{
    if(installPrompt){
      await installPrompt.prompt();
      installPrompt=null;
      button.hidden=true;
      setHelp();
      return;
    }
    setHelp();
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/radio/radio-sw.js',{scope:'/radio/'}).catch(()=>{}),{once:true});
  }
  setHelp();
})();