# Social Distribution — spajanje sutra

Alat je gotov i radi u **dry-run** modu: dva puta dnevno (08:30 i 14:30 Zagreb)
uzima najnoviji sadržaj (jutro: zadnja editorial objava; popodne: World Topics
analiza dana ili AKTUAL featured vijest) i za sve 4 platforme sastavlja
ispravno formatiran tekst — dužina, hashtagovi, slika, link — te ga sprema u
`apps/portal/data/social-distribution/plan.json` + čitljiv pregled u
`preview.html`. Ništa se ne šalje dok se ne uključi live mod.

## Što treba sutra, po platformi

**Facebook** (stranica GNK ASG, ne osobni profil):
1. Meta app na developers.facebook.com (App Type: Business)
2. Generiraj dugotrajni Page Access Token (Graph API Explorer → `pages_manage_posts`, `pages_read_engagement`)
3. Repo secrets: `FB_PAGE_TOKEN`, `FB_PAGE_ID`

**Instagram** (Business/Creator račun povezan na FB stranicu):
1. Isti Meta app kao Facebook (permission `instagram_content_publish`)
2. IG Business Account ID (iz Graph API `/me/accounts` → `instagram_business_account`)
3. Repo secret: `IG_BUSINESS_ID` (koristi isti `FB_PAGE_TOKEN`)

**LinkedIn** (Company Page GNK ASG):
1. App na developer.linkedin.com, proizvod "Share on LinkedIn" + "Community Management API"
2. OAuth token sa scope `w_organization_social`
3. Organization URN (format `urn:li:organization:XXXXXXXX`)
4. Repo secrets: `LINKEDIN_ORG_TOKEN`, `LINKEDIN_ORG_URN`

**X** (developer account, "Read and Write" app):
1. developer.x.com → novi app → Keys and tokens
2. API Key + Secret, Access Token + Secret (OAuth 1.0a User Context)
3. Repo secrets: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`

## Kako se aktivira live slanje

1. Dodaj gornje secrete: Settings → Secrets and variables → Actions → New repository secret
2. Postavi repo **variable** (ne secret) `SOCIAL_LIVE` na `1`
3. Sljedeći cron run (ili ručni `workflow_dispatch`) počinje stvarno slati

Adapteri (`postToFacebook`, `postToInstagram`, `postToLinkedIn`, `postToX`) su
već napisani u `scripts/social-distribution-v1.mjs` — ništa se ne mijenja u
kodu, samo se dodaju secreti.

## Kontrola duplikata

`apps/portal/data/social-distribution/published.json` pamti koje je stavke
(po URL-u) alat već obradio, tako da se ista objava nikad ne pošalje dvaput
na istu platformu, čak ni ako cron promaši slot ili se pokrene ručno više puta.

## Format po platformi (već ugrađeno)

| Platforma | Limit | Hashtagovi | Slika |
|---|---|---|---|
| Facebook | ~8000 (praktično kratko) | 3-5 | opcionalna |
| Instagram | 2200 (125 vidljivo) | 8-15, zaseban blok | **obavezna** |
| LinkedIn | 3000 (120-300 riječi idealno) | 3-5 | opcionalna |
| X | 280 | 1-2 | opcionalna |

Svaka objava nosi internu bilješku "Odobrio urednik: Nermin Sefić" u logu
(ne u javnom tekstu) — isti standard kao Blogger/Tumblr/Dev.to/Telegraph.
