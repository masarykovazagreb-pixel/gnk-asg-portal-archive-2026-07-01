/**
 * DIZAJN SUSTAV — jedan rječnik za sve webove mreže.
 *
 * Zašto postoji: sedam generatora (portal, gradski kanali, svjetski portali,
 * šest samostalnih webova, arhiva, dnevnik, KANAL) pisalo je svoje boje,
 * razmake i radijuse pod svojim imenima. Ista kartica na dva weba zato nije
 * izgledala isto, a nova zemlja značila je novi CSS.
 *
 * Kako radi: tokeni se NE upisuju kao fiksne boje, nego kao veza na varijable
 * koje web već ima (`--ink`, `--bg`, `--accent`, `--line`). Jedna definicija,
 * a vrijednost se razlikuje po webu — što je i cilj: ista struktura, različiti
 * izvori, gradovi i jezici.
 *
 * Imena su namjerno `--amd-*` (AKTUAL MEDIA design), da ne pregaze varijable
 * koje stranice već koriste (`--am-line` u starijim CSS-ovima).
 */

export const DESIGN_ID = 'am-design-v1';
export const DESIGN_VERSION = 'v1';

/** Boje, mjere i tipografija — jedan popis, jedan izvor. */
export const TOKENS = {
  '--amd-ink': 'var(--ink, #12233a)',
  '--amd-bg': 'var(--bg, #f7f4ec)',
  '--amd-surface': 'var(--surface, var(--panel, rgba(127, 127, 127, .06)))',
  '--amd-accent': 'var(--accent, var(--gold, #e2b857))',
  '--amd-accent2': 'var(--accent2, var(--gold, #74b6ff))',
  '--amd-line': 'var(--line, rgba(128, 128, 128, .28))',
  '--amd-muted': 'var(--muted, var(--soft, rgba(127, 127, 127, .86)))',
  '--amd-measure': '68ch',
  '--amd-radius': '14px',
  '--amd-gap': 'clamp(1rem, 2.2vw, 1.6rem)',
  '--amd-font-serif': 'Georgia, "Times New Roman", serif',
  '--amd-font-sans': 'system-ui, -apple-system, "Segoe UI", sans-serif'
};

/**
 * Token blok. Vraća `<style>` koji stoji u <head> svake javne stranice.
 * `extra` omogućuje webu da nadjača pojedini token (npr. drukčija mjera).
 */
export function designTokensCss(extra = {}) {
  const merged = { ...TOKENS, ...extra };
  const body = Object.entries(merged).map(([name, value]) => `${name}:${value}`).join(';');
  return `<style id="${DESIGN_ID}" data-am-design="${DESIGN_VERSION}">:root{${body}}` +
    /* Osnovna pravila koja vrijede svugdje: fokus se vidi, animacije se poštuju,
       tablice i slike ne izlaze iz okvira. */
    `img,svg,video{max-width:100%}` +
    `:where(a,button,summary,input,select,textarea):focus-visible{outline:2px solid var(--amd-accent);outline-offset:2px}` +
    `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}` +
    `.skip{position:absolute;left:-9999px;top:0;background:#111614;color:#fff;padding:.7rem 1rem;z-index:9999;border-radius:0 0 .45rem 0;font-weight:600;text-decoration:none}.skip:focus,.skip:focus-visible{left:8px;top:8px;outline:2px solid #fff;outline-offset:2px}` +
    `</style>`;
}

/** Ubaci token blok prije `</head>`; drugi prolaz ne mijenja ništa. */
export function withDesignTokens(html, extra = {}) {
  if (String(html).includes(`id="${DESIGN_ID}"`)) return html;
  if (!String(html).includes('</head>')) return html;
  return String(html).replace('</head>', `${designTokensCss(extra)}</head>`);
}

/**
 * Isti tokeni kao vanjski list — za stranice sa strogim CSP-om
 * (`style-src 'self'`), gdje ugrađeni stil ne prolazi. Sadržaj je identičan
 * onome što `designTokensCss` upisuje, samo bez `<style>` omotača.
 */
export function designTokensFile() {
  const body = Object.entries(TOKENS).map(([name, value]) => `${name}:${value}`).join(';');
  return `:root{${body}}` +
    'img,svg,video{max-width:100%}' +
    ':where(a,button,summary,input,select,textarea):focus-visible{outline:2px solid var(--amd-accent);outline-offset:2px}' +
    '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}' +
    '.skip{position:absolute;left:-9999px;top:0;background:#111614;color:#fff;padding:.7rem 1rem;z-index:9999;border-radius:0 0 .45rem 0;font-weight:600;text-decoration:none}.skip:focus,.skip:focus-visible{left:8px;top:8px;outline:2px solid #fff;outline-offset:2px}' +
    '\n';
}

/** Veza na vanjski token list (CSP-safe), idempotentno. */
export function withDesignTokensLink(html, href = '/assets/am-design-v1.css?v=20261024') {
  if (String(html).includes('data-am-design="v1"')) return html;
  if (!String(html).includes('</head>')) return html;
  return String(html).replace('</head>', `<link rel="stylesheet" href="${href}" data-am-design="v1">\n</head>`);
}
