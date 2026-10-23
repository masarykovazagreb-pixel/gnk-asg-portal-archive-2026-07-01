/**
 * OKVIR IZDANJA NA JEZIKU ZEMLJE — jedan popis, svi jezici.
 *
 * Zašto zaseban modul: sadržaj izdanja (naslovi, sažeci, osvrti, teme, datumi)
 * već se piše na jeziku zemlje, ali okvir — skakač na sadržaj, povratni link na
 * maticu, oznake, popis ostalih izdanja i podnožje — bio je na hrvatskom na
 * svih 17 adresa. Čitatelj u Tokiju je tako dobivao hrvatski okvir oko japanskog
 * teksta. Ovaj modul drži taj okvir na jednom mjestu, u 14 jezika, kako se više
 * ne bi mogao vratiti kroz jedan zaboravljeni literal u build.mjs.
 *
 * Pravila:
 *  - imena izdanja, ljudi i tvrtki (AKTUAL MEDIA, GNK ASG, Nermin Sefić,
 *    BUSINESS TJEDNIK) se NE prevode — to su imena, ne opis;
 *  - svaki jezik ima isti skup ključeva; `directions` je samo za arapski;
 *  - ako jezika nema u tablici, koristi se engleski, nikada hrvatski, jer
 *    hrvatski okvir na japanskoj stranici je upravo greška koju popravljamo.
 *
 * Test: tests/test-editions-parity-v1.mjs (provjera da na izdanju koje nije
 * hrvatsko nema hrvatskih okvirnih riječi) i tests/test-strings-v1.mjs.
 */

/* Redoslijed je fiksan i mora odgovarati redoslijedu linkova u build.mjs. */
export const DESK_IDS = ['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet'];

/* Vanjski i matični linkovi podnožja — redoslijed je isti u svim jezicima. */
export const EXTRA_HREFS = [
  '/radio/',
  '/galerija/',
  '/usa/',
  '/kanal/',
  '/aktual-media/',
  '/status/',
  '/gnk-aktual/mreza/',
  '/tehnologija-buducnosti/',
  '/digital-workforce/knjiga/',
  'https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/'
];

export const CHROME = {
  hr: {
    skip: 'Sadržaj',
    back: '← AKTUAL MEDIA · sva izdanja',
    hubAria: 'Vrati se u AKTUAL MEDIA — sva izdanja',
    tags: 'Oznake',
    tagsEdition: 'Oznake izdanja',
    tagsText: 'Oznake teksta',
    tagsLead: 'Oznake izdanja:',
    otherTitle: 'Ostala izdanja — klik vodi na izdanje',
    otherAria: 'Ostala izdanja AKTUAL MEDIA',
    allEditions: 'Sva izdanja',
    allArrow: 'Sva izdanja →',
    onePlace: 'AKTUAL MEDIA — sve na jednom mjestu',
    langSwitch: 'Pročitajte ovo izdanje na engleskom',
    desks: ['Sport', 'Politika', 'Sigurnost', 'Business', 'Tehnologija', 'Tjednik Mode', 'Putovanja', 'Ljubimci', 'Svijet'],
    extra: ['Radio', 'Galerija', 'Colorado · USA', 'Svi kanali', 'Podatkovni desk', 'Status ažurnosti', 'Mreža izdanja', 'Tehnologija budućnosti', 'Knjiga radnika', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA vodi ${n} gradskih kanala, devet deskova, business tjednik, radio i podatkovni desk pod istim imenom i istom metodologijom.`,
    sourceDesc: (name, title) => `Osvrti na tekstove izvora ${name} u izdanju ${title}.`
  },
  sr: {
    skip: 'Sadržaj',
    back: '← AKTUAL MEDIA · sva izdanja',
    hubAria: 'Vrati se u AKTUAL MEDIA — sva izdanja',
    tags: 'Oznake',
    tagsEdition: 'Oznake izdanja',
    tagsText: 'Oznake teksta',
    tagsLead: 'Oznake izdanja:',
    otherTitle: 'Ostala izdanja — klik vodi na izdanje',
    otherAria: 'Ostala izdanja AKTUAL MEDIA',
    allEditions: 'Sva izdanja',
    allArrow: 'Sva izdanja →',
    onePlace: 'AKTUAL MEDIA — sve na jednom mestu',
    langSwitch: 'Pročitajte ovo izdanje na engleskom',
    desks: ['Sport', 'Politika', 'Bezbednost', 'Biznis', 'Tehnologija', 'Tjednik Mode', 'Putovanja', 'Ljubimci', 'Svet'],
    extra: ['Radio', 'Galerija', 'Kolorado · SAD', 'Svi kanali', 'Podatkovni desk', 'Status ažurnosti', 'Mreža izdanja', 'Tehnologija budućnosti', 'Knjiga radnika', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA vodi ${n} gradskih kanala, devet deskova, business nedeljnik, radio i podatkovni desk pod istim imenom i istom metodologijom.`,
    sourceDesc: (name, title) => `Osvrti na tekstove izvora ${name} u izdanju ${title}.`
  },
  bs: {
    skip: 'Sadržaj',
    back: '← AKTUAL MEDIA · sva izdanja',
    hubAria: 'Vrati se u AKTUAL MEDIA — sva izdanja',
    tags: 'Oznake',
    tagsEdition: 'Oznake izdanja',
    tagsText: 'Oznake teksta',
    tagsLead: 'Oznake izdanja:',
    otherTitle: 'Ostala izdanja — klik vodi na izdanje',
    otherAria: 'Ostala izdanja AKTUAL MEDIA',
    allEditions: 'Sva izdanja',
    allArrow: 'Sva izdanja →',
    onePlace: 'AKTUAL MEDIA — sve na jednom mjestu',
    langSwitch: 'Pročitajte ovo izdanje na engleskom',
    desks: ['Sport', 'Politika', 'Sigurnost', 'Biznis', 'Tehnologija', 'Tjednik Mode', 'Putovanja', 'Kućni ljubimci', 'Svijet'],
    extra: ['Radio', 'Galerija', 'Colorado · SAD', 'Svi kanali', 'Podatkovni desk', 'Status ažurnosti', 'Mreža izdanja', 'Tehnologija budućnosti', 'Knjiga radnika', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA vodi ${n} gradskih kanala, devet deskova, business tjednik, radio i podatkovni desk pod istim imenom i istom metodologijom.`,
    sourceDesc: (name, title) => `Osvrti na tekstove izvora ${name} u izdanju ${title}.`
  },
  hu: {
    skip: 'Tartalom',
    back: '← AKTUAL MEDIA · minden kiadás',
    hubAria: 'Vissza az AKTUAL MEDIA-hoz — minden kiadás',
    tags: 'Címkék',
    tagsEdition: 'A kiadás címkéi',
    tagsText: 'A cikk címkéi',
    tagsLead: 'A kiadás címkéi:',
    otherTitle: 'További kiadások — kattintson a kiadásra',
    otherAria: 'Az AKTUAL MEDIA többi kiadása',
    allEditions: 'Minden kiadás',
    allArrow: 'Minden kiadás →',
    onePlace: 'AKTUAL MEDIA — minden egy helyen',
    langSwitch: 'Olvassa ezt a kiadást angolul',
    desks: ['Sport', 'Politika', 'Biztonság', 'Business', 'Technológia', 'Tjednik Mode', 'Utazás', 'Háziállatok', 'Világ'],
    extra: ['Rádió', 'Galéria', 'Colorado · USA', 'Minden csatorna', 'Adatdeszk', 'Frissítési állapot', 'A kiadások hálózata', 'A jövő technológiája', 'A munkás könyve', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `Az AKTUAL MEDIA ${n} városi csatornát, kilenc deszkot, egy business hetilapot, egy rádiót és egy adatdeszkot visz ugyanazzal a névvel és ugyanazzal a módszertannal.`,
    sourceDesc: (name, title) => `Elemzések a(z) ${name} szövegeiről a(z) ${title} kiadásban.`
  },
  sl: {
    skip: 'Vsebina',
    back: '← AKTUAL MEDIA · vse izdaje',
    hubAria: 'Nazaj na AKTUAL MEDIA — vse izdaje',
    tags: 'Oznake',
    tagsEdition: 'Oznake izdaje',
    tagsText: 'Oznake članka',
    tagsLead: 'Oznake izdaje:',
    otherTitle: 'Druge izdaje — klik vodi do izdaje',
    otherAria: 'Druge izdaje AKTUAL MEDIA',
    allEditions: 'Vse izdaje',
    allArrow: 'Vse izdaje →',
    onePlace: 'AKTUAL MEDIA — vse na enem mestu',
    langSwitch: 'Preberite to izdajo v angleščini',
    desks: ['Šport', 'Politika', 'Varnost', 'Posel', 'Tehnologija', 'Tjednik Mode', 'Potovanja', 'Hišni ljubljenčki', 'Svet'],
    extra: ['Radio', 'Galerija', 'Colorado · ZDA', 'Vsi kanali', 'Podatkovna miza', 'Stanje osvežitve', 'Mreža izdaj', 'Tehnologija prihodnosti', 'Knjiga delavca', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA vodi ${n} mestnih kanalov, devet miz, poslovni tednik, radio in podatkovno mizo pod istim imenom in z isto metodologijo.`,
    sourceDesc: (name, title) => `Osvrti na besedila vira ${name} v izdaji ${title}.`
  },
  it: {
    skip: 'Contenuto',
    back: '← AKTUAL MEDIA · tutte le edizioni',
    hubAria: 'Torna ad AKTUAL MEDIA — tutte le edizioni',
    tags: 'Tag',
    tagsEdition: "Tag dell'edizione",
    tagsText: "Tag dell'articolo",
    tagsLead: "Tag dell'edizione:",
    otherTitle: 'Altre edizioni — clicca per aprire',
    otherAria: 'Altre edizioni AKTUAL MEDIA',
    allEditions: 'Tutte le edizioni',
    allArrow: 'Tutte le edizioni →',
    onePlace: 'AKTUAL MEDIA — tutto in un solo posto',
    langSwitch: 'Leggi questa edizione in inglese',
    desks: ['Sport', 'Politica', 'Sicurezza', 'Business', 'Tecnologia', 'Tjednik Mode', 'Viaggi', 'Animali', 'Mondo'],
    extra: ['Radio', 'Galleria', 'Colorado · USA', 'Tutti i canali', 'Desk dati', 'Stato di aggiornamento', 'Rete delle edizioni', 'Tecnologia del futuro', 'Il libro del lavoratore', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA gestisce ${n} canali cittadini, nove desk, un settimanale economico, una radio e un desk dati con lo stesso nome e la stessa metodologia.`,
    sourceDesc: (name, title) => `Letture critiche dei testi di ${name} nell'edizione ${title}.`
  },
  bg: {
    skip: 'Съдържание',
    back: '← AKTUAL MEDIA · всички издания',
    hubAria: 'Обратно към AKTUAL MEDIA — всички издания',
    tags: 'Етикети',
    tagsEdition: 'Етикети на изданието',
    tagsText: 'Етикети на статията',
    tagsLead: 'Етикети на изданието:',
    otherTitle: 'Други издания — кликнете за изданието',
    otherAria: 'Други издания на AKTUAL MEDIA',
    allEditions: 'Всички издания',
    allArrow: 'Всички издания →',
    onePlace: 'AKTUAL MEDIA — всичко на едно място',
    langSwitch: 'Прочетете това издание на английски',
    desks: ['Спорт', 'Политика', 'Сигурност', 'Бизнес', 'Технологии', 'Tjednik Mode', 'Пътувания', 'Домашни любимци', 'Свят'],
    extra: ['Радио', 'Галерия', 'Колорадо · САЩ', 'Всички канали', 'Деск за данни', 'Състояние на обновяване', 'Мрежа на изданията', 'Технологии на бъдещето', 'Книга на работника', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA води ${n} градски канала, девет деска, бизнес седмичник, радио и деск за данни под едно и също име и с една и съща методология.`,
    sourceDesc: (name, title) => `Оценки на текстовете на източника ${name} в изданието ${title}.`
  },
  ro: {
    skip: 'Conținut',
    back: '← AKTUAL MEDIA · toate edițiile',
    hubAria: 'Înapoi la AKTUAL MEDIA — toate edițiile',
    tags: 'Etichete',
    tagsEdition: 'Etichetele ediției',
    tagsText: 'Etichetele articolului',
    tagsLead: 'Etichetele ediției:',
    otherTitle: 'Alte ediții — clic pentru ediție',
    otherAria: 'Alte ediții AKTUAL MEDIA',
    allEditions: 'Toate edițiile',
    allArrow: 'Toate edițiile →',
    onePlace: 'AKTUAL MEDIA — totul într-un singur loc',
    langSwitch: 'Citiți această ediție în engleză',
    desks: ['Sport', 'Politică', 'Securitate', 'Business', 'Tehnologie', 'Tjednik Mode', 'Călătorii', 'Animale de companie', 'Lume'],
    extra: ['Radio', 'Galerie', 'Colorado · SUA', 'Toate canalele', 'Biroul de date', 'Starea actualizării', 'Rețeaua edițiilor', 'Tehnologia viitorului', 'Cartea lucrătorului', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA conduce ${n} canale urbane, nouă birouri, un săptămânal de business, un radio și un birou de date sub același nume și cu aceeași metodologie.`,
    sourceDesc: (name, title) => `Lecturi critice ale textelor din ${name} în ediția ${title}.`
  },
  en: {
    skip: 'Content',
    back: '← AKTUAL MEDIA · all editions',
    hubAria: 'Back to AKTUAL MEDIA — all editions',
    tags: 'Tags',
    tagsEdition: 'Edition tags',
    tagsText: 'Article tags',
    tagsLead: 'Edition tags:',
    otherTitle: 'Other editions — click to open',
    otherAria: 'Other AKTUAL MEDIA editions',
    allEditions: 'All editions',
    allArrow: 'All editions →',
    onePlace: 'AKTUAL MEDIA — all in one place',
    langSwitch: 'Read this edition in English',
    desks: ['Sport', 'Politics', 'Security', 'Business', 'Technology', 'Tjednik Mode', 'Travel', 'Pets', 'World'],
    extra: ['Radio', 'Gallery', 'Colorado · USA', 'All channels', 'Data desk', 'Freshness status', 'Edition network', 'Future technology', "Worker's book", 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA runs ${n} city channels, nine desks, a business weekly, a radio and a data desk under one name and one methodology.`,
    sourceDesc: (name, title) => `Readings of ${name} texts in the ${title} edition.`
  },
  id: {
    skip: 'Konten',
    back: '← AKTUAL MEDIA · semua edisi',
    hubAria: 'Kembali ke AKTUAL MEDIA — semua edisi',
    tags: 'Tagar',
    tagsEdition: 'Tagar edisi',
    tagsText: 'Tagar artikel',
    tagsLead: 'Tagar edisi:',
    otherTitle: 'Edisi lain — klik untuk membuka',
    otherAria: 'Edisi AKTUAL MEDIA lainnya',
    allEditions: 'Semua edisi',
    allArrow: 'Semua edisi →',
    onePlace: 'AKTUAL MEDIA — semuanya di satu tempat',
    langSwitch: 'Baca edisi ini dalam bahasa Inggris',
    desks: ['Olahraga', 'Politik', 'Keamanan', 'Bisnis', 'Teknologi', 'Tjednik Mode', 'Perjalanan', 'Hewan peliharaan', 'Dunia'],
    extra: ['Radio', 'Galeri', 'Colorado · AS', 'Semua kanal', 'Meja data', 'Status kebaruan', 'Jaringan edisi', 'Teknologi masa depan', 'Buku pekerja', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA mengelola ${n} kanal kota, sembilan meja, satu mingguan bisnis, radio, dan meja data dengan satu nama dan satu metodologi.`,
    sourceDesc: (name, title) => `Tinjauan atas teks ${name} dalam edisi ${title}.`
  },
  pt: {
    skip: 'Conteúdo',
    back: '← AKTUAL MEDIA · todas as edições',
    hubAria: 'Voltar à AKTUAL MEDIA — todas as edições',
    tags: 'Etiquetas',
    tagsEdition: 'Etiquetas da edição',
    tagsText: 'Etiquetas do artigo',
    tagsLead: 'Etiquetas da edição:',
    otherTitle: 'Outras edições — clique para abrir',
    otherAria: 'Outras edições AKTUAL MEDIA',
    allEditions: 'Todas as edições',
    allArrow: 'Todas as edições →',
    onePlace: 'AKTUAL MEDIA — tudo num só lugar',
    langSwitch: 'Leia esta edição em inglês',
    desks: ['Esporte', 'Política', 'Segurança', 'Negócios', 'Tecnologia', 'Tjednik Mode', 'Viagens', 'Animais', 'Mundo'],
    extra: ['Rádio', 'Galeria', 'Colorado · EUA', 'Todos os canais', 'Mesa de dados', 'Estado de atualização', 'Rede de edições', 'Tecnologia do futuro', 'Livro do trabalhador', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `A AKTUAL MEDIA mantém ${n} canais urbanos, nove mesas, um semanário de negócios, uma rádio e uma mesa de dados com o mesmo nome e a mesma metodologia.`,
    sourceDesc: (name, title) => `Leituras dos textos de ${name} na edição ${title}.`
  },
  ar: {
    skip: 'المحتوى',
    back: '→ أكتوال ميديا · كل الإصدارات',
    hubAria: 'العودة إلى أكتوال ميديا — كل الإصدارات',
    tags: 'الوسوم',
    tagsEdition: 'وسوم الإصدار',
    tagsText: 'وسوم المقال',
    tagsLead: 'وسوم الإصدار:',
    otherTitle: 'إصدارات أخرى — اضغط للفتح',
    otherAria: 'إصدارات أكتوال ميديا الأخرى',
    allEditions: 'كل الإصدارات',
    allArrow: 'كل الإصدارات ←',
    onePlace: 'أكتوال ميديا — كل شيء في مكان واحد',
    langSwitch: 'اقرأ هذا الإصدار بالإنجليزية',
    desks: ['رياضة', 'سياسة', 'أمن', 'أعمال', 'تكنولوجيا', 'Tjednik Mode', 'سفر', 'حيوانات أليفة', 'العالم'],
    extra: ['راديو', 'معرض الصور', 'كولورادو · الولايات المتحدة', 'كل القنوات', 'مكتب البيانات', 'حالة التحديث', 'شبكة الإصدارات', 'تقنية المستقبل', 'كتاب العامل', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `تدير أكتوال ميديا ${n} قناة مدينية وتسعة مكاتب وأسبوعية اقتصادية وإذاعة ومكتب بيانات باسم واحد ومنهجية واحدة.`,
    sourceDesc: (name, title) => `قراءات في نصوص ${name} ضمن إصدار ${title}.`
  },
  ja: {
    skip: '本文へ',
    back: '← AKTUAL MEDIA · すべての版',
    hubAria: 'AKTUAL MEDIA に戻る — すべての版',
    tags: 'タグ',
    tagsEdition: '版のタグ',
    tagsText: '記事のタグ',
    tagsLead: '版のタグ：',
    otherTitle: '他の版 — クリックで開く',
    otherAria: 'AKTUAL MEDIA の他の版',
    allEditions: 'すべての版',
    allArrow: 'すべての版 →',
    onePlace: 'AKTUAL MEDIA — すべてを一か所に',
    langSwitch: 'この版を英語で読む',
    desks: ['スポーツ', '政治', '安全保障', 'ビジネス', 'テクノロジー', 'Tjednik Mode', '旅行', 'ペット', '世界'],
    extra: ['ラジオ', 'ギャラリー', 'コロラド · 米国', 'すべてのチャンネル', 'データデスク', '更新状況', '版のネットワーク', '未来技術', '労働者の本', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA は ${n} の都市チャンネル、9 のデスク、週刊ビジネス、ラジオ、データデスクを同じ名前と同じ方法論で運営しています。`,
    sourceDesc: (name, title) => `${title} 版における ${name} の記事への評価。`
  },
  zh: {
    skip: '正文',
    back: '← AKTUAL MEDIA · 全部版本',
    hubAria: '返回 AKTUAL MEDIA — 全部版本',
    tags: '标签',
    tagsEdition: '版本标签',
    tagsText: '文章标签',
    tagsLead: '版本标签：',
    otherTitle: '其他版本 — 点击打开',
    otherAria: 'AKTUAL MEDIA 的其他版本',
    allEditions: '全部版本',
    allArrow: '全部版本 →',
    onePlace: 'AKTUAL MEDIA — 尽在一处',
    langSwitch: '用英语阅读此版本',
    desks: ['体育', '政治', '安全', '商业', '科技', 'Tjednik Mode', '旅行', '宠物', '世界'],
    extra: ['广播', '画廊', '科罗拉多 · 美国', '全部频道', '数据台', '更新状态', '版本网络', '未来科技', '工人之书', 'BUSINESS TJEDNIK W43 ↗'],
    network: (n) => `AKTUAL MEDIA 以同一名称和同一方法运营 ${n} 个城市频道、九个工作台、一份商业周刊、一个电台和一个数据台。`,
    sourceDesc: (name, title) => `对 ${title} 版本中 ${name} 文章的评议。`
  }
};

/** Okvir za jezik; nepoznat jezik dobiva engleski, nikada hrvatski. */
export const chromeOf = (lang) => CHROME[lang] || CHROME.en;

/** Desk linkovi: ista adresa, natpis na jeziku izdanja. */
export const desksOf = (lang) => chromeOf(lang).desks.map((label, i) => [DESK_IDS[i], label]);

/** Vanjski linkovi podnožja: ista adresa, natpis na jeziku izdanja. */
export const extraOf = (lang) => chromeOf(lang).extra.map((label, i) => [EXTRA_HREFS[i], label]);

/**
 * Natpisi traka s izdanjima (zaglavlje i mini traka). Imena gradova se ne
 * prevode; prevodi se samo okvir i opis radnje za čitače ekrana.
 */
export const EDITIONS_UI = {
  hr: ['AKTUAL MEDIA izdanja', 'ovo izdanje', 'otvori izdanje'],
  sr: ['AKTUAL MEDIA izdanja', 'ovo izdanje', 'otvori izdanje'],
  bs: ['AKTUAL MEDIA izdanja', 'ovo izdanje', 'otvori izdanje'],
  hu: ['AKTUAL MEDIA kiadások', 'ez a kiadás', 'kiadás megnyitása'],
  sl: ['Izdaje AKTUAL MEDIA', 'ta izdaja', 'odpri izdajo'],
  it: ['Edizioni AKTUAL MEDIA', 'questa edizione', 'apri l\u2019edizione'],
  bg: ['Издания на AKTUAL MEDIA', 'това издание', 'отвори изданието'],
  ro: ['Edițiile AKTUAL MEDIA', 'această ediție', 'deschide ediția'],
  en: ['AKTUAL MEDIA editions', 'this edition', 'open the edition'],
  id: ['Edisi AKTUAL MEDIA', 'edisi ini', 'buka edisi'],
  pt: ['Edições AKTUAL MEDIA', 'esta edição', 'abrir a edição'],
  ar: ['إصدارات أكتوال ميديا', 'هذا الإصدار', 'افتح الإصدار'],
  ja: ['AKTUAL MEDIA の版', 'この版', '版を開く'],
  zh: ['AKTUAL MEDIA 版本', '此版本', '打开版本']
};

export const editionsUi = (lang) => EDITIONS_UI[lang] || EDITIONS_UI.en;
