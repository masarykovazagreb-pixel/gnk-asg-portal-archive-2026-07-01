# Sigurnosni model

## Dozvoljeno u MVP-u

- promjena javnih boja
- promjena referenci logotipa
- promjena media kit popisa
- promjena javnog statusa
- promjena kratke poruke na naslovnici
- snapshot
- rollback

## Nije dozvoljeno u MVP-u

- brisanje produkcije
- promjena DNS-a
- promjena Cloudflare tokena/secreta
- slanje poruka trećima
- javna objava pravnih/financijskih tekstova bez odobrenja
- nepovratne radnje

## Token

`OPERATOR_TOKEN` mora biti Cloudflare Secret.

## Direct GET

Direct GET postoji samo za kratke sigurne akcije.
Ne prima proizvoljan HTML, JS, financijske tekstove ni opasne naredbe.

## POST command

Za složenije naredbe koristi se `POST /operator/command` s Bearer tokenom.
