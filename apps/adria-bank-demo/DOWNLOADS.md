# Adria Bank Demo downloads

These are synthetic, local-only demo materials. They do not connect to real banking, payments, trading, or identity-verification services.

## Recommended: Windows 11 desktop installer

- Open the [Windows installer workflow](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/workflows/adria-bank-demo-windows-installer.yml), choose its latest successful run, then download the `Adria-Bank-Demo-Windows-Setup` artifact. The ZIP contains `Adria-Banka-Demo-Setup-1.2.0-x64.exe`, Croatian installation instructions, and `SHA256SUMS.txt`. The Windows workflow smoke-installs and launches the app before uploading. The installer embeds Electron, installs per-user, creates Desktop/Start-menu shortcuts, and does **not** require Node.js, npm, or internet access for installation and core use. Optional public daily reference feeds may need internet. The installer is unsigned, so Windows SmartScreen may show a warning; verify the source and checksum before running it.

## Source/developer archives

- [Legacy desktop source bundle](./Adria-Bank-Demo-Desktop-2026-10-11.zip?raw=1) — **not an installer**. It requires Node.js 22.12+ (64-bit), npm, and internet access for its first setup. Use it only to inspect or run the source-based version.
- [Code-only source bundle](./Adria-Bank-Demo-Code-2026-10-11.zip?raw=1) — source, tests, manifests, and local server files.

SHA-256 checksums for the checked-in archives:

- Legacy desktop source: `c73574e29ecae19e8481821e0b24a0280d635bf46f42cc20e9955dcb89b5a354`
- Code-only: `b9131a3099fe20e5f03a3b37f6a7d6540f02e855d367e2e249978ac7eed78c89`

The standalone installer's checksum is bundled with each Windows installer artifact. Keep TLS certificate verification and normal Windows security controls enabled; never enter real personal, account, payment-card, or confidential data in the demo.
