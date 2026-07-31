# Uklanjanje neregistriranog writera

- Uklonjen je `.github/workflows/dohvati-slike-komentari.yml`.
- Workflow je bio jednokratan, imao je `contents: write` i izravni `git push` bez concurrency/retry zaštite.
- Nema deploya, nema izmjena produkcijskih ruta, tajni, DNS-a ni Workera.
- Promjena mora proći obvezne CI provjere prije bilo kakvog mergea.
