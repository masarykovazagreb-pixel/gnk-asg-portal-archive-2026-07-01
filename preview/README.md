# GNK ASG lokalni preview

Ovaj sloj služi isključivo za lokalnu provjeru grane `visual-redesign`.

Ne sadrži produkcijske Cloudflare rute, cron triggere, binding ID-jeve ni secrets.

## Pokretanje funkcionalnih testova

```powershell
node .\tests\publications-preview.test.mjs
```

## Pokretanje lokalnog pregleda

```powershell
node .\scripts\preview-publications-server.mjs
```

Lokalni URL-ovi:

- `http://127.0.0.1:4173/objave/`
- `http://127.0.0.1:4173/publications/`
- `http://127.0.0.1:4173/objave/poslovni-pregled-preview-staging-test/`
- `http://127.0.0.1:4173/publications/poslovni-pregled-preview-staging-test/`

Lokalni preview ne mijenja `gnk-asg.hr` i ne izvršava Cloudflare deploy.