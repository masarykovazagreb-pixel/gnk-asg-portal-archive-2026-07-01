# Produkcijska točka povrata — prije redizajna portala (2026-10-13)

Ovaj zapis označava zadnje poznato dobro stanje **prije** objave redizajna portala i istaknutog bankovnog linka.

## Potvrđeno stanje prije objave

- Repozitorij: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`
- Produkcijski `main` SHA: `79e1066908444ec73edc0b73a693b23feff0ebd1`
- GitHub Actions workflow: **Deploy Admin Auth V6**
- Uspješno izvršavanje: `38337476419`
- Vrijeme izvršavanja: `2026-10-13 02:33:54–02:36:10 UTC`
- Rezultat: `success`; autorizacija, deploy produkcijskih Workera i produkcijska provjera točno tog SHA-a prošli su.
- Zapis izvršavanja: <https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/38337476419>

Taj SHA je povratna točka izvornog koda. Deploy workflow zadržava postojeće Cloudflare rute, bindings i secrets; ovaj zapis ne sadrži nikakve tajne.

## Povrat ako objava izazove problem

1. Zabilježiti prijavljenu grešku i trenutni `x-gnk-deploy-revision`; ne mijenjati DNS, rute, secrets ni produkcijske podatke.
2. Na `main` napraviti **revert PR** promjena iz neispravne objave (ne koristiti `reset --hard` ni force-push na `main`). Revert treba vratiti kod na poznato dobro stanje iz gornjeg SHA-a, uz očuvanje kasnijih nezavisnih promjena.
3. Nakon što je revert mergean, uzeti puni SHA aktualnog `main` commita i ručno pokrenuti **Deploy Admin Auth V6** s `confirm_production_deploy=DEPLOY_ADMIN_AUTH_V6` i `approved_sha=<taj puni SHA>`. Workflow odbija deploy ako odobreni SHA nije točno aktualni `main`.
4. Pričekati uspješnu produkcijsku provjeru koja uspoređuje aktivni release i revision headere. Uključen je i provjerljiv test bankovne stavke javnog menija.

Neuspjeh smoke provjere znači da se objava ne smatra uspješnom; povrat se provodi kroz isti odobreni, exact-SHA deploy postupak, a ne neprovjerenom promjenom ruta ili konfiguracije.
