(() => {
  'use strict';
  if (window.__GNK_ASG_AKTUAL_ARCHIVE_V1__) return;
  window.__GNK_ASG_AKTUAL_ARCHIVE_V1__ = true;

  const path = location.pathname.replace(/\/+$/, '');
  const match = path.match(/^\/objave\/aktual\/([^/]+)$/i);
  if (!match) return;
  const slug = match[1];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00+02:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('hr-HR', {day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Zagreb'}).format(date);
  }

  function headingCandidate(text) {
    const value = String(text || '').trim();
    if (value.length < 12 || value.length > 115) return false;
    if (/[.!?]$/.test(value)) return false;
    return /^(Razumijevanje|Razumevanje|Važnost|Značaj|Ključ|Ključni|Ključne|Kako|Moć|Metode|Izvori|Od ideje|Balansiranje|Zaključak|Istraživanje|Telefonski|Profesionalne|Maksimiziranje|Etička|Fokus grupe|Administrativni|Poštanske|Strategije|Analiza|Zakonski|Prednosti|Izbor|Unapređenje|Planiranje|Financijsko|Finansijsko|Prodaja|Marketing)/i.test(value);
  }

  function improveArticle(article) {
    const title = document.querySelector('h1')?.textContent.trim().toLocaleLowerCase('hr');
    const paragraphs = Array.from(article.querySelectorAll(':scope > p'));
    paragraphs.forEach((paragraph, index) => {
      const lines = paragraph.textContent.split(/\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (index === 1 && title && lines.length === 1 && lines[0].toLocaleLowerCase('hr') === title) {
        paragraph.remove();
        return;
      }
      if (lines.length < 2 || !headingCandidate(lines[0])) return;
      const heading = document.createElement('h2');
      heading.textContent = lines.shift();
      const body = document.createElement('p');
      body.textContent = lines.join('\n');
      paragraph.replaceWith(heading, body);
    });
  }

  function apply(item) {
    document.body.classList.add('gnk-aktual-archive');
    document.body.dataset.aktualSlug = slug;
    document.documentElement.dataset.gnkAktualArchive = 'v1';

    const meta = document.querySelector('.meta');
    if (meta && item?.datePublished) {
      meta.innerHTML = `<time datetime="${esc(item.datePublished)}">Objavljeno ${esc(formatDate(item.datePublished))}</time><span>·</span><span>Nermin Sefić</span><span>·</span><span>GNK ASG</span><span>·</span><span>GNK DINAMO Ltd.</span>`;
    }

    const image = document.querySelector('img.hero');
    if (image && !image.closest('figure')) {
      image.alt = item?.alt || image.alt;
      image.decoding = 'async';
      const figure = document.createElement('figure');
      figure.className = 'gnk-aktual-figure';
      image.replaceWith(figure);
      figure.appendChild(image);
      const caption = document.createElement('figcaption');
      caption.textContent = item?.imageCredit || 'Foto: Shutterstock, prema izvornoj objavi Aktual.rs';
      figure.appendChild(caption);
    }

    const source = document.querySelector('.box a[href*="aktual.rs"]');
    if (source) {
      source.target = '_blank';
      source.rel = 'noopener noreferrer external';
    }

    const article = document.querySelector('article');
    if (article) {
      improveArticle(article);
      if (!document.querySelector('.gnk-aktual-rights')) {
        const rights = document.createElement('p');
        rights.className = 'gnk-aktual-rights';
        rights.innerHTML = `Autor teksta: <strong>Nermin Sefić</strong>. Izvorna objava: <a href="${esc(item?.sourceUrl || `https://aktual.rs/clanak/${slug}/`)}" target="_blank" rel="noopener noreferrer external">Aktual.rs</a>. Fotografija: Shutterstock, prema kreditu uz izvornu objavu. GNK ASG arhivska verzija SEO je strukturirana za Nermina Sefića, GNK ASG i GNK DINAMO Ltd.`;
        article.insertAdjacentElement('afterend', rights);
      }
    }
  }

  async function start() {
    let item = null;
    try {
      const response = await fetch(`/data/aktual-nermin-sefic.json?cb=${Date.now()}`, {cache:'no-store', headers:{accept:'application/json'}});
      if (response.ok) {
        const payload = await response.json();
        item = (payload.items || []).find(entry => entry.slug === slug) || null;
      }
    } catch (_) {}
    apply(item || {slug, datePublished:slug === 'kljucni-faktori-motivacije-za-pokretanje-vlastitog-posla' ? '2024-10-02' : '2024-10-03'});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
