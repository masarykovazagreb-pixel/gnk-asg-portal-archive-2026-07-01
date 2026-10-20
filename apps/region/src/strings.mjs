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
