(()=>{
  const apply=()=>{
    if(document.getElementById('gnk-compact-menu-polish-v1'))return;
    const style=document.createElement('style');
    style.id='gnk-compact-menu-polish-v1';
    style.textContent=`
      :root{--gnk-compact-strip-height:32px!important}
      #gnk-compact-strip{height:32px!important;box-shadow:0 3px 10px rgba(0,0,0,.28)!important}
      #gnk-compact-strip .gnk-strip-track{right:202px!important}
      #gnk-compact-strip .gnk-strip-message{font-size:8px!important;letter-spacing:.08em!important}
      #gnk-compact-menu{right:5px!important;top:2px!important}
      #gnk-compact-menu .gnk-compact-actions{gap:2px!important;padding:1px!important;border-radius:18px!important}
      #gnk-compact-menu a,#gnk-compact-menu button{height:24px!important;min-width:29px!important;padding:0 6px!important;font-size:7px!important}
      #gnk-compact-menu .gnk-lang{height:24px!important;padding:0 1px!important}
      #gnk-compact-menu .gnk-lang a{height:18px!important;min-width:18px!important;padding:0 2px!important;font-size:7px!important}
      #gnk-compact-menu nav{top:30px!important}
      @media(max-width:700px){
        :root{--gnk-compact-strip-height:30px!important}
        #gnk-compact-strip{height:30px!important}
        #gnk-compact-strip .gnk-strip-track{right:188px!important}
        #gnk-compact-menu a,#gnk-compact-menu button{height:22px!important;min-width:27px!important;padding:0 5px!important}
        #gnk-compact-menu .gnk-lang{height:22px!important}
        #gnk-compact-menu .gnk-lang a{height:17px!important;min-width:17px!important}
        #gnk-compact-menu nav{top:28px!important}
      }
    `;
    document.head.appendChild(style);
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply,{once:true}):apply();
})();
