(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V2__) return;
  window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V1__ = true;
  window.__GNK_ASG_PUBLIC_QUALITY_CLIENT_V2__ = true;

  const path = location.pathname.toLowerCase();
  const excluded = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/auto-editor'];
  if (excluded.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const broken = /(?:\uFFFD|Γö|Γò|├|╕|╛|Ã.|Â.|â€|Å.|Ä.)/;
  const hardBroken = /(?:\uFFFD|Γö|Γò|├|╕|╛)/;

  function score(value) {
    const found = String(value || '').match(/(?:\uFFFD|Γö|Γò|├|╕|╛|Ã.|Â.|â€|Å.|Ä.)/g);
    return found ? found.length : 0;
  }

  function repair(value) {
    let output = String(value ?? '').normalize('NFC');
    if (!broken.test(output)) return output;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const chars = [...output];
        if (!chars.every(character => character.charCodeAt(0) <= 255)) break;
        const bytes = Uint8Array.from(chars.map(character => character.charCodeAt(0)));
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (score(decoded) < score(output)) output = decoded;
        else break;
      } catch {
        break;
      }
    }

    const replacements = [
      ['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€','”'],['â€“','–'],['â€”','—'],['â€¦','…'],
      ['Â ',' '],['Â',''],['Ä','č'],['Ä‡','ć'],['Å¡','š'],['Å¾','ž'],['Ä‘','đ'],
      ['PoÄetna','Početna'],['TrÅ¾iÅ¡ta','Tržišta'],['RuÄno','Ručno'],['osvjeÅ¾i','osvježi'],
      ['UÄitavanje','Učitavanje'],['tehniÄki','tehnički'],['toÄke','točke'],['sljedeÄ‡a','sljedeća'],
      ['pomoÄ‡','pomoć'],['sadrÅ¾aj','sadržaj'],['izvjeÅ¡taj','izvještaj'],['aÅ¾urirano','ažurirano']
    ];
    for (const [bad, good] of replacements) output = output.split(bad).join(good);
    return output.normalize('NFC');
  }

  function repairDom(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return broken.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fixed = repair(node.nodeValue || '');
      if (!hardBroken.test(fixed)) node.nodeValue = fixed;
    });
  }

  function englishHeading(value) {
    const content = String(value || '').toLowerCase();
    const en = (content.match(/\b(the|and|as|over|ahead|government|global|business|power|project|status|says|seeks|hits|breaks|ground|loses|renewable|energy|technology)/g) || []).length;
    const hr = (content.match(/\b(i|je|su|za|na|od|koji|kako|tržište|poslovanje|projekt|vlada|razvoj|energija|tehnologija)/g) || []).length;
    return en >= 2 && hr === 0;
  }

  function invalidCroatian(content, title) {
    return hardBroken.test(content) || englishHeading(title) ||
      /\b(ko će|zvanično|akcioni plan|u oblasti|kompanije su|investirali su|trenutno realiziraju|komesar)/i.test(content);
  }

  function qualityMessage(croatian) {
    const section = document.createElement('section');
    section.className = 'gnk-quality-empty';
    section.innerHTML = croatian
      ? '<h2>Objava prolazi kontrolu kvalitete</h2><p>Ovaj tekst nije javno prikazan jer nije zadovoljio jezična, tehnička ili urednička pravila portala.</p><a href="/objave/">Povratak na provjerene objave</a>'
      : '<h2>Publication under quality review</h2><p>This article is not publicly displayed because it did not pass the language, technical or editorial rules.</p><a href="/publications/">Return to verified publications</a>';
    return section;
  }

  function filterArticles() {
    const listHr = path === '/objave' || path === '/objave/' || path.startsWith('/objave/');
    const listEn = path === '/publications' || path === '/publications/' || path.startsWith('/publications/');
    if (!listHr && !listEn) return;

    let removed = false;
    document.querySelectorAll('article').forEach(article => {
      const heading = article.querySelector('h1,h2,h3')?.textContent || '';
      const content = article.textContent || '';
      const invalid = hardBroken.test(content) || (listHr && invalidCroatian(content, heading));
      if (invalid) {
        article.remove();
        removed = true;
      }
    });

    const grid = document.querySelector('.grid,.publication-grid');
    if (grid && !grid.querySelector('article') && !grid.querySelector('.gnk-quality-empty')) {
      grid.appendChild(qualityMessage(listHr));
      return;
    }

    if (removed && !grid && !document.querySelector('.gnk-quality-empty')) {
      const main = document.querySelector('main') || document.body;
      main.replaceChildren(qualityMessage(listHr));
    }
  }

  function patchMenu() {
    const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications');
    const menu = document.getElementById('gnk-asg-premium-menu');
    if (!menu) return;

    if (english) {
      menu.querySelectorAll('a').forEach(link => {
        if (/ai help/i.test(link.textContent || '')) link.href = '/en/assistant/';
      });
    }

    const statusUrl = english ? '/automation-status/' : '/status-automatizacije/';
    if (![...menu.querySelectorAll('a')].some(link => {
      try { return new URL(link.href, location.origin).pathname === statusUrl; } catch { return false; }
    })) {
      const link = document.createElement('a');
      link.href = statusUrl;
      link.textContent = 'Status';
      menu.appendChild(link);
    }
  }

  function installStyle() {
    if (path === '/' || path === '/en/' || document.getElementById('gnk-quality-client-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-quality-client-style';
    style.textContent = '.gnk-quality-empty{padding:22px;border:1px solid rgba(212,175,55,.35);border-radius:16px;background:#0d2340;color:#dce5f1;line-height:1.65}.gnk-quality-empty h2{color:#fff}.gnk-quality-empty a{color:#ffe08a;font-weight:900;text-decoration:none}.gnk-asg-premium-menu a[href*="status"]{border-color:rgba(212,175,55,.42)!important}';
    document.head.appendChild(style);
  }

  function run() {
    installStyle();
    repairDom();
    filterArticles();
    patchMenu();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [120,400,900,1800,3500].forEach(delay => setTimeout(run, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
