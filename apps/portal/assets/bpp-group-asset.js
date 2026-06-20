(() => {
  'use strict';
  if (window.GNK_BPP_GROUP_ASSET_READY) return;
  window.GNK_BPP_GROUP_ASSET_READY = true;

  const isEnglish = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');

  function installStyle() {
    if (document.getElementById('gnk-bpp-group-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-bpp-group-style';
    style.textContent = [
      '.bpp-group-asset{margin-top:13px;padding:16px 15px 15px;border:1px solid rgba(212,175,55,.27);border-radius:16px;background:linear-gradient(143deg,rgba(7,22,45,.97),rgba(14,42,74,.96));color:#dbe5f1}',
      '.bpp-group-asset .bpp-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}',
      '.bpp-group-asset .bpp-tag{color:#dfbd58;font-size:.57rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}',
      '.bpp-group-asset .bpp-status{display:inline-flex;align-items:center;gap:5px;color:#aebed1;font-size:.55rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}',
      '.bpp-group-asset .bpp-status:before{content:"";width:5px;height:5px;border-radius:50%;background:#d4af37}',
      '.bpp-group-asset h3{margin:0 0 7px;color:#fff;font-size:.98rem;line-height:1.25}',
      '.bpp-group-asset .bpp-owner{margin:0 0 10px;color:#e4c159;font-size:.67rem;font-weight:800;line-height:1.42}',
      '.bpp-group-asset .bpp-summary{margin:0 0 11px;color:#adbecf;font-size:.71rem;line-height:1.54}',
      '.bpp-group-asset .bpp-scope{margin:0 0 12px;padding:10px 10px;border-radius:10px;background:rgba(255,255,255,.045);border:1px solid rgba(169,188,211,.15);color:#ced9e5;font-size:.66rem;line-height:1.52}',
      '.bpp-group-asset .bpp-scope strong{color:#fff}',
      '.bpp-group-asset a{display:inline-flex;align-items:center;gap:7px;color:#e3c05d;text-decoration:none;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.bpp-group-asset a:hover{color:#f4d77f}',
      '.bpp-group-asset a:after{content:"↗";font-size:.7rem}',
      '@media(max-width:980px){.bpp-group-asset{margin-top:12px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function markup() {
    if (isEnglish()) return '<article class="bpp-group-asset" aria-label="Bitcoin Payment Processor"><div class="bpp-top"><span class="bpp-tag">Digital infrastructure</span><span class="bpp-status">Group asset</span></div><h3>Bitcoin Payment Processor</h3><p class="bpp-owner">GNK DINAMO Ltd. group business framework</p><p class="bpp-summary">Digital asset payment infrastructure with API integration, real-time notifications and merchant dashboard capabilities.</p><p class="bpp-scope"><strong>Role clarification:</strong> The software solution was developed by GNK ASG d.o.o. for the GNK DINAMO Ltd. group framework. GNK ASG d.o.o. does not operate the system, does not execute transactions through it, and Bitcoin Payment Processor is not part of its operational business.</p><a href="https://bpp.is/" target="_blank" rel="noopener">Open bpp.is</a></article>';
    return '<article class="bpp-group-asset" aria-label="Bitcoin Payment Processor"><div class="bpp-top"><span class="bpp-tag">Digitalna infrastruktura</span><span class="bpp-status">Imovina grupacije</span></div><h3>Bitcoin Payment Processor</h3><p class="bpp-owner">Poslovni okvir GNK DINAMO Ltd. grupacije</p><p class="bpp-summary">Infrastruktura za plaćanje digitalnom imovinom s API integracijom, obavijestima u stvarnom vremenu i funkcionalnostima merchant dashboarda.</p><p class="bpp-scope"><strong>Razgraničenje uloge:</strong> Programsko rješenje Bitcoin Payment Processor izradio je GNK ASG d.o.o. za poslovni okvir GNK DINAMO Ltd. grupacije. GNK ASG d.o.o. ne upravlja sustavom, ne provodi transakcije putem sustava i Bitcoin Payment Processor nije dio njegova operativnog poslovanja.</p><a href="https://bpp.is/" target="_blank" rel="noopener">Otvori bpp.is</a></article>';
  }

  function mount() {
    installStyle();
    const sidebar = document.querySelector('#global-network .network-sidebar, #global-network .network-information-panel, .network-sidebar.network-information-panel');
    if (!sidebar) return false;
    const old = sidebar.querySelector('.bpp-group-asset');
    if (old) old.remove();
    sidebar.insertAdjacentHTML('beforeend', markup());
    return true;
  }

  function init() {
    mount();
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (mount() || ++attempts > 80) window.clearInterval(timer);
    }, 150);
    const observer = new MutationObserver(() => {
      const sidebar = document.querySelector('#global-network .network-sidebar, #global-network .network-information-panel, .network-sidebar.network-information-panel');
      if (sidebar && !sidebar.querySelector('.bpp-group-asset')) mount();
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  window.addEventListener('gnk-language-change', mount);
})();
