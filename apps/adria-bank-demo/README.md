# Adria Bank Demo

A rehearsal-oriented synthetic banking sandbox with staff and customer-facing entry points. **Adria Bank is fictional and is not a bank, payment service, lender, card issuer, FX provider or crypto-asset service.** All customer, account, bank-directory, treasury, card, loan and transaction records are synthetic. No real funds move.

## Run locally

Requirements: Node.js **22.12+** and npm (Electron 44 requires Node.js 22.12 or newer for this source-based desktop install).

```sh
npm ci
npm test
npm run dev
```

Open the local server on port `4173`:

- `http://localhost:4173/` — welcome screen, language choice, then staff or customer demo entry
- `http://localhost:4173/index.html` — staff / operations workspace
- `http://localhost:4173/client.html` — customer-portal rehearsal
- `http://localhost:4173/exchange.html` — standalone FX / digital-asset rehearsal desk
- `http://localhost:4173/index.html#interop` — staff-only multi-bank / crypto-exchange interop lab

### Install the Windows 11 desktop demo (recommended)

Use the **Windows standalone installer ZIP** linked from [`DOWNLOADS.md`](./DOWNLOADS.md) or the [Windows installer workflow](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/workflows/adria-bank-demo-windows-installer.yml). Extract it, verify the SHA-256 in `SHA256SUMS.txt` if desired, and run `Adria-Banka-Demo-Setup-1.2.0-x64.exe`. It includes the Electron runtime, installs per-user, creates Desktop/Start-menu shortcuts, and launches the app. **The end user does not need Node.js, npm, administrator rights, or internet access for installation and the core demo.** Internet is used only for optional public reference feeds; clearly labelled bundled synthetic sample data is available offline. TLS certificate verification remains enabled.

The installer is unsigned, so Windows SmartScreen may show a publisher warning. Verify the download source and checksum; do not disable Defender, SmartScreen, or certificate checks. Local demo data is retained if the app is uninstalled.

The older `Adria-Bank-Demo-Desktop-2026-10-11.zip` is a **source/developer bundle, not an installer**. Its `START-ADRIA-BANK-DEMO.bat` path requires Windows 10/11 x64, Node.js 22.12+ (64-bit), npm and an internet connection for the first Electron/dependency download. Use the standalone installer ZIP for an easy desktop installation.

Most data and workflows run in the browser and are saved in local storage. The local Node server has **two read-only proxy routes** for public ECB and Central Bank of Kenya (CBK) daily reference sources (`/api/fx/ecb` and `/api/fx/cbk`); they do not accept banking instructions or customer data. The restricted Electron preload uses separate IPC calls for the same reference feeds. Feed access can fail; the UI then labels its bundled dated samples as fallback data. The selected public rates are informational/daily, not real-time, executable, guaranteed or bank-specific quotes. AED is derived from the ECB EUR/USD reference and the stated USD/AED peg assumption. No pricing provider or payment network is connected. The app retries these public read-only reference sources every six hours while its process is running; this does not monitor or update laws, licences, bank connectivity or payment-rail status.

### Optional market-data reference

The Twelve Data EUR/USD panel is **off unless manually requested**, and makes no calls without an API key. To enable it for a local run, set `TWELVEDATA_API_KEY` in the process environment before launching (`$env:TWELVEDATA_API_KEY='…'; npm start` in PowerShell, or `TWELVEDATA_API_KEY=… npm run dev` in a shell). The key is read only by the local server or Electron main process; it is not embedded in the app, put in browser storage, sent to the renderer, or included in print/export. The endpoint is fixed to EUR/USD, caches a successful response for 60 seconds and returns a sanitized timestamped indication. Check Twelve Data's current plan and usage terms before enabling it. This is market data only—not an exchange connection, executable quote or execution price—and it never changes simulated trades, daily FX references, account conversion or crypto sample values.

The customer selector is a demonstration persona switch, **not authentication**, authorization or a secure tenant boundary. Use synthetic records only. Do not enter real personal, banking, card, identity or confidential information.

## Background simulation (local desktop)

A clearly labelled, rule-based rehearsal loop starts enabled by default and runs every five minutes while the app process is open. Each cycle posts one small EUR transfer between two low-risk, verified **synthetic** customer profiles, verifies that the local double-entry journals remain balanced, records a bounded local status event and persists the scenario. It does not place an external transfer, use customer input, call an AI service, edit source code or make legal/compliance decisions. The UI exposes a pause/resume control and 1-, 5-, 15- and 60-minute intervals; recent cycle, health and ledger history are bounded.

To keep the installed Windows desktop app working after its window is closed, open **Settings → Background rehearsal simulator** and explicitly enable **Keep app running in the system tray**. Closing the window then hides it to the notification area; choose **Quit Adria Bank Demo** from the tray menu to stop the process. If desired, also enable **Start in the background when Windows starts**. This is an optional per-user startup setting. The app cannot run when Windows is shut down, sleeping, hibernating, or when the process is quit; it is not a cloud service or Windows service. The browser/local-server version runs only while that page/process is active.

## Included rehearsal workflows

- **At least 1,000 fictional customers**, including personal and business profiles, more than 1,000 sample accounts, balances and several thousand synthetic transaction records. Country-aware routing-shaped identifiers are always invalid-checksum IBAN-shaped strings where supported, otherwise visibly `DEMO-CC-…` domestic identifiers; all generated BIC-shaped values are marked DEMO-only. Nothing is routable. Seed records use reserved `.invalid` email addresses; no record represents a real person or account.
- **Banker and customer rehearsal surfaces.** The staff console contains simulated role levels, local maker/checker queues and servicing workflows; the separate customer portal can switch between fictional personal and business profiles. Persona and role switching are training controls, not authentication, tenant isolation or server-enforced authorization.
- **Local account-to-account and bank-to-bank rehearsals.** Same-currency transfers post to the fictional ledger. SEPA-shaped outbound instructions wait for a local checker and may be cancelled only while queued; approval is not external transmission and cannot be recalled by this demo. Incoming-payment practice credits a fictional account only after local checker review. A second workflow queues bank-to-bank instructions before it changes synthetic balances at one of ten fictional directory banks. No instruction is sent to SEPA, SWIFT, ACH, a bank, correspondent or settlement system.
- **KYC, AML and complaint practice.** Allowlisted synthetic KYC categories and checklist states support personal/business review without identity numbers, document uploads or source checks. AML alerts are illustrative only. A local complaint queue supports guarded creation, status history, escalation and a draft response; it sends nothing externally and does not calculate statutory deadlines. No real identity, sanctions, PEP or beneficial-owner screening occurs.
- **Clearly marked print and exports.** Every app entry point displays **DEMO DESKTOP ADRIA BANK**. Printed pages, statements, transaction receipts and SEPA/SWIFT-shaped drafts carry the same exact label and an offline/synthetic disclaimer. CSV and JSON exports include the brand and demo-only metadata; exported documents are training data, not bank-issued records.

- **Treasury / vault examples** with substantial fictional reserve, nostro, clearing, branch-cash and ATM balances. Figures are training scenario values, not financial statements or evidence of capital, liquidity or custody.
- **Multi-currency accounts** including EUR, currencies covered by the ECB table, KES and AED; local conversions between a customer’s synthetic fiat accounts use the available dated reference data and an illustrative spread. The UI identifies each source/date and distinguishes fallback samples. Daily reference inputs are not live trading prices.
- **Offline crypto examples** for BTC, ETH, USDC and GNKC (GNK Credit), with local-only send, receipt, cancellation and checker-approval rehearsals. Prices are static illustrative samples; GNKC is a synthetic non-transferable demo token. There is no wallet custody, key storage, blockchain, exchange, broadcast or public market.
- **Bank & Exchange Interop Lab: 50 product ideas and 50 runnable local tools.** The original 20 concepts and rehearsals remain, with 30 additional implemented tools for consent expiry/revocation previews, statement normalization and data-quality checks, transaction categories and recurrence, cash buffers/liquidity ladders, fee anomaly and cut-off scenarios, batch validation, FX stress and cross-border costs, nostro reconciliation, funds-protection education, disputes/chargeback practice, fraud/AML/sanctions/PEP tabletop exercises, maker-checker maps, audit/data-portability exports, session/passkey readiness and crypto address/custody preflight. Category filters, local activity, sample evidence and a global local-only pause are included.
- **Three selectable fictional local system profiles:** Adria Bank Croatia (EUR), Adria Bank Singapore (SGD) and Adria Bank Egypt (EGP). The Singapore and Egypt cards are clickable in both the workbench and institutions directory; selection switches only the active local fixture set, illustrative currency context and tool outputs. Every name is a fictional demo label—not a legal bank, licensed entity, branch, live service or connected institution. Each profile has separate synthetic bank-style adapters and fixed exchange-market samples; no bank or venue is contacted.
- The lab never accepts API keys or fetches exchange data, transmits payments or places trades. Market/order-book figures are fixed educational fixtures, not quotes. Its idea library describes product concepts, not existing coverage, provider integrations or partnerships. Exports are branded and exclude customer data and credentials.
- **Cash, payouts, savings, lending and overdraft.** Fictional teller deposits/withdrawals, local ATM rehearsal, savings maturity, and loan/overdraft application, checker, simulated disbursement and repayment flows post only to the local double-entry scenario. Terms and rates are indicative training values; no contract, regulated decision, deposit guarantee, outside cash movement or real money is created.
- **Local identifier checker** for fictional bank/BIC-shaped directory entries, deliberately non-routable demo account identifiers and masked card tokens, plus country-specific IBAN length/BBAN/MOD-97 checks and 12–19 digit Luhn-format checks. Full test values are handled transiently in the page, masked in the result and never saved, logged or transmitted. Use synthetic values only; a passing checksum is not proof of an existing or reachable account/card. Never enter real payment or identity data.
- **Virtual debit and prepaid card lifecycle rehearsal.** Staff or customer demo entry can issue standard, premium or prepaid virtual tokens linked to synthetic EUR accounts; adjust online, international and recurring-purchase controls and daily/monthly limits; locally load capped prepaid value; rehearse fictional merchant purchases against controls and available balance; lock/unlock or cancel a token and return any remaining prepaid balance to its linked demo account. Every record stores only a synthetic token suffix—never a PAN, CVV/CVC or PIN. Purchases and loads post to the local balanced demo ledger only. There is no physical fulfillment, issuer processor, card network, wallet provisioning, 3-D Secure or external authorization.
- **Call-centre rehearsal** with synthetic support tickets, local status/assignment notes and customer/staff handling guides. No phone, call recording, CRM or customer service provider is connected.
- **Customer and staff procedure guides** and a transparent local, rule-based helper. Questions stay in the browser; there is no model/API call.
- **Selected primary regulator/data-source links** for Croatia/EU and each proposed market. Links are research starting points only, not legal advice, confirmation of status or connected integrations.
- **Polished welcome front door and nine languages:** Croatian, English, German, French, Spanish, Arabic, Kiswahili, Japanese and Chinese; separate local entry links for employee operations and personal/business customer rehearsal.
- **Seven illustrative staff levels:** global platform administrator, group banking administrator, country manager, branch manager, supervisor/checker, operations maker and read-only auditor. Role switching and permissions are UI demonstrations, not production access controls.

The company-location planning card uses the public GNK DINAMO Ltd. / FINA listing at **1942 Broadway, Ste 314C, Boulder, Colorado 80302**. This is a public address listing, not independent registry verification or proof of legal headquarters; Delaware incorporation and a Delaware registered-agent address remain unverified. The company site says GNK DINAMO Ltd. is not affiliated with the GNK “DINAMO” non-profit association. The app is an independent fictional demo, not the official club or a bank.

The demo has no real onboarding, identity verification, beneficial-owner registry check, PEP/sanctions/adverse-media screening, payment settlement, card processing, bank connectivity, SWIFT registration, liquidity provider, crypto custody, authentication, server-enforced authorization, immutable audit, production monitoring, disaster recovery or regulator integration. SEPA/SWIFT labels describe only local rehearsals.

## Windows 11 build and installer verification

The end-user package is an x64 NSIS installer, built on a Windows runner so it embeds the Electron runtime and avoids requiring Node.js on the target PC. The installer is per-user, does not request elevation, creates Desktop and Start-menu shortcuts, opens the app after setup, and keeps local demo data on uninstall. It is unsigned; SmartScreen may therefore show a warning.

On a trusted Windows 11 x64 machine or CI runner, build and package it with:

```powershell
npm ci
npm test
npm run dist:win
npm run package:windows-installer-zip
```

This creates `release/Adria-Banka-Demo-Setup-1.2.0-x64.exe` and `release/Adria-Bank-Demo-Windows-Setup-1.2.0-x64.zip`. The ZIP contains the Windows installer, Croatian installation instructions and `SHA256SUMS.txt`; its packager verifies the PE signature, archive CRC and embedded installer checksum. The GitHub Actions workflow builds the installer on Windows, silently installs it per-user, verifies the installed executable and Electron app archive, packages the ZIP, then uploads it as the `Adria-Bank-Demo-Windows-Setup` artifact.

The checked-in `Adria-Bank-Demo-Desktop-2026-10-11.zip` remains a legacy source/developer bundle, not a binary installer; it requires Node.js 22.12+ and network access on first setup. It must not be presented as the end-user installer. The separate `npm run package:desktop-zip` command creates that source bundle. No TLS verification is disabled during package installation or builds.

## Product, legal and operational boundaries

See [`COMPLIANCE-OVERVIEW.md`](./COMPLIANCE-OVERVIEW.md) for the ten-market planning matrix and simulated-vs-real requirements, and [`PRODUCT-AND-COMPETITOR-REVIEW-2026-10-11.md`](./PRODUCT-AND-COMPETITOR-REVIEW-2026-10-11.md) for the dated, primary-source Croatia/EU legal and provider comparison, onboarding review and product roadmap. These are research aids, not legal advice. Official public reference data and regulator links do not establish that Adria Bank exists, is licensed, may offer a regulated product, has a real account, can verify an identity, or can move money. No regulator has been contacted. Obtain qualified local legal, tax, security, prudential and operational advice before any real-world activity.

## Development checks

```sh
node --check src/app.mjs
node --check src/core.mjs
node --check src/i18n.mjs
node --check src/welcome.mjs
node --check src/market-data.mjs
node --check src/fx.mjs
node --check src/assistant.mjs
node --check src/interop-lab.mjs
node --check electron/main.cjs
node --check electron/preload.cjs
npm test
```

The Node test suite checks the demo ledger and workflows, FX parsers, branding/export metadata, and a Happy DOM smoke pass for staff/customer/exchange startup, persona-owned accounts, role switching, payment/complaint forms, and print/CSV/JSON outputs. It is a DOM-level rehearsal, not a substitute for browser, Windows installer, security or accessibility testing.
