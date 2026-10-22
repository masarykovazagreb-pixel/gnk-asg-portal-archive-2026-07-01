/**
 * GNK ASG MREŽA — registar neovisnih stranica.
 *
 * Svaka stranica ima vlastiti hosting (Cloudflare Pages projekt), vlastiti
 * sitemap, feed i robots.txt, ali jedno uredništvo: AKTUAL MEDIA, urednik
 * Nermin Sefić. Ovdje je jedini popis — iz njega se grade stranice, mrežni
 * hub na gnk-asg.hr, trake i testovi. Ako se doda šesta stranica, dodaje se
 * samo ovdje i sve ostalo je posljedica.
 */

export const NETWORK_HUB_HR = 'https://gnk-asg.hr/mreza/';
export const NETWORK_HUB_EN = 'https://gnk-asg.hr/en/network/';
export const MAIN_SITE = 'https://gnk-asg.hr/';

/* Boje su dio identiteta: svaka stranica ima svoj akcent, ali istu tamnu
   podlogu, isti ritam i istu tipografiju — mreža se prepoznaje po strukturi,
   a razlikuje po boji. */
export const SITES = [
  {
    slug: 'bor-usa',
    name: 'BOR USA',
    domain: 'gnk-bor-usa.pages.dev',
    base: 'https://gnk-bor-usa.pages.dev/',
    accent: '#e2453c',
    accent2: '#f3c26b',
    bg: '#0a0709',
    lang: 'hr',
    tagline: {
      hr: 'Borilački sport u Sjedinjenim Državama: regulativa, sigurnost i kako se čita borba.',
      en: 'Combat sports in the United States: regulation, safety and how to read a fight.',
    },
    hashtags: ['#BorUSA', '#MMA', '#Boks', '#AktualMedia'],
    topics: ['regulativa', 'sigurnost', 'karta'],
  },
  {
    slug: 'kosarka',
    name: 'KOŠARKA 360',
    domain: 'gnk-kosarka.pages.dev',
    base: 'https://gnk-kosarka.pages.dev/',
    accent: '#ef7a1e',
    accent2: '#f7d27a',
    bg: '#0b0704',
    lang: 'hr',
    tagline: {
      hr: 'Košarka bez šuma: kako se čita sezona, što broje brojke i zašto regionalna liga nije mala.',
      en: 'Basketball without noise: how to read a season, what the numbers count, and why the regional league matters.',
    },
    hashtags: ['#Kosarka360', '#NBA', '#ABA', '#AktualMedia'],
    topics: ['sezona', 'europa', 'brojke'],
  },
  {
    slug: 'scena-znanosti',
    name: 'SCENA ZNANOSTI',
    domain: 'gnk-scena-znanosti.pages.dev',
    base: 'https://gnk-scena-znanosti.pages.dev/',
    accent: '#38bdf8',
    accent2: '#a7f3d0',
    bg: '#04090f',
    lang: 'hr',
    tagline: {
      hr: 'Kako znanost stvarno nastaje: recenzija, preprints, ispravci i ono što se ne objavi.',
      en: 'How science actually happens: peer review, preprints, corrections, and what never gets published.',
    },
    hashtags: ['#ScenaZnanosti', '#Znanost', '#Preprint', '#AktualMedia'],
    topics: ['recenzija', 'preprinti', 'reprodukcija'],
  },
  {
    slug: 'step-buducnosti',
    name: 'STEP BUDUĆNOSTI',
    domain: 'gnk-step-buducnosti.pages.dev',
    base: 'https://gnk-step-buducnosti.pages.dev/',
    accent: '#a78bfa',
    accent2: '#f472b6',
    bg: '#0a0614',
    lang: 'hr',
    tagline: {
      hr: 'Ples, step i pokret kao tehnologija: sport, ozljede, snimanje pokreta i pozornica.',
      en: 'Dance, step and movement as technology: sport, injury, motion capture and the stage.',
    },
    hashtags: ['#StepBuducnosti', '#Ples', '#Pokret', '#AktualMedia'],
    topics: ['sport', 'tehnologija', 'ozljede'],
  },
  {
    slug: 'zdravlje',
    name: 'ZDRAVLJE 360',
    domain: 'gnk-zdravlje.pages.dev',
    base: 'https://gnk-zdravlje.pages.dev/',
    accent: '#34d399',
    accent2: '#e6f5c9',
    bg: '#05100c',
    lang: 'hr',
    tagline: {
      hr: 'Zdravlje bez čuda: prevencija, san, kretanje i kako se čita medicinska studija.',
      en: 'Health without miracles: prevention, sleep, movement, and how to read a medical study.',
    },
    hashtags: ['#Zdravlje360', '#Prevencija', '#JavnoZdravlje', '#AktualMedia'],
    topics: ['prevencija', 'san', 'studija'],
  },
  {
    slug: 'izbori-srbija',
    name: 'IZBORI U SRBIJI',
    domain: 'gnk-izbori-srbija.pages.dev',
    base: 'https://gnk-izbori-srbija.pages.dev/',
    accent: '#ef4444',
    accent2: '#60a5fa',
    bg: '#0a0b10',
    lang: 'hr',
    tagline: {
      hr: 'Nadzorni desk: što mediji u Srbiji, Hrvatskoj, BiH i SAD-u objavljuju o izborima — s izvorom i datumom.',
      en: 'A monitoring desk: what media in Serbia, Croatia, Bosnia and the US publish about the election — with source and date.',
    },
    hashtags: ['#IzboriSrbija', '#Srbija', '#NadzorniDesk', '#AktualMedia'],
    topics: ['statistika', 'sigurnost', 'izvori'],
    temporary: true,
  },
];

export const siteBySlug = (slug) => SITES.find((site) => site.slug === slug);

export const pagePath = (slug, lang) => {
  if (slug === '') return lang === 'en' ? '/en/' : '/';
  return lang === 'en' ? `/en/${slug}/` : `/${slug}/`;
};

export function siteBase(site) {
  const key = `SITE_BASE_${site.slug.toUpperCase().replace(/-/g, '_')}`;
  return (process.env[key] || site.base).replace(/\/$/, '');
}

export const absoluteUrl = (site, slug, lang) => `${siteBase(site)}${pagePath(slug, lang)}`;
