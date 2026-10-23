/**
 * JEDAN ENTITETSKI GRAF ZA CIJELU MREŽU — `network-entity v1`.
 *
 * Tražilica ne povezuje stranice po boji ni po slogu, nego po entitetima:
 * tko izdaje, tko uređuje, što je s čime povezano. Zato svaka stranica mreže
 * nosi isti, kratki graf s četiri čvora i stalnim `@id` adresama:
 *
 *   https://gnk-asg.hr/#gnk-asg            GNK ASG d.o.o. (Zagreb)
 *   https://gnk-asg.hr/#gnk-dinamo-ltd     GNK DINAMO Ltd. (Boulder, Colorado)
 *   https://gnk-asg.hr/gnk-aktual/#aktual-media   AKTUAL MEDIA
 *   https://gnk-asg.hr/#nermin-sefic       Nermin Sefić, glavni urednik
 *
 * Pravila koja se ne mijenjaju:
 *  - GNK ASG d.o.o. i GNK DINAMO Ltd. su dva odvojena pravna lica; veza je
 *    `parentOrganization` / `affiliation`, nikad stapanje u jedan čvor;
 *  - GNK DINAMO Ltd. nije nogometni klub — to piše u
 *    `disambiguatingDescription`, jer je zabuna stvarna i mjerljiva;
 *  - `@id` adrese su apsolutne i iste na svakoj stranici, pa se graf spaja
 *    bez obzira na to s koje je domene stranica otvorena;
 *  - nema izmišljenih podataka: sve što piše dolazi iz javnog korporativnog
 *    profila opisanog na /pojasnjenje-gnk-asg-i-gnk-dinamo-ltd/.
 *
 * Test: tests/test-network-entity-v1.mjs.
 */

export const SITE = 'https://gnk-asg.hr';
export const ORG_ASG = `${SITE}/#gnk-asg`;
export const ORG_DINAMO = `${SITE}/#gnk-dinamo-ltd`;
export const ORG_AKTUAL = `${SITE}/gnk-aktual/#aktual-media`;
export const PERSON = `${SITE}/#nermin-sefic`;
export const EXPLAINER = `${SITE}/pojasnjenje-gnk-asg-i-gnk-dinamo-ltd/`;
export const LINKEDIN = 'https://www.linkedin.com/in/nermin-sefic-18573196';

/** Hashtagovi koji stoje na svakoj stranici (vidljivi i u article:tag). */
export const HASHTAGS = ['#AKTUALMEDIA', '#GNKASG', '#NerminSefić'];

const organizationAsg = () => ({
  '@type': 'Organization',
  '@id': ORG_ASG,
  name: 'GNK ASG d.o.o.',
  legalName: 'GNK ASG d.o.o.',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-gnk-asg-gold.svg`, width: 512, height: 512 },
  address: { '@type': 'PostalAddress', addressLocality: 'Zagreb', addressCountry: 'HR' },
  founder: { '@id': PERSON },
  parentOrganization: { '@id': ORG_DINAMO },
  sameAs: [`${SITE}/`, `${SITE}/gnk-aktual/`, `${SITE}/nermin-sefic/`, `${SITE}/mreza/`, LINKEDIN]
});

const organizationDinamo = () => ({
  '@type': 'Organization',
  '@id': ORG_DINAMO,
  name: 'GNK DINAMO Ltd.',
  url: EXPLAINER,
  address: { '@type': 'PostalAddress', addressLocality: 'Boulder', addressRegion: 'Colorado', addressCountry: 'US' },
  /* Zabuna s nogometnim klubom je stvarna; ovdje je jasno razdvojena. */
  disambiguatingDescription:
    'Matično društvo grupe sa sjedištem u Boulderu, Colorado. Nije nogometni klub i ne objavljuje sportski sadržaj.',
  employee: { '@id': PERSON },
  subjectOf: { '@type': 'WebPage', url: EXPLAINER, name: 'Pojašnjenje: GNK ASG d.o.o. i GNK DINAMO Ltd.' }
});

const organizationAktual = (networkUrls = []) => ({
  '@type': 'NewsMediaOrganization',
  '@id': ORG_AKTUAL,
  name: 'AKTUAL MEDIA',
  alternateName: ['AKTUAL MEDIA d.o.o.', 'Aktual Media', 'Aktual medija', 'AKTUAL MEDIA KANAL'],
  url: `${SITE}/gnk-aktual/`,
  parentOrganization: { '@id': ORG_ASG },
  editor: { '@id': PERSON },
  publishingPrinciples: `${SITE}/metodologija/`,
  /* Mreža se popisuje na hubu; ovdje je dovoljno nekoliko stalnih adresa. */
  sameAs: [...new Set([
    `${SITE}/mreza/`,
    'https://gnk-asg-arhiva.pages.dev/',
    'https://gnk-asg-dnevnik.pages.dev/',
    'https://gnk-asg-tjednik.pages.dev/',
    ...networkUrls
  ])].slice(0, 12)
});

const person = () => ({
  '@type': 'Person',
  '@id': PERSON,
  name: 'Nermin Sefić',
  alternateName: ['Nermin Sefic', 'Sefic Nermin', 'Sefić Nermin'],
  jobTitle: 'Glavni urednik AKTUAL MEDIA, direktor GNK ASG d.o.o.',
  url: `${SITE}/nermin-sefic/`,
  image: `${SITE}/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp`,
  worksFor: [{ '@id': ORG_ASG }, { '@id': ORG_AKTUAL }],
  affiliation: { '@id': ORG_DINAMO },
  sameAs: [`${SITE}/nermin-sefic/`, `${SITE}/autorske-objave/`, LINKEDIN],
  knowsAbout: ['novinarstvo', 'uređivanje', 'financije', 'revizija', 'korporativno upravljanje', 'umjetna inteligencija', 'izvoz softvera']
});

/**
 * Graf za jednu stranicu. `language` je 'hr' ili 'en'; ne mijenja `@id`
 * adrese, samo jezik opisa.
 */
export function entityGraph({ language = 'hr', networkUrls = [], compact = true } = {}) {
  const graph = [organizationAsg(), organizationDinamo(), organizationAktual(networkUrls), person()];
  if (!compact) return { '@context': 'https://schema.org', '@graph': graph };

  /* Kratka inačica: samo identitet i veze. Puni opis stoji na stranicama
     entiteta (/nermin-sefic/, /gnk-aktual/, /mreza/, naslovnice), a ovdje je
     dovoljno da tražilica poveže stranicu s istim `@id` čvorovima. Tako
     graf ne udvostručuje veličinu svake od sedam tisuća stranica. */
  const slim = graph.map((node) => {
    const keep = { '@type': node['@type'], '@id': node['@id'], name: node.name };
    if (node.alternateName) keep.alternateName = node.alternateName.slice(0, 3);
    if (node.jobTitle) keep.jobTitle = node.jobTitle;
    if (node.url) keep.url = node.url;
    if (node.parentOrganization) keep.parentOrganization = node.parentOrganization;
    if (node.worksFor) keep.worksFor = node.worksFor;
    if (node.affiliation) keep.affiliation = node.affiliation;
    if (node.founder) keep.founder = node.founder;
    if (node.editor) keep.editor = node.editor;
    return keep;
  });
  return { '@context': 'https://schema.org', '@graph': slim };
}

/** Isti graf, spreman za `<script type="application/ld+json">`. */
export function entityGraphJson(options = {}) {
  return JSON.stringify(entityGraph(options));
}
