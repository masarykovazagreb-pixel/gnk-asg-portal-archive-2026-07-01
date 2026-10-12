// SPT — O sustavu
"use strict";
VIEWS.info = {
  title: "O sustavu",
  sub: "Arhitektura, tehnologije praćenja i upute za Windows 11",
  async render(cont) {
    const meta = await API.get("/api/meta");
    cont.innerHTML = `
    <div class="grid g2">
      <div class="card info-sec">
        <h3>🧩 SPT u brojkama</h3>
        <div class="grid g2" style="gap:10px">
          <div class="kpi"><div class="v">${meta.athletes}</div><div class="l">sportaša</div></div>
          <div class="kpi"><div class="v">${meta.sports}</div><div class="l">sportova</div></div>
          <div class="kpi"><div class="v">${meta.sessions.toLocaleString("hr-HR")}</div><div class="l">sesija</div></div>
          <div class="kpi"><div class="v">${meta.metrics}</div><div class="l">vrsta mjerenja</div></div>
          <div class="kpi"><div class="v">${meta.clubs}</div><div class="l">klubova (šifre)</div></div>
          <div class="kpi"><div class="v">${meta.devices}</div><div class="l">uređaja</div></div>
        </div>
        <p style="margin-top:12px">Baza generirana: <b>${fmtD(meta.generated)}</b> · determinističko sjeme <code>${meta.seed}</code>
        — svaka instalacija SPT-a stvara identičnu radnu bazu (za reproduktivnost analiza).</p>
      </div>

      <div class="card info-sec">
        <h3>📡 Kako radi praćenje uživo</h3>
        <p><b>Indoor — M2M mreža (UWB/LPS):</b> igrači nose čip (tag) koji 20× u sekundi emitira ultraširokopojasni signal.
        8–16 sidara (anchors) po dvorani triangulira poziciju s točnošću ±10 cm i šalje je mesh mrežom do gatewaya,
        a gateway do SPT poslužitelja. Latencija je ispod 20 ms — dovoljno i za semafor i za semafor sudaca.</p>
        <p><b>Outdoor — GPS/GNSS:</b> čipovi primaju L1/L2 signate satelita (10–18 Hz, ±1–2 m). Idealno za nogomet, ragbi, atletiku.</p>
        <p><b>Bluetooth (BLE):</b> rezervni kanal za manje baze — pojasevi za puls i IMU čipovi, 4 Hz.</p>
        <p><b>Auto način:</b> SPT sam bira najbolji kanal prema kvaliteti signala (dvorana → UWB, vani → GNSS).</p>
        <p>U ovoj demonstraciji signal <b>simulira poslužitelj</b>; sučelje, protokoli i obrada identični su produkcijskima.</p>
      </div>

      <div class="card info-sec">
        <h3>🎬 Reprodukcija 2D/3D</h3>
        <p>Svaka snimljena utakmica pohranjuje pozicije <b>svakog igrača i lopte 1 Hz</b> (uzorkovano iz 20 Hz toka).
        Preglednik interpolira na 60 fps pa se reprodukcija doima kontinuirano:</p>
        <ul>
          <li><b>2D</b> — taktički prikaz s točkicama u boji momčadi (crvena/plava), brojevima i tragovima</li>
          <li><b>3D</b> — perspektivna kamera: vuci mišem za rotaciju, kotačić za zum; lopta leti parabolom pri udarcima</li>
          <li><b>Heatmap</b> — gušće zone kretanja; <b>vektori brzine</b> — strelice sprinteva</li>
          <li>Reprodukcija <b>unatrag i unaprijed</b> (◀◀ / ▶▶), brzina 0,25×–8×</li>
          <li>Klik na igrača → ploča s metrikama do tog trenutka + graf brzine kroz utakmicu</li>
        </ul>
      </div>

      <div class="card info-sec">
        <h3>🖥️ Windows 11 — pokretanje</h3>
        <p>SPT je napisan u čistom Pythonu (standardna biblioteka) — <b>ne treba ništa instalirati</b> osim Pythona 3.10+:</p>
        <ul>
          <li>Instaliraj <b>Python 3.10 ili noviji</b> sa python.org (obavezno označi "Add to PATH")</li>
          <li>Dvoklik <code>start_windows.bat</code> — aplikacija se sama otvori u pregledniku na <code>http://localhost:8000</code></li>
          <li>Prvo pokretanje stvara bazu (~3 s); zatim je sve odmah dostupno</li>
        </ul>
        <p>Podaci su u <code>spt.db</code> (SQLite) — kopiranjem mape prenosiš cijeli sustav. Server sluša na
        <code>0.0.0.0:8000</code> pa mu s istog Wi-Fi-ja mogu pristupiti tableti u dvorani (IP:8000).</p>
        <p>Port se mijenja varijablom <code>SPT_PORT</code>; bez otvaranja preglednika: <code>SPT_NO_BROWSER=1</code>.</p>
      </div>

      <div class="card info-sec">
        <h3>🔐 Privatnost i šifre</h3>
        <p>Klubovi su u bazi isključivo pod šiframa <code>KLB-XXXX</code> (zemlja, razina i sport su poznati, identitet nije).
        Sportovi se vode po nazivu. Sportaši imaju generirana imena — podaci su <b>u potpunosti sintetski</b> i služe za
        demonstraciju analitičke platforme.</p>
      </div>

      <div class="card info-sec">
        <h3>🧭 Plan proširenja (produkcija)</h3>
        <ul>
          <li>Uvoz stvarnih izvoza: Catapult/STATSports CSV, Kinexon JSON, Polar Team Pro</li>
          <li>UDP most za live tokove uređaja (datoteka <code>hardware_bridge.py</code> sadrži sučelje)</li>
          <li>Video AI analitika (detekcija tehničkih akcija) i xG modeli</li>
          <li>Višejezično sučelje (HR/EN/DE) i izvozi izvještaja u PDF</li>
        </ul>
      </div>
    </div>`;
    cont.append(el("div", "muted", '<div style="text-align:center;font-size:10.5px;padding:14px 0;opacity:.7">SPT · produced by <b>GNK ASG</b> · gnk-asg.hr</div>'));
  }
};
