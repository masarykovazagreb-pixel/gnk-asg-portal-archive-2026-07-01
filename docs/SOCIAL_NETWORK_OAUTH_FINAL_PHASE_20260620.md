# GNK ASG povezivanje društvenih mreža – završna faza

Datum: 20. lipnja 2026.
Grana: `experience-ai-live-overview`

## Odluka

Povezivanje X-a, Facebooka i LinkedIna s administratorskim sučeljem provodi se tek nakon što budu završeni i potvrđeni:

1. Business/Light preview
2. Social Share Center
3. canonical, Open Graph, Twitter Card i schema podaci
4. stabilni javni URL-ovi objava i vijesti
5. Mail Studio i Mail Agent
6. završni sigurnosni i integracijski test

## Razlog

OAuth integracije uvode vanjske tokene, dozvole, ograničenja platformi i dodatne sigurnosne rizike. Njih treba spojiti tek kada je unutarnji sustav stabilan, kako se ne bi miješali problemi portala s problemima vanjskih API-ja.

## Ciljna funkcija

Nakon povezivanja administrator će moći:

- odabrati Objavu, Vijest, tržišni pregled, Media Kit ili drugu javnu stranicu
- odabrati sliku članka ili GNK ASG identitetsku sliku
- generirati tekst i hashtagove uz AI pomoć
- pregledati LinkedIn/Facebook/X karticu
- objaviti odmah ili zakazati objavu
- odabrati jednu ili više mreža
- evidentirati rezultat i eventualnu pogrešku
- ponovno objaviti sadržaj uz izmijenjeni tekst

## Sigurnosna pravila

- tokeni i client secrets ne smiju biti u GitHubu
- spremanje samo kao Cloudflare secrets
- odvojene aplikacije i dozvole za LinkedIn, Meta i X
- najmanji potrebni opseg dozvola
- mogućnost opoziva integracije bez utjecaja na portal
- pravne, financijske i osjetljive objave zahtijevaju ručno odobrenje
- automatsko objavljivanje dopušteno samo za unaprijed definirane niskorizične kategorije

## Redoslijed povezivanja

1. LinkedIn Company Page
2. Facebook Page
3. X račun
4. testni draftovi
5. zakazivanje i retry
6. produkcijsko odobrenje

Produkcija promijenjena: NE.
