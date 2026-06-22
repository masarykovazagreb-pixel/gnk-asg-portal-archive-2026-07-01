# GNK ASG final pre-deploy gate — 22.06.2026.

Validation grana provjerava zaključani izvorni commit `987e14d9874a76235957873be1262d901d5b0c3a` i checkpoint `predeploy-checkpoint-20260622-987e14d`.

Gate je read-only prema produkciji. Ne deploya, ne stvara `.github/release/PRODUCTION_APPROVED`, ne spaja grane, ne mijenja secrets, DNS ni Cloudflare produkcijske rute i ne uključuje masovno slanje.

Obuhvat:

- 16 obveznih zelenih source workflowa;
- produkcijski workflow trigger audit;
- release candidate audit;
- HR/EN javni route audit;
- backup/restore rehearsal;
- release paket i checksum manifest;
- četiri mobilna kontrastna scenarija;
- BPP canonical link `https://bpp.is/`;
- HR/EN contact repair sloj;
- zaključani produkcijski workflowi;
- `MEDIA_CAMPAIGN_LIVE_SEND=false`.

Pozitivan status može biti samo `READY_FOR_EXPLICIT_PRODUCTION_APPROVAL`. Produkcijski korak i dalje zahtijeva zasebno izričito korisničko odobrenje.
