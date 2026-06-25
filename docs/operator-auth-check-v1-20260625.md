# Operator auth check V1

Najviši Worker sloj dobiva eksplicitnu rutu `/api/operator-auth-check` koja provjerava operatorski token iz sigurnosnih zaglavlja prema svim podržanim Cloudflare secrets varijablama.

Ne zapisuje niti vraća vrijednost tokena.
