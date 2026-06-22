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



/* GNK_ASG_INDEX_IMAGE_FILL_V1 */
function gnkImageCandidates() {
  return [
    {
      src: "https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png",
      label: "GNK ASG",
      text: "Korporativni identitet"
    },
    {
      src: "https://gnk-asg.hr/r2/seo-gallery/business/gnk-asg-business-corporate-overview.jpg",
      label: "Business",
      text: "Poslovni i korporativni pregled"
    },
    {
      src: "https://gnk-asg.hr/r2/seo-gallery/ai-technology/gnk-asg-ai-technology-network.jpg",
      label: "AI & Tech",
      text: "AI, podaci i digitalna infrastruktura"
    },
    {
      src: "https://gnk-asg.hr/r2/seo-gallery/finance/gnk-asg-financial-market-intelligence.jpg",
      label: "Markets",
      text: "Tržišta, financije i analitika"
    },
    {
      src: "https://gnk-asg.hr/r2/seo-gallery/sport/gnk-asg-sport-global-network.jpg",
      label: "Sport",
      text: "Sport, mreža i međunarodni okvir"
    }
  ];
}

function buildVisualFill(className, title, subtitle, count) {
  const wrap = document.createElement("div");
  wrap.className = `gnk-empty-visual-fill ${className}`;

  const header = document.createElement("div");
  header.className = "gnk-empty-visual-fill-header";

  const titleWrap = document.createElement("div");
  const titleEl = document.createElement("div");
  titleEl.className = "gnk-empty-visual-fill-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "gnk-empty-visual-fill-subtitle";
  subtitleEl.textContent = subtitle;

  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subtitleEl);
  header.appendChild(titleWrap);
  wrap.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "gnk-visual-grid";

  gnkImageCandidates().slice(0, count).forEach(item => {
    const card = document.createElement("div");
    card.className = "gnk-visual-card";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.text;

    const overlay = document.createElement("div");
    overlay.className = "gnk-visual-card-overlay";

    const label = document.createElement("div");
    label.className = "gnk-visual-card-label";
    label.textContent = item.label;

    const text = document.createElement("div");
    text.className = "gnk-visual-card-text";
    text.textContent = item.text;

    overlay.appendChild(label);
    overlay.appendChild(text);
    card.appendChild(img);
    card.appendChild(overlay);
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  return wrap;
}

function insertCommandCentreVisuals() {
  const section = findSection(/Command Centre/i);
  if (!section || section.querySelector(".gnk-command-visuals")) return;

  const targets = [...section.querySelectorAll("div,section,article")].filter(el => {
    const txt = textOf(el);
    const rect = el.getBoundingClientRect();
    return rect.height > 220 && rect.width > 260 && !txt && !el.querySelector("img");
  });

  const host = targets.sort((a,b) => (b.getBoundingClientRect().height * b.getBoundingClientRect().width) - (a.getBoundingClientRect().height * a.getBoundingClientRect().width))[0];

  if (host) {
    host.classList.add("gnk-command-visuals");
    host.appendChild(buildVisualFill(
      "gnk-command-visuals",
      "Vizualni pregled",
      "Odabrani GNK ASG vizuali u praznom prostoru modula",
      3
    ));
    return;
  }

  const fallback = [...section.querySelectorAll("div,section,article,.panel,.card")]
    .sort((a,b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];

  if (fallback && !fallback.querySelector(".gnk-command-visuals")) {
    const fill = buildVisualFill(
      "gnk-command-visuals",
      "Vizualni pregled",
      "Odabrani GNK ASG vizuali u praznom prostoru modula",
      3
    );
    fallback.appendChild(fill);
  }
}

function insertPublicSourcesVisuals() {
  const section = findSection(/Javni izvori i službeni registri|Public sources and official registers/i);
  if (!section || section.querySelector(".gnk-public-visuals")) return;

  const cards = [...section.querySelectorAll("div,section,article,.card")]
    .filter(el => /OTVORI IZVOR|OPEN SOURCE/i.test(textOf(el)));

  if (cards.length < 2) return;

  const lastCard = cards[cards.length - 1];
  const rowParent = lastCard.parentElement;

  if (!rowParent) return;

  const fill = buildVisualFill(
    "gnk-public-visuals",
    "GNK ASG vizuali",
    "Vizualna dopuna praznih prostora u sekciji javnih izvora",
    2
  );

  rowParent.insertAdjacentElement("afterend", fill);
}

const __originalBoot_ImageFill = boot;
boot = function() {
  __originalBoot_ImageFill();
  insertCommandCentreVisuals();
  insertPublicSourcesVisuals();
};

/* GNK_ASG_FORCE_AUDIT_TEXT_BLACK_V3 */
function forceAuditTextBlack() {
  const requiredTexts = [
    "Neovisna revizija",
    "Izvješće neovisnog revizora i financijski izvještaji",
    "S bilješkama koje uključuju konsolidirane financijske podatke GNK DINAMO Ltd. Group.",
    "Independent audit",
    "Independent auditor report and financial statements"
  ];

  const candidates = [
    ...document.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,p,span,div,strong,small,a,button"
    )
  ];

  candidates.forEach(node => {
    const value = String(node.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    const matches = requiredTexts.some(text =>
      value === text || value.includes(text)
    );

    if (!matches) return;

    node.setAttribute("data-gnk-audit-black-v3", "1");
    node.style.setProperty("color", "#111827", "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("text-shadow", "none", "important");
    node.style.setProperty("-webkit-text-fill-color", "#111827", "important");

    node.querySelectorAll("*").forEach(child => {
      child.style.setProperty("color", "#111827", "important");
      child.style.setProperty("opacity", "1", "important");
      child.style.setProperty("text-shadow", "none", "important");
      child.style.setProperty("-webkit-text-fill-color", "#111827", "important");
    });

    let parent = node.parentElement;

    for (let level = 0; parent && level < 3; level++, parent = parent.parentElement) {
      const parentText = String(parent.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      if (
        parentText.includes("Neovisna revizija") &&
        parentText.includes("Izvješće neovisnog revizora")
      ) {
        parent.classList.add("gnk-pdf-card-blacktext");
      }
    }
  });
}

const __gnkOriginalBootAuditBlackV3 = boot;

boot = function() {
  __gnkOriginalBootAuditBlackV3();
  forceAuditTextBlack();

  [100, 400, 1000, 2200].forEach(delay => {
    setTimeout(forceAuditTextBlack, delay);
  });
};

/* GNK_ASG_FORCE_GROUP_PROFILE_BLACK_V4 */
function forceGroupProfileBlackV4() {
  const exactTexts = [
    "Parent company",
    "Tvrtka",
    "GNK DINAMO Ltd.",
    "Sjedište",
    "Boulder, Colorado, USA",
    "Entity ID",
    "20238180649",
    "Ovlašteni predstavnik",
    "Nermin Sefić",
    "Stvarni vlasnik / UBO grupe",
    "Broj društava u grupi",
    "33, uključujući GNK DINAMO Ltd."
  ];

  const section = findSection(/GNK DINAMO Ltd\. Group Overview/i);
  if (!section) return;

  const matchingNodes = [
    ...section.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,p,span,div,strong,small,a,td,li"
    )
  ].filter(node => {
    const value = String(node.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    return exactTexts.includes(value);
  });

  matchingNodes.forEach(node => {
    node.setAttribute("data-gnk-group-black-v4", "1");
    node.style.setProperty("color", "#111827", "important");
    node.style.setProperty("-webkit-text-fill-color", "#111827", "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("text-shadow", "none", "important");

    node.querySelectorAll("*").forEach(child => {
      child.style.setProperty("color", "#111827", "important");
      child.style.setProperty("-webkit-text-fill-color", "#111827", "important");
      child.style.setProperty("opacity", "1", "important");
      child.style.setProperty("text-shadow", "none", "important");
    });
  });

  const parentNode = matchingNodes.find(node =>
    String(node.textContent || "").replace(/\s+/g, " ").trim() === "Parent company"
  );

  let card = parentNode;

  while (card && card !== section) {
    const cardText = String(card.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (
      cardText.includes("Parent company") &&
      cardText.includes("Entity ID") &&
      cardText.includes("Broj društava u grupi")
    ) {
      const rect = card.getBoundingClientRect();

      if (rect.width > 260 && rect.height > 200) {
        card.classList.add("gnk-group-profile-light-card");
        break;
      }
    }

    card = card.parentElement;
  }
}

const __gnkOriginalBootGroupProfileBlackV4 = boot;

boot = function() {
  __gnkOriginalBootGroupProfileBlackV4();
  forceGroupProfileBlackV4();

  [100, 400, 1000, 2200].forEach(delay => {
    setTimeout(forceGroupProfileBlackV4, delay);
  });
};

/* GNK_ASG_FORCE_PDF_BUTTON_BLACK_V5 */
function forcePdfButtonBlackV5() {
  [...document.querySelectorAll("a,button,span,div")].forEach(node => {
    const value = String(node.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    if (value !== "PREUZMI PDF ↓" && value !== "PREUZMI PDF" && value !== "DOWNLOAD PDF ↓" && value !== "DOWNLOAD PDF") {
      return;
    }

    const button = node.closest("a,button") || node;

    button.classList.add("gnk-force-pdf-button-black-v5");
    button.style.setProperty("color", "#000000", "important");
    button.style.setProperty("-webkit-text-fill-color", "#000000", "important");
    button.style.setProperty("text-shadow", "none", "important");
    button.style.setProperty("opacity", "1", "important");

    button.querySelectorAll("*").forEach(child => {
      child.style.setProperty("color", "#000000", "important");
      child.style.setProperty("-webkit-text-fill-color", "#000000", "important");
      child.style.setProperty("fill", "#000000", "important");
      child.style.setProperty("text-shadow", "none", "important");
      child.style.setProperty("opacity", "1", "important");
    });
  });
}

const __gnkOriginalBootPdfButtonBlackV5 = boot;

boot = function() {
  __gnkOriginalBootPdfButtonBlackV5();
  forcePdfButtonBlackV5();

  [100,400,1000,2200].forEach(delay => {
    setTimeout(forcePdfButtonBlackV5, delay);
  });
};


/* GNK_ASG_INDEX_POLISH_V6_FIXED_START */

const GNK_V6_FIXED_IMAGES = [{"src":"/assets/objave/seo-20/upravljanje-likvidnoscu-u-rastucoj-kompaniji-gnk-asg-nermin-sefic.jpg","alt":"Poslovanje i međunarodna mreža","title":"Poslovanje i međunarodna mreža"},{"src":"/assets/seo-gallery/gnk-asg-financije-poslovanje-009.jpg","alt":"Tehnologija i tržišna inteligencija","title":"Tehnologija i tržišna inteligencija"},{"src":"/assets/seo-gallery/gnk-asg-infrastruktura-sport-odrzivost-009.jpg","alt":"Korporativna galerija GNK ASG","title":"Korporativna galerija GNK ASG"}];

function gnkV6FixedText(element) {
  return String(element && element.textContent || "")
    .replace(/\s+/g," ")
    .trim();
}

function gnkV6FixedFindSection(pattern) {
  const nodes = Array.from(
    document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,strong,span")
  );

  const heading = nodes.find(node => pattern.test(gnkV6FixedText(node)));

  if (!heading) {
    return null;
  }

  let current = heading;
  let fallback = heading.parentElement;

  for (let level = 0; current && current !== document.body && level < 9; level++) {
    const rect = current.getBoundingClientRect();

    if (rect.width > Math.min(620,window.innerWidth * .68) && rect.height > 220) {
      return current;
    }

    fallback = current;
    current = current.parentElement;
  }

  return fallback;
}

function gnkV6FixedRgb(value) {
  const match = String(value || "").match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i
  );

  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4])
  };
}

function gnkV6FixedLuminance(color) {
  if (!color) {
    return .5;
  }

  const channel = value => {
    const normalized = value / 255;

    return normalized <= .03928
      ? normalized / 12.92
      : Math.pow((normalized + .055) / 1.055,2.4);
  };

  return .2126 * channel(color.r) +
    .7152 * channel(color.g) +
    .0722 * channel(color.b);
}

function gnkV6FixedSurfaceColor(element) {
  let current = element;

  for (let level = 0; current && level < 9; level++) {
    const color = gnkV6FixedRgb(
      getComputedStyle(current).backgroundColor
    );

    if (color && color.a > .2) {
      return color;
    }

    current = current.parentElement;
  }

  return {r:255,g:255,b:255,a:1};
}

function gnkV6FixedContrast(section) {
  if (!section) {
    return;
  }

  Array.from(
    section.querySelectorAll(
      "section,article,.card,.panel,[class*='card'],[class*='panel']"
    )
  ).forEach(surface => {
    const rect = surface.getBoundingClientRect();

    if (rect.width < 120 || rect.height < 45) {
      return;
    }

    if (
      surface.closest(
        ".gnk-pdf-card-blacktext,.gnk-group-profile-light-card"
      )
    ) {
      return;
    }

    const luminance = gnkV6FixedLuminance(
      gnkV6FixedSurfaceColor(surface)
    );

    surface.classList.remove(
      "gnk-v6-dark-surface",
      "gnk-v6-light-surface"
    );

    surface.classList.add(
      luminance < .45
        ? "gnk-v6-dark-surface"
        : "gnk-v6-light-surface"
    );
  });
}

function gnkV6FixedGallery(className,title) {
  const gallery = document.createElement("div");
  gallery.className = "gnk-v6-gallery " + className;

  const heading = document.createElement("div");
  heading.className = "gnk-v6-gallery-title";
  heading.textContent = title;

  const grid = document.createElement("div");
  grid.className = "gnk-v6-gallery-grid";

  GNK_V6_FIXED_IMAGES.forEach(item => {
    const figure = document.createElement("figure");
    figure.className = "gnk-v6-gallery-card";

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = item.alt;
    image.loading = "lazy";
    image.decoding = "async";

    image.addEventListener("error",() => {
      figure.remove();
    },{once:true});

    const caption = document.createElement("figcaption");
    caption.className = "gnk-v6-gallery-caption";
    caption.textContent = item.title;

    figure.appendChild(image);
    figure.appendChild(caption);
    grid.appendChild(figure);
  });

  gallery.appendChild(heading);
  gallery.appendChild(grid);

  return gallery;
}

function gnkV6FixedSources() {
  const section = gnkV6FixedFindSection(
    /Javni izvori i službeni registri|Public sources and official registers/i
  );

  if (!section) {
    return;
  }

  Array.from(section.querySelectorAll("div,section,article")).forEach(container => {
    const cards = Array.from(container.children).filter(child =>
      /OTVORI IZVOR|OPEN SOURCE/i.test(gnkV6FixedText(child))
    );

    if (cards.length >= 2) {
      container.classList.add("gnk-v6-source-grid");
    }
  });

  section.querySelectorAll(".gnk-v6-fixed-public-gallery").forEach(node => {
    node.remove();
  });

  section.appendChild(
    gnkV6FixedGallery(
      "gnk-v6-fixed-public-gallery",
      document.documentElement.lang === "en"
        ? "GNK ASG corporate gallery"
        : "GNK ASG korporativna galerija"
    )
  );
}

function gnkV6FixedCommandCentre() {
  const section = gnkV6FixedFindSection(/Command Centre/i);

  if (!section) {
    return;
  }

  section.querySelectorAll(
    ".gnk-v6-fixed-command-gallery"
  ).forEach(node => {
    node.remove();
  });

  const candidates = Array.from(
    section.querySelectorAll("div,section,article")
  ).filter(element => {
    const rect = element.getBoundingClientRect();
    const textLength = gnkV6FixedText(element).length;

    return rect.width > 280 &&
      rect.height > 180 &&
      textLength < 180 &&
      !element.querySelector("img") &&
      !element.querySelector("form,input,textarea,select");
  }).sort((first,second) => {
    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();

    return secondRect.width * secondRect.height -
      firstRect.width * firstRect.height;
  });

  const host = candidates[0] || section;

  host.appendChild(
    gnkV6FixedGallery(
      "gnk-v6-fixed-command-gallery",
      document.documentElement.lang === "en"
        ? "GNK ASG visual overview"
        : "GNK ASG vizualni pregled"
    )
  );
}

function gnkV6FixedRun() {
  const sections = [
    gnkV6FixedFindSection(
      /Financijski profil GNK ASG d\.o\.o\.|Financial profile/i
    ),
    gnkV6FixedFindSection(
      /GNK DINAMO Ltd\. Group Overview/i
    ),
    gnkV6FixedFindSection(
      /Command Centre/i
    ),
    gnkV6FixedFindSection(
      /Javni izvori i službeni registri|Public sources and official registers/i
    )
  ].filter(Boolean);

  Array.from(new Set(sections)).forEach(
    gnkV6FixedContrast
  );

  gnkV6FixedCommandCentre();
  gnkV6FixedSources();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    gnkV6FixedRun,
    {once:true}
  );
} else {
  gnkV6FixedRun();
}

window.addEventListener(
  "load",
  gnkV6FixedRun,
  {once:true}
);

setTimeout(gnkV6FixedRun,400);
setTimeout(gnkV6FixedRun,1200);

/* GNK_ASG_INDEX_POLISH_V6_FIXED_END */


/* GNK_ASG_REMOVE_CORPORATE_GALLERY_V9_START */

const GNK_ASG_REMOVE_CORPORATE_GALLERY_V9 = true;

function gnkRemoveCorporateGalleryV9() {
  const selectors = [
    ".gnk-v6-public-gallery",
    ".gnk-v6-fixed-public-gallery",
    ".gnk-empty-visual-fill.gnk-public-visuals",
    ".gnk-v6-gallery.gnk-v6-public-gallery",
    ".gnk-v6-gallery.gnk-v6-fixed-public-gallery",
    ".gnk-v6-gallery.gnk-v6-fixed-public-gallery",
    ".gnk-v6-public-gallery",
    ".gnk-v6-fixed-public-gallery"
  ];

  document.querySelectorAll(selectors.join(",")).forEach(element => {
    element.remove();
  });

  const titles = [
    "gnk asg korporativna galerija",
    "gnk asg corporate gallery"
  ];

  document.querySelectorAll(
    "h1,h2,h3,h4,h5,h6,p,span,strong,div"
  ).forEach(element => {
    const value = String(element.textContent || "")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();

    if (!titles.includes(value)) {
      return;
    }

    let block = element.closest(
      ".gnk-v6-gallery," +
      ".gnk-empty-visual-fill," +
      ".gnk-public-visuals," +
      ".gnk-v6-public-gallery," +
      ".gnk-v6-fixed-public-gallery"
    );

    if (!block) {
      let current = element.parentElement;

      for (let level = 0; current && level < 6; level++) {
        const currentText = String(current.textContent || "")
          .replace(/\s+/g," ")
          .trim()
          .toLowerCase();

        const imageCount = current.querySelectorAll("img").length;
        const rect = current.getBoundingClientRect();

        if (
          titles.some(title => currentText.includes(title)) &&
          imageCount >= 1 &&
          rect.width > 250
        ) {
          block = current;
          break;
        }

        current = current.parentElement;
      }
    }

    if (block) {
      block.remove();
    }
  });
}

try {
  if (typeof insertPublicSourcesVisuals === "function") {
    insertPublicSourcesVisuals = function() {
      gnkRemoveCorporateGalleryV9();
    };
  }

  if (typeof gnkV6FillPublicSources === "function") {
    gnkV6FillPublicSources = function() {
      gnkRemoveCorporateGalleryV9();
    };
  }

  if (typeof gnkV6FixedSources === "function") {
    gnkV6FixedSources = function() {
      gnkRemoveCorporateGalleryV9();
    };
  }
} catch (error) {}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    gnkRemoveCorporateGalleryV9,
    {once:true}
  );
} else {
  gnkRemoveCorporateGalleryV9();
}

window.addEventListener(
  "load",
  gnkRemoveCorporateGalleryV9,
  {once:true}
);

[100,300,700,1200,2200,4000].forEach(delay => {
  setTimeout(gnkRemoveCorporateGalleryV9,delay);
});

new MutationObserver(() => {
  gnkRemoveCorporateGalleryV9();
}).observe(document.documentElement,{
  childList:true,
  subtree:true
});

/* GNK_ASG_REMOVE_CORPORATE_GALLERY_V9_END */
})();