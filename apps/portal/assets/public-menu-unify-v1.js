(() => {
  if (window.__GNK_ASG_PUBLIC_MENU_UNIFY_V1__) return;
  window.__GNK_ASG_PUBLIC_MENU_UNIFY_V1__ = true;
  const path = location.pathname.toLowerCase();
  if (/^\/(operator-dashboard|operator-mobile|mail-studio|admin-center|news-admin|pdf-publisher)(\/|$)/.test(path)) return;
  const isEn = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets/') || path.startsWith('/news/') || path.startsWith('/publications/');
  const links = isEn ? [
    ['⌂ Home','/en/'],['♙ Profile','/en/#profil'],['▥ Financials','/en/#financije'],['▥ Markets','/markets/'],['▤ Publications','/publications/'],['▦ News','/news/'],['✎ Auto Editor','/auto-editor/'],['▣ PDF','/en/downloads/'],['▦ Visual Index','/visual-index/'],['◉ AI Help','/assistant/'],['✉ Contact','/en/contact/'],['⚖ Legal','/en/legal/'],['▯ App','/app/'],['⚙ Admin','/admin-center/','nofollow'],['HR','/','language']
  ] : [
    ['⌂ Početna','/'],['♙ Profil','/#profil'],['▥ Financije','/#financije'],['▥ Tržišta','/trzista/'],['▤ Objave','/objave/'],['▦ Vijesti','/vijesti/'],['✎ Auto Editor','/auto-editor/'],['▣ PDF centar','/downloads/'],['▦ Visual Index','/visual-index/'],['◉ AI pomoć','/assistant/'],['✉ Kontakt','/contact/'],['⚖ Legal','/legal/'],['▯ App','/app/'],['⚙ Admin','/admin-center/','nofollow'],['EN','/en/','language']
  ];
  const active = href => {
    const url = new URL(href, location.origin);
    if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
    if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
    return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
  };
  const menuHtml = () => links.map(([label,href,kind]) => `<a href="${href}"${active(href)?' aria-current="page"':''}${kind==='nofollow'?' rel="nofollow"':''}${kind==='language'?' data-language="1"':''}>${label}</a>`).join('');
  const dinamoMark = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="gnkDinamoGold" x1="0" x2="1"><stop stop-color="#a87516"/><stop offset=".5" stop-color="#ffe092"/><stop offset="1" stop-color="#b77d13"/></linearGradient></defs><path d="M78 19A40 40 0 1 0 85 65" fill="none" stroke="url(#gnkDinamoGold)" stroke-width="6"/><rect x="28" y="51" width="10" height="25" fill="url(#gnkDinamoGold)"/><rect x="45" y="38" width="10" height="38" fill="url(#gnkDinamoGold)"/><rect x="62" y="28" width="10" height="48" fill="url(#gnkDinamoGold)"/><path d="M22 81Q62 88 83 58M69 59H84V73" fill="none" stroke="url(#gnkDinamoGold)" stroke-width="5"/></svg>';
  const cleanLegacy = () => document.querySelectorAll('.gnk-global-float-home,.gnk-global-float-ai,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap').forEach(node => node.remove());
  const install = () => {
    const header = document.getElementById('gnk-asg-premium-header');
    if (!header || header.dataset.unified === '1') return Boolean(header);
    header.dataset.unified = '1';
    header.classList.add('gnk-unified-public-header');
    document.body.classList.add('gnk-public-menu-unified');
    document.getElementById('gnk-asg-premium-menu').innerHTML = menuHtml();
    const drawerMenu = document.getElementById('gnk-asg-drawer-menu');
    if (drawerMenu) drawerMenu.innerHTML = menuHtml();
    const actions = header.querySelector('.gnk-asg-shell-actions');
    if (actions && !actions.querySelector('.gnk-unified-status')) actions.insertAdjacentHTML('afterbegin',`<span class="gnk-unified-status"><i></i>${isEn?'System active':'Sustav aktivan'}</span>`);
    if (!header.querySelector('.gnk-unified-secondary')) {
      const secondary = document.createElement('a');
      secondary.className = 'gnk-unified-secondary';
      secondary.href = isEn ? '/en/#profil' : '/#profil';
      secondary.innerHTML = `${dinamoMark}<span><strong>GNK DINAMO Ltd.</strong><small>Parent Company · Boulder, Colorado</small></span>`;
      header.appendChild(secondary);
    }
    cleanLegacy();
    return true;
  };
  let attempts = 0;
  const timer = setInterval(() => { attempts += 1; if (install() || attempts > 80) clearInterval(timer); }, 60);
  document.addEventListener('DOMContentLoaded', install, {once:true});
  window.addEventListener('load', install, {once:true});
  [300,900,2200].forEach(delay => setTimeout(() => { install(); cleanLegacy(); }, delay));
})();
