/**
 * IMPRESSUM MREŽE — jedan blok, svaki web, svaki jezik izdanja.
 *
 * Do sada je svaki generator pisao svoje podnožje, pa je na jednom webu pisalo
 * „AKTUAL MEDIA d.o.o.", na drugom samo „AKTUAL MEDIA", a na trećem nigdje nije
 * stajao ni nositelj ni izdavač. Čitatelj koji dođe s tražilice mora na svakoj
 * stranici naći iste činjenice:
 *
 *   nositelj   GNK ASG d.o.o.
 *   osnivač    GNK DINAMO Ltd, SAD
 *   izdavač    AKTUAL MEDIA d.o.o.
 *   urednik    Nermin Sefić — direktor i glavni urednik
 *   kontakt    info@gnk-asg.hr
 *
 * Blok je tekstualan (bez slika i bez skripte): radi pod strogim CSP-om, čita se
 * i bez slika, i indeksira se kao dio stranice. Jezik bloka je jezik izdanja —
 * hrvatski okvir na japanskoj stranici je greška, ne detalj.
 */

export const HOUSE = {
  email: 'info@gnk-asg.hr',
  holder: { hr: 'GNK ASG d.o.o.', en: 'GNK ASG d.o.o.' },
  founder: {
    hr: 'GNK DINAMO Ltd, SAD', en: 'GNK DINAMO Ltd, USA', sr: 'GNK DINAMO Ltd, SAD',
    bs: 'GNK DINAMO Ltd, SAD', sl: 'GNK DINAMO Ltd, ZDA', hu: 'GNK DINAMO Ltd, USA',
    it: 'GNK DINAMO Ltd, USA', bg: 'GNK DINAMO Ltd, САЩ', ro: 'GNK DINAMO Ltd, SUA',
    ar: 'GNK DINAMO Ltd، الولايات المتحدة', id: 'GNK DINAMO Ltd, AS', ja: 'GNK DINAMO Ltd（米国）',
    zh: 'GNK DINAMO Ltd（美国）', pt: 'GNK DINAMO Ltd, EUA'
  },
  publisher: 'AKTUAL MEDIA d.o.o.',
  editor: {
    name: 'Nermin Sefić',
    hr: 'direktor i glavni urednik', en: 'director and editor-in-chief',
    sr: 'direktor i glavni urednik', bs: 'direktor i glavni urednik',
    sl: 'direktor in glavni urednik', hu: 'igazgató és főszerkesztő',
    it: 'direttore e caporedattore', bg: 'директор и главен редактор',
    ro: 'director și redactor-șef', ar: 'المدير ورئيس التحرير',
    id: 'direktur dan pemimpin redaksi', ja: '取締役兼編集長',
    zh: '董事兼总编辑', pt: 'diretor e editor-chefe'
  },
  personUrl: 'https://gnk-asg.hr/nermin-sefic/',
  main: 'https://gnk-asg.hr',
  hub: { hr: 'https://gnk-asg.hr/mreza/', en: 'https://gnk-asg.hr/en/network/' },
  archive: 'https://gnk-asg-arhiva.pages.dev/',
  daily: 'https://gnk-asg-dnevnik.pages.dev/',
  chan: 'https://gnk-asg-kanal.pages.dev/',
  weekly: 'https://gnk-asg-tjednik.pages.dev/'
};

const LANGS = ['hr', 'en', 'sr', 'bs', 'sl', 'hu', 'it', 'bg', 'ro', 'ar', 'id', 'ja', 'zh', 'pt'];
const L = (lang) => {
  const key = String(lang || 'hr').toLowerCase().split('-')[0];
  return LANGS.includes(key) ? key : 'hr';
};
/** Vrijednost iz tablice po jeziku, s hrvatskim kao sigurnom podlogom. */
export const t = (table, lang) => table[L(lang)] ?? table.hr;
export const hubOf = (lang) => HOUSE.hub[L(lang)] || HOUSE.hub.hr;

const WORDS = {
  hr: { title: 'Izdavač i kontakt', holder: 'Nositelj', founder: 'Osnivač', publisher: 'Izdavač', editor: 'Direktor i glavni urednik', contact: 'Kontakt', hubs: 'Mreža', note: 'Sadržaj se objavljuje po istoj uredničkoj politici na svakom webu mreže; svaki preuzeti tekst nosi izvor i poveznicu na matičnu objavu.' },
  en: { title: 'Publisher and contact', holder: 'Holder', founder: 'Founder', publisher: 'Publisher', editor: 'Director and editor-in-chief', contact: 'Contact', hubs: 'Network', note: 'Content follows the same editorial policy on every site of the network; every syndicated text carries its source and a link to the original.' },
  sr: { title: 'Izdavač i kontakt', holder: 'Nositelj', founder: 'Osnivač', publisher: 'Izdavač', editor: 'Direktor i glavni urednik', contact: 'Kontakt', hubs: 'Mreža', note: 'Sadržaj se objavljuje po istoj uredničkoj politici na svakom webu mreže; svaki preuzeti tekst nosi izvor i poveznicu na matičnu objavu.' },
  bs: { title: 'Izdavač i kontakt', holder: 'Nositelj', founder: 'Osnivač', publisher: 'Izdavač', editor: 'Direktor i glavni urednik', contact: 'Kontakt', hubs: 'Mreža', note: 'Sadržaj se objavljuje po istoj uredničkoj politici na svakom webu mreže; svaki preuzeti tekst nosi izvor i poveznicu na matičnu objavu.' },
  sl: { title: 'Založnik in stik', holder: 'Nosilec', founder: 'Ustanovitelj', publisher: 'Založnik', editor: 'Direktor in glavni urednik', contact: 'Kontakt', hubs: 'Mreža', note: 'Vsebina se objavlja po isti uredniški politiki na vsakem spletnem mestu mreže; vsako prevzeto besedilo nosi vir in povezavo na izvirno objavo.' },
  hu: { title: 'Kiadó és kapcsolat', holder: 'Fenntartó', founder: 'Alapító', publisher: 'Kiadó', editor: 'Igazgató és főszerkesztő', contact: 'Kapcsolat', hubs: 'Hálózat', note: 'A tartalom minden hálózati oldalon ugyanazon szerkesztői elvek szerint jelenik meg; minden átvett szöveg feltünteti a forrást és az eredeti bejegyzés linkjét.' },
  it: { title: 'Editore e contatti', holder: 'Titolare', founder: 'Fondatore', publisher: 'Editore', editor: 'Direttore e caporedattore', contact: 'Contatti', hubs: 'Rete', note: 'I contenuti seguono la stessa politica editoriale su ogni sito della rete; ogni testo ripreso indica la fonte e il collegamento all’originale.' },
  bg: { title: 'Издател и контакт', holder: 'Носител', founder: 'Основател', publisher: 'Издател', editor: 'Директор и главен редактор', contact: 'Контакт', hubs: 'Мрежа', note: 'Съдържанието се публикува по една и съща редакционна политика на всеки сайт в мрежата; всеки препубликуван текст носи източник и връзка към оригинала.' },
  ro: { title: 'Editor și contact', holder: 'Titular', founder: 'Fondator', publisher: 'Editor', editor: 'Director și redactor-șef', contact: 'Contact', hubs: 'Rețea', note: 'Conținutul urmează aceeași politică editorială pe fiecare site al rețelei; fiecare text preluat are sursa și legătura către original.' },
  ar: { title: 'الناشر والتواصل', holder: 'الجهة المالكة', founder: 'المؤسس', publisher: 'الناشر', editor: 'المدير ورئيس التحرير', contact: 'التواصل', hubs: 'الشبكة', note: 'يُنشر المحتوى وفق السياسة التحريرية نفسها على كل موقع في الشبكة، ويحمل كل نص منقول مصدره ورابطه إلى الأصل.' },
  id: { title: 'Penerbit dan kontak', holder: 'Penyelenggara', founder: 'Pendiri', publisher: 'Penerbit', editor: 'Direktur dan pemimpin redaksi', contact: 'Kontak', hubs: 'Jaringan', note: 'Konten terbit dengan kebijakan redaksi yang sama di setiap situs jaringan; setiap teks yang dikutip mencantumkan sumber dan tautan ke aslinya.' },
  ja: { title: '発行元と連絡先', holder: '運営主体', founder: '設立者', publisher: '発行元', editor: '取締役兼編集長', contact: '連絡先', hubs: 'ネットワーク', note: '本ネットワークの各サイトは同一の編集方針で公開しています。転載記事には出典と元記事へのリンクを必ず記載します。' },
  zh: { title: '出版方与联系方式', holder: '运营主体', founder: '创办方', publisher: '出版方', editor: '董事兼总编辑', contact: '联系方式', hubs: '网络', note: '网络内各站点均按同一编辑方针发布内容；每篇转载文章均标注来源并链接到原文。' },
  pt: { title: 'Editor e contato', holder: 'Titular', founder: 'Fundador', publisher: 'Editor', editor: 'Diretor e editor-chefe', contact: 'Contato', hubs: 'Rede', note: 'O conteúdo segue a mesma política editorial em todos os sites da rede; cada texto reproduzido traz a fonte e o link para o original.' }
};

/** HTML blok koji ide u podnožje svake stranice. */
export function impressumBlock(lang = 'hr', { compact = false } = {}) {
  const w = WORDS[L(lang)] || WORDS.hr;
  const href = hubOf(lang);
  const person = `${HOUSE.editor.name} — ${t(HOUSE.editor, lang)}`;
  if (compact) {
    return `<p class="am-impressum-line" data-am-impressum="v1">${w.holder}: ${t(HOUSE.holder, lang)} · ${w.founder}: ${t(HOUSE.founder, lang)} · ${w.publisher}: ${HOUSE.publisher} · ${w.editor}: <a href="${HOUSE.personUrl}">${HOUSE.editor.name}</a> · ${w.contact}: <a href="mailto:${HOUSE.email}">${HOUSE.email}</a> · <a href="${href}">${w.hubs}</a></p>`;
  }
  return `<section class="am-impressum" aria-label="${w.title}" data-am-impressum="v1">
  <h2 class="am-impressum-h">${w.title}</h2>
  <ul class="am-impressum-list">
    <li><b>${w.holder}:</b> ${t(HOUSE.holder, lang)}</li>
    <li><b>${w.founder}:</b> ${t(HOUSE.founder, lang)}</li>
    <li><b>${w.publisher}:</b> ${HOUSE.publisher}</li>
    <li><b>${w.editor}:</b> <a href="${HOUSE.personUrl}">${person}</a></li>
    <li><b>${w.contact}:</b> <a href="mailto:${HOUSE.email}">${HOUSE.email}</a></li>
  </ul>
  <p class="am-impressum-note">${w.note}</p>
  <p class="am-impressum-links"><a href="${href}">${w.hubs} →</a></p>
</section>`;
}

/** CSS koji ide uz blok; mali je i ne dira ništa drugo. */
export const IMPRESSUM_CSS = `.am-impressum-line{margin:18px 0 0;padding:12px 0 0;border-top:1px solid rgba(128,128,128,.22);font:400 12px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif;opacity:.82}
.am-impressum-line a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.am-impressum{margin:28px auto 0;max-width:1100px;padding:18px 20px;border-top:1px solid rgba(128,128,128,.28);font:400 13px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:inherit}
.am-impressum-h{margin:0 0 8px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.72}
.am-impressum-list{list-style:none;margin:0;padding:0;display:grid;gap:3px}
.am-impressum-list b{font-weight:700}
.am-impressum-list a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.am-impressum-note{margin:10px 0 6px;max-width:78ch;opacity:.72}
.am-impressum-links a{font-weight:700;text-decoration:none}
.am-impressum-links a:hover{text-decoration:underline}`;

/**
 * JSON-LD čvor koji svaka stranica mora nositi. Vraća objekt koji generator
 * ubaci u svoj graf ili ispiše kao zaseban `<script type="application/ld+json">`.
 */
export function impressumNode() {
  return {
    '@type': 'Organization',
    '@id': `${HOUSE.main}/#gnk-asg`,
    name: HOUSE.holder.hr,
    legalName: HOUSE.holder.hr,
    url: `${HOUSE.main}/`,
    email: HOUSE.email,
    parentOrganization: { '@type': 'Organization', name: HOUSE.founder.hr },
    publisher: { '@type': 'Organization', name: HOUSE.publisher, url: `${HOUSE.main}/gnk-aktual/` },
    employee: {
      '@type': 'Person',
      name: HOUSE.editor.name,
      jobTitle: HOUSE.editor.hr,
      url: HOUSE.personUrl
    }
  };
}
