---
title: "Zeleni dashboard nije dokaz da sustav radi"
seo_title: "Zeleni dashboard nije dokaz operativne spremnosti | GNK ASG"
meta_description: "Komentar o tome zašto green CI, profil workera ili HTTP 200 nisu sami po sebi dokaz produkcijskog rada bez exact deploya, runtime healtha i stvarnog smoke testa."
canonical_url: "https://gnk-asg.hr/insights/zeleni-dashboard-nije-dokaz-da-sustav-radi/"
article_schema_or_jsonld: "Article"
h1_h2_structure: true
internal_links:
  - "/digital-workforce/"
  - "/insights/"
  - "/newsroom/"
entity_links:
  - "GNK ASG d.o.o."
  - "runtime health"
  - "production readiness"
  - "observability"
image_plan: "Editorial illustration contrasting a green dashboard with a separate evidence panel for deploy SHA, live health, queue and smoke test; no documentary claims."
alt_text: "Zeleni dashboard uz odvojene dokaze deploy SHA-a, runtime healtha, queuea i smoke testa"
byline: "Prepared by GNK ASG Intelligence Desk"
publication_date: "2026-08-11"
approval_status: "not_approved"
---

# Zeleni dashboard nije dokaz da sustav radi

Najopasnija boja u automatiziranom sustavu ponekad je zelena. Ne zato što je zelen status loš, nego zato što ga ljudi vrlo brzo počnu tumačiti šire nego što dokaz stvarno dopušta.

CI može biti zelen i potvrđivati da kod prolazi definirane testove. To ne znači automatski da je baš ta verzija deployana u produkciju. Health endpoint može vraćati HTTP 200, ali ne provjeravati stvarne dependencyje. Katalog može sadržavati tisuće digitalnih worker profila, ali to nije dokaz da tisuće procesa trenutno rade. Workflow može završiti sa statusom `success`, dok vanjski servis možda nije prihvatio nijednu novu objavu jer je skripta failure pretvorila u upozorenje.

Problem nije u alatima. Problem nastaje kada se dokaz jedne stvari koristi kao dokaz druge.

## Svaka zelena oznaka mora imati precizno značenje

Ako piše „CI green“, to treba značiti samo da su testovi za određeni commit prošli. Ako piše „deployed“, mora postojati konkretan deploy SHA. Ako piše „runtime healthy“, signal treba dolaziti iz stvarnog runtimea. Ako piše „published“, mora postojati remote identifikator ili drugi dokaz da je vanjski kanal objavu prihvatio.

Ta disciplina djeluje strogo, ali zapravo ubrzava rad. Kada statusi imaju precizno značenje, tim ne gubi vrijeme na raspravu o tome što je „vjerojatno“ napravljeno. Incidenti se brže lokaliziraju jer se zna koji je sloj stvarno zelen, a koji još nije dokazano provjeren.

## Najskuplja greška je lažno pozitivno stanje

Crveni alarm mobilizira ljude. Lažno zeleni status ih uspavljuje. Ako sustav kaže da je sve u redu, a backlog raste, deploy je star ili vanjski mirror ne radi, problem se otkriva kasnije i tada je obično skuplji.

Zato dobar operativni sustav mora radije reći `unknown` ili `degraded` nego izmišljati sigurnost. Nepoznat status nije sramota. On je informacija da nedostaje dokaz.

## 100% ne znači bez budućih kvarova

Stvarnih 100% spremnosti ne znači obećanje da se sutra ništa ne može pokvariti. Znači da su poznati kritični slojevi zatvoreni, da je aktualna verzija stvarno deployana, da smoke potvrđuje produkciju, da queue i retry imaju pravila, da single-writer ownership sprječava race condition i da vanjski kanali imaju dokaz stvarne sinkronizacije.

Sustav će i dalje povremeno imati incidente. Razlika je u tome što ih više ne skriva iza optimističnog dashboarda.

Zato je bolji jedan precizan crveni indikator nego deset nezasluženih zelenih. U ozbiljnoj automatizaciji istina stanja važnija je od dojma napretka.

*This publication is an informational GNK ASG Intelligence Desk brief and does not constitute legal, tax, financial or investment advice.*