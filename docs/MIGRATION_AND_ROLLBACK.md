# Migracija i rollback

## Faza 1

Postojeći frontend i aktivni Workeri kopirani su u privatni GitHub repozitorij bez secrets.

## Faza 2

Vizualne promjene rade se na grani visual-redesign bez promjene produkcije.

## Faza 3

Potvrđeni commit postavlja se na zaseban preview ili staging Worker.

## Faza 4

Provjeravaju se sve javne stranice, backend endpointi, KV, D1, R2, kontakt, mail, admin i mobilni admin.

## Faza 5

Prije produkcijskog deploya sprema se aktualni Cloudflare kod i konfiguracija.

## Faza 6

Potvrđeni GitHub commit postavlja se na postojeću Cloudflare infrastrukturu uz zadržavanje postojećih secrets i bindinga.

## Rollback

Ako test nakon deploya ne prođe, vraća se prethodna Cloudflare verzija ili spremljeni produkcijski backup.
