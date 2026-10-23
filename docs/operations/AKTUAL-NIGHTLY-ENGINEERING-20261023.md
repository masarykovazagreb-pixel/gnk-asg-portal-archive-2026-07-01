# GNK ASG / AKTUAL MEDIA — noćni razvojni zapis, 23.10.2026.

## Potvrđeno
- Jedini repozitorij: masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01.
- PR #349 ostaje DRAFT, nije spojen. Trenutačno stanje pri provjeri: mergeable=false (dirty); glavna grana bila je 046cd49643bed488569828ab3c86c5c289ea1745. PR je u međuvremenu napredovao kroz više commitova; prije svakog spajanja ponovno provjeriti HEAD.
- U PR grani su ažurirani scripts/aktual-review-window-gate-v1.mjs (commit 9b50ad4fdf756eb2ea1c4a80e415efd37e6b4890) i tests/test-aktual-review-window-gate-v1.mjs (commit 41da8cedff12fe6b3d95e2d621677cad5b5c4752).
- Offline odluka o 30 minuta sada zahtijeva izričitu oznaku pouzdane potvrde dostave, datum provjere, podudaranje SHA-256 izvornog sadržaja i potvrde, vrijeme pripreme prije stvarne dostave, HTTPS izvor te zabranu budućih vremena.
- Izolirano je provedeno 7/7 funkcionalnih provjera tog modula u JS izvršavanju, uključujući granicu 30 minuta, kasnu dostavu, odbijanje, nesklad sažetka i zabranu produkcijskog deploya. To nije zamjena za GitHub Actions Node testove.
- Postojeći orkestrator koristi jedan raspored svaka četiri sata; 150 su uloge/provjere, ne 150 zasebno hostanih Workera. Globalni portali ostaju staging bez potvrđenih novih javnih URL-ova.

## Blokade / rizici
- PR #349 ima konflikt sa stanjem main i nema potvrđen zelen CI za najnoviji head u trenutku provjere. Ne spajati niti deployati.
- Server-side helper workers/gnk-asg-direct-operator/src/editorial-approval-decision-store-v2.js i dalje računa interval od notifiedAt umjesto od dokazano deliveredAt. Pokušaj izmjene zaustavila je kontrola alata. Ne prikazivati kao popravljeno.
- evaluateLedger u scripts/aktual-review-window-gate-v1.mjs i dalje predaje e.currentSha256 kao verifiedDigest bez neovisnog računanja. To je samopotvrđivanje; ne koristiti taj izlaz kao dokaz stvarnog odobrenja. Pokušaj izmjene blokiran.
- Polje proofOfDelivery.verified samo po sebi nije kriptografski dokaz da je vanjski primatelj dobio obavijest. Treba backend provjera izvornog pružatelja dostave i audit log.
- Recentni main CI: scheduled AUTONOMIJA 365 mjerenje 22.10.2026. završilo je failure, dok su neki kasniji deploy/preview workflowi završili success. Uspjeh deploy workflowa nije dokaz live URL-a.
- U opisu PR #349 postoji ranija izričita STOP napomena za razvoj 12 novih portala; iako su 12 staging stranica u PR-u, do razjašnjenja ne aktivirati javnu objavu.

## Prioriteti
1. Neovisni hash sadržaja i verificirani zapis dostave u backendu; odvojiti pripremu od javnog odobrenja.
2. Uskladiti server-side helper s vremenom potvrđene dostave i dodati Node regresijske testove.
3. Razriješiti PR konflikte bez zaobilaženja postojećih release pravila i potvrditi GitHub Actions testove.
4. Provjeriti kanonskih 12 staging stranica i 8 regionalnih izdanja kroz postojeći CI; stvarne URL-ove upisati samo nakon HTTP potvrde.
5. Provjeriti uzrok failure u AUTONOMIJA 365 i izbjeći dodatne rasporede, plaćene API-je i lažne metrike.

## Evidencija
PR: https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/pull/349
Main CI failure: https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/39859435181
Raniji uspješan PR Workforce check (nije trenutačni head): https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/39840139846

Ne slati noćnu rutinsku obavijest; čuvati zapis za dnevni pregled.

## CI dodatak — 23.10.2026. 06:20 Zagreb

- PR #349: test fixture za `aktual-review-window-gate-v1.mjs` usklađen s parametrima `trustedReceipt` i `verifyEntry` (commit `a3d4aa1fcdb83583d3cef488165c6e7c0503c4c7`).
- Izolirana provjera logike: 14/14 prolaza; još nema potvrde novog GitHub Actions Node CI-ja.
- Main SHA: `cdb9c221798232012b3f6a9aeddb936fefff0a33`; PR ostaje draft i nije mergeable.
- Main run 39879315940: 12 zastarjelih generiranih stranica `izbori-srbija`; run 39875268543: nedovoljno neovisnih izvora za neke `top-teme`.
- Sljedeće: potvrditi Node CI, sačuvati prag kvalitete izvora, razriješiti konflikt PR-a; bez deploya i bez dodatnih rasporeda.
