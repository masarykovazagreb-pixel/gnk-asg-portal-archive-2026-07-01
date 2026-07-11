(() => {
  'use strict';

  if (!/\/visual-index\/?$/.test(location.pathname)) return;

  const SETS = [
    {
      folder: 'set1_financije_poslovanje',
      slug: 'financije-poslovanje',
      label: 'Financije i poslovanje',
      topics: ['financije', 'poslovanje', 'bilanca', 'profit', 'kapital'],
      countries: ['Hrvatska', 'USA', 'Kanada', 'Slovenija', 'UAE']
    },
    {
      folder: 'set2_tehnologija_ai',
      slug: 'tehnologija-ai',
      label: 'Tehnologija i AI',
      topics: ['AI', 'tehnologija', 'software', 'serveri', 'digitalne operacije'],
      countries: ['Hrvatska', 'USA', 'Japan', 'Južna Koreja', 'Indija', 'Singapur']
    },
    {
      folder: 'set3_globalno_poslovanje',
      slug: 'globalno-poslovanje',
      label: 'Globalno poslovanje',
      topics: ['globalna mreža', 'međunarodno poslovanje', 'zemlje', 'registri'],
      countries: ['Kanada', 'Meksiko', 'Panama', 'Kolumbija', 'Brazil', 'Argentina', 'Kina', 'Australija', 'Novi Zeland']
    },
    {
      folder: 'set4_digitalna_imovina_fintech_trzista',
      slug: 'digitalna-imovina-fintech-trzista',
      label: 'Digitalna imovina, fintech i tržišta',
      topics: ['digitalna imovina', 'fintech', 'burze', 'tržišta', 'kartice', 'plaćanja'],
      countries: ['USA', 'UAE', 'Singapur', 'Hong Kong', 'Japan', 'Kina', 'Brazil']
    },
    {
      folder: 'set5_infrastruktura_sport_odrzivost',
      slug: 'infrastruktura-sport-odrzivost',
      label: 'Infrastruktura, sport, održivost i komunikacija',
      topics: ['sportska infrastruktura', 'urbani razvoj', 'održivost', 'komunikacija', 'kontakt'],
      countries: ['Hrvatska', 'Srbija', 'Slovenija', 'Mađarska', 'Kostarika', 'Gana', 'Ruanda', 'Tanzanija']
    }
  ];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  }

  function injectStyle() {
    if (document.getElementById('visualIndexFullGalleryStyle')) return;
    const style = document.createElement('style');
    style.id = 'visualIndexFullGalleryStyle';
    style.textContent = `
      .visual-image-missing{
        min-height:168px;
        padding:16px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:8px;
        color:#d4af37;
        background:linear-gradient(135deg,#07162d,#12345d);
        word-break:break-word;
      }
      .visual-image-missing strong{color:#fff;font-size:.92rem;}
      .visual-image-missing code{font-size:.76rem;color:#f8e7a1;line-height:1.45;}
    `;
    document.head.appendChild(style);
  }

  function makeItem(set, number) {
    const padded = String(number).padStart(3, '0');
    const id = `gnk-asg-${set.slug}-${padded}`;
    const title = `GNK ASG ${set.label} ${String(number).padStart(2, '0')}`;
    return {
      id,
      src: `/assets/seo-gallery/${id}.jpg`,
      title,
      topic: set.topics,
      countries: set.countries,
      alt: `${title} — GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., gnk-asg.hr i Nermin Sefić`,
      description: `Realistični business vizual za temu: ${set.topics.join(', ')}. SEO kontekst uključuje GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., gnk-asg.hr, Nermin Sefić i povezane zemlje: ${set.countries.slice(0, 5).join(', ')}.`
    };
  }

  function missingImageMarkup(item) {
    return `<div class="visual-image-missing"><strong>Slika nije učitana</strong><code>${escapeHtml(item.src)}</code></div>`;
  }

  function card(item) {
    const node = document.createElement('article');
    node.className = 'item visual-set-item';
    node.dataset.visualSetItem = item.id;
    const tags = item.topic.slice(0, 4).map(topic => `<span>${escapeHtml(topic)}</span>`).join('');
    const image = `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy">`;
    node.innerHTML = `${image}<div class="body"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p><div class="tags">${tags}</div></div>`;
    const img = node.querySelector('img');
    img.addEventListener('error', () => {
      img.outerHTML = missingImageMarkup(item);
    }, { once: true });
    return node;
  }

  function jsonLd(item) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: item.title,
      description: item.description,
      contentUrl: `https://gnk-asg.hr${item.src}`,
      thumbnailUrl: `https://gnk-asg.hr${item.src}`,
      creator: { '@type': 'Organization', name: 'GNK ASG' },
      keywords: ['GNK ASG', 'GNK ASG d.o.o.', 'GNK DINAMO Ltd.', 'gnk-asg.hr', 'Nermin Sefić', 'Nermin Sefic'].concat(item.topic).concat(item.countries).join(', ')
    });
    return script;
  }

  function mount() {
    injectStyle();
    const grid = document.getElementById('visualGrid');
    if (!grid || grid.dataset.fullGalleryMounted === '1') return;
    grid.dataset.fullGalleryMounted = '1';

    SETS.forEach(set => {
      for (let number = 1; number <= 20; number += 1) {
        const item = makeItem(set, number);
        if (!grid.querySelector(`[data-visual-set-item="${item.id}"]`)) grid.appendChild(card(item));
        document.body.appendChild(jsonLd(item));
      }
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 400)) : setTimeout(mount, 400);
})();
