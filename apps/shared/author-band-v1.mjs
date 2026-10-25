/**
 * AUTORSKA TRAKA — Nermin Sefić na svakom webu mreže.
 *
 * Zahtjev kuće: urednik i direktor mora biti vidljiv na svakom webu, s
 * fotografijom, funkcijom i poveznicama na svoje tekstove — i na jeziku tog
 * weba. Traka je jedna forma svugdje; mijenja se samo jezik i put do portreta.
 *
 * Nema ugrađenog stila: CSS se isporučuje kroz vanjski list svakog weba
 * (`AUTHOR_BAND_CSS`), pa CSP ostaje `style-src 'self'`.
 * Slika se ne učitava s tuđeg hosta — kopira se u `assets/people/` weba.
 */
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTHOR_BAND_VERSION = 'AKTUAL_MEDIA_AUTHOR_BAND_V1';

/** Izvorni portret u repozitoriju — jedan, da se lica ne razlikuju po webovima. */
export const AUTHOR_PORTRAIT = join(dirname(fileURLToPath(import.meta.url)), '..', 'portal', 'assets', 'people', 'nermin-sefic', 'nermin-sefic-01-official-desk-portrait.webp');

const COPY = {
  hr: { role: 'direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorske objave', profile: 'Profil', kicker: 'Urednik ovog weba' },
  en: { role: 'director of GNK ASG d.o.o. and editor-in-chief of AKTUAL MEDIA', columns: 'Columns', author: 'Authored texts', profile: 'Profile', kicker: 'Editor of this site' },
  sr: { role: 'direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorski tekstovi', profile: 'Profil', kicker: 'Urednik ovog weba' },
  bs: { role: 'direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorski tekstovi', profile: 'Profil', kicker: 'Urednik ovog weba' },
  sl: { role: 'direktor GNK ASG d.o.o. in glavni urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Avtorski prispevki', profile: 'Profil', kicker: 'Urednik tega spletnega mesta' },
  hu: { role: 'a GNK ASG d.o.o. igazgatója és az AKTUAL MEDIA főszerkesztője', columns: 'Rovatok', author: 'Saját írások', profile: 'Profil', kicker: 'Az oldal szerkesztője' },
  it: { role: 'direttore di GNK ASG d.o.o. e caporedattore di AKTUAL MEDIA', columns: 'Rubriche', author: 'Scritti', profile: 'Profilo', kicker: 'Curatore di questo sito' },
  bg: { role: 'директор на GNK ASG d.o.o. и главен редактор на AKTUAL MEDIA', columns: 'Колони', author: 'Авторски текстове', profile: 'Профил', kicker: 'Редактор на сайта' },
  ro: { role: 'director al GNK ASG d.o.o. și redactor-șef al AKTUAL MEDIA', columns: 'Cronici', author: 'Texte de autor', profile: 'Profil', kicker: 'Editorul acestui site' },
  ar: { role: 'مدير GNK ASG d.o.o. ورئيس تحرير AKTUAL MEDIA', columns: 'أعمدة', author: 'مقالات الكاتب', profile: 'الملف الشخصي', kicker: 'محرر هذا الموقع' },
  id: { role: 'direktur GNK ASG d.o.o. dan pemimpin redaksi AKTUAL MEDIA', columns: 'Kolom', author: 'Tulisan penulis', profile: 'Profil', kicker: 'Editor situs ini' },
  ja: { role: 'GNK ASG d.o.o. 取締役兼 AKTUAL MEDIA 編集長', columns: 'コラム', author: '寄稿', profile: 'プロフィール', kicker: 'このサイトの編集者' },
  zh: { role: 'GNK ASG d.o.o. 董事兼 AKTUAL MEDIA 总编辑', columns: '专栏', author: '作者文章', profile: '简介', kicker: '本站编辑' },
  pt: { role: 'diretor da GNK ASG d.o.o. e editor-chefe da AKTUAL MEDIA', columns: 'Colunas', author: 'Textos de autor', profile: 'Perfil', kicker: 'Editor deste site' }
};

export function authorBandCopy(lang) {
  const key = String(lang || 'hr').toLowerCase().split('-')[0];
  return COPY[key] || COPY.hr;
}

/**
 * @param {string} lang jezik weba (hr, en, sr, ja, …)
 * @param {string|null} city slug gradskog izdanja (za put do portreta)
 * @param {{portrait?: string}} options izrijekom zadani put do portreta
 */
export function authorBand(lang, city, options = {}) {
  const t = authorBandCopy(lang);
  const portrait = options.portrait
    || (city ? `/kanal/${city}/assets/people/nermin-sefic.webp` : '/assets/people/nermin-sefic.webp');
  return `<section class="am-author" aria-label="Nermin Sefić" data-am-author="v1" data-am-lang="${String(lang || 'hr').toLowerCase().split('-')[0]}">
  <img src="${portrait}" alt="Nermin Sefić, ${t.role}" width="72" height="72" loading="lazy" decoding="async">
  <div>
    <span class="am-author-k">${t.kicker}</span>
    <b>Nermin Sefić</b>
    <p>${t.role} · <a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a></p>
    <nav>
      <a href="https://gnk-asg.hr/gnk-aktual/kolumne/">${t.columns} →</a>
      <a href="https://gnk-asg.hr/autorske-objave/">${t.author} →</a>
      <a href="https://gnk-asg.hr/nermin-sefic/">${t.profile} →</a>
    </nav>
  </div>
</section>`;
}

export const AUTHOR_BAND_CSS = `.am-author{margin:26px auto 0;max-width:1100px;padding:18px 20px;border:1px solid rgba(128,128,128,.24);border-radius:14px;display:grid;grid-template-columns:72px minmax(0,1fr);gap:16px;align-items:center;background:rgba(127,127,127,.05)}
.am-author img{width:72px;height:72px;border-radius:50%;object-fit:cover}
.am-author-k{font:800 10px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.66}
.am-author b{display:block;font:800 17px/1.25 Georgia,serif;margin:5px 0 3px}
.am-author p{margin:0;font-size:13px;opacity:.8;max-width:60ch}
.am-author nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}
.am-author nav a{font:700 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(128,128,128,.4);border-radius:999px;padding:7px 11px;text-decoration:none;color:inherit}
.am-author nav a:hover{border-color:currentColor}
@media(max-width:640px){.am-author{grid-template-columns:56px minmax(0,1fr)}.am-author img{width:56px;height:56px}.am-author nav{grid-column:1/-1}}`;

/**
 * Kopira portret u `assets/people/` izlaza weba. Bez toga bi traka pokazivala
 * prazan okvir na domenama koje ne poslužuju portret.
 */
export function ensureAuthorPortrait(sourcePortrait, outDir) {
  if (!existsSync(sourcePortrait)) return false;
  const dir = join(outDir, 'assets', 'people');
  const target = join(dir, 'nermin-sefic.webp');
  if (existsSync(target)) return true;
  mkdirSync(dir, { recursive: true });
  copyFileSync(sourcePortrait, target);
  return true;
}
