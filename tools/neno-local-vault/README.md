# NENO LOCAL VAULT (v0.1.0)

**Osobna, lokalna aplikacija za Windows 11.** Ne ovisi o GNK ASG portalu, GitHubu ili internetu pri običnoj pretrazi. Aplikacija ne šalje dokumente na mrežu bez odabira AI načina i potvrde za oblak. Originale samo čita.

## Što sada radi

- Ručni izbor mapa, lokalnih diskova i priključenih USB diskova; ne pokreće automatski pretraživanje cijelog C: diska.
- Inkrementalno indeksiranje uz mogućnost prekida, lokalna SQLite FTS5 baza; pamti sadržaj i kad se USB odspoji.
- Pretraga po riječi, dijelu riječi, imenima i oblicima (npr. **Sanela**/**Saneli**), sadržaju, nazivu, putanji i uz filtar mape/tipa.
- PDF (samo tekstualni), DOCX, XLSX/XLSM, ODT, RTF, EML, TXT, CSV, HTML, JSON, kôd i ostale navedene vrste.
- Pregled izvornog teksta, otvaranje originala, kopiranje putanje, izvoz rezultata u CSV.
- Povijest upita, spremljene analize s putanjama izvora, detekcija jednakog ekstrahiranog teksta.
- Bez AI-ja izrađuje provjerljiv dokazni pregled; opcijski lokalna Ollama ili OpenAI API uz svjesnu odluku korisnika.

## Windows instalacija

1. U repozitoriju pronađi **Actions → NENO Local Vault Windows → najnoviji uspješni run → Artifacts** i preuzmi `NenoLocalVault-Windows.zip`.
2. Raspakiraj ZIP. Pokreni `NenoLocalVault.exe` iz tog foldera; ne treba instaliran Python.
3. Ako želiš prečac u Start izborniku: u istoj mapi desni klik `install.ps1` → Run with PowerShell, ili u PowerShellu `powershell -ExecutionPolicy Bypass -File .\install.ps1`. Ne pokreći skripte koje nisi prethodno pregledao.
4. U kartici **Diskovi i USB** dodaj izvore i klikni **Pokreni indeksiranje**. Zatim upiši npr. `što sam pisao o Saneli` u pretragu.

SQLite baza i povijest: `%LOCALAPPDATA%\NenoLocalVault\vault.sqlite3` (obični lokalni sadržaj bez enkripcije). Preporučeno koristiti BitLocker i zaštitu Windows računa. **NE** spremati bazu u javni GitHub.

### Opcionalni lokalni AI

1. Instaliraj Ollama na Windows računalo, preuzmi željeni model, npr. `ollama pull llama3.2`.
2. Izaberi **Lokalni Ollama** u aplikaciji. Bez poslužitelja i modela dobit ćeš jasnu grešku, ali pretraga i dalje radi.
3. Model se može promijeniti kroz korisničku varijablu `NENO_OLLAMA_MODEL`. AI odgovori nisu dokaz; uvijek provjeri navedeni izvor.

### Opcionalni cloud AI

OpenAI API je zasebno naplativ od pretplate na ChatGPT. Za korištenje postavi `OPENAI_API_KEY` u Windows korisničke varijable okruženja, ponovno pokreni aplikaciju i izaberi **OpenAI API (oblak)**. Aplikacija će *za svaki upit* tražiti potvrdu slanja izvadaka do 12 pronađenih datoteka. Nikad ne postavljaj API ključ u repozitorij.

## Tehničke granice — ne obećavamo ono što ne radi

- Skenirani PDF-ovi/slike zahtijevaju OCR (još nije implementiran); .PST/.MSG/.DOC/.XLS nisu podržani u ovoj verziji.
- Nema pregleda Outlooka, Gmaila, ChatGPT razgovora ili WhatsAppa bez prethodnog lokalnog izvoza u podržanu vrstu datoteke.
- Pretraga je leksička (FTS5 s proširenjem nastavaka riječi), ne stvarno semantička. Generativna analiza zahtijeva Ollama model ili OpenAI API.
- Prikaz AI-ju ograničen je na prvih 12 rezultata i 4.500 znakova po dokumentu; zaključci nisu potpuna analiza velikog arhiva.
- Indeksiranje može čitati povjerljive informacije koje korisnik odabere; lokalna SQLite baza po zadanim postavkama nije šifrirana. Izvorni diskovi se ne mijenjaju.
- Ne briše indeks za odspojene USB-ove. Obrisane lokalne datoteke također ostaju u indeksu do budućeg upravljanja arhivom; provjeri postoje li originali prije pozivanja na njih.
- Ograničenje veličine izvornog dokumenta: 16 MiB; izvučeni tekst reže se na 350.000 znakova. Za opsežne arhive rezultat može biti nepotpun.

## Lokalni razvoj i testiranje

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-build.txt
.\.venv\Scripts\python -m unittest discover -s tests -v
.\.venv\Scripts\python app.py
.\.venv\Scripts\python -m PyInstaller --onefile --windowed --name NenoLocalVault app.py
```

**Privatnost i razgraničenje**: repozitorij sadrži samo aplikacijski kod, nikada korisničke dokumente ni indeks. Windows build je GitHub Actions artefakt; to NIJE live Cloudflare/GNK ASG deploy. Neovisne provjere aplikacije na stvarnom Windows 11 računalu ostaju potrebne.