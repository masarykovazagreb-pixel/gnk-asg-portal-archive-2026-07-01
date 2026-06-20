(function(){
  if (window.__GNK_ASG_GLOBAL_LAYER_ACTIVE__) return;
  window.__GNK_ASG_GLOBAL_LAYER_ACTIVE__ = true;

  const isEn = location.pathname.toLowerCase().startsWith("/en") || location.pathname.toLowerCase().startsWith("/news") || location.pathname.toLowerCase().startsWith("/markets");
  const L = isEn ? {
    menu: "MENU",
    home: "HOME",
    asg: "ASG",
    close: "×",
    mainMenu: "GNK ASG Menu",
    assistant: "ASG Assistant",
    subtitle: "Online, offline and optional free AI search layer",
    placeholder: "Ask about GNK ASG, markets, news, documents or this page...",
    offline: "Offline search",
    online: "Online search",
    freeAi: "Free AI",
    clear: "Clear",
    searching: "Searching...",
    onlineOpened: "Online search opened in a new tab.",
    noQuery: "Enter a question first.",
    fallbackAi: "Free AI provider is not available in this browser. Local smart answer is shown instead.",
    sourceNote: "Public assistant only. It cannot perform admin actions and does not provide legal, financial or investment advice.",
    labels: {
      profile: "Profile",
      financials: "Financials",
      network: "Network",
      markets: "Markets",
      insights: "Insights",
      news: "News",
      archive: "Archive",
      contact: "Contact",
      admin: "Admin"
    }
  } : {
    menu: "MENU",
    home: "HOME",
    asg: "ASG",
    close: "×",
    mainMenu: "GNK ASG izbornik",
    assistant: "ASG Assistant",
    subtitle: "Online, offline i opcionalni besplatni AI sloj pretrage",
    placeholder: "Pitaj o GNK ASG, tržištima, vijestima, dokumentima ili ovoj stranici...",
    offline: "Offline pretraga",
    online: "Online pretraga",
    freeAi: "Free AI",
    clear: "Očisti",
    searching: "Pretražujem...",
    onlineOpened: "Online pretraga otvorena je u novoj kartici.",
    noQuery: "Prvo upiši pitanje.",
    fallbackAi: "Besplatni AI provider nije dostupan u ovom pregledniku. Prikazujem lokalni pametni odgovor.",
    sourceNote: "Javni asistent. Ne provodi admin radnje i nije pravni, financijski ni investicijski savjet.",
    labels: {
      profile: "Profil",
      financials: "Financije",
      network: "Mreža",
      markets: "Tržišta",
      insights: "Objave",
      news: "Vijesti",
      archive: "Arhiva",
      contact: "Kontakt",
      admin: "Admin"
    }
  };

  function el(tag, attrs, html){
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k,v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k,v);
    });
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function homeUrl(){
    return isEn ? "/en/" : "/";
  }

  function menuLinks(){
    return [
      [L.labels.profile, isEn ? "/en/#o-nama" : "/#o-nama"],
      [L.labels.financials, isEn ? "/en/#financials" : "/#financials"],
      [L.labels.network, isEn ? "/en/#grupa" : "/#grupa"],
      [L.labels.markets, isEn ? "/markets/" : "/trzista/"],
      [L.labels.insights, "/objave/"],
      [L.labels.news, isEn ? "/news/" : "/vijesti/"],
      [L.labels.archive, isEn ? "/news/archive/" : "/vijesti/arhiva/"],
      [L.labels.contact, "/contact/"],
      [L.labels.admin, "/operator-dashboard/"]
    ];
  }

  function closePanels(except){
    document.querySelectorAll(".gnk-asg-panel.open").forEach(p => {
      if (p !== except) p.classList.remove("open");
    });
  }

  function createLayer(){
    const old = document.getElementById("gnk-asg-global-layer-root");
    if (old) old.remove();

    const root = el("div", { id: "gnk-asg-global-layer-root" });const menuPanel = el("section", { id: "gnk-asg-menu-panel", class: "gnk-asg-panel", "aria-label": L.mainMenu });
    menuPanel.innerHTML =
      '<div class="gnk-asg-panel-head"><strong>' + esc(L.mainMenu) + '</strong><button class="gnk-asg-panel-close" type="button">' + esc(L.close) + '</button></div>' +
      '<div class="gnk-asg-panel-body"><div class="gnk-asg-menu-grid">' +
      menuLinks().map(x => '<a href="' + escAttr(x[1]) + '">' + esc(x[0]) + '</a>').join("") +
      '</div></div>';
    root.appendChild(menuPanel);

    const asgPanel = el("section", { id: "gnk-asg-asg-panel", class: "gnk-asg-panel", "aria-label": L.assistant });
    asgPanel.innerHTML =
      '<div class="gnk-asg-panel-head"><strong>' + esc(L.assistant) + '</strong><button class="gnk-asg-panel-close" type="button">' + esc(L.close) + '</button></div>' +
      '<div class="gnk-asg-panel-body">' +
      '<div class="gnk-asg-asg-title"><img src="' + ASG_LOGO + '" alt="GNK ASG"><div><strong>GNK ASG</strong><span>' + esc(L.subtitle) + '</span></div></div>' +
      '<textarea id="gnk-asg-asg-query" placeholder="' + escAttr(L.placeholder) + '"></textarea>' +
      '<div class="gnk-asg-asg-actions">' +
      '<button type="button" id="gnk-asg-offline-search">' + esc(L.offline) + '</button>' +
      '<button type="button" id="gnk-asg-online-search">' + esc(L.online) + '</button>' +
      '<button type="button" id="gnk-asg-free-ai">' + esc(L.freeAi) + '</button>' +
      '<button type="button" id="gnk-asg-clear">' + esc(L.clear) + '</button>' +
      '</div>' +
      '<div id="gnk-asg-asg-output">' + esc(L.sourceNote) + '</div>' +
      '</div>';
    root.appendChild(asgPanel);

    const dock = el("nav", { id: "gnk-asg-floating-dock", "aria-label": "GNK ASG floating controls" });
    dock.appendChild(el("button", { class: "gnk-asg-float-btn", id: "gnk-asg-menu-btn", type: "button", text: L.menu }));
    dock.appendChild(el("a", { class: "gnk-asg-float-btn", href: homeUrl(), text: L.home }));
    dock.appendChild(el("button", { class: "gnk-asg-float-btn asg", id: "gnk-asg-asg-btn", type: "button", text: L.asg }));
    root.appendChild(dock);

    document.body.appendChild(root);menuPanel.querySelector(".gnk-asg-panel-close").addEventListener("click", () => menuPanel.classList.remove("open"));
    asgPanel.querySelector(".gnk-asg-panel-close").addEventListener("click", () => asgPanel.classList.remove("open"));

    document.getElementById("gnk-asg-menu-btn").addEventListener("click", () => {
      closePanels(menuPanel);
      menuPanel.classList.toggle("open");
    });

    document.getElementById("gnk-asg-asg-btn").addEventListener("click", () => {
      closePanels(asgPanel);
      asgPanel.classList.toggle("open");
    });

    document.getElementById("gnk-asg-offline-search").addEventListener("click", offlineSearch);
    document.getElementById("gnk-asg-online-search").addEventListener("click", onlineSearch);
    document.getElementById("gnk-asg-free-ai").addEventListener("click", freeAiSearch);
    document.getElementById("gnk-asg-clear").addEventListener("click", () => {
      document.getElementById("gnk-asg-asg-query").value = "";
      writeOut(L.sourceNote);
    });
  }

  function query(){
    return (document.getElementById("gnk-asg-asg-query") || {}).value || "";
  }

  function writeOut(text){
    const out = document.getElementById("gnk-asg-asg-output");
    if (out) out.textContent = text;
  }

  async function collectContext(q){
    const pageText = (document.body.innerText || "").replace(/\s+/g," ").slice(0, 6000);
    const urls = ["/api/news", "/api/market", "/api/news-sources", "/data/news.json", "/data/market.json"];
    const chunks = [];

    for (const url of urls) {
      try {
        const r = await fetch(url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now(), { cache: "no-store" });
        if (!r.ok) continue;
        const j = await r.json();
        chunks.push(url + ":\n" + JSON.stringify(compactJson(j)).slice(0, 4500));
      } catch(e) {}
    }

    return {
      query: q,
      pageText: pageText,
      data: chunks.join("\n\n")
    };
  }

  function compactJson(j){
    if (!j || typeof j !== "object") return j;

    if (Array.isArray(j.items)) {
      return {
        ok: j.ok,
        worker: j.worker,
        updatedAt: j.updatedAt,
        status: j.status,
        itemCount: j.itemCount || j.currentCount || j.items.length,
        items: j.items.slice(0, 8).map(x => ({
          title: x.title,
          sourceTitle: x.sourceTitle,
          excerpt: x.excerpt,
          link: x.link
        }))
      };
    }

    if (j.assets || j.crypto || j.top) {
      return {
        ok: j.ok,
        worker: j.worker,
        updatedAt: j.updatedAt,
        status: j.status,
        top: j.top,
        crypto: Array.isArray(j.crypto) ? j.crypto.slice(0, 8).map(x => ({
          name: x.name,
          symbol: x.symbol,
          price_eur: x.price_eur,
          change_24h_pct: x.change_24h_pct
        })) : undefined
      };
    }

    if (Array.isArray(j.sources)) {
      return {
        ok: j.ok,
        worker: j.worker,
        sourceCount: j.sourceCount || j.sources.length,
        sources: j.sources.slice(0, 12).map(x => ({ title: x.title, url: x.url, category: x.category }))
      };
    }

    return j;
  }

  async function offlineSearch(){
    const q = query().trim();
    if (!q) return writeOut(L.noQuery);

    writeOut(L.searching);
    const ctx = await collectContext(q);
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const text = ctx.pageText;
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => {
      const low = s.toLowerCase();
      return terms.some(t => low.includes(t));
    }).slice(0, 8);

    let answer = "";
    answer += "OFFLINE SEARCH\n";
    answer += "Query: " + q + "\n\n";
    answer += "Page matches:\n";
    answer += sentences.length ? sentences.map((s,i) => (i+1) + ". " + s.slice(0, 360)).join("\n") : "- No direct page match.\n";
    answer += "\n\nBackend/context snapshot:\n";
    answer += ctx.data ? ctx.data.slice(0, 5000) : "- No backend snapshot available.";
    answer += "\n\n" + L.sourceNote;

    writeOut(answer);
  }

  function onlineSearch(){
    const q = query().trim();
    if (!q) return writeOut(L.noQuery);

    const site = "site:gnk-asg.hr " + q;
    const google = "https://www.google.com/search?q=" + encodeURIComponent(site);
    const duck = "https://duckduckgo.com/?q=" + encodeURIComponent(site);

    window.open(google, "_blank", "noopener,noreferrer");
    setTimeout(() => window.open(duck, "_blank", "noopener,noreferrer"), 250);
    writeOut(L.onlineOpened + "\n\nGoogle: " + google + "\nDuckDuckGo: " + duck);
  }

  async function freeAiSearch(){
    const q = query().trim();
    if (!q) return writeOut(L.noQuery);

    writeOut(L.searching);
    const ctx = await collectContext(q);
    const prompt =
      "You are GNK ASG public assistant. Answer only from the provided public context. Do not give legal, financial or investment advice. Question: " +
      q + "\n\nPublic context:\n" + (ctx.pageText + "\n\n" + ctx.data).slice(0, 10000);

    try {
      if (window.ai && window.ai.assistant && window.ai.assistant.create) {
        const session = await window.ai.assistant.create();
        const response = await session.prompt(prompt);
        writeOut(String(response) + "\n\n" + L.sourceNote);
        return;
      }
    } catch(e) {}

    try {
      await loadScript("https://js.puter.com/v2/");
      if (window.puter && window.puter.ai && window.puter.ai.chat) {
        const response = await window.puter.ai.chat(prompt);
        writeOut(String(response) + "\n\n" + L.sourceNote);
        return;
      }
    } catch(e) {}

    const local = localSmartAnswer(q, ctx);
    writeOut(L.fallbackAi + "\n\n" + local + "\n\n" + L.sourceNote);
  }

  function localSmartAnswer(q, ctx){
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const all = (ctx.pageText + "\n" + ctx.data).split(/[\n.?!]+/).map(s => s.trim()).filter(Boolean);
    const scored = all.map(s => {
      const low = s.toLowerCase();
      let score = 0;
      terms.forEach(t => { if (low.includes(t)) score += 2; });
      if (/gnk asg|market|news|vijesti|tržišta|admin|contact|kontakt/i.test(s)) score += 1;
      return { s, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 8);

    if (!scored.length) {
      return "Nisam našao dovoljno lokalnog konteksta za precizan odgovor. Koristi Online search za vanjsku pretragu ili otvori odgovarajuću sekciju portala.";
    }

    return scored.map((x,i) => (i+1) + ". " + x.s.slice(0, 420)).join("\n");
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function esc(s){
    return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  function escAttr(s){
    return esc(s).replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createLayer);
  } else {
    createLayer();
  }
})();