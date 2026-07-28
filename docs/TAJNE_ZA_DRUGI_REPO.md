# Tajne za drugi repozitorij — gdje naći svaku vrijednost

Mirror prenosi kod, ali **ne prenosi tajne**. Da bi drugi repozitorij mogao preuzeti
posao, svih 11 vrijednosti mora se upisati ručno.

Vrijednosti se ne mogu pročitati iz GitHuba — jednom upisane, više se ne prikazuju.
Ova tablica govori odakle svaka dolazi.

Upisuje se na:
`https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/settings/secrets/actions`

---

## Imamo ih — samo prepiši

| Tajna | Odakle |
|---|---|
| `BLOGGER_BLOG_ID` | `900891366025005249` — javni podatak, stoji u feedu bloga |
| `BLOGGER_CLIENT_ID` | Google Cloud Console → Clients → Web client 1 |
| `BLOGGER_CLIENT_SECRET` | zapisan pri stvaranju klijenta; ako je izgubljen, napravi novi klijent |
| `BLOGGER_REFRESH_TOKEN` | izvađen kroz OAuth Playground; postupak je u `docs/BLOG_I_TAJNE.md` |

---

## Može se pročitati

| Tajna | Gdje pogledati |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → bilo koja domena → desni stupac, *Account ID*. Vidi se i u adresi: `dash.cloudflare.com/<ovo je ID>/...` |

---

## Ne postoji nigdje — mora se napraviti nanovo

Ove se vrijednosti nakon stvaranja **više nikada ne prikazuju**, ni u GitHubu ni u
Cloudflareu. Ako nisu zapisane izvan sustava, jedini put je napraviti nove.

| Tajna | Kako napraviti |
|---|---|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com/profile/api-tokens → *Create Token* → *Edit Cloudflare Workers*. Dodaj i: Account Settings **Read**, Workers KV **Edit**, D1 **Edit**, R2 **Edit**, Zone → Workers Routes **Edit** |
| `MASARYKOVA_MIRROR_TOKEN` | GitHub, račun `masarykovazagreb-pixel` → Settings → Developer settings → Personal access tokens → **classic**, opseg `repo` |
| `MASARYKOVA_BACKUP_TOKEN` | isto kao gore; može biti isti token |

---

## Zajedničke s Cloudflareom — pažljivo

`GNK_ASG_ADMIN_TOKEN`, `GNK_ASG_OPERATOR_TOKEN` i `OPERATOR_TOKEN` nisu obični ključevi.
To je **zajednička lozinka između GitHuba i Workera**.

Automatizacija šalje vrijednost u zaglavlju `x-operator-token`, a Worker je uspoređuje
sa svojom (`env.OPERATOR_TOKEN`, uz zamjenske nazive). Ako se te dvije ne poklapaju,
Worker odbija zahtjev.

Zato ih **nije dovoljno promijeniti samo u GitHubu**. Ako vrijednost nije zapisana
izvan sustava, mijenja se na obje strane odjednom:

```
# 1. nova vrijednost u Worker
npx wrangler secret put OPERATOR_TOKEN --name gnk-asg-direct-operator

# 2. ista vrijednost u OBA repozitorija, pod sva tri imena
#    GNK_ASG_ADMIN_TOKEN, GNK_ASG_OPERATOR_TOKEN, OPERATOR_TOKEN
```

Tri imena postoje jer su nastajala u različito vrijeme; Worker prihvaća bilo koje.
Vrijednost je ista.

**Redoslijed je bitan:** promijeni li se prvo GitHub, automatizacije padaju dok se ne
promijeni i Worker. Promijeni li se prvo Worker, isto. Zato oboje u istom koraku, pa
odmah pokreni `verify-email-tools-status-v6` i provjeri prolazi li.

---

## Provjera

Kad je sve upisano:

```
GITHUB_TOKEN=<token s pristupom drugom repozitoriju> \
TARGET_REPO=masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01 \
node scripts/repo-switch-preflight.mjs
```

Ispisuje što je spremno, a što fali. Ništa ne mijenja.

---

## Cloudflare resursi — stvarno stanje

Snimljeno 28.07.2026. naredbama `wrangler kv namespace list` i `wrangler d1 list`.

Račun: `beckuphome@gmail.com` · Account ID `1728309632b4e7be93fba322822905da`

**Bitna razlika:** u `wrangler.toml` datotekama vezana su **2 KV prostora i 1 D1 baza**.
Na računu ih stvarno postoji **8 KV i 2 D1**. Popis vezanja pokazuje samo ono što kod
koristi, ne i sve što postoji. Pri seobi na drugi Cloudflare račun mora se prenijeti
sve, ne samo vezano.

### KV prostori (8)

| Naziv | ID | Vezan u kodu |
|---|---|---|
| `GNK_ASG_KV` | a3e9e78c7d554d7fa10996da9a89e7bc | da |
| `GNK_ASG_CONFIG_KV` | d6f5dac9fa034d8d813db0de44eb7b1b | da |
| `ASG_DATA` | cbea240c2baf4f43848ff1e70b588eb3 | ne |
| `ASG_DATA_preview` | 511eb59eef1b416489294784c0c72f02 | ne — testni |
| `CONTACT_MESSAGES` | a40d83b04e9f4e4a812713b8215b4347 | ne |
| `OPERATOR_KV` | 2f74480cc351427d96d5c68a7ebdd4a8 | ne |
| `SEO_KV` | 6e085c5765ce447ab924e9f7d8183afd | ne |
| `SEO_KV_preview` | d51143757f3e4226abf411e136ac47cb | ne — testni |

### D1 baze (2)

| Naziv | UUID | Nastala | Veličina |
|---|---|---|---|
| `gnk_asg_operator_logs` | 2116c4e5-1850-4888-91e7-c47deead3ced | 14.06.2026. | 1,9 MB |
| `gnk_asg_auto_editor` | 480a8af2-259c-4a82-8a26-e8169c9acebe | 20.06.2026. | 1,1 MB |

`gnk_asg_operator_logs` je ona koju koristi `media-command-from-chat`.

### R2

| Spremnik | Nastao |
|---|---|
| `gnk-asg-media-assets` | 14.06.2026. |

Vezanje `GNK_ASG_MEDIA_ASSETS` pojavljuje se na 78 mjesta u kodu. Provjereno
28.07.2026. — pristup radi, iako se R2 ne pojavljuje u ispisu ovlasti računa
(`wrangler whoami` ne navodi sve opsege).

### Sigurnosna kopija podataka

Kod se zrcali na drugi repozitorij, ali **KV i D1 sadržaj nigdje se ne kopira**.
Ako se izgubi Cloudflare račun, ti podaci nemaju pričuvu. Izvoz:

```
npx wrangler d1 export gnk_asg_operator_logs --output logs.sql --remote
npx wrangler d1 export gnk_asg_auto_editor  --output editor.sql --remote
npx wrangler kv key list --namespace-id <ID>
```
