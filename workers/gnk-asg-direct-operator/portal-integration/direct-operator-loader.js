/**
 * GNK ASG Direct Operator frontend loader.
 * Dodaje se na postojeći portal da povlači konfiguraciju iz Cloudflare KV endpointa.
 */
(async function loadGnkAsgDirectOperator() {
  try {
    const response = await fetch("/data/operator-public.json", { cache: "no-store" });
    if (!response.ok) return;

    const data = await response.json();
    const config = data.siteConfig || {};
    const status = data.status || {};
    const mediaKit = data.mediaKit || {};
    const theme = config.theme || {};

    const vars = {
      navy: "--navy",
      royalBlue: "--blue",
      gold: "--gold",
      cream: "--cream",
      paper: "--paper",
      ink: "--ink",
      muted: "--muted",
      line: "--line"
    };

    for (const [key, cssVar] of Object.entries(vars)) {
      if (theme[key]) document.documentElement.style.setProperty(cssVar, theme[key]);
    }

    document.querySelectorAll("[data-operator-brand-primary]").forEach(el => {
      el.textContent = config.brand?.primaryName || el.textContent;
    });

    document.querySelectorAll("[data-operator-brand-secondary]").forEach(el => {
      el.textContent = config.brand?.secondaryName || el.textContent;
    });

    document.querySelectorAll("[data-operator-homepage-notice]").forEach(el => {
      el.textContent = config.homepage?.notice || el.textContent;
    });

    document.querySelectorAll("[data-operator-status]").forEach(el => {
      el.textContent = status.label || el.textContent;
      el.setAttribute("data-state", status.state || "");
    });

    document.querySelectorAll("[data-operator-logo='asg']").forEach(el => {
      if (config.logos?.asg?.logoSvg) el.innerHTML = config.logos.asg.logoSvg;
    });

    document.querySelectorAll("[data-operator-logo='dinamoLtd']").forEach(el => {
      if (config.logos?.dinamoLtd?.logoSvg) el.innerHTML = config.logos.dinamoLtd.logoSvg;
    });

    window.GNK_ASG_OPERATOR_PUBLIC = { siteConfig: config, status, mediaKit };
  } catch (error) {
    console.warn("GNK ASG Direct Operator config not loaded.", error);
  }
})();
