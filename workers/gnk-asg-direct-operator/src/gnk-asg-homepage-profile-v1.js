export const GNK_ASG_HOMEPAGE_PROFILE_V1 = {
  version: "homepage-profile-v1",
  updatedAt: "2026-06-16",
  sourceNote: "Podaci su pripremljeni iz korisnickog sc.zip vizualnog materijala i projektnih napomena. Koristiti kao jedinstveni izvor za homepage, kartu, AI badge i javne JSON endpointove.",
  homepagePriority: [
    "Razdvojiti GNK ASG d.o.o. samostalni profil od GNK DINAMO Ltd. group overview.",
    "Na prvoj stranici prikazati grupu, GNK ASG d.o.o., financijske pokazatelje, globalnu mrezu, mapu gradova, plan 2026., dokumente, kontakt i AI badge.",
    "Index mora ostati brz: teske vijesti i veliki clanci idu na podstranice, a homepage prikazuje sazetak."
  ],
  company: {
    legalName: "GNK ASG d.o.o.",
    registeredSeat: "Zagrebačka cesta 130, Zagreb, Hrvatska",
    oib: "75227917632",
    mbs: "081512375",
    founded: "12. svibnja 2023.",
    primaryActivity: "Sportske djelatnosti, NKD 93.19.0",
    director: "Nermin Sefic",
    ubo: "Nermin Sefic",
    shareholder: "Sports Performance Tracking d.o.o., Beograd",
    auditor: "EKVILIBRIJ d.o.o.",
    positioning: "GNK ASG d.o.o. je hrvatsko drustvo unutar sire GNK DINAMO Ltd. poslovne i tehnolosko-sportske grupe."
  },
  companyFinancialsFY2025: {
    scope: "GNK ASG d.o.o. samostalni prikaz",
    salesRevenueEUR: 504000000,
    totalAssetsEUR: 46400000,
    equityAndReservesEUR: 46210000,
    shortTermLiabilitiesEUR: 184500,
    longTermLiabilitiesEUR: 0,
    profitBeforeTaxEUR: 21584.16,
    profitForYearEUR: 16076.47,
    intangibleAssetsSoftwareEUR: 30000000,
    disclosure: "Samostalni prikaz GNK ASG d.o.o. treba odvojiti od konsolidiranog grupnog pregleda GNK DINAMO Ltd. Group."
  },
  group: {
    parentCompany: "GNK DINAMO Ltd.",
    parentSeat: "Boulder, Colorado, USA",
    entityId: "20238180649",
    authorizedRepresentative: "Nermin Sefic",
    groupUbo: "Nermin Sefic",
    existingPositions: 33,
    plannedExpansion2026: 12,
    totalAfterExpansion: 45,
    positioning: "GNK DINAMO Ltd. Group je medunarodni poslovni, sportsko-tehnoloski i financijsko-informacijski okvir s globalnom mrezom drustava i planiranih pozicija."
  },
  groupFinancialsFY2025: {
    scope: "GNK DINAMO Ltd. Group overview",
    revenueEUR: 4704600000,
    netProfitEUR: 982480000,
    totalAssetsEUR: 3483000000,
    equityAndReservesEUR: 3414000000,
    liabilitiesEUR: 69040000,
    equityRatioPercent: 98.02,
    disclosure: "Grupni podaci su management-certified / internally group-reviewed za Colorado public disclosure filing i nisu isto sto i neovisno revidirani financijski izvjestaji GNK ASG d.o.o."
  },
  networkReach: {
    current: {
      positions: 33,
      uniqueCities: 30,
      countriesOrMarkets: 28,
      continents: 6,
      cityPopulationReachApprox: 317300000,
      marketPopulationReachApprox: 4720000000
    },
    afterExpansion2026: {
      positions: 45,
      uniqueCities: 42,
      countriesOrMarkets: 39,
      continents: 6,
      cityPopulationReachApprox: 395500000,
      marketPopulationReachApprox: 5160000000
    }
  },
  map: {
    style: "premium dark corporate world map with gold network links",
    precision: "city centroid approximate coordinates for visual network map",
    existingLocations: [
      {"label":"GNK DINAMO Ltd.","city":"Boulder","country":"USA","lat":40.015,"lng":-105.270,"type":"parent"},
      {"label":"Hrvatska","city":"Zagreb","country":"Croatia","lat":45.815,"lng":15.982,"type":"existing"},
      {"label":"Slovenija","city":"Nova Gorica","country":"Slovenia","lat":45.956,"lng":13.649,"type":"existing"},
      {"label":"Madarska","city":"Budapest","country":"Hungary","lat":47.497,"lng":19.040,"type":"existing"},
      {"label":"Srbija 1","city":"Belgrade","country":"Serbia","lat":44.812,"lng":20.461,"type":"existing"},
      {"label":"Srbija 2","city":"Novi Sad","country":"Serbia","lat":45.267,"lng":19.833,"type":"existing"},
      {"label":"Srbija 3","city":"Nis","country":"Serbia","lat":43.320,"lng":21.896,"type":"existing"},
      {"label":"Srbija 4","city":"Kragujevac","country":"Serbia","lat":44.012,"lng":20.911,"type":"existing"},
      {"label":"Vancouver","city":"Vancouver","country":"Canada","lat":49.282,"lng":-123.121,"type":"existing"},
      {"label":"Toronto","city":"Toronto","country":"Canada","lat":43.653,"lng":-79.383,"type":"existing"},
      {"label":"Mexico City","city":"Mexico City","country":"Mexico","lat":19.433,"lng":-99.133,"type":"existing"},
      {"label":"Panama City","city":"Panama City","country":"Panama","lat":8.983,"lng":-79.516,"type":"existing"},
      {"label":"Bogota","city":"Bogota","country":"Colombia","lat":4.711,"lng":-74.072,"type":"existing"},
      {"label":"Lima","city":"Lima","country":"Peru","lat":-12.046,"lng":-77.043,"type":"existing"},
      {"label":"Santiago","city":"Santiago","country":"Chile","lat":-33.449,"lng":-70.669,"type":"existing"},
      {"label":"Sao Paulo","city":"Sao Paulo","country":"Brazil","lat":-23.555,"lng":-46.639,"type":"existing"},
      {"label":"Buenos Aires","city":"Buenos Aires","country":"Argentina","lat":-34.604,"lng":-58.382,"type":"existing"},
      {"label":"Dubai","city":"Dubai","country":"United Arab Emirates","lat":25.204,"lng":55.270,"type":"existing"},
      {"label":"Mumbai","city":"Mumbai","country":"India","lat":19.076,"lng":72.878,"type":"existing"},
      {"label":"Singapore","city":"Singapore","country":"Singapore","lat":1.352,"lng":103.820,"type":"existing"},
      {"label":"Jakarta","city":"Jakarta","country":"Indonesia","lat":-6.208,"lng":106.846,"type":"existing"},
      {"label":"Beijing","city":"Beijing","country":"China","lat":39.904,"lng":116.407,"type":"existing"},
      {"label":"Seoul","city":"Seoul","country":"South Korea","lat":37.566,"lng":126.978,"type":"existing"},
      {"label":"Tokyo","city":"Tokyo","country":"Japan","lat":35.676,"lng":139.650,"type":"existing"},
      {"label":"Kuala Lumpur","city":"Kuala Lumpur","country":"Malaysia","lat":3.139,"lng":101.687,"type":"existing"},
      {"label":"Hong Kong","city":"Hong Kong","country":"Hong Kong","lat":22.319,"lng":114.169,"type":"existing"},
      {"label":"Casablanca","city":"Casablanca","country":"Morocco","lat":33.573,"lng":-7.589,"type":"existing"},
      {"label":"Lagos","city":"Lagos","country":"Nigeria","lat":6.524,"lng":3.379,"type":"existing"},
      {"label":"Nairobi","city":"Nairobi","country":"Kenya","lat":-1.292,"lng":36.822,"type":"existing"},
      {"label":"Johannesburg","city":"Johannesburg","country":"South Africa","lat":-26.204,"lng":28.047,"type":"existing"},
      {"label":"Cape Town","city":"Cape Town","country":"South Africa","lat":-33.925,"lng":18.424,"type":"existing"},
      {"label":"Sydney","city":"Sydney","country":"Australia","lat":-33.869,"lng":151.209,"type":"existing"},
      {"label":"Auckland","city":"Auckland","country":"New Zealand","lat":-36.850,"lng":174.764,"type":"existing"}
    ],
    plannedLocations2026: [
      {"label":"San Jose","city":"San Jose","country":"Costa Rica","lat":9.928,"lng":-84.091,"type":"planned2026"},
      {"label":"Quito","city":"Quito","country":"Ecuador","lat":-0.180,"lng":-78.467,"type":"planned2026"},
      {"label":"Montevideo","city":"Montevideo","country":"Uruguay","lat":-34.901,"lng":-56.164,"type":"planned2026"},
      {"label":"Doha","city":"Doha","country":"Qatar","lat":25.285,"lng":51.531,"type":"planned2026"},
      {"label":"Bangkok","city":"Bangkok","country":"Thailand","lat":13.756,"lng":100.501,"type":"planned2026"},
      {"label":"Manila","city":"Manila","country":"Philippines","lat":14.599,"lng":120.984,"type":"planned2026"},
      {"label":"Ho Chi Minh","city":"Ho Chi Minh City","country":"Vietnam","lat":10.823,"lng":106.630,"type":"planned2026"},
      {"label":"Accra","city":"Accra","country":"Ghana","lat":5.560,"lng":-0.205,"type":"planned2026"},
      {"label":"Kigali","city":"Kigali","country":"Rwanda","lat":-1.944,"lng":30.062,"type":"planned2026"},
      {"label":"Port Louis","city":"Port Louis","country":"Mauritius","lat":-20.160,"lng":57.501,"type":"planned2026"},
      {"label":"Dar es Salaam","city":"Dar es Salaam","country":"Tanzania","lat":-6.792,"lng":39.208,"type":"planned2026"},
      {"label":"Perth","city":"Perth","country":"Australia","lat":-31.952,"lng":115.861,"type":"planned2026"}
    ],
    linkLogic: {
      hub: "Boulder",
      regionalHubs: ["Zagreb","Dubai","Singapore","Sao Paulo","Toronto","Johannesburg","Sydney"],
      visualRule: "Povezati parent/hub s regionalnim hubovima, zatim regionalne hubove s okolnim gradovima. Linkovi su vizualni prikaz mreze, ne dokaz vlasnicke strukture."
    }
  },
  homepageModules: [
    {"id":"hero","title":"GNK ASG / GNK DINAMO Ltd. Global Group","priority":1},
    {"id":"company-profile","title":"GNK ASG d.o.o. korporativni profil","priority":2},
    {"id":"company-financials","title":"GNK ASG d.o.o. financijski pokazatelji","priority":3},
    {"id":"group-overview","title":"GNK DINAMO Ltd. Group Overview","priority":4},
    {"id":"global-map","title":"Globalna mreza i karta gradova","priority":5},
    {"id":"planned-2026","title":"Planirana ekspanzija 2026.","priority":6},
    {"id":"digital-assets-monitor","title":"Digital Exchange Monitor","priority":7},
    {"id":"documents","title":"Javni dokumenti i PDF datoteke","priority":8},
    {"id":"contact-ai","title":"Kontakt forma + AI potvrda","priority":9},
    {"id":"news-summary","title":"Business News sazetak","priority":10}
  ],
  newsLogic: {
    externalNews: {
      targetTimesCroatia: ["09:00","16:00"],
      recommendedCron: "hourly check with Croatia time gate",
      storageKeys: ["news:latest","news:archive:YYYY-MM-DD","news:status"],
      publicEndpoints: ["/business-news","/data/news.json"],
      homepageRule: "Na homepage ide samo lagani sazetak i link na News Hub."
    },
    marketData: {
      refresh: {
        digitalAssets: "5-15 min if API limits allow",
        goldBrentFx: "15-60 min",
        dailyBrief: "1-3 times daily"
      },
      storageKeys: ["market:latest","digital-assets:latest","market:status","daily-market-brief:latest"],
      publicEndpoints: ["/markets","/data/market.json","/data/digital-assets.json"],
      statusLabels: ["LIVE","DELAYED","SNAPSHOT","FALLBACK"],
      disclaimer: "Podaci su informativni, mogu kasniti i nisu financijski savjet."
    },
    ownPosts: {
      workflow: ["draft","operator review","approval","publish"],
      storageKeys: ["articles:index","article:<slug>","article:draft:<id>","article:published:<slug>"],
      publicEndpoints: ["/articles/<slug>","/data/articles.json","/business-news"],
      rule: "Nase objave ne smiju ici automatski u produkciju bez kontrole ako su osjetljive."
    }
  },
  contactAndAi: {
    contactSubmitEndpoint: "https://operator.gnk-asg.hr/api/contact-submit",
    inboxEndpoint: "https://operator.gnk-asg.hr/operator/contact-inbox",
    confirmedWorking: true,
    userMessageAfterSubmit: "Hvala, [ime]. Vas upit je zaprimljen. Broj predmeta: [id]. Odgovorit cemo putem e-maila.",
    aiBadgeFunctions: [
      "status portala",
      "objasnjenje GNK ASG d.o.o.",
      "objasnjenje GNK DINAMO Ltd. Group",
      "financijski sazetak i napomene",
      "kontakt potvrda i broj predmeta",
      "linkovi na PDF dokumente",
      "pomoc oko media kita",
      "bez administratorskih ovlasti"
    ]
  },
  documentsRequired: [
    "GNK ASG Media Kit PDF",
    "GNK ASG Company Profile PDF",
    "GNK ASG Letterhead DOCX",
    "GNK ASG Presentation Template PPTX",
    "GNK ASG d.o.o. audit report/status PDF",
    "GNK DINAMO Ltd. Good Standing PDF",
    "GNK DINAMO Ltd. Group Financial Report PDF",
    "Group Financial Factsheet PDF",
    "Group Financial Overview PDF"
  ],
  nextBuildSteps: [
    "Endpoint /data/homepage-profile.json",
    "Homepage sekcije iz ovog data modela",
    "Premium karta s lokacijama i vezama",
    "AI badge povezan s homepage-profile podacima",
    "Kontakt UX potvrda s ID brojem",
    "PDF/document completeness audit",
    "News/market storage audit",
    "Vizualni popravci nakon stabilizacije podataka"
  ]
};

export function gnkAsgHomepageProfileResponse() {
  return new Response(JSON.stringify(GNK_ASG_HOMEPAGE_PROFILE_V1, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-homepage-profile": "v1"
    }
  });
}
