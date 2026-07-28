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
