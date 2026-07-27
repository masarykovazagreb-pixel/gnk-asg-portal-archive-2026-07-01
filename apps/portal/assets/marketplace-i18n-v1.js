(() => {
  'use strict';
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/trgovina' && path !== '/trgovina/prehrana') return;
  const params = new URLSearchParams(location.search);
  const english = params.get('lang') === 'en';
  document.documentElement.lang = english ? 'en' : 'hr';
  const localUrl = lang => `${location.pathname}${lang === 'en' ? '?lang=en' : ''}${location.hash || ''}`;
  const T = english ? {
    shopTitle: 'GNK ASG Marketplace — technology, food and recipes',
    shopDescription: 'A unified GNK ASG marketplace for technology, food, meals and recipes with dynamic catalogs and informational data.',
    heroEye: 'GNK ASG MARKETPLACE · UNIFIED ENTRY',
    heroTitle: 'Technology.<br><span>Food.</span><br>Recipes.',
    heroLead: 'One main page connects all GNK ASG marketplace catalogs. Choose an area, browse the content and open the relevant catalog directly without hidden or disconnected routes.',
    tech: 'Technology', food: 'Food', recipes: 'Meals and recipes',
    techDesc: 'IT equipment, devices, business solutions and comparative reference prices.',
    foodDesc: 'Food categories and a dynamic overview of meals from a public food source.',
    recipeDesc: 'Choose a meal and review ingredients, measures and detailed preparation instructions.',
    openTech: 'Open technology catalog ↓', openFood: 'Open food categories →', openRecipes: 'Open recipes →',
    products: 'Products and solutions', catalogNote: 'GNK ASG catalog · DummyJSON · Best Buy when approved',
    search: 'Search catalog', searchPlaceholder: 'Name, manufacturer, category or SKU', category: 'Category', all: 'All categories',
    sort: 'Sort', featured: 'Recommended', name: 'Name A–Z', low: 'Price: low to high', high: 'Price: high to low',
    loading: 'Loading…', checking: 'Checking source…', disclaimer: 'Displayed prices and availability are informational. GNK ASG does not process online payments on this page; final commercial terms are confirmed in a separate offer.',
    department: 'Department', marketRequest: 'Marketplace — request for information', general: 'General contact', fullName: 'Full name', email: 'Email', subject: 'Subject', message: 'Message', consent: 'I consent to data processing for the purpose of answering this inquiry.', send: 'Send inquiry', notSent: 'Not sent.',
    foodTitle: 'Food — categories and recipes | GNK ASG', foodDescription: 'GNK ASG informational overview of food categories, meals and recipes from the public TheMealDB source.',
    foodEye: 'GNK ASG · FOOD · INFORMATIONAL CONTENT', foodHero: 'Categories.<br><span>Meals.</span><br>Recipes.',
    foodLead: 'A dynamic overview of food categories and recipes. Content is retrieved through the GNK ASG server-side cache layer and supports information, inspiration and development of the Group’s food projects.',
    foodNote: 'Source: TheMealDB · categories refresh every 24 hours · recipes every 6 hours',
    categories: 'Food categories', meals: 'Meals in the selected category', choose: 'Choose a category to display meals.'
  } : null;
  function setText(selector, value) { const el = document.querySelector(selector); if (el && value != null) el.textContent = value; }
  function setHtml(selector, value) { const el = document.querySelector(selector); if (el && value != null) el.innerHTML = value; }
  function applyLanguageLinks() {
    document.querySelectorAll('.lang a').forEach(link => {
      const label = (link.getAttribute('aria-label') || link.textContent || '').toLowerCase();
      const isEn = label.includes('english') || link.textContent.trim().toUpperCase() === 'EN';
      link.href = localUrl(isEn ? 'en' : 'hr');
      link.toggleAttribute('aria-current', isEn === english);
    });
  }
  if (english) {
    if (path === '/trgovina') {
      document.title = T.shopTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', T.shopDescription);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://gnk-asg.hr/trgovina/?lang=en');
      setText('.hero .gnk-eyebrow', T.heroEye); setHtml('.hero h1', T.heroTitle); setText('.hero > p:last-of-type', T.heroLead);
      const cards = document.querySelectorAll('.market-card');
      if (cards[0]) { setText('.market-card:nth-child(1) h2', T.tech); setText('.market-card:nth-child(1) p', T.techDesc); setText('.market-card:nth-child(1) strong', T.openTech); }
      if (cards[1]) { cards[1].href = '/trgovina/prehrana/?lang=en#foodCategories'; setText('.market-card:nth-child(2) h2', T.food); setText('.market-card:nth-child(2) p', T.foodDesc); setText('.market-card:nth-child(2) strong', T.openFood); }
      if (cards[2]) { cards[2].href = '/trgovina/prehrana/?lang=en#foodMeals'; setText('.market-card:nth-child(3) h2', T.recipes); setText('.market-card:nth-child(3) p', T.recipeDesc); setText('.market-card:nth-child(3) strong', T.openRecipes); }
      setText('#technology .gnk-eyebrow', T.tech.toUpperCase()); setText('#technology .section-head h2', T.products); setText('#technology .section-head > p', T.catalogNote);
      const searchInput = document.getElementById('shopSearch'); const searchLabel = searchInput?.closest('label'); if (searchLabel) searchLabel.childNodes[0].textContent = T.search; searchInput?.setAttribute('placeholder', T.searchPlaceholder);
      const categoryLabel = document.getElementById('shopCategory')?.closest('label'); if (categoryLabel) categoryLabel.childNodes[0].textContent = T.category;
      const sortLabel = document.getElementById('shopSort')?.closest('label'); if (sortLabel) sortLabel.childNodes[0].textContent = T.sort;
      const opts = document.querySelectorAll('#shopSort option'); [T.featured,T.name,T.low,T.high].forEach((v,i)=>{if(opts[i])opts[i].textContent=v;});
      setText('#shopResultCount', T.loading); setText('#shopCatalogMeta', T.checking); setText('.market-note', T.disclaimer);
      const labels = document.querySelectorAll('#contactForm label');
      if (labels[0]) labels[0].childNodes[0].textContent = T.department;
      const dep = document.querySelectorAll('#contactForm select option'); if (dep[0]) dep[0].textContent=T.marketRequest; if(dep[1])dep[1].textContent=T.general;
      if (labels[1]) labels[1].childNodes[0].textContent=T.fullName; if(labels[2])labels[2].childNodes[0].textContent=T.email; if(labels[3])labels[3].childNodes[0].textContent=T.subject; if(labels[4])labels[4].childNodes[0].textContent=T.message;
      setText('.consent span', T.consent); setText('.contact-actions button', T.send); setText('#contactStatus', T.notSent);
    } else {
      document.title = T.foodTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', T.foodDescription);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://gnk-asg.hr/trgovina/prehrana/?lang=en');
      setText('.food-hero .gnk-eyebrow', T.foodEye); setHtml('.food-hero h1', T.foodHero); setText('.food-hero > p', T.foodLead); setText('.food-note', T.foodNote);
      const nav = document.querySelectorAll('.food-nav a'); if(nav[0]){nav[0].href='/trgovina/?lang=en';nav[0].textContent=T.tech;} if(nav[1])nav[1].textContent=T.categories;
      const titles=document.querySelectorAll('.food-title'); if(titles[0])titles[0].textContent=T.categories; if(titles[1])titles[1].textContent=T.meals;
      setText('#foodCategories .food-empty', T.loading); setText('#foodMeals .food-empty', T.choose);
    }
  }
  applyLanguageLinks();
  new MutationObserver(applyLanguageLinks).observe(document.documentElement,{childList:true,subtree:true});
})();
