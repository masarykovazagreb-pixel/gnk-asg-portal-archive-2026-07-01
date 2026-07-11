(() => {
  'use strict';

  const HOME_BUTTON_ID = 'gnkFloatingHomeButton';
  const STYLE_ID = 'gnkFloatingHomeButtonStyle';
  const MOBILE_QUERY = '(max-width: 820px)';

  function isEnglishPage() {
    return document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || window.GNK_LANG?.get?.() === 'en';
  }

  function homeHref() {
    return isEnglishPage() ? '/en/' : '/';
  }

  function label() {
    return isEnglishPage() ? 'Home' : 'Početna';
  }

  function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  }

  function isMobileScreen() {
    return window.matchMedia?.(MOBILE_QUERY)?.matches || window.innerWidth <= 820;
  }

  function shouldHideHomeButton() {
    return isMobileScreen() || isStandaloneApp();
  }

  function removeButton() {
    document.getElementById(HOME_BUTTON_ID)?.remove();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .gnk-floating-home-button{
        position:fixed;
        left:18px;
        bottom:18px;
        z-index:9998;
        width:52px;
        height:52px;
        border-radius:18px;
        display:grid;
        place-items:center;
        text-decoration:none;
        color:#d4af37;
        background:linear-gradient(135deg,#07162d,#102b4e);
        border:1px solid rgba(212,175,55,.55);
        box-shadow:0 14px 34px rgba(7,22,45,.24);
        transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        opacity:.94;
      }
      .gnk-floating-home-button:hover,
      .gnk-floating-home-button:focus-visible{
        transform:translateY(-2px);
        box-shadow:0 18px 40px rgba(7,22,45,.32);
        opacity:1;
        outline:none;
      }
      .gnk-floating-home-button svg{
        width:25px;
        height:25px;
        display:block;
        fill:none;
        stroke:currentColor;
        stroke-width:2.35;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      @media(max-width:820px){
        .gnk-floating-home-button{display:none!important;}
      }
      @media(min-width:1180px){
        .gnk-floating-home-button{left:22px;bottom:22px;}
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (shouldHideHomeButton()) {
      removeButton();
      return;
    }
    injectStyle();
    let button = document.getElementById(HOME_BUTTON_ID);
    if (!button) {
      button = document.createElement('a');
      button.id = HOME_BUTTON_ID;
      button.className = 'gnk-floating-home-button';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10.5V20h13v-9.5"></path><path d="M9.5 20v-6h5v6"></path></svg>';
      document.body.appendChild(button);
    }
    button.href = homeHref();
    button.title = label();
    button.setAttribute('aria-label', label());
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
  window.addEventListener('gnk-language-change', mount);
  window.addEventListener('resize', mount);
  window.matchMedia?.(MOBILE_QUERY)?.addEventListener?.('change', mount);
})();
