# NENO LOCAL VAULT — v0.3.0 (Windows 11 installer + ChatGPT sign-in)

Osobna aplikacija koja indeksira odabrane lokalne HDD/SSD/USB mape te pronalazi tekstove, dokumente i prethodno izvezene .eml poruke. Lokalno indeksiranje i pretraga rade bez interneta. Privatni dokumenti **nisu** uključeni u GitHub kod ili artefakte.

## Preuzimanje pravog Windows Setup programa

Otvoriti **Actions → NENO Local Vault Windows Installer → zadnji uspješni build → Artifacts** i preuzeti `NenoLocalVault-Setup-Windows11-v0.3.0`. U ZIP-u treba biti:

- `NenoLocalVault-Setup-0.3.0.exe`: instalacijski čarobnjak za Windows 11 (NSIS), per-user bez administratorskih prava; Start prečac i deinstalacija.
- `NenoLocalVault-portable.exe`: prenosiva aplikacija bez instalacije.
- `SHA256.txt`: kontrolne vrijednosti EXE datoteka.
- `README.md`: upute.

**Sadržaj je dostupan tek nakon uspješnog Windows builda.** Workflow prvo provodi testove, pakira Windows EXE, kompajlira NSIS Setup i provjerava tihu instalaciju i deinstalaciju. Build nije isto što i dokaz pokretanja GUI-ja na korisnikovu stvarnom računalu. NSIS EXE nije digitalno potpisan; SmartScreen može upozoriti.

## Nova prijava putem ChatGPT računa

U kartici **ChatGPT povezivanje** odabrati **Nastavi s ChatGPT-jem**. Aplikacija otvara službeni OpenAI OAuth/OIDC PKCE postupak u sistemskom pregledniku; e-mail (uključujući beckuphome adresu) koristi se samo ako je njime registriran taj ChatGPT račun. E-mail se provjerava kriptografski preko OpenAI ID tokena; aplikacija ne traži niti sprema lozinku.

Nakon uspješne prijave odabrati **Učitaj AI modele**, zatim način **ChatGPT račun (prijava)**. Za svaku AI analizu treba zasebno potvrditi slanje odabranih izvadaka. OAuth tokeni ostaju lokalno zaštićeni Windows DPAPI-jem. Korištenje ChatGPT plana ovisi o ovlaštenju i dostupnim modelima; nijedan postupak ne daje pristup ranijim ChatGPT razgovorima ili memoriji. Za Responses API koristi se `store:false` i `stream:true`.

Alternativno: potpuno offline dokazni pregled, lokalni Ollama ili zaseban OpenAI API ključ (`OPENAI_API_KEY`; API trošak je odvojen od ChatGPT pretplate).

**Granica provjere:** službeni OAuth integracijski kod ima automatske testove, ali prijava stvarnim ChatGPT računom i AI poziv nisu izvršeni bez vlasnikova aktivnog pristanka.

## OCR, baza, privatnost

OCR skenova zahtijeva vanjski Tesseract i željene jezike, primjerice `NENO_OCR_LANG=hrv+eng`. Baza je `%LOCALAPPDATA%\NenoLocalVault\vault.sqlite3` i sadrži indeksirane tekstove; nije šifrirana na aplikacijskoj razini. Preporučeni BitLocker i dobra Windows zaštita. Deinstalacija **ne briše** privatnu bazu ni prijave, kako ne bi dovela do gubitka sadržaja. Za uklanjanje cijelog lokalnog profila potrebna je zasebna odluka.

Nisu podržani Outlook PST/MSG, svi povijesni razgovori drugih aplikacija bez izvoza ni pouzdana semantička pretraga. Hash dokazuje identičnost podataka u trenutku provjere, a ne pravnu autentičnost.

## Reproducibilna izgradnja

`decode_source.py` provjerava SHA-256 izvornog ZIP-a v0.2, `apply_upgrade.py` zatim provjerava SHA-256 dodatka v0.3, učitava unaprijeđene Python datoteke, tests i NSIS `installer.nsi`. `requirements-build.txt` priprema PyInstaller. Dodatne korisničke datoteke ili tokeni ne smiju biti uključeni u build.

Programski rad ostaje izoliran u razvojnoj grani. GNK ASG produkcija nije mijenjana.
