/**
 * SVJETSKA IZDANJA — registar devet samostalnih portala.
 *
 * Devet gradova izvan regije (Nairobi, Jakarta, New York, São Paulo, Sydney,
 * Singapur, Kairo, Tokio, Peking) dosad su živjeli samo kao podstranice
 * gnk-asg.hr/kanal/<grad>/. Ovim registrom dobivaju vlastitu adresu, vlastiti
 * sitemap, feed i robots.txt — ali isti sadržaj, isti izvor i istog urednika.
 *
 * Pravila:
 *  - popis je jedini izvor: build, mreža, agenti i testovi čitaju odavde;
 *  - adresa se može preskočiti env varijablom WORLD_BASE_<ID> (pregled u
 *    sandboxu), ali javna adresa ostaje *.pages.dev;
 *  - portali ne prepisuju članke: svaki zapis vodi na kanonski osvrt na
 *    gnk-asg.hr, pa nema dvostrukog sadržaja među domenama.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { channels } = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8'));

/** Devet svjetskih izdanja — redom kako se pojavljuju u kanalu. */
export const WORLD_IDS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];

/** Kontinenti: pokrivenost je dio ugovora, ne marketinška tvrdnja. */
export const CONTINENTS = {
  nairobi: { hr: 'Afrika', en: 'Africa' },
  jakarta: { hr: 'Azija', en: 'Asia' },
  newyork: { hr: 'Sjeverna Amerika', en: 'North America' },
  saopaulo: { hr: 'Južna Amerika', en: 'South America' },
  sydney: { hr: 'Oceanija', en: 'Oceania' },
  singapur: { hr: 'Azija', en: 'Asia' },
  kairo: { hr: 'Afrika', en: 'Africa' },
  tokio: { hr: 'Azija', en: 'Asia' },
  peking: { hr: 'Azija', en: 'Asia' }
};

export const MAIN = 'https://gnk-asg.hr';
export const AKTUAL = `${MAIN}/gnk-aktual/`;
export const HUB_HR = `${MAIN}/mreza/`;
export const HUB_EN = `${MAIN}/en/network/`;

const slug = (id) => `world-${id}`;

export const WORLD_PORTALS = WORLD_IDS.map((id) => {
  const channel = channels.find((item) => item.id === id);
  if (!channel) throw new Error(`Svjetsko izdanje "${id}" ne postoji u apps/region/channels.json`);
  const domain = `gnk-world-${id}.pages.dev`;
  return {
    id,
    slug: slug(id),
    domain,
    /* Javna adresa projekta. Env varijabla služi samo lokalnom pregledu. */
    base: `https://${domain}/`,
    name: channel.title,
    city: channel.city,
    cityEn: channel.cityEn || channel.city,
    cityNative: channel.cityNative || channel.cityEn || channel.city,
    countryNative: channel.countryNative || channel.countryEn || channel.country,
    country: channel.country,
    countryEn: channel.countryEn || channel.country,
    continent: CONTINENTS[id],
    lang: channel.lang,
    locale: channel.locale,
    timezone: channel.timezone,
    palette: channel.palette,
    hashtags: channel.hashtags,
    sources: channel.sources || [],
    /* Kanonski osvrti žive pod glavnom domenom — portal ih ne kopira. */
    sourceBase: channel.base,
    englishBase: `${channel.base}en/`,
    label: { hr: channel.city, en: channel.cityEn || channel.city },
    note: {
      hr: `Svjetsko izdanje · ${channel.country}`,
      en: `World edition · ${channel.countryEn || channel.country}`
    }
  };
});

export const WORLD_BY_ID = new Map(WORLD_PORTALS.map((portal) => [portal.id, portal]));

/** Adresa portala: env override (pregled), inače javna *.pages.dev adresa. */
export function portalBase(portal) {
  const key = `WORLD_BASE_${portal.id.toUpperCase()}`;
  const value = process.env[key];
  return (value || portal.base).replace(/\/+$/, '');
}

/** Apsolutna adresa stranice na portalu. */
export const portalUrl = (portal, path = '') => `${portalBase(portal)}/${path}`;

/** Kanonski osvrt na glavnoj domeni za pojedini zapis. */
export const reviewUrl = (portal, item) => `${portal.sourceBase}clanak/${item.slug}/`;

/** Popis kontinenata koje mreža stvarno pokriva (za test i dokumentaciju). */
export const CONTINENT_LIST = [...new Set(WORLD_PORTALS.map((portal) => portal.continent.hr))];
