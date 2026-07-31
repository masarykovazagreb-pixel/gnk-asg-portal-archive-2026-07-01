# PROCES: prijevod i objava na sve kanale
## Za drugog informatičara, 31.07.2026.

## Slike
Pexels preko `gnk-asg-image-proxy` Workera. Ne generirano, ne ponovljeno.
Dohvat ide preko jednokratnog GitHub Actions koraka jer izvršno okruženje
nema izravan pristup internetu.

## Prijevod
Ručan, uredniku dosljedan, ne strojni. Isti "Intelligence Desk" glas kao
hrvatski izvornik.

## Redoslijed objave, po tekstu
1. Hrvatski izvornik već na gnk-asg.hr
2. Napisan engleski tekst
3. Nova, jedinstvena slika (Pexels)
4. Staticka HTML stranica na gnk-asg.hr/en/... - puni SEO/meta/OG/JSON-LD,
   hreflang oba smjera
5. Upis u apps/portal/data/editorial-registry.json (lang: "en")
6. Blog automatski (satno). Dev.to i Tumblr rucno pokrenuti dok se ne
   odluci o automatskom rasporedu (vidi objavi-15-dnevno.yml, iskljuceno)

## Dosljedno na svakoj objavi
Nermin Sefic u naslovu/kljucnim rijecima/hashtagovima, GNK ASG i
GNK DINAMO Ltd. gdje prirodno pristaje, poveznica natrag na izvornik.

## Skripte
scripts/tumblr-publish-v1.mjs, scripts/devto-publish-v1.mjs,
scripts/generate-kolumna-page.mjs, scripts/kolumne-publish-v1.mjs

## Trenutno stanje kanala (31.07, navecer)
Blog: 156+ | Dev.to: 9 | Tumblr: 9
