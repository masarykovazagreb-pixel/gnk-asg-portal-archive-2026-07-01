(() => {
  if (window.__GNK_ASG_INDEX_HOTFIX_20260622__) return;
  window.__GNK_ASG_INDEX_HOTFIX_20260622__ = true;

  const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
  const textOf = el => normalize(el?.textContent || "");
  const isHeadingText = (el, regex) => regex.test(textOf(el));
  const sectionContainer = el => el?.closest("section, article, main > div, .section, .container, .panel, .card") || el?.parentElement;
  const allTextNodes = () => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,strong,span,div,a,button")];

  function findSection(regex) {
    const match = allTextNodes().find(node => isHeadingText(node, regex));
    return sectionContainer(match);
  }

  function markValues(section) {
    if (!section) return;
    [...section.querySelectorAll("div,span,p,strong,td,a,h1,h2,h3,h4,h5,h6,small,li")].forEach(node => {
      const txt = textOf(node);
      if (/(EUR|USD|%|mil\.|mlrd\.|tis\.)/i.test(txt) && txt.length < 80) {
        node.setAttribute("data-gnk-value", "1");
      }
    });
  }

  function removeDuplicateInstallApp() {
    const navs = [...document.querySelectorAll("header, nav, .nav, .menu, .topbar")]
      .filter(el => /(install|app)/i.test(textOf(el)));

    navs.forEach(nav => {
      const items = [...nav.querySelectorAll("a,button")];
      const install = items.find(el => /^install$/i.test(textOf(el)));
      const app = items.find(el => /^app$/i.test(textOf(el)));
      if (!install || !app) return;

      const installHref = install.getAttribute("href") || install.dataset.href || install.getAttribute("onclick") || "";
      const appHref = app.getAttribute("href") || app.dataset.href || app.getAttribute("onclick") || "";

      if (!appHref || installHref === appHref || /install|app/i.test(appHref)) {
        const wrapper = app.closest("li, .nav-item, .menu-item, .chip, .badge, .button-wrap") || app;
        wrapper.remove();
      }
    });
  }

  function fixFinancialProfileContrast() {
    const hr = findSection(/Financijski profil GNK ASG d\.o\.o\./i);
    const en = findSection(/Financial profile/i);
    [hr, en].filter(Boolean).forEach(section => {
      section.classList.add("gnk-financial-contrast");
      markValues(section);
    });
  }

  function fixGroupOverviewContrast() {
    const hr = findSection(/GNK DINAMO Ltd\. Group Overview/i);
    const en = findSection(/Group Overview/i);
    [hr, en].filter(Boolean).forEach(section => {
      section.classList.add("gnk-group-contrast");
      markValues(section);
    });
  }

  function compactCommandCentre() {
    const section = findSection(/Command Centre/i);
    if (!section) return;

    section.classList.add("gnk-command-centre-hotfix");

    const bigBlocks = [...section.querySelectorAll(":scope > div, .panel, .card, article, section, .grid > div")].filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 200 && rect.height > 140;
    });

    const shell = bigBlocks.length >= 2
      ? (bigBlocks[0].parentElement === bigBlocks[1].parentElement ? bigBlocks[0].parentElement : section)
      : section;

    shell.classList.add("gnk-command-centre-shell");

    const rightCandidate = bigBlocks.sort((a,b) => b.offsetWidth - a.offsetWidth)[0];
    if (rightCandidate) {
      rightCandidate.classList.add("gnk-command-centre-right");
      [...rightCandidate.querySelectorAll(".card, .panel, article, section, > div")].forEach(el => {
        if (el !== rightCandidate) el.classList.add("gnk-command-centre-tight");
      });
    }

    markValues(section);
  }

  function normalizePublicSources() {
    const section = findSection(/Javni izvori i službeni registri|Public sources and official registers/i);
    if (!section) return;

    section.classList.add("gnk-public-sources-hotfix");

    [...section.querySelectorAll("div, section, article")].forEach(container => {
      const cards = [...container.children].filter(child => /OTVORI IZVOR|OPEN SOURCE/i.test(textOf(child)));
      if (cards.length >= 2) {
        container.classList.add("gnk-public-grid");
      }
    });
  }

  async function auditDownloads() {
    const candidates = [...document.querySelectorAll("a,button")].filter(el => /(PDF|SLIKA)/i.test(textOf(el)));
    const report = [];

    for (const el of candidates) {
      const label = textOf(el);
      const href = el.getAttribute("href") || el.dataset.href || "";
      const onclick = el.getAttribute("onclick") || "";
      let status = "unknown-script";

      if (href && href !== "#" && !/^javascript:/i.test(href)) {
        status = "has-link";
      } else if (onclick) {
        status = "script-handler";
      } else {
        status = "missing-target";
      }

      if (status === "missing-target") {
        el.classList.add("gnk-download-audit-broken");
      } else if (status === "unknown-script") {
        el.classList.add("gnk-download-audit-unknown");
      }

      report.push({
        label,
        status,
        href,
        onclick: onclick ? "yes" : ""
      });
    }

    window.__GNK_ASG_INDEX_DOWNLOAD_AUDIT__ = report;
    console.table(report);
  }

  function boot() {
    removeDuplicateInstallApp();
    fixFinancialProfileContrast();
    fixGroupOverviewContrast();
    compactCommandCentre();
    normalizePublicSources();
    auditDownloads();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }



/* GNK_ASG_INDEX_HOTFIX_COLOR_V2 */
function addYellowGroupOverviewLeft() {
  const section = findSection(/GNK DINAMO Ltd\. Group Overview/i);
  if (!section) return;

  section.classList.add("gnk-group-left-yellow");

  const exactMatches = [
    /^Parent company$/i,
    /^Tvrtka$/i,
    /^GNK DINAMO Ltd\.$/i,
    /^Sjedište$/i,
    /^Boulder,\s*Colorado,\s*USA$/i,
    /^Entity ID$/i,
    /^20238180649$/i,
    /^Ovlašteni predstavnik$/i,
    /^Nermin Sefić$/i,
    /^Stvarni vlasnik \/ UBO grupe$/i,
    /^Broj društava u grupi$/i,
    /^33,\s*uključujući GNK DINAMO Ltd\.?$/i
  ];

  [...section.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div,strong,a,small,td,li")]
    .forEach(node => {
      const txt = textOf(node);
      if (exactMatches.some(rx => rx.test(txt))) {
        node.setAttribute("data-gnk-left-yellow", "1");
      }
    });
}

function elevatePdfCard(card) {
  if (!card) return;
  card.classList.add("gnk-pdf-card-blacktext");

  [...card.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div,strong,small,a,button")]
    .forEach(node => {
      const txt = textOf(node);
      if (
        /Neovisna revizija|Izvješće neovisnog revizora i financijski izvještaji|S bilješkama koje uključuju konsolidirane financijske podatke GNK DINAMO Ltd\. Group\.|FILED IN COLORADO|Konsolidirani financijski izvještaj grupe|Certificirani Colorado podnesak/i.test(txt)
      ) {
        node.setAttribute("data-gnk-pdf-black", "1");
      }

      if (/PREUZMI PDF/i.test(txt)) {
        node.classList.add("gnk-pdf-yellow-button");
      }

      if (/PDF/i.test(txt) && txt.length <= 24) {
        node.classList.add("gnk-pdf-badge");
      }
    });
}

function fixPdfCardsAppearance() {
  const financialSection = findSection(/Financijski profil GNK ASG d\.o\.o\./i);
  const groupSection = findSection(/GNK DINAMO Ltd\. Group Overview/i);

  const cardHints = [
    /Neovisna revizija/i,
    /FILED IN COLORADO/i
  ];

  [financialSection, groupSection].filter(Boolean).forEach(section => {
    [...section.querySelectorAll("div,article,section,.card,.panel")].forEach(candidate => {
      const txt = textOf(candidate);
      if (cardHints.some(rx => rx.test(txt)) && /PREUZMI PDF/i.test(txt)) {
        elevatePdfCard(candidate);
      }
    });
  });
}

const __originalBoot_20260622 = boot;
boot = function() {
  __originalBoot_20260622();
  addYellowGroupOverviewLeft();
  fixPdfCardsAppearance();
};
})();