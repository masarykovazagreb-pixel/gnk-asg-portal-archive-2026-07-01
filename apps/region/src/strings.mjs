/**
 * Prijevodi sučelja po jeziku. Ključevi su isti za sve kanale; tekst se ne
 * strojno prevodi u letu, nego je ovdje eksplicitno napisan za svaki jezik.
 */
export const STRINGS = {
  hr: {
    locale: 'hr_HR',
    ui: {
      editionOf: 'Izdanje AKTUAL MEDIA',
      latest: 'Najnovije',
      allNews: 'Sve objave',
      themes: 'Teme',
      sources: 'Izvori',
      methodology: 'Metodologija',
      hashtags: 'Oznake',
      readAtSource: 'Pročitajte kod izvornika',
      published: 'Objavljeno',
      source: 'Izvor',
      editor: 'Urednik izdanja',
      director: 'Direktor',
      publisher: 'Izdavač',
      contact: 'Kontakt',
      radio: 'Radio uživo',
      radioNote: 'Vanjska postaja · otvara se u novom prozoru',
      otherChannels: 'Ostala izdanja',
      hub: 'Sva izdanja AKTUAL MEDIA',
      aboutTitle: 'Što je ovo izdanje',
      aboutText: 'Dnevni pregled lokalnih medija s poveznicom na svaki izvornik. Osvrt opisuje kako je tekst naslovljen i što treba provjeriti prije zaključka; tvrdnje izvornika nisu naše tvrdnje.',
      emptyTitle: 'Prvo izdanje je u pripremi',
      emptyText: 'Stroj svakoga dana čita navedene izvore. Ako izvor u ovom ciklusu nije dostupan, izdanje se ne izmišlja — objavljuje se ono što je stvarno pronađeno.',
      analysis: 'Što provjeriti',
      summary: 'Sažetak izvornika',
      quoteNote: 'Naslov i sažetak preuzeti su iz izvornika i služe kao predmet osvrta.',
      back: 'Natrag na izdanje',
      updated: 'Ažurirano',
      daily: 'Dnevno izdanje',
      autoNote: 'Automatski sastavljeno iz objavljenih izvora · nije pojedinačno urednički pregledano',
      sourcesLead: 'Popis medija koje ovo izdanje čita. Naslovi se preuzimaju iz njihovih javnih feedova, uz poveznicu na izvornik.',
      methodLead: 'Kako nastaje izdanje: čitanje javnih feedova, provjera poveznice, izdvajanje naslova i sažetka, osvrt na način izvještavanja i objava s punom atribucijom.',
      methodPoints: [
        'Ne preuzimamo cijeli tekst izvornika i ne prepričavamo ga kao svoju vijest.',
        'Svaki zapis nosi izravnu poveznicu na izvornik i datum objave.',
        'Brojke i tvrdnje iz naslova označavamo kao ono što treba provjeriti, ne kao potvrđenu činjenicu.',
        'Ako izvor nije dostupan, izdanje to kaže umjesto da popuni prazninu izmišljenim sadržajem.',
        'Ispravci se objavljuju na istoj stranici, s datumom.'
      ],
      themeNames: {
        sigurnost: 'Sigurnost i kibernetika', rat: 'Rat i eskalacije', potres: 'Potresi i nesreće',
        politika: 'Politika', ekonomija: 'Gospodarstvo', ai: 'AI i tehnologija',
        energija: 'Energija', sport: 'Sport', drustvo: 'Društvo'
      },
      checks: {
        number: 'Naslov sadrži brojku. Provjerite je li u tekstu navedeno odakle brojka dolazi i na koje razdoblje se odnosi.',
        superlative: 'Naslov koristi superlativ. Provjerite s kojim se skupom uspoređuje i tko je usporedbu napravio.',
        anonymous: 'Tekst se poziva na neimenovane izvore. Provjerite postoji li dokument ili imenovani sugovornik.',
        question: 'Naslov je pitanje. Provjerite daje li tekst odgovor ili samo otvara temu.',
        exclusive: 'Naslov najavljuje ekskluzivu. Provjerite je li tvrdnja potvrđena na drugom mjestu.',
        quote: 'Provjerite je li citat u izvorniku pun i u kontekstu, a ne skraćen.'
      }
    }
  },
  sr: {
    locale: 'sr_RS',
    ui: {
      editionOf: 'Izdanje AKTUAL MEDIA',
      latest: 'Najnovije',
      allNews: 'Sve objave',
      themes: 'Teme',
      sources: 'Izvori',
      methodology: 'Metodologija',
      hashtags: 'Oznake',
      readAtSource: 'Pročitajte kod izvornika',
      published: 'Objavljeno',
      source: 'Izvor',
      editor: 'Urednik izdanja',
      director: 'Direktor',
      publisher: 'Izdavač',
      contact: 'Kontakt',
      radio: 'Radio uživo',
      radioNote: 'Spoljna stanica · otvara se u novom prozoru',
      otherChannels: 'Ostala izdanja',
      hub: 'Sva izdanja AKTUAL MEDIA',
      aboutTitle: 'Šta je ovo izdanje',
      aboutText: 'Dnevni pregled lokalnih medija sa linkom na svaki izvor. Osvrt opisuje kako je tekst naslovljen i šta treba proveriti pre zaključka; tvrdnje izvora nisu naše tvrdnje.',
      emptyTitle: 'Prvo izdanje je u pripremi',
      emptyText: 'Mašina svakog dana čita navedene izvore. Ako izvor u ovom ciklusu nije dostupan, izdanje se ne izmišlja — objavljuje se ono što je stvarno pronađeno.',
      analysis: 'Šta proveriti',
      summary: 'Sažetak izvora',
      quoteNote: 'Naslov i sažetak preuzeti su iz izvora i služe kao predmet osvrta.',
      back: 'Nazad na izdanje',
      updated: 'Ažurirano',
      daily: 'Dnevno izdanje',
      autoNote: 'Automatski sastavljeno iz objavljenih izvora · nije pojedinačno urednički pregledano',
      sourcesLead: 'Spisak medija koje ovo izdanje čita. Naslovi se preuzimaju iz njihovih javnih feedova, uz link na izvor.',
      methodLead: 'Kako nastaje izdanje: čitanje javnih feedova, provera linka, izdvajanje naslova i sažetka, osvrt na način izveštavanja i objava sa punom atribucijom.',
      methodPoints: [
        'Ne preuzimamo ceo tekst izvora i ne prepričavamo ga kao svoju vest.',
        'Svaki zapis nosi direktan link na izvor i datum objave.',
        'Brojeve i tvrdnje iz naslova označavamo kao ono što treba proveriti, ne kao potvrđenu činjenicu.',
        'Ako izvor nije dostupan, izdanje to kaže umesto da popuni prazninu izmišljenim sadržajem.',
        'Ispravke objavljujemo na istoj stranici, sa datumom.'
      ],
      themeNames: {
        sigurnost: 'Bezbednost i kibernetika', rat: 'Rat i eskalacije', potres: 'Zemljotresi i nesreće',
        politika: 'Politika', ekonomija: 'Privreda', ai: 'AI i tehnologija',
        energija: 'Energija', sport: 'Sport', drustvo: 'Društvo'
      },
      checks: {
        number: 'Naslov sadrži broj. Proverite da li je u tekstu navedeno odakle broj dolazi i na koji period se odnosi.',
        superlative: 'Naslov koristi superlativ. Proverite sa kojim skupom se poredi i ko je napravio poređenje.',
        anonymous: 'Tekst se poziva na neimenovane izvore. Proverite postoji li dokument ili imenovani sagovornik.',
        question: 'Naslov je pitanje. Proverite da li tekst daje odgovor ili samo otvara temu.',
        exclusive: 'Naslov najavljuje ekskluzivu. Proverite da li je tvrdnja potvrđena na drugom mestu.',
        quote: 'Proverite da li je citat u izvoru pun i u kontekstu, a ne skraćen.'
      }
    }
  },
  bs: {
    locale: 'bs_BA',
    ui: {
      editionOf: 'Izdanje AKTUAL MEDIA',
      latest: 'Najnovije',
      allNews: 'Sve objave',
      themes: 'Teme',
      sources: 'Izvori',
      methodology: 'Metodologija',
      hashtags: 'Oznake',
      readAtSource: 'Pročitajte kod izvornika',
      published: 'Objavljeno',
      source: 'Izvor',
      editor: 'Urednik izdanja',
      director: 'Direktor',
      publisher: 'Izdavač',
      contact: 'Kontakt',
      radio: 'Radio uživo',
      radioNote: 'Vanjska stanica · otvara se u novom prozoru',
      otherChannels: 'Ostala izdanja',
      hub: 'Sva izdanja AKTUAL MEDIA',
      aboutTitle: 'Šta je ovo izdanje',
      aboutText: 'Dnevni pregled lokalnih medija s linkom na svaki izvor. Osvrt opisuje kako je tekst naslovljen i šta treba provjeriti prije zaključka; tvrdnje izvora nisu naše tvrdnje.',
      emptyTitle: 'Prvo izdanje je u pripremi',
      emptyText: 'Mašina svakog dana čita navedene izvore. Ako izvor u ovom ciklusu nije dostupan, izdanje se ne izmišlja — objavljuje se ono što je stvarno pronađeno.',
      analysis: 'Šta provjeriti',
      summary: 'Sažetak izvora',
      quoteNote: 'Naslov i sažetak preuzeti su iz izvora i služe kao predmet osvrta.',
      back: 'Nazad na izdanje',
      updated: 'Ažurirano',
      daily: 'Dnevno izdanje',
      autoNote: 'Automatski sastavljeno iz objavljenih izvora · nije pojedinačno urednički pregledano',
      sourcesLead: 'Spisak medija koje ovo izdanje čita. Naslovi se preuzimaju iz njihovih javnih feedova, uz link na izvor.',
      methodLead: 'Kako nastaje izdanje: čitanje javnih feedova, provjera linka, izdvajanje naslova i sažetka, osvrt na način izvještavanja i objava s punom atribucijom.',
      methodPoints: [
        'Ne preuzimamo cijeli tekst izvora i ne prepričavamo ga kao svoju vijest.',
        'Svaki zapis nosi direktan link na izvor i datum objave.',
        'Brojeve i tvrdnje iz naslova označavamo kao ono što treba provjeriti, ne kao potvrđenu činjenicu.',
        'Ako izvor nije dostupan, izdanje to kaže umjesto da popuni prazninu izmišljenim sadržajem.',
        'Ispravke objavljujemo na istoj stranici, s datumom.'
      ],
      themeNames: {
        sigurnost: 'Sigurnost i kibernetika', rat: 'Rat i eskalacije', potres: 'Zemljotresi i nesreće',
        politika: 'Politika', ekonomija: 'Ekonomija', ai: 'AI i tehnologija',
        energija: 'Energija', sport: 'Sport', drustvo: 'Društvo'
      },
      checks: {
        number: 'Naslov sadrži broj. Provjerite da li je u tekstu navedeno odakle broj dolazi i na koji period se odnosi.',
        superlative: 'Naslov koristi superlativ. Provjerite s kojim skupom se poredi i ko je napravio poređenje.',
        anonymous: 'Tekst se poziva na neimenovane izvore. Provjerite postoji li dokument ili imenovani sagovornik.',
        question: 'Naslov je pitanje. Provjerite da li tekst daje odgovor ili samo otvara temu.',
        exclusive: 'Naslov najavljuje ekskluzivu. Provjerite da li je tvrdnja potvrđena na drugom mjestu.',
        quote: 'Provjerite da li je citat u izvoru pun i u kontekstu, a ne skraćen.'
      }
    }
  },
  hu: {
    locale: 'hu_HU',
    ui: {
      editionOf: 'AKTUAL MEDIA kiadás',
      latest: 'Legfrissebb',
      allNews: 'Minden cikk',
      themes: 'Témák',
      sources: 'Források',
      methodology: 'Módszertan',
      hashtags: 'Címkék',
      readAtSource: 'Olvassa el az eredetinél',
      published: 'Közzétéve',
      source: 'Forrás',
      editor: 'Kiadás szerkesztője',
      director: 'Igazgató',
      publisher: 'Kiadó',
      contact: 'Kapcsolat',
      radio: 'Élő rádió',
      radioNote: 'Külső adó · új ablakban nyílik',
      otherChannels: 'További kiadások',
      hub: 'Az AKTUAL MEDIA összes kiadása',
      aboutTitle: 'Mi ez a kiadás',
      aboutText: 'Helyi médiumok napi áttekintése, minden esetben az eredeti forrásra mutató hivatkozással. Az elemzés azt írja le, hogyan címezték a cikket, és mit kell ellenőrizni a következtetés előtt; a forrás állításai nem a mieink.',
      emptyTitle: 'Az első kiadás előkészületben',
      emptyText: 'A rendszer minden nap olvassa a megadott forrásokat. Ha egy forrás ebben a ciklusban nem érhető el, a kiadás nem talál ki tartalmat — azt közli, amit valóban megtalált.',
      analysis: 'Mit ellenőrizzünk',
      summary: 'Az eredeti összefoglalója',
      quoteNote: 'A cím és az összefoglaló az eredeti forrásból származik, és az elemzés tárgya.',
      back: 'Vissza a kiadáshoz',
      updated: 'Frissítve',
      daily: 'Napi kiadás',
      autoNote: 'Automatikusan összeállítva közzétett forrásokból · nem egyedi szerkesztői ellenőrzés',
      sourcesLead: 'Azok a médiumok, amelyeket ez a kiadás olvas. A címek a nyilvános hírcsatornáikból származnak, az eredetire mutató hivatkozással.',
      methodLead: 'Így készül a kiadás: nyilvános hírcsatornák olvasása, a hivatkozás ellenőrzése, a cím és az összefoglaló kiemelése, elemzés a tudósítás módjáról, majd közzététel teljes hivatkozással.',
      methodPoints: [
        'Nem másoljuk át a forrás teljes szövegét, és nem mondjuk el újra saját hírként.',
        'Minden tétel közvetlen hivatkozást és közzétételi dátumot tartalmaz.',
        'A címben szereplő számokat és állításokat ellenőrizendőként jelöljük, nem megerősített tényként.',
        'Ha a forrás nem elérhető, a kiadás ezt kimondja, ahelyett hogy kitalált tartalommal töltené ki a hiányt.',
        'A javításokat ugyanazon az oldalon, dátummal tesszük közzé.'
      ],
      themeNames: {
        sigurnost: 'Biztonság és kibernetika', rat: 'Háború és eszkaláció', potres: 'Földrengések és katasztrófák',
        politika: 'Politika', ekonomija: 'Gazdaság', ai: 'AI és technológia',
        energija: 'Energia', sport: 'Sport', drustvo: 'Társadalom'
      },
      checks: {
        number: 'A cím számot tartalmaz. Ellenőrizze, hogy a szöveg megadja-e a szám forrását és időszakát.',
        superlative: 'A cím szuperlatívuszt használ. Ellenőrizze, mivel hasonlítják össze, és ki végezte az összehasonlítást.',
        anonymous: 'A szöveg névtelen forrásokra hivatkozik. Ellenőrizze, van-e dokumentum vagy nevesített forrás.',
        question: 'A cím kérdés. Ellenőrizze, hogy a szöveg válaszol-e, vagy csak felveti a témát.',
        exclusive: 'A cím exkluzív anyagot jelez. Ellenőrizze, hogy az állítást máshol is megerősítették-e.',
        quote: 'Ellenőrizze, hogy az idézet teljes és kontextusban van-e, nem rövidített.'
      }
    }
  },
  sl: {
    locale: 'sl_SI',
    ui: {
      editionOf: 'Izdaja AKTUAL MEDIA',
      latest: 'Najnovejše',
      allNews: 'Vse objave',
      themes: 'Teme',
      sources: 'Viri',
      methodology: 'Metodologija',
      hashtags: 'Oznake',
      readAtSource: 'Preberite pri izvirniku',
      published: 'Objavljeno',
      source: 'Vir',
      editor: 'Urednik izdaje',
      director: 'Direktor',
      publisher: 'Založnik',
      contact: 'Kontakt',
      radio: 'Radio v živo',
      radioNote: 'Zunanja postaja · odpre se v novem oknu',
      otherChannels: 'Druge izdaje',
      hub: 'Vse izdaje AKTUAL MEDIA',
      aboutTitle: 'Kaj je ta izdaja',
      aboutText: 'Dnevni pregled lokalnih medijev s povezavo na vsak vir. Osvrt opisuje, kako je besedilo naslovljeno in kaj je treba preveriti pred sklepom; trditve vira niso naše trditve.',
      emptyTitle: 'Prva izdaja je v pripravi',
      emptyText: 'Stroj vsak dan bere navedene vire. Če vir v tem ciklu ni dosegljiv, izdaja ne izmišlja — objavi, kar je v resnici našla.',
      analysis: 'Kaj preveriti',
      summary: 'Povzetek vira',
      quoteNote: 'Naslov in povzetek sta prevzeta iz vira in sta predmet osvrta.',
      back: 'Nazaj na izdajo',
      updated: 'Posodobljeno',
      daily: 'Dnevna izdaja',
      autoNote: 'Samodejno sestavljeno iz objavljenih virov · ni posamično uredniško pregledano',
      sourcesLead: 'Seznam medijev, ki jih ta izdaja bere. Naslovi so prevzeti iz njihovih javnih kanalov, s povezavo na vir.',
      methodLead: 'Kako nastane izdaja: branje javnih kanalov, preverjanje povezave, izločitev naslova in povzetka, osvrt na način poročanja in objava s polno atribucijo.',
      methodPoints: [
        'Ne prepisujemo celotnega besedila vira in ga ne povzemamo kot svojo novico.',
        'Vsak zapis ima neposredno povezavo na vir in datum objave.',
        'Številke in trditve iz naslova označimo kot tisto, kar je treba preveriti, ne kot potrjeno dejstvo.',
        'Če vir ni dosegljiv, izdaja to pove, namesto da bi vrzel zapolnila z izmišljeno vsebino.',
        'Popravke objavimo na isti strani, z datumom.'
      ],
      themeNames: {
        sigurnost: 'Varnost in kibernetika', rat: 'Vojna in stopnjevanje', potres: 'Potresi in nesreče',
        politika: 'Politika', ekonomija: 'Gospodarstvo', ai: 'AI in tehnologija',
        energija: 'Energija', sport: 'Šport', drustvo: 'Družba'
      },
      checks: {
        number: 'Naslov vsebuje številko. Preverite, ali besedilo navaja, od kod številka izhaja in na katero obdobje se nanaša.',
        superlative: 'Naslov uporablja presežnik. Preverite, s katerim nizom se primerja in kdo je primerjavo naredil.',
        anonymous: 'Besedilo se sklicuje na neimenovane vire. Preverite, ali obstaja dokument ali imenovani sogovornik.',
        question: 'Naslov je vprašanje. Preverite, ali besedilo odgovarja ali le odpira temo.',
        exclusive: 'Naslov napoveduje ekskluzivo. Preverite, ali je trditev potrjena drugje.',
        quote: 'Preverite, ali je citat v viru cel in v kontekstu, ne skrajšan.'
      }
    }
  },
  it: {
    locale: 'it_IT',
    ui: {
      editionOf: 'Edizione AKTUAL MEDIA',
      latest: 'Ultime notizie',
      allNews: 'Tutti gli articoli',
      themes: 'Temi',
      sources: 'Fonti',
      methodology: 'Metodologia',
      hashtags: 'Tag',
      readAtSource: 'Leggi alla fonte',
      published: 'Pubblicato',
      source: 'Fonte',
      editor: 'Direttore dell’edizione',
      director: 'Direttore',
      publisher: 'Editore',
      contact: 'Contatti',
      radio: 'Radio in diretta',
      radioNote: 'Emittente esterna · si apre in una nuova finestra',
      otherChannels: 'Altre edizioni',
      hub: 'Tutte le edizioni AKTUAL MEDIA',
      aboutTitle: 'Che cos’è questa edizione',
      aboutText: 'Rassegna quotidiana dei media locali con un collegamento a ogni fonte. L’analisi descrive come è intitolato l’articolo e che cosa verificare prima di concludere; le affermazioni della fonte non sono le nostre.',
      emptyTitle: 'La prima edizione è in preparazione',
      emptyText: 'Il sistema legge ogni giorno le fonti indicate. Se una fonte non è raggiungibile in questo ciclo, l’edizione non inventa: pubblica ciò che ha realmente trovato.',
      analysis: 'Che cosa verificare',
      summary: 'Sintesi della fonte',
      quoteNote: 'Titolo e sintesi sono ripresi dalla fonte e sono l’oggetto dell’analisi.',
      back: 'Torna all’edizione',
      updated: 'Aggiornato',
      daily: 'Edizione quotidiana',
      autoNote: 'Composta automaticamente da fonti pubblicate · non rivista singolarmente dalla redazione',
      sourcesLead: 'I media che questa edizione legge. I titoli provengono dai loro canali pubblici, con il collegamento alla fonte.',
      methodLead: 'Come nasce l’edizione: lettura dei canali pubblici, verifica del collegamento, estrazione di titolo e sintesi, analisi del modo di informare e pubblicazione con piena attribuzione.',
      methodPoints: [
        'Non copiamo l’intero testo della fonte e non lo raccontiamo come una nostra notizia.',
        'Ogni scheda ha un collegamento diretto alla fonte e la data di pubblicazione.',
        'Numeri e affermazioni del titolo sono segnalati come da verificare, non come fatti accertati.',
        'Se una fonte non è disponibile, l’edizione lo dice invece di riempire il vuoto con contenuti inventati.',
        'Le correzioni sono pubblicate sulla stessa pagina, con la data.'
      ],
      themeNames: {
        sigurnost: 'Sicurezza e cibernetica', rat: 'Guerra ed escalation', potres: 'Terremoti e disastri',
        politika: 'Politica', ekonomija: 'Economia', ai: 'IA e tecnologia',
        energija: 'Energia', sport: 'Sport', drustvo: 'Società'
      },
      checks: {
        number: 'Il titolo contiene un numero. Verificate se il testo indica da dove viene il numero e a quale periodo si riferisce.',
        superlative: 'Il titolo usa un superlativo. Verificate con quale insieme si confronta e chi ha fatto il confronto.',
        anonymous: 'Il testo cita fonti anonime. Verificate se esiste un documento o una fonte nominata.',
        question: 'Il titolo è una domanda. Verificate se il testo risponde o si limita ad aprire il tema.',
        exclusive: 'Il titolo annuncia un’esclusiva. Verificate se l’affermazione è confermata altrove.',
        quote: 'Verificate che la citazione sia completa e nel contesto, non abbreviata.'
      }
    }
  },
  bg: {
    locale: 'bg_BG',
    ui: {
      editionOf: 'Издание на AKTUAL MEDIA',
      latest: 'Най-ново',
      allNews: 'Всички публикации',
      themes: 'Теми',
      sources: 'Източници',
      methodology: 'Методология',
      hashtags: 'Етикети',
      readAtSource: 'Прочетете при източника',
      published: 'Публикувано',
      source: 'Източник',
      editor: 'Редактор на изданието',
      director: 'Директор',
      publisher: 'Издател',
      contact: 'Контакт',
      radio: 'Радио на живо',
      radioNote: 'Външна станция · отваря се в нов прозорец',
      otherChannels: 'Други издания',
      hub: 'Всички издания на AKTUAL MEDIA',
      aboutTitle: 'Какво е това издание',
      aboutText: 'Ежедневен преглед на местните медии с връзка към всеки източник. Коментарът описва как е озаглавен текстът и какво трябва да се провери преди извод; твърденията на източника не са наши твърдения.',
      emptyTitle: 'Първото издание е в подготовка',
      emptyText: 'Системата чете посочените източници всеки ден. Ако източник не е достъпен в този цикъл, изданието не измисля — публикува това, което наистина е намерено.',
      analysis: 'Какво да проверим',
      summary: 'Резюме на източника',
      quoteNote: 'Заглавието и резюмето са взети от източника и са предмет на коментара.',
      back: 'Обратно към изданието',
      updated: 'Обновено',
      daily: 'Ежедневно издание',
      autoNote: 'Съставено автоматично от публикувани източници · не е индивидуално редакторски проверено',
      sourcesLead: 'Медиите, които това издание чете. Заглавията идват от публичните им канали, с връзка към източника.',
      methodLead: 'Как се създава изданието: четене на публични канали, проверка на връзката, извличане на заглавие и резюме, коментар върху начина на отразяване и публикация с пълно посочване на източника.',
      methodPoints: [
        'Не копираме целия текст на източника и не го преразказваме като своя новина.',
        'Всеки запис носи пряка връзка към източника и дата на публикуване.',
        'Числата и твърденията в заглавието са отбелязани като нещо за проверка, не като потвърден факт.',
        'Ако източникът не е достъпен, изданието го казва, вместо да запълва празнината с измислено съдържание.',
        'Корекциите се публикуват на същата страница, с дата.'
      ],
      themeNames: {
        sigurnost: 'Сигурност и кибернетика', rat: 'Война и ескалация', potres: 'Земетресения и бедствия',
        politika: 'Политика', ekonomija: 'Икономика', ai: 'ИИ и технологии',
        energija: 'Енергетика', sport: 'Спорт', drustvo: 'Общество'
      },
      checks: {
        number: 'Заглавието съдържа число. Проверете дали текстът посочва откъде идва числото и за кой период се отнася.',
        superlative: 'Заглавието използва суперлатив. Проверете с кой набор се сравнява и кой е направил сравнението.',
        anonymous: 'Текстът се позовава на анонимни източници. Проверете дали има документ или посочен източник.',
        question: 'Заглавието е въпрос. Проверете дали текстът отговаря или само отваря темата.',
        exclusive: 'Заглавието обявява ексклузив. Проверете дали твърдението е потвърдено другаде.',
        quote: 'Проверете дали цитатът е пълен и в контекст, а не съкратен.'
      }
    }
  },
  ro: {
    locale: 'ro_RO',
    ui: {
      editionOf: 'Ediția AKTUAL MEDIA',
      latest: 'Cele mai noi',
      allNews: 'Toate articolele',
      themes: 'Teme',
      sources: 'Surse',
      methodology: 'Metodologie',
      hashtags: 'Etichete',
      readAtSource: 'Citiți la sursă',
      published: 'Publicat',
      source: 'Sursă',
      editor: 'Editorul ediției',
      director: 'Director',
      publisher: 'Editor',
      contact: 'Contact',
      radio: 'Radio live',
      radioNote: 'Post extern · se deschide într-o fereastră nouă',
      otherChannels: 'Alte ediții',
      hub: 'Toate edițiile AKTUAL MEDIA',
      aboutTitle: 'Ce este această ediție',
      aboutText: 'Selecta zilnică a presei locale, cu un link către fiecare sursă. Comentariul descrie cum este intitulat articolul și ce trebuie verificat înainte de o concluzie; afirmațiile sursei nu sunt afirmațiile noastre.',
      emptyTitle: 'Prima ediție este în pregătire',
      emptyText: 'Sistemul citește zilnic sursele indicate. Dacă o sursă nu este disponibilă în acest ciclu, ediția nu inventează — publică ceea ce a găsit cu adevărat.',
      analysis: 'Ce trebuie verificat',
      summary: 'Rezumatul sursei',
      quoteNote: 'Titlul și rezumatul sunt preluate din sursă și fac obiectul comentariului.',
      back: 'Înapoi la ediție',
      updated: 'Actualizat',
      daily: 'Ediție zilnică',
      autoNote: 'Alcătuită automat din surse publicate · nu este verificată individual de redacție',
      sourcesLead: 'Publicațiile pe care le citește această ediție. Titlurile provin din fluxurile lor publice, cu link către sursă.',
      methodLead: 'Cum apare ediția: citirea fluxurilor publice, verificarea linkului, extragerea titlului și a rezumatului, comentariu asupra modului de relatare și publicare cu atribuire completă.',
      methodPoints: [
        'Nu copiem textul integral al sursei și nu îl povestim ca știre proprie.',
        'Fiecare fișă are un link direct către sursă și data publicării.',
        'Cifrele și afirmațiile din titlu sunt marcate ca elemente de verificat, nu ca fapte confirmate.',
        'Dacă sursa nu este disponibilă, ediția spune acest lucru în loc să umple golul cu conținut inventat.',
        'Corectările sunt publicate pe aceeași pagină, cu data.'
      ],
      themeNames: {
        sigurnost: 'Securitate și cibernetică', rat: 'Război și escaladare', potres: 'Cutremure și dezastre',
        politika: 'Politică', ekonomija: 'Economie', ai: 'AI și tehnologie',
        energija: 'Energie', sport: 'Sport', drustvo: 'Societate'
      },
      checks: {
        number: 'Titlul conține o cifră. Verificați dacă textul arată de unde provine cifra și la ce perioadă se referă.',
        superlative: 'Titlul folosește un superlativ. Verificați cu ce ansamblu se compară și cine a făcut comparația.',
        anonymous: 'Textul citează surse anonime. Verificați dacă există un document sau o sursă numită.',
        question: 'Titlul este o întrebare. Verificați dacă textul răspunde sau doar deschide tema.',
        exclusive: 'Titlul anunță un exclusiv. Verificați dacă afirmația este confirmată în altă parte.',
        quote: 'Verificați dacă citatul este complet și în context, nu scurtat.'
      }
    }
  }
};


/* ------------------------------------------------------------------ *
 *  Global editions — jezični paketi za izdanja izvan regije.
 *  Isti ključevi kao u hrvatskom paketu; tekst je pisan za svaki jezik,
 *  ne strojno preveden u letu.
 * ------------------------------------------------------------------ */

const GLOBAL_UI = {
  en: {
    locale: 'en_US',
    ui: {
      editionOf: 'An AKTUAL MEDIA edition',
      latest: 'Latest', allNews: 'All stories', themes: 'Themes', sources: 'Sources',
      methodology: 'Methodology', hashtags: 'Tags', readAtSource: 'Read at the source',
      published: 'Published', source: 'Source', editor: 'Editor of the edition',
      director: 'Director', publisher: 'Publisher', contact: 'Contact',
      radio: 'Radio live', radioNote: 'External station · opens in a new window',
      otherChannels: 'Other editions', hub: 'All AKTUAL MEDIA editions',
      aboutTitle: 'What this edition is',
      aboutText: 'A daily review of local media with a link to every original. The review describes how the story was headlined and what to check before drawing a conclusion; the claims of the sources are not our claims.',
      emptyTitle: 'The first edition is being prepared',
      emptyText: 'The engine reads the named sources every day. If a source is not available in this cycle, the edition does not invent one — it publishes what was actually found.',
      analysis: 'What to check', summary: 'Summary of the original',
      quoteNote: 'The headline and summary are taken from the original and are the subject of the review.',
      back: 'Back to the edition', updated: 'Updated', daily: 'Daily edition',
      autoNote: 'Automatically assembled from published sources · not individually editorially reviewed',
      sourcesLead: 'The outlets this edition reads. Headlines are taken from their public feeds, with a link to the original.',
      methodLead: 'How the edition is made: reading public feeds, checking the link, extracting the headline and summary, reviewing how the story is reported, and publishing with full attribution.',
      methodPoints: [
        'We do not republish the full article or rewrite it as our own news.',
        'Every record carries a direct link to the original and its publication date.',
        'Figures and claims from headlines are marked as things to check, not as confirmed facts.',
        'If a source is unavailable, the edition says so instead of filling the gap with invented content.',
        'Corrections are published on the same page, with a date.'
      ],
      themeNames: {
        sigurnost: 'Security and cyber', rat: 'War and escalation', potres: 'Earthquakes and disasters',
        politika: 'Politics', ekonomija: 'Economy', ai: 'AI and technology',
        energija: 'Energy', sport: 'Sport', drustvo: 'Society'
      },
      checks: {
        number: 'The headline contains a figure. Check whether the text says where the figure comes from and which period it covers.',
        superlative: 'The headline uses a superlative. Check what it is compared with and who made the comparison.',
        anonymous: 'The text relies on unnamed sources. Check whether a document or a named source exists.',
        question: 'The headline is a question. Check whether the text answers it or only opens the topic.',
        exclusive: 'The headline announces an exclusive. Check whether the claim is confirmed elsewhere.',
        quote: 'Check that the quotation is complete and in context, not shortened.'
      }
    }
  },
  id: {
    locale: 'id_ID',
    ui: {
      editionOf: 'Edisi AKTUAL MEDIA',
      latest: 'Terbaru', allNews: 'Semua tulisan', themes: 'Tema', sources: 'Sumber',
      methodology: 'Metodologi', hashtags: 'Tagar', readAtSource: 'Baca di sumber aslinya',
      published: 'Terbit', source: 'Sumber', editor: 'Editor edisi',
      director: 'Direktur', publisher: 'Penerbit', contact: 'Kontak',
      radio: 'Radio langsung', radioNote: 'Stasiun eksternal · terbuka di jendela baru',
      otherChannels: 'Edisi lain', hub: 'Semua edisi AKTUAL MEDIA',
      aboutTitle: 'Apa edisi ini',
      aboutText: 'Tinjauan harian media lokal dengan tautan ke setiap sumber asli. Tinjauan menjelaskan bagaimana berita diberi judul dan apa yang perlu diperiksa sebelum menyimpulkan; klaim sumber bukanlah klaim kami.',
      emptyTitle: 'Edisi pertama sedang disiapkan',
      emptyText: 'Mesin membaca sumber yang tercantum setiap hari. Bila sumber tidak tersedia pada siklus ini, edisi tidak mengarang — yang terbit adalah apa yang benar-benar ditemukan.',
      analysis: 'Yang perlu diperiksa', summary: 'Ringkasan sumber asli',
      quoteNote: 'Judul dan ringkasan diambil dari sumber asli dan menjadi objek tinjauan.',
      back: 'Kembali ke edisi', updated: 'Diperbarui', daily: 'Edisi harian',
      autoNote: 'Disusun otomatis dari sumber yang terbit · tidak ditinjau editor secara individual',
      sourcesLead: 'Media yang dibaca edisi ini. Judul diambil dari feed publik mereka, dengan tautan ke sumber asli.',
      methodLead: 'Cara edisi ini dibuat: membaca feed publik, memeriksa tautan, mengambil judul dan ringkasan, meninjau cara pemberitaan, lalu menerbitkan dengan atribusi penuh.',
      methodPoints: [
        'Kami tidak menyalin seluruh artikel dan tidak menuliskannya ulang sebagai berita kami.',
        'Setiap catatan memuat tautan langsung ke sumber asli dan tanggal terbitnya.',
        'Angka dan klaim dari judul ditandai sebagai hal yang perlu diperiksa, bukan fakta yang sudah pasti.',
        'Bila sumber tidak tersedia, edisi menyatakannya, bukan mengisi kekosongan dengan karangan.',
        'Koreksi diterbitkan di halaman yang sama, dengan tanggal.'
      ],
      themeNames: {
        sigurnost: 'Keamanan dan siber', rat: 'Perang dan eskalasi', potres: 'Gempa dan bencana',
        politika: 'Politik', ekonomija: 'Ekonomi', ai: 'AI dan teknologi',
        energija: 'Energi', sport: 'Olahraga', drustvo: 'Masyarakat'
      },
      checks: {
        number: 'Judul memuat angka. Periksa apakah teks menyebut asal angka dan periode yang dicakupnya.',
        superlative: 'Judul memakai superlatif. Periksa apa pembandingnya dan siapa yang membuat perbandingan.',
        anonymous: 'Teks mengacu pada sumber tanpa nama. Periksa apakah ada dokumen atau sumber yang disebut namanya.',
        question: 'Judul berupa pertanyaan. Periksa apakah teks menjawabnya atau hanya membuka topik.',
        exclusive: 'Judul mengumumkan eksklusif. Periksa apakah klaim itu dikonfirmasi di tempat lain.',
        quote: 'Periksa apakah kutipan lengkap dan dalam konteks, bukan dipotong.'
      }
    }
  },
  pt: {
    locale: 'pt_BR',
    ui: {
      editionOf: 'Uma edição AKTUAL MEDIA',
      latest: 'Mais recentes', allNews: 'Todas as matérias', themes: 'Temas', sources: 'Fontes',
      methodology: 'Metodologia', hashtags: 'Etiquetas', readAtSource: 'Leia na fonte original',
      published: 'Publicado', source: 'Fonte', editor: 'Editor da edição',
      director: 'Diretor', publisher: 'Publicador', contact: 'Contato',
      radio: 'Rádio ao vivo', radioNote: 'Emissora externa · abre em nova janela',
      otherChannels: 'Outras edições', hub: 'Todas as edições AKTUAL MEDIA',
      aboutTitle: 'O que é esta edição',
      aboutText: 'Uma revisão diária da mídia local com link para cada original. A revisão descreve como a matéria foi titulada e o que verificar antes de concluir; as afirmações das fontes não são as nossas.',
      emptyTitle: 'A primeira edição está em preparação',
      emptyText: 'O sistema lê as fontes indicadas todos os dias. Se uma fonte não estiver disponível neste ciclo, a edição não inventa — publica o que realmente foi encontrado.',
      analysis: 'O que verificar', summary: 'Resumo do original',
      quoteNote: 'O título e o resumo são retirados do original e são o objeto da revisão.',
      back: 'Voltar à edição', updated: 'Atualizado', daily: 'Edição diária',
      autoNote: 'Montado automaticamente a partir de fontes publicadas · sem revisão editorial individual',
      sourcesLead: 'Os veículos que esta edição lê. Os títulos vêm dos feeds públicos, com link para o original.',
      methodLead: 'Como a edição é feita: leitura de feeds públicos, verificação do link, extração do título e do resumo, revisão de como a matéria foi reportada e publicação com atribuição completa.',
      methodPoints: [
        'Não republicamos o texto completo nem o reescrevemos como notícia nossa.',
        'Cada registro traz link direto para o original e a data de publicação.',
        'Números e afirmações do título são marcados como pontos a verificar, não como fatos confirmados.',
        'Se uma fonte estiver indisponível, a edição diz isso em vez de preencher a lacuna com conteúdo inventado.',
        'Correções são publicadas na mesma página, com data.'
      ],
      themeNames: {
        sigurnost: 'Segurança e ciber', rat: 'Guerra e escalada', potres: 'Terremotos e desastres',
        politika: 'Política', ekonomija: 'Economia', ai: 'IA e tecnologia',
        energija: 'Energia', sport: 'Esporte', drustvo: 'Sociedade'
      },
      checks: {
        number: 'O título contém um número. Verifique se o texto informa de onde vem o número e a que período se refere.',
        superlative: 'O título usa superlativo. Verifique com o que é comparado e quem fez a comparação.',
        anonymous: 'O texto cita fontes sem nome. Verifique se existe documento ou fonte nomeada.',
        question: 'O título é uma pergunta. Verifique se o texto responde ou apenas abre o tema.',
        exclusive: 'O título anuncia exclusividade. Verifique se a afirmação é confirmada em outro lugar.',
        quote: 'Verifique se a citação está completa e em contexto, não encurtada.'
      }
    }
  },
  ar: {
    locale: 'ar_EG',
    ui: {
      editionOf: 'إصدار أكتوال ميديا',
      latest: 'الأحدث', allNews: 'كل المواد', themes: 'المواضيع', sources: 'المصادر',
      methodology: 'المنهجية', hashtags: 'الوسوم', readAtSource: 'اقرأ عند المصدر',
      published: 'نُشر', source: 'المصدر', editor: 'محرر الإصدار',
      director: 'المدير', publisher: 'الناشر', contact: 'اتصال',
      radio: 'راديو مباشر', radioNote: 'محطة خارجية · تُفتح في نافذة جديدة',
      otherChannels: 'إصدارات أخرى', hub: 'كل إصدارات أكتوال ميديا',
      aboutTitle: 'ما هذا الإصدار',
      aboutText: 'مراجعة يومية للصحافة المحلية مع رابط إلى كل نص أصلي. تصف المراجعة كيف صيغ العنوان وما ينبغي التحقق منه قبل الاستنتاج؛ وادعاءات المصادر ليست ادعاءاتنا.',
      emptyTitle: 'الإصدار الأول قيد الإعداد',
      emptyText: 'يقرأ النظام المصادر المذكورة كل يوم. وإذا لم يتوفر مصدر في هذه الدورة، لا يخترع الإصدار بديلاً — بل ينشر ما وُجد فعلاً.',
      analysis: 'ما ينبغي التحقق منه', summary: 'ملخص النص الأصلي',
      quoteNote: 'العنوان والملخص مأخوذان من المصدر الأصلي وهما موضوع المراجعة.',
      back: 'رجوع إلى الإصدار', updated: 'حُدِّث', daily: 'إصدار يومي',
      autoNote: 'جُمع آلياً من مصادر منشورة · دون مراجعة تحريرية فردية',
      sourcesLead: 'الوسائل التي يقرأها هذا الإصدار. تُؤخذ العناوين من خلاصاتها العامة مع رابط إلى الأصل.',
      methodLead: 'كيف يُصنع الإصدار: قراءة الخلاصات العامة، والتحقق من الرابط، واستخراج العنوان والملخص، ومراجعة طريقة التغطية، والنشر مع نسبة كاملة إلى المصدر.',
      methodPoints: [
        'لا نعيد نشر النص كاملاً ولا نعيد كتابته كخبر لنا.',
        'كل سجل يحمل رابطاً مباشراً إلى المصدر الأصلي وتاريخ نشره.',
        'الأرقام والادعاءات الواردة في العناوين تُعلَّم كأمور تحتاج إلى تحقق، لا كحقائق مؤكدة.',
        'إذا تعذر الوصول إلى مصدر، يقول الإصدار ذلك بدلاً من ملء الفراغ بمحتوى مختلق.',
        'تُنشر التصحيحات على الصفحة نفسها، مع التاريخ.'
      ],
      themeNames: {
        sigurnost: 'الأمن والسيبرانية', rat: 'الحرب والتصعيد', potres: 'الزلازل والكوارث',
        politika: 'السياسة', ekonomija: 'الاقتصاد', ai: 'الذكاء الاصطناعي والتقنية',
        energija: 'الطاقة', sport: 'الرياضة', drustvo: 'المجتمع'
      },
      checks: {
        number: 'العنوان يحتوي رقماً. تحقق مما إذا كان النص يذكر مصدر الرقم والفترة التي يغطيها.',
        superlative: 'العنوان يستخدم صيغة تفضيل. تحقق من الشيء الذي يُقارن به ومن أجرى المقارنة.',
        anonymous: 'النص يعتمد على مصادر غير مسماة. تحقق من وجود وثيقة أو مصدر مسمى.',
        question: 'العنوان سؤال. تحقق مما إذا كان النص يجيب عنه أم يفتح الموضوع فقط.',
        exclusive: 'العنوان يعلن حصرية. تحقق مما إذا كان الادعاء مؤكداً في مكان آخر.',
        quote: 'تحقق من أن الاقتباس كامل وفي سياقه، لا مختصراً.'
      }
    }
  },
  ja: {
    locale: 'ja_JP',
    ui: {
      editionOf: 'AKTUAL MEDIA 版',
      latest: '最新', allNews: 'すべての記事', themes: 'テーマ', sources: '情報源',
      methodology: '方法論', hashtags: 'タグ', readAtSource: '原文で読む',
      published: '公開', source: '情報源', editor: '版の編集者',
      director: '代表', publisher: '発行', contact: '連絡先',
      radio: 'ラジオ（ライブ）', radioNote: '外部局 · 新しいウィンドウで開きます',
      otherChannels: '他の版', hub: 'AKTUAL MEDIA のすべての版',
      aboutTitle: 'この版について',
      aboutText: '地域メディアを毎日読み、すべての原文へのリンクを付けます。レビューは見出しの付け方と、結論の前に確認すべき点を説明します。情報源の発言は私たちの発言ではありません。',
      emptyTitle: '最初の版を準備しています',
      emptyText: '毎日、指定した情報源を読みます。この周期で情報源が利用できない場合、版は内容を作らず、実際に見つかったものだけを公開します。',
      analysis: '確認すべき点', summary: '原文の要約',
      quoteNote: '見出しと要約は原文から取り、レビューの対象としています。',
      back: '版へ戻る', updated: '更新', daily: '日刊版',
      autoNote: '公開された情報源から自動で構成 · 個別の編集確認は行っていません',
      sourcesLead: 'この版が読む媒体です。見出しは各社の公開フィードから取得し、原文へのリンクを付けます。',
      methodLead: '版の作り方：公開フィードを読み、リンクを確認し、見出しと要約を取り出し、報じ方を検討して、出典を明示して公開します。',
      methodPoints: [
        '原文の全文を転載せず、自社のニュースとして書き直すこともありません。',
        '各記録には原文への直接リンクと公開日を付けます。',
        '見出しの数字や主張は、確認済みの事実ではなく確認すべき点として示します。',
        '情報源が利用できない場合は、架空の内容で埋めず、その旨を明記します。',
        '訂正は同じページに日付とともに掲載します。'
      ],
      themeNames: {
        sigurnost: '安全保障とサイバー', rat: '戦争と緊張', potres: '地震と災害',
        politika: '政治', ekonomija: '経済', ai: 'AI と技術',
        energija: 'エネルギー', sport: 'スポーツ', drustvo: '社会'
      },
      checks: {
        number: '見出しに数字があります。本文が数字の出所と対象期間を示しているか確認してください。',
        superlative: '見出しに最上級表現があります。何と比べているのか、誰が比較したのかを確認してください。',
        anonymous: '本文が匿名の情報源に依拠しています。文書や氏名の明らかな情報源があるか確認してください。',
        question: '見出しが疑問形です。本文が答えているのか、テーマを示すだけかを確認してください。',
        exclusive: '見出しが独占取材をうたっています。主張が別の場所で確認されているかを見てください。',
        quote: '引用が短縮されず、完全な形で文脈の中にあるか確認してください。'
      }
    }
  },
  zh: {
    locale: 'zh_CN',
    ui: {
      editionOf: 'AKTUAL MEDIA 版本',
      latest: '最新', allNews: '全部文章', themes: '主题', sources: '来源',
      methodology: '方法', hashtags: '标签', readAtSource: '阅读原文',
      published: '发布', source: '来源', editor: '版本编辑',
      director: '总监', publisher: '出版', contact: '联系',
      radio: '广播直播', radioNote: '外部电台 · 在新窗口打开',
      otherChannels: '其他版本', hub: 'AKTUAL MEDIA 全部版本',
      aboutTitle: '这个版本是什么',
      aboutText: '每天梳理本地媒体，并为每一篇原文附上链接。评论说明标题如何拟定、在得出结论之前需要核对什么；来源的说法不是我们的说法。',
      emptyTitle: '第一版正在准备',
      emptyText: '系统每天读取所列来源。如果本轮某个来源不可用，版本不会编造，只发布真正找到的内容。',
      analysis: '需要核对什么', summary: '原文摘要',
      quoteNote: '标题和摘要取自原文，是评论的对象。',
      back: '返回版本', updated: '更新', daily: '每日版',
      autoNote: '由已发布的来源自动汇编 · 未经逐篇编辑审核',
      sourcesLead: '这个版本阅读的媒体。标题取自其公开订阅源，并附原文链接。',
      methodLead: '版本的制作方式：读取公开订阅源、核对链接、提取标题与摘要、审视报道方式，并在注明来源后发布。',
      methodPoints: [
        '我们不转载全文，也不把它改写成本站新闻。',
        '每条记录都带原文直链和发布日期。',
        '标题中的数字和说法标为需要核对的事项，而不是已确认的事实。',
        '如果来源不可用，版本会说明，而不会用虚构内容填补空白。',
        '更正发布在同一页面，并注明日期。'
      ],
      themeNames: {
        sigurnost: '安全与网络', rat: '战争与升级', potres: '地震与灾害',
        politika: '政治', ekonomija: '经济', ai: '人工智能与技术',
        energija: '能源', sport: '体育', drustvo: '社会'
      },
      checks: {
        number: '标题中有数字。请核对正文是否说明数字的来源和所涉期间。',
        superlative: '标题使用最高级。请核对比较对象以及是谁做的比较。',
        anonymous: '正文依赖未具名来源。请核对是否存在文件或具名来源。',
        question: '标题是问句。请核对正文是否作答，还是只提出问题。',
        exclusive: '标题声称独家。请核对这一说法是否在其他地方得到确认。',
        quote: '请核对引语是否完整、是否在语境中，而非被截短。'
      }
    }
  }
};

for (const [lang, pack] of Object.entries(GLOBAL_UI)) STRINGS[lang] = pack;

export const t = (lang) => STRINGS[lang] || STRINGS.hr;

/**
 * Rečenice za tijelo osvrta. Namjerno govore samo o tekstu koji imamo pred
 * sobom (naslov, sažetak, datum, poveznica) i nikada ne dodaju činjenice.
 */
export const ANALYSIS = {
  hr: {
    claim: (x) => `Naslov izvornika glasi: „${x.title}“.`,
    summary: (x) => `Sažetak koji izvornik objavljuje uz naslov: „${x.summary}“.`,
    noSummary: () => 'Uz naslov nije objavljen sažetak. Osvrt se zato oslanja samo na naslov, datum i poveznicu — ništa se ne dodaje.',
    numbers: () => 'Brojka iz naslova nije u sažetku povezana s dokumentom ni razdobljem. To je prvo pitanje za izvornik.',
    unnamed: () => 'Sažetak se poziva na izvore bez imena. Prije zaključka provjerite postoji li dokument ili imenovani sugovornik.',
    framing: () => 'Naš osvrt ne prenosi tvrdnje izvornika kao činjenice. Provjerava kako su izložene i što čitatelj treba sam provjeriti.',
    read: () => 'Cijeli tekst pročitajte kod izvornika. Ovdje je okvir za čitanje, ne zamjena za izvornik.',
    context: (x) => `Tema je ${x.theme}, a tekst je objavljen ${x.date} na ${x.source}.`
  },
  sr: {
    claim: (x) => `Naslov izvora glasi: „${x.title}“.`,
    summary: (x) => `Sažetak koji izvor objavljuje uz naslov: „${x.summary}“.`,
    noSummary: () => 'Uz naslov nije objavljen sažetak. Osvrt se zato oslanja samo na naslov, datum i link — ništa se ne dodaje.',
    numbers: () => 'Broj iz naslova nije u sažetku povezan sa dokumentom ni periodom. To je prvo pitanje za izvor.',
    unnamed: () => 'Sažetak se poziva na izvore bez imena. Pre zaključka proverite postoji li dokument ili imenovani sagovornik.',
    framing: () => 'Naš osvrt ne prenosi tvrdnje izvora kao činjenice. Proverava kako su izložene i šta čitalac treba sam da proveri.',
    read: () => 'Ceo tekst pročitajte kod izvora. Ovde je okvir za čitanje, ne zamena za izvor.',
    context: (x) => `Tema je ${x.theme}, a tekst je objavljen ${x.date} na ${x.source}.`
  },
  bs: {
    claim: (x) => `Naslov izvora glasi: „${x.title}“.`,
    summary: (x) => `Sažetak koji izvor objavljuje uz naslov: „${x.summary}“.`,
    noSummary: () => 'Uz naslov nije objavljen sažetak. Osvrt se zato oslanja samo na naslov, datum i link — ništa se ne dodaje.',
    numbers: () => 'Broj iz naslova nije u sažetku povezan s dokumentom ni periodom. To je prvo pitanje za izvor.',
    unnamed: () => 'Sažetak se poziva na izvore bez imena. Prije zaključka provjerite postoji li dokument ili imenovani sagovornik.',
    framing: () => 'Naš osvrt ne prenosi tvrdnje izvora kao činjenice. Provjerava kako su izložene i šta čitatelj treba sam provjeriti.',
    read: () => 'Cijeli tekst pročitajte kod izvora. Ovdje je okvir za čitanje, ne zamjena za izvor.',
    context: (x) => `Tema je ${x.theme}, a tekst je objavljen ${x.date} na ${x.source}.`
  },
  hu: {
    claim: (x) => `Az eredeti címe: „${x.title}“.`,
    summary: (x) => `A forrás összefoglalója a cím mellett: „${x.summary}“.`,
    noSummary: () => 'A cím mellett nem jelent meg összefoglaló. Az elemzés ezért csak a címre, a dátumra és a hivatkozásra támaszkodik — semmit nem tesz hozzá.',
    numbers: () => 'A címben szereplő számot az összefoglaló nem köti dokumentumhoz vagy időszakhoz. Ez az első kérdés a forrás felé.',
    unnamed: () => 'Az összefoglaló névtelen forrásokra hivatkozik. Következtetés előtt ellenőrizze, van-e dokumentum vagy nevesített forrás.',
    framing: () => 'Elemzésünk nem emeli át a forrás állításait tényként. Azt vizsgálja, hogyan vannak kifejtve, és mit kell az olvasónak ellenőriznie.',
    read: () => 'A teljes szöveget a forrásnál olvassa el. Ez olvasási keret, nem helyettesíti az eredetit.',
    context: (x) => `A téma: ${x.theme}; a szöveg ${x.date} jelent meg a következőnél: ${x.source}.`
  },
  sl: {
    claim: (x) => `Naslov izvirnika: „${x.title}“.`,
    summary: (x) => `Povzetek, ki ga vir objavi ob naslovu: „${x.summary}“.`,
    noSummary: () => 'Ob naslovu ni objavljenega povzetka. Osvrt se zato opira le na naslov, datum in povezavo — ničesar ne dodaja.',
    numbers: () => 'Številka iz naslova v povzetku ni povezana z dokumentom ali obdobjem. To je prvo vprašanje za vir.',
    unnamed: () => 'Povzetek se sklicuje na neimenovane vire. Pred sklepom preverite, ali obstaja dokument ali imenovani sogovornik.',
    framing: () => 'Naš osvrt ne prevzema trditev vira kot dejstev. Preverja, kako so predstavljene in kaj mora bralec preveriti sam.',
    read: () => 'Celotno besedilo preberite pri viru. Tu je okvir za branje, ne nadomestilo za izvirnik.',
    context: (x) => `Tema je ${x.theme}, besedilo pa je objavljeno ${x.date} pri ${x.source}.`
  },
  it: {
    claim: (x) => `Il titolo della fonte è: „${x.title}“.`,
    summary: (x) => `La sintesi pubblicata dalla fonte accanto al titolo: „${x.summary}“.`,
    noSummary: () => 'Accanto al titolo non è pubblicata alcuna sintesi. L’analisi si basa quindi solo su titolo, data e collegamento — non aggiunge nulla.',
    numbers: () => 'Il numero nel titolo non è collegato nella sintesi a un documento o a un periodo. È la prima domanda alla fonte.',
    unnamed: () => 'La sintesi cita fonti senza nome. Prima di concludere verificate se esiste un documento o una fonte nominata.',
    framing: () => 'La nostra analisi non riporta le affermazioni della fonte come fatti. Verifica come sono esposte e che cosa deve controllare il lettore.',
    read: () => 'Leggete il testo completo alla fonte. Qui c’è una griglia di lettura, non un sostituto dell’originale.',
    context: (x) => `Il tema è ${x.theme}; il testo è stato pubblicato il ${x.date} su ${x.source}.`
  },
  bg: {
    claim: (x) => `Заглавието на източника е: „${x.title}“.`,
    summary: (x) => `Резюмето, което източникът публикува до заглавието: „${x.summary}“.`,
    noSummary: () => 'До заглавието не е публикувано резюме. Затова коментарът се опира само на заглавието, датата и връзката — нищо не се добавя.',
    numbers: () => 'Числото от заглавието не е свързано в резюмето с документ или период. Това е първият въпрос към източника.',
    unnamed: () => 'Резюмето се позовава на източници без имена. Преди извод проверете дали има документ или посочен източник.',
    framing: () => 'Коментарът ни не представя твърденията на източника като факти. Проверява как са изложени и какво трябва да провери читателят.',
    read: () => 'Прочетете целия текст при източника. Тук има рамка за четене, не замяна на оригинала.',
    context: (x) => `Темата е ${x.theme}, а текстът е публикуван на ${x.date} в ${x.source}.`
  },
  ro: {
    claim: (x) => `Titlul sursei este: „${x.title}“.`,
    summary: (x) => `Rezumatul publicat de sursă lângă titlu: „${x.summary}“.`,
    noSummary: () => 'Lângă titlu nu este publicat niciun rezumat. De aceea comentariul se bazează doar pe titlu, dată și link — nu adaugă nimic.',
    numbers: () => 'Cifra din titlu nu este legată în rezumat de un document sau de o perioadă. Este prima întrebare pentru sursă.',
    unnamed: () => 'Rezumatul citează surse fără nume. Înainte de a concluziona, verificați dacă există un document sau o sursă numită.',
    framing: () => 'Comentariul nostru nu preia afirmațiile sursei ca fapte. Verifică modul în care sunt expuse și ce trebuie să verifice cititorul.',
    read: () => 'Citiți textul integral la sursă. Aici este un cadru de lectură, nu un substitut pentru original.',
    context: (x) => `Tema este ${x.theme}, iar textul a fost publicat pe ${x.date} la ${x.source}.`
  }
};

/* ---------- kritički sloj: pitanja koja tekst mora izdržati ----------
 * Ne dodaje tvrdnje o sadržaju izvornika — samo provjerava kako je izložen.
 * Jezik prati izdanje; sve formulacije ostaju pitanja, ne ocjene. */
const CRITIQUE = {
  hr: {
    headline: () => 'Kritički osvrt počinje od naslova: tvrdi li ono što tijelo teksta može dokazati. Ako je naslov u kondicionalu ili bez subjekta, čitatelj mora znati tko je što rekao, a ne samo što se dogodilo.',
    attribution: () => 'Provjerite atribuciju: imenuje li tekst instituciju, tvrtku ili osobu, ili se poziva na „krugove” i „izvore bliske”. Nepripisana tvrdnja nije lažna, ali nije ni provjerljiva — i tako je treba čitati.',
    verification: () => 'Tri stvari koje treba moći provjeriti prije zaključka: dokument (odluka, ugovor, izvješće), razdoblje na koje se brojka odnosi i definicija pojma iz naslova. Ako jedno od troje nedostaje, naslov obećava više nego tekst.',
    counterpoint: () => 'Dobar izvještaj navodi i podatak koji mu ne ide u prilog. Ako u tekstu nema nijednog protuprimjera ni ograde, to je signal da je okvir zatvoren prije provjere.'
  },
  sr: {
    headline: () => 'Kritički osvrt počinje od naslova: tvrdi li on ono što telo teksta može da dokaže. Ako je naslov u kondicionalu ili bez subjekta, čitalac mora da zna ko je šta rekao, a ne samo šta se dogodilo.',
    attribution: () => 'Proverite atribuciju: imenuje li tekst instituciju, kompaniju ili osobu, ili se poziva na „krugove” i „izvore bliske”. Nepripisana tvrdnja nije lažna, ali nije ni proverljiva — i tako je treba čitati.',
    verification: () => 'Tri stvari koje treba moći proveriti pre zaključka: dokument (odluka, ugovor, izveštaj), period na koji se broj odnosi i definicija pojma iz naslova. Ako jedno od troje nedostaje, naslov obećava više nego tekst.',
    counterpoint: () => 'Dobar izveštaj navodi i podatak koji mu ne ide u prilog. Ako u tekstu nema nijednog protivprimera ni ograde, to je signal da je okvir zatvoren pre provere.'
  },
  bs: {
    headline: () => 'Kritički osvrt počinje od naslova: tvrdi li on ono što tijelo teksta može dokazati. Ako je naslov u kondicionalu ili bez subjekta, čitatelj mora znati ko je šta rekao, a ne samo šta se dogodilo.',
    attribution: () => 'Provjerite atribuciju: imenuje li tekst instituciju, firmu ili osobu, ili se poziva na „krugove” i „izvore bliske”. Nepripisana tvrdnja nije lažna, ali nije ni provjerljiva — i tako je treba čitati.',
    verification: () => 'Tri stvari koje treba moći provjeriti prije zaključka: dokument (odluka, ugovor, izvještaj), period na koji se broj odnosi i definicija pojma iz naslova. Ako jedno od troje nedostaje, naslov obećava više nego tekst.',
    counterpoint: () => 'Dobar izvještaj navodi i podatak koji mu ne ide u prilog. Ako u tekstu nema nijednog protuprimjera ni ograde, to je signal da je okvir zatvoren prije provjere.'
  },
  hu: {
    headline: () => 'A kritikai elemzés a címmel kezdődik: állít-e annyit, mint amit a szöveg törzse bizonyítani tud. Ha a cím feltételes vagy alany nélküli, az olvasónak tudnia kell, ki mit mondott, nem csak azt, hogy mi történt.',
    attribution: () => 'Ellenőrizze a hivatkozást: megnevezi-e a szöveg az intézményt, a céget vagy a személyt, vagy „körökre” és „közeli forrásokra” hivatkozik. A meg nem nevezett állítás nem feltétlenül hamis, de nem is ellenőrizhető — így kell olvasni.',
    verification: () => 'Három dolgot kell tudni ellenőrizni a következtetés előtt: a dokumentumot (döntés, szerződés, jelentés), az időszakot, amelyre a szám vonatkozik, és a címben szereplő fogalom meghatározását. Ha valamelyik hiányzik, a cím többet ígér a szövegnél.',
    counterpoint: () => 'A jó tudósítás olyan adatot is hoz, amely nem erősíti meg az állítását. Ha a szövegben nincs ellenpélda és nincs fenntartás, az annak a jele, hogy a keret a ellenőrzés előtt lezárult.'
  },
  sl: {
    headline: () => 'Kritični osvrt se začne pri naslovu: trdi to, kar telo besedila lahko dokaže. Če je naslov pogojen ali brez osebka, mora bralec vedeti, kdo je kaj rekel, ne le, kaj se je zgodilo.',
    attribution: () => 'Preverite pripis: ali besedilo imenuje ustanovo, podjetje ali osebo, ali se sklicuje na „kroge” in „bližnje vire”. Nepripisana trditev ni nujno napačna, a ni preverljiva — tako jo je treba brati.',
    verification: () => 'Pred sklepom morajo biti preverljive tri stvari: dokument (odločitev, pogodba, poročilo), obdobje, na katero se nanaša številka, in opredelitev pojma iz naslova. Če eno od treh manjka, naslov obljublja več kot besedilo.',
    counterpoint: () => 'Dobro poročanje navede tudi podatek, ki mu ne ustreza. Če v besedilu ni nobenega nasprotnega primera in nobenega pridržka, je to znak, da je bil okvir zaprt pred preverjanjem.'
  },
  it: {
    headline: () => 'L’analisi critica parte dal titolo: afferma ciò che il corpo del testo può dimostrare. Se il titolo è al condizionale o senza soggetto, il lettore deve sapere chi ha detto cosa, non solo cosa è accaduto.',
    attribution: () => 'Verificate l’attribuzione: il testo nomina un’istituzione, un’azienda o una persona, oppure si richiama a „ambienti” e „fonti vicine”. Un’affermazione non attribuita non è necessariamente falsa, ma non è verificabile — e va letta così.',
    verification: () => 'Tre cose devono essere verificabili prima di concludere: il documento (decisione, contratto, rapporto), il periodo a cui si riferisce il numero e la definizione del termine nel titolo. Se manca una delle tre, il titolo promette più di quanto il testo dia.',
    counterpoint: () => 'Un buon resoconto riporta anche il dato che non lo conferma. Se nel testo non c’è alcun controesempio né alcuna cautela, è il segnale che la cornice è stata chiusa prima della verifica.'
  },
  bg: {
    headline: () => 'Критичният прочит започва от заглавието: твърди ли то това, което текстът може да докаже. Ако заглавието е в условно наклонение или без подлог, читателят трябва да знае кой какво е казал, а не само какво се е случило.',
    attribution: () => 'Проверете приписването: назовава ли текстът институция, фирма или човек, или се позовава на „кръгове” и „близки източници”. Неприписаното твърдение не е непременно невярно, но не е и проверимо — така трябва да се чете.',
    verification: () => 'Три неща трябва да могат да се проверят преди извода: документът (решение, договор, доклад), периодът, за който се отнася числото, и определението на понятието от заглавието. Ако едно от трите липсва, заглавието обещава повече от текста.',
    counterpoint: () => 'Добрият репортаж посочва и данните, които не го потвърждават. Ако в текста няма нито един контрапример и никакво уточнение, това е знак, че рамката е затворена преди проверката.'
  },
  ro: {
    headline: () => 'Analiza critică începe de la titlu: afirmă el ceea ce corpul textului poate demonstra. Dacă titlul este la condițional sau fără subiect, cititorul trebuie să știe cine a spus ce, nu doar ce s-a întâmplat.',
    attribution: () => 'Verificați atribuirea: textul numește o instituție, o companie sau o persoană ori se referă la „cercuri” și „surse apropiate”. O afirmație neatribuită nu este neapărat falsă, dar nu este verificabilă — și trebuie citită astfel.',
    verification: () => 'Trei lucruri trebuie să poată fi verificate înainte de concluzie: documentul (decizie, contract, raport), perioada la care se referă cifra și definiția termenului din titlu. Dacă lipsește unul dintre ele, titlul promite mai mult decât textul.',
    counterpoint: () => 'Un reportaj bun citează și datul care nu îl confirmă. Dacă în text nu există niciun contraexemplu și nicio nuanțare, este semnalul că grila a fost închisă înainte de verificare.'
  }
};
for (const [lang, extra] of Object.entries(CRITIQUE)) {
  if (ANALYSIS[lang]) Object.assign(ANALYSIS[lang], extra);
}

/* Analiza i kritički sloj za nove jezike — dodaju se nakon što su
   ANALYSIS i CRITIQUE definirani, pa redoslijed u datoteci ostaje jasan. */
/* Rečenice osvrta za nove jezike. */
Object.assign(ANALYSIS, {
  en: {
    claim: (x) => `The original headline reads: “${x.title}”.`,
    summary: (x) => `The summary published with the headline: “${x.summary}”.`,
    noSummary: () => 'No summary was published with the headline. The review therefore rests only on the headline, the date and the link — nothing is added.',
    numbers: () => 'The figure in the headline is not tied in the summary to a document or a period. That is the first question for the source.',
    unnamed: () => 'The summary relies on sources without names. Before concluding, check whether a document or a named source exists.',
    framing: () => 'Our review does not present the claims of the source as facts. It examines how they are set out and what the reader should check.',
    read: () => 'Read the full text at the source. This is a frame for reading, not a substitute for the original.',
    context: (x) => `The theme is ${x.theme}; the text was published on ${x.date} at ${x.source}.`,
    headline: () => 'A critical review starts with the headline: does it claim what the body can prove. If the headline is conditional or has no subject, the reader must know who said what, not only what happened.',
    attribution: () => 'Check attribution: does the text name an institution, a company or a person, or does it refer to “circles” and “sources close to”? An unattributed claim is not necessarily false, but it is not verifiable — and should be read that way.',
    verification: () => 'Three things must be verifiable before a conclusion: the document (decision, contract, report), the period the figure refers to, and the definition of the term in the headline. If one of the three is missing, the headline promises more than the text.',
    counterpoint: () => 'Good reporting also gives the fact that does not support it. If the text has no counterexample and no caveat, that is a signal the frame was closed before verification.'
  },
  id: {
    claim: (x) => `Judul aslinya berbunyi: “${x.title}”.`,
    summary: (x) => `Ringkasan yang diterbitkan bersama judul: “${x.summary}”.`,
    noSummary: () => 'Tidak ada ringkasan yang terbit bersama judul. Karena itu tinjauan hanya bersandar pada judul, tanggal, dan tautan — tidak ada yang ditambahkan.',
    numbers: () => 'Angka dalam judul tidak dihubungkan dalam ringkasan dengan dokumen atau periode tertentu. Itu pertanyaan pertama untuk sumber.',
    unnamed: () => 'Ringkasan mengacu pada sumber tanpa nama. Sebelum menyimpulkan, periksa apakah ada dokumen atau sumber yang disebut namanya.',
    framing: () => 'Tinjauan kami tidak menyajikan klaim sumber sebagai fakta. Tinjauan memeriksa bagaimana klaim itu disusun dan apa yang perlu diperiksa pembaca.',
    read: () => 'Baca teks lengkap di sumbernya. Ini kerangka membaca, bukan pengganti teks asli.',
    context: (x) => `Temanya ${x.theme}; teks terbit pada ${x.date} di ${x.source}.`,
    headline: () => 'Tinjauan kritis mulai dari judul: apakah judul menjanjikan apa yang bisa dibuktikan isi berita. Bila judul bersifat bersyarat atau tanpa subjek, pembaca harus tahu siapa mengatakan apa, bukan hanya apa yang terjadi.',
    attribution: () => 'Periksa atribusi: apakah teks menyebut lembaga, perusahaan, atau orang, atau mengacu pada “lingkaran” dan “sumber dekat”. Klaim tanpa atribusi belum tentu salah, tetapi tidak dapat diperiksa — dan harus dibaca begitu.',
    verification: () => 'Tiga hal harus bisa diperiksa sebelum menyimpulkan: dokumen (keputusan, kontrak, laporan), periode yang dirujuk angka, dan definisi istilah dalam judul. Bila salah satunya tidak ada, judul menjanjikan lebih dari isi.',
    counterpoint: () => 'Liputan yang baik juga menyebut data yang tidak mendukungnya. Bila teks tidak memuat satu pun contoh lawan atau catatan pembatas, itu tanda kerangka ditutup sebelum pemeriksaan.'
  },
  pt: {
    claim: (x) => `O título original diz: “${x.title}”.`,
    summary: (x) => `O resumo publicado com o título: “${x.summary}”.`,
    noSummary: () => 'Não foi publicado resumo com o título. Por isso a revisão se apoia apenas no título, na data e no link — nada é acrescentado.',
    numbers: () => 'O número do título não é ligado no resumo a um documento ou a um período. É a primeira pergunta para a fonte.',
    unnamed: () => 'O resumo cita fontes sem nome. Antes de concluir, verifique se existe documento ou fonte nomeada.',
    framing: () => 'Nossa revisão não apresenta as afirmações da fonte como fatos. Ela examina como foram expostas e o que o leitor deve verificar.',
    read: () => 'Leia o texto completo na fonte. Aqui há um roteiro de leitura, não um substituto do original.',
    context: (x) => `O tema é ${x.theme}; o texto foi publicado em ${x.date} em ${x.source}.`,
    headline: () => 'A revisão crítica começa pelo título: ele afirma o que o corpo do texto pode provar. Se o título é condicional ou sem sujeito, o leitor precisa saber quem disse o quê, não apenas o que aconteceu.',
    attribution: () => 'Verifique a atribuição: o texto nomeia instituição, empresa ou pessoa, ou recorre a “círculos” e “fontes próximas”. Uma afirmação sem atribuição não é necessariamente falsa, mas não é verificável — e deve ser lida assim.',
    verification: () => 'Três coisas precisam ser verificáveis antes da conclusão: o documento (decisão, contrato, relatório), o período a que o número se refere e a definição do termo do título. Se falta uma delas, o título promete mais do que o texto.',
    counterpoint: () => 'Uma boa reportagem também traz o dado que não a confirma. Se o texto não tem contraexemplo nem ressalva, é sinal de que o enquadramento foi fechado antes da verificação.'
  },
  ar: {
    claim: (x) => `عنوان النص الأصلي: «${x.title}».`,
    summary: (x) => `الملخص المنشور مع العنوان: «${x.summary}».`,
    noSummary: () => 'لم يُنشر ملخص مع العنوان. لذلك تعتمد المراجعة على العنوان والتاريخ والرابط فقط — ولا يُضاف شيء.',
    numbers: () => 'الرقم الوارد في العنوان غير مربوط في الملخص بوثيقة أو بفترة زمنية. وهذا أول سؤال يُطرح على المصدر.',
    unnamed: () => 'يشير الملخص إلى مصادر بلا أسماء. قبل الاستنتاج، تحقق من وجود وثيقة أو مصدر مسمى.',
    framing: () => 'لا تعرض مراجعتنا ادعاءات المصدر كحقائق، بل تفحص كيف عُرضت وما ينبغي على القارئ التحقق منه.',
    read: () => 'اقرأ النص الكامل عند المصدر. ما هنا إطار للقراءة، لا بديل عن الأصل.',
    context: (x) => `الموضوع ${x.theme}، ونُشر النص في ${x.date} على ${x.source}.`,
    headline: () => 'تبدأ المراجعة النقدية من العنوان: هل يدّعي ما يستطيع متن النص إثباته. وإذا كان العنوان شرطياً أو بلا فاعل، فعلى القارئ أن يعرف من قال ماذا، لا ما حدث فقط.',
    attribution: () => 'تحقق من النسبة: هل يسمّي النص مؤسسة أو شركة أو شخصاً، أم يستند إلى «أوساط» و«مصادر مقربة». الادعاء غير المنسوب ليس بالضرورة كاذباً، لكنه غير قابل للتحقق — وهكذا يجب أن يُقرأ.',
    verification: () => 'ثلاثة أمور يجب أن تكون قابلة للتحقق قبل الاستنتاج: الوثيقة (قرار، عقد، تقرير)، والفترة التي يشير إليها الرقم، وتعريف المصطلح في العنوان. وإذا غاب أحد الثلاثة، فإن العنوان يعد بأكثر مما يقدمه النص.',
    counterpoint: () => 'التغطية الجيدة تذكر أيضاً المعطى الذي لا يدعمها. وإذا خلا النص من أي مثال مضاد ومن أي تحفظ، فذلك مؤشر على أن الإطار أُغلق قبل التحقق.'
  },
  ja: {
    claim: (x) => `原文の見出しは「${x.title}」です。`,
    summary: (x) => `見出しとともに公開された要約は「${x.summary}」です。`,
    noSummary: () => '見出しとともに要約は公開されていません。そのためレビューは見出し・日付・リンクだけに基づき、何も付け加えません。',
    numbers: () => '見出しの数字は、要約の中で文書や期間に結びついていません。まず情報源に確認すべき点です。',
    unnamed: () => '要約は名前のない情報源に依拠しています。結論の前に、文書や氏名の明らかな情報源があるか確認してください。',
    framing: () => '私たちのレビューは、情報源の主張を事実として示しません。どのように提示されているか、読者が何を確認すべきかを検討します。',
    read: () => '全文は情報源でお読みください。ここにあるのは読み方の枠組みであり、原文の代わりではありません。',
    context: (x) => `テーマは${x.theme}、本文は${x.date}に${x.source}で公開されました。`,
    headline: () => '批判的レビューは見出しから始まります。本文が証明できる以上のことを見出しが主張していないか。条件付きや主語のない見出しなら、何が起きたかだけでなく、誰が何を言ったかを読者は知る必要があります。',
    attribution: () => '帰属を確認してください。機関・企業・個人を名指ししているか、「関係者」「近い筋」に依拠しているか。名前のない主張は虚偽とは限りませんが、検証できません。そのように読むべきです。',
    verification: () => '結論の前に検証できるべきは三つです。文書（決定・契約・報告書）、数字が指す期間、見出しの用語の定義。どれか一つが欠けるなら、見出しは本文以上のことを約束しています。',
    counterpoint: () => 'よい報道は、自説を支えないデータも示します。反例も留保もないなら、検証の前に枠が閉じられたという合図です。'
  },
  zh: {
    claim: (x) => `原标题为：“${x.title}”。`,
    summary: (x) => `与标题一同发布的摘要：“${x.summary}”。`,
    noSummary: () => '标题没有配发摘要。因此评论只依据标题、日期和链接，不添加任何内容。',
    numbers: () => '标题中的数字在摘要里没有对应到文件或时间范围。这是需要向来源核对的第一个问题。',
    unnamed: () => '摘要引用了未具名来源。得出结论前，请核对是否存在文件或具名来源。',
    framing: () => '我们的评论不把来源的说法当作事实，而是审视它如何呈现、读者需要核对什么。',
    read: () => '请在来源处阅读全文。这里提供的是阅读框架，不是原文的替代。',
    context: (x) => `主题为${x.theme}；文本于${x.date}发布于${x.source}。`,
    headline: () => '批评性评论从标题开始：它是否主张了正文能够证明的内容。若标题使用条件式或缺少主语，读者必须知道是谁说了什么，而不只是发生了什么。',
    attribution: () => '请核对归属：正文是否点明机构、公司或个人，还是援引“圈内人士”“接近的消息源”。未注明出处的说法未必虚假，但无法核实——应当这样阅读。',
    verification: () => '得出结论前应有三项可核对的内容：文件（决定、合同、报告）、数字所指的期间、标题中概念的定义。三者缺一，标题就承诺了正文给不出的东西。',
    counterpoint: () => '好的报道也会给出不利于自身说法的数据。如果正文既无反例也无保留，说明框架在核对之前就已经封闭。'
  }
});
