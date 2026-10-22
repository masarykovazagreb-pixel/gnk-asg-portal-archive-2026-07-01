# NENO LOCAL VAULT — v0.2.0

**Privatna Windows 11 aplikacija** za lokalno pretraživanje diskova, USB-ova, dokumenata i prethodno izvezene korespondencije. Datoteke koje korisnik odabere indeksiraju se u SQLite bazu na njegovom računalu. Za običnu pretragu nisu potrebni internet, račun ni AI ključ. Izvornike samo čita; sadržaj baze nije objavljen na GitHubu.

## Mogućnosti

- Indeksiranje odabranih mapa, diskova i USB-ova, s prekidom i inkrementalnim nastavkom. Ranije pronađeni tekst ostaje dostupan nakon iskopčavanja USB-a.
- Pretraživanje na hrvatskom (npr. `što sam pisao o Saneli`), filtriranje po mapi i vrsti, pregled teksta, otvaranje izvornika i izvoz CSV-a.
- Nova kartica **Komunikacija** za lokalne `.eml` poruke: pošiljatelj, primatelji, predmet, datum iz zaglavlja, putanja i pregled sadržaja. Poruke treba prethodno izvesti: ovo nije neposredan Outlook/Gmail pristup.
- Oznake `aktualan` / `izmijenjen` / `nedostupan` za izvore, zasebna provjera SHA-256 izvornika, izvoz dokaznog CSV-a sa zapisanim SHA-256 vrijednostima.
- Ručna sigurnosna kopija baze putem SQLite backup mehanizma, povijest upita, pohranjene analize i pretraga jednakog izvučenog teksta.
- AI analiza koristeći relevantne izvatke iz cijelog indeksiranog teksta (najviše 12 dokumenata, do 4500 znakova iz svakog). Način `Offline pregled` radi bez AI-ja; lokalna Ollama radi bez oblaka; OpenAI API zahtijeva posebnu potvrdu prije svakog slanja.
- OCR za slike i skenirane PDF-ove ako je instaliran vanjski Tesseract OCR. Podržava `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.bmp`, a OCR skeniranog PDF-a ograničen je na prvih 25 stranica.
- Pri neuspjelom ponovnom čitanju **čuva prethodno indeksirani tekst**. Postoji ručno `Ukloni iz indeksa` koje ne briše original s diska.

## Instalacija za Windows 11

**Za korisnike:** na GitHub razvojnoj grani Masarikove otvori Actions > `NENO Local Vault Windows` > **uspješno završeno** pokretanje > Artifacts > `NenoLocalVault-Windows`. Raspakiraj. Pokreni `NenoLocalVault.exe` ili `install.ps1` iz iste mape za korisničku Start prečicu. **Dok nije potvrđen uspješan Windows Actions build, ne može se tvrditi da je `.exe` dostupan.**

**Za razvoj / ručno stvaranje `.exe`:**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-build.txt
.\.venv\Scripts\python -m unittest discover -s tests -v
.\.venv\Scripts\python app.py
.\.venv\Scripts\python -m PyInstaller --clean --noconfirm --onefile --windowed --collect-all pypdfium2 --name NenoLocalVault app.py
```

**OCR:** odvojeno instaliraj Tesseract, provjeri da je `tesseract.exe` u Windows PATH-u te po potrebi instaliraj hrvatski jezični paket i postavi `NENO_OCR_LANG=hrv+eng`. Bez Tesseracta normalna pretraga PDF/DOCX/TXT i ostalih tekstualnih formata i dalje radi; pogreške OCR-a evidentiraju se u indeksu.

**Ollama:** odvojeno instaliraj Ollama i model, npr. `ollama pull llama3.2`, pa u aplikaciji odaberi Lokalni Ollama. Model se bira varijablom `NENO_OLLAMA_MODEL`.

**OpenAI:** postavi vlastiti `OPENAI_API_KEY` u korisničke varijable okruženja; OpenAI API naplaćuje se zasebno od ChatGPT pretplate. Prije svakog slanja prikazuje se potvrda. Privatne pravne i poslovne spise ne šalji u oblak bez zasebne procjene rizika.

## Sigurnost i granice

- Indeks sadrži **nešifrirani tekst** u `%LOCALAPPDATA%\NenoLocalVault\vault.sqlite3`; preporučeni su BitLocker, zaštićen Windows korisnički račun i sigurna lokacija backup kopija. Lokalna baza se nikad ne stavlja u GitHub.
- SHA-256 omogućuje utvrditi je li original identičan indeksiranoj verziji, ali sam po sebi **ne dokazuje autentičnost, autora ni valjanost pravnog dokumenta**. Datum `.eml` zaglavlja sam po sebi ne dokazuje primitak.
- Ne podržava automatski Outlook `.pst/.msg/.ost`, stare binarne Word `.doc`/Excel `.xls` dokumente, WhatsApp baze, sadržaj poruka skriven u aplikacijama, ni govor/video bez izvezenog teksta. Ti su formati predmet zasebne nadogradnje.
- Izvučeni tekst ograničen je na 350.000 znakova po dokumentu; sirove datoteke do 16 MiB; PDF tekstualni prolaz do 400 stranica; OCR 25 PDF stranica. Za iznimno velike arhive treba daljnja optimizacija i provjera.
- Indeksiranje ne ulazi automatski u Windows sistemske/skrivene cache foldere; ručno odaberi relevantnu mapu. Izbrisana ili odspojena datoteka ne uklanja automatski ranije pohranjeni indeks.
- OCR i AI podložni su pogreškama; svaku važnu pravnu/financijsku tvrdnju provjeri iz originala. Testovi ne dokazuju da je Windows `.exe` gotov dok Windows Actions ne prođe.

## Razvoj i kontrola

Provjera: `python -m unittest discover -s tests -v` (12 testova, uključujući email kronologiju, migraciju baze v0.1, backup, hash, offline USB, relevantan AI izvadak i čuvanje podataka nakon neuspjelog ponovnog čitanja). GUI smoke-test također je proveden u virtualnom Linux prikazu; Windows 11 zahtijeva neovisan test.

**Razgraničenje:** sve se razvija na izdvojenoj grani GitHuba Masarikova i ne mijenja produkciju GNK ASG portala ni Cloudflare Workere.
