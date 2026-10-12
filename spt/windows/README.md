# SPT 2.5 — instalacija za Windows 10/11

> **produced by GNK ASG** · https://gnk-asg.hr/spt/

## ⬇️ Preuzimanje

**[SPT-Setup-2.5.0.exe](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/raw/main/spt/windows/release/SPT-Setup-2.5.0.exe)** (≈ 0,8 MB)

SHA-256 je u [`release/SPT-Setup-2.5.0.exe.sha256`](release/SPT-Setup-2.5.0.exe.sha256). Provjera u PowerShellu:

```powershell
Get-FileHash .\SPT-Setup-2.5.0.exe -Algorithm SHA256
```

## 🧭 Instalacija (oko 1–2 minute)

1. Dvoklik na **SPT-Setup-2.5.0.exe**.
2. Datoteka nije digitalno potpisana certifikatom tvrtke, pa Windows može prikazati
   **„Windows je zaštitio vaše računalo”** (SmartScreen). Kliknite **Više informacija → Ipak pokreni**.
3. U prozoru instalacije kliknite **Instaliraj**. Administratorska prava **nisu** potrebna.
4. Instalacija:
   - preuzme službeni **Python** s python.org (oko 11 MB) i provjeri njegov digitalni potpis
     (Python Software Foundation). Python koristi samo SPT, ne mijenja sustav ni PATH.
     Za instalaciju je zato potrebna internetska veza, a poslije SPT radi i bez interneta;
   - pripremi bazu podataka: 1.423 sportaša, 75 sportova, oko 27.700 sesija (do 1 minute);
   - stvori prečace i upiše SPT u **Postavke → Aplikacije**.
5. SPT se otvara u vlastitom prozoru (Microsoft Edge u „app” načinu).

**Demo prijave:** `admin / admin123`, `trener / 1234`, `kondicija / 1234`, `sportas / 1234`, `skaut / 1234`.

## 📌 Prečaci (izbornik Start → SPT)

| Prečac | Što radi |
|---|---|
| **SPT 2.5** (i na radnoj površini) | pokreće SPT u pozadini i otvara prozor; ako već radi, samo otvara prozor |
| **SPT 2.5 (mrežni način)** | SPT prima podatke i s uređaja u lokalnoj mreži (satovi na UDP 1520, UWB gateway, tableti). Windows tada pita za dopuštenje vatrozida |
| **Zaustavi SPT** | gasi SPT poslužitelj koji radi u pozadini |
| **Deinstaliraj SPT** | uklanja SPT |
| **SPT na webu** | https://gnk-asg.hr/spt/ |

Kad zatvorite prozor, SPT ostaje raditi u pozadini, pa se sljedeći put otvara odmah.
Za gašenje koristite **Zaustavi SPT**; SPT se gasi i odjavom iz Windowsa.
Zadano SPT sluša samo na ovom računalu (`127.0.0.1`), pa vatrozid ne postavlja pitanja.

## 📁 Što se instalira i gdje

```
%LOCALAPPDATA%\Programs\SPT\
├── app\                  SPT aplikacija (server.py, moduli, static\) + spt.db (vaši podaci)
├── python\               službeni Python (embeddable, samo za SPT)
├── SPT-Uninstall.exe     deinstalacija
├── uninstall.ps1, spt.ico, install.json
%LOCALAPPDATA%\SPT\logs\  zapisi (launcher.log, server.log)
```

- **Nadogradnja:** novu verziju samo pokrenite preko stare. Baza `spt.db` (vaši podaci) se zadržava.
- **Deinstalacija:** *Postavke → Aplikacije → SPT 2.5 → Deinstaliraj* ili *Start → SPT → Deinstaliraj SPT*.
  Briše program, prečace, lokalnu bazu i zapise.

## 🛠️ Za IT: tiha instalacija

```bat
SPT-Setup-2.5.0.exe /S          :: tiha instalacija (bez prozora, bez pokretanja)
"%LOCALAPPDATA%\Programs\SPT\SPT-Uninstall.exe" /S   :: tiha deinstalacija
```

Izlazni kod: `0` uspjeh, `1` greška, `1602` korisnik je odustao.

## ❓ Rješavanje problema

| Problem | Rješenje |
|---|---|
| SmartScreen blokira pokretanje | *Više informacija → Ipak pokreni* (datoteka nije potpisana certifikatom tvrtke) |
| „Python nije bilo moguće preuzeti” | Provjerite internetsku vezu i pokrenite instalaciju ponovno. Ako na računalu već postoji Python 3.10+ s python.org, instalacija ga koristi automatski |
| SPT se ne otvara | Pogledajte `%LOCALAPPDATA%\SPT\logs\server.log` i `%TEMP%\SPT-instalacija.log` |
| Port 8000 je zauzet | SPT sam odabere slobodan port (8765, 18000…) |
| Pametna kontrola aplikacija (Smart App Control) blokira nepotpisane programe | Koristite ručni način: Python s python.org pa `start_windows.bat` (vidi `spt/README.md`) |

---

## 👩‍💻 Za razvoj: kako je instalacija napravljena

```
spt/windows/
├── build_installer.py        izrada i provjera SPT-Setup-<verzija>.exe
├── stub/setup_stub.c         C instalacijski program (Win32, bez ovisnosti) — Setup i Uninstall
├── stub/spt-setup.manifest   asInvoker (bez admina), Windows 10/11, PerMonitorV2 DPI
├── installer/install.ps1     grafička instalacija (WinForms, PowerShell 5.1)
├── installer/uninstall.ps1   deinstalacija
├── launcher/spt_launcher.pyw pokretač (pozadinski poslužitelj + Edge app prozor, --lan, --stop)
├── launcher/spt_prepare.py   priprema baze tijekom instalacije
├── assets/spt.ico            ikona (iz apps/portal/spt/img/spt-icon.webp)
└── release/                  SPT-Setup-2.5.0.exe + .sha256 (za preuzimanje)
```

Izrada (Linux, macOS ili Windows; nisu potrebni Windows alati):

```bash
pip install ziglang pillow pefile
python spt/windows/build_installer.py
```

- `zig cc -target x86_64-windows-gnu` prevodi `setup_stub.c` u dva GUI programa: Setup i Uninstall,
  s ikonom, manifestom i podacima o verziji (CompanyName „GNK ASG”, Comments „produced by GNK ASG”).
- Paket je ZIP dodan na kraj Setup programa, iza kojeg slijedi završni zapis
  `SPTPKG01` + duljina ZIP-a (uint64 LE). Setup ga raspakira u `%TEMP%` pomoću Windowsovog
  `tar.exe` (rezerva je PowerShell `Expand-Archive`) i pokrene `install.ps1`.
- Izrada je deterministička: isti izvor uvijek daje isti SHA-256.
- Skripta sama provjerava rezultat: završni zapis, CRC svih datoteka, obavezne datoteke,
  UTF-8 BOM u `.ps1`, x64 GUI podsustav, resurse (ikona, manifest, verzija) i uvoze.
- Verzija se čita iz `spt/server.py` (`VERSION`).

Pokretač se može testirati i na Linuxu:
`SPT_LAUNCHER_NO_UI=1 SPT_DATA_DIR=/tmp/spt SPT_LAUNCHER_PORTS=8795 python3 spt_launcher.pyw [--lan|--stop]`.

*SPT — Sports Performance Tracking · produced by GNK ASG*
