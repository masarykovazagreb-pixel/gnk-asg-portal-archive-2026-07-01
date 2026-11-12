/**
 * AUTORSKA TRAKA — Nermin Sefić na svakom webu mreže.
 *
 * Povezanost grupe: stvarni vlasnik (UBO) vidljiv je na svakom webu mreže, s
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
  hr: { role: 'stvarni vlasnik (UBO) povezane grupe GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA i urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorske objave', profile: 'Profil', kicker: 'Vlasnička povezanost' },
  en: { role: 'ultimate beneficial owner (UBO) of the GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA group and AKTUAL MEDIA editor', columns: 'Columns', author: 'Authored texts', profile: 'Profile', kicker: 'Group ownership' },
  sr: { role: 'stvarni vlasnik (UBO) povezane grupe GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA i urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorski tekstovi', profile: 'Profil', kicker: 'Vlasnička povezanost' },
  bs: { role: 'stvarni vlasnik (UBO) povezane grupe GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA i urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Autorski tekstovi', profile: 'Profil', kicker: 'Vlasnička povezanost' },
  sl: { role: 'dejanski lastnik (UBO) skupine GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA in urednik AKTUAL MEDIA', columns: 'Kolumne', author: 'Avtorski prispevki', profile: 'Profil', kicker: 'Lastniška povezava' },
  hu: { role: 'a GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA csoport tényleges tulajdonosa (UBO) és az AKTUAL MEDIA szerkesztője', columns: 'Rovatok', author: 'Saját írások', profile: 'Profil', kicker: 'Tulajdonosi kapcsolat' },
  it: { role: 'titolare effettivo (UBO) del gruppo GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA e redattore di AKTUAL MEDIA', columns: 'Rubriche', author: 'Scritti', profile: 'Profilo', kicker: 'Legame proprietario' },
  bg: { role: 'действителен собственик (UBO) на групата GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA и редактор на AKTUAL MEDIA', columns: 'Колони', author: 'Авторски текстове', profile: 'Профил', kicker: 'Собственост на групата' },
  ro: { role: 'beneficiar real (UBO) al grupului GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA și editor AKTUAL MEDIA', columns: 'Cronici', author: 'Texte de autor', profile: 'Profil', kicker: 'Legătură de proprietate' },
  ar: { role: 'المالك المستفيد النهائي (UBO) لمجموعة GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA ومحرر AKTUAL MEDIA', columns: 'أعمدة', author: 'مقالات الكاتب', profile: 'الملف الشخصي', kicker: 'ملكية المجموعة' },
  id: { role: 'pemilik manfaat akhir (UBO) grup GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA dan editor AKTUAL MEDIA', columns: 'Kolom', author: 'Tulisan penulis', profile: 'Profil', kicker: 'Keterkaitan kepemilikan' },
  ja: { role: 'GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIAグループの実質的支配者（UBO）、AKTUAL MEDIA編集者', columns: 'コラム', author: '寄稿', profile: 'プロフィール', kicker: 'グループの実質的所有者' },
  zh: { role: 'GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA 集团最终受益所有人（UBO）、AKTUAL MEDIA 编辑', columns: '专栏', author: '作者文章', profile: '简介', kicker: '集团所有权' },
  pt: { role: 'beneficiário final (UBO) do grupo GNK ASG / GNK DINAMO Ltd. / AKTUAL MEDIA e editor da AKTUAL MEDIA', columns: 'Colunas', author: 'Textos de autor', profile: 'Perfil', kicker: 'Vínculo societário' }
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
      <a href="https://gnk-asg.hr/group-network/">GNK ASG / GNK DINAMO Ltd. →</a>
      <a href="https://gnk-asg.hr/aktual-media/">AKTUAL MEDIA →</a>
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
