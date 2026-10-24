/**
 * JEDAN ZNAK — jedan izvor.
 *
 * Znak kuće (slovo A na tamnoplavoj podlozi, zlatna crta ispod) postoji kao
 * datoteka `apps/shared/brand/favicon.svg`. Generatori ga ne crtaju svaki za
 * sebe: sedam generatora dosad je crtalo sedam slova (B za Beograd, N za
 * Nairobi, K za Kanal), pa je ista mreža na karticama preglednika izgledala
 * kao trideset i jedno različito izdanje.
 *
 * Tko gradi stranicu, uvozi `FAVICON_SVG` i upiše ga pod `assets/favicon.svg`;
 * `MARK_SVG` je isti crtež u većem formatu za zaglavlje i podnožje.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const BRAND_NAME = 'AKTUAL MEDIA';
export const BRAND_LEGAL = 'AKTUAL MEDIA d.o.o.';
export const BRAND_ID = 'https://gnk-asg.hr/#aktual-media';

const read = (...parts) => readFileSync(join(HERE, ...parts), 'utf8');

/** Znak u formatu ikone (64×64) — jedini dopušteni favicon mreže. */
export const FAVICON_SVG = read('favicon.svg');

/** Znak za zaglavlje i podnožje (72×72, s naslovom i opisom za čitače). */
export const MARK_SVG = readFileSync(join(HERE, '..', '..', 'portal', 'assets', 'brand', 'aktual-media-mark.svg'), 'utf8');

/** Ikona za `<head>`; put je relativan prema korijenu weba. */
export const faviconLink = (root = '') => `<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">`;
