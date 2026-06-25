(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_MASS_MAIL_V20__) return;
  window.__GNK_ASG_MAIL_STUDIO_MASS_MAIL_V20__ = true;

  const VERSION = 'GNK_ASG_MAIL_STUDIO_MASS_MAIL_V20_20260626';
  const STORE_KEY = 'gnk_asg_mass_mail_campaign_v20';
  const MAX_RECIPIENTS = 100;
  let recipients = [];

  const q = id => document.getElementById(id);
  const val = id => String(q(id)?.value || '');
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const setStatus = text => { const node = q('status'); if (node) node.textContent = text; };
  const log = text => {
    const node = q('gnkMassLog');
    if (!node) return;
    const stamp = new Date().toLocaleTimeString('hr-HR');
    node.textContent = `[${stamp}] ${text}\n${node.textContent}`.slice(0, 18000);
  };

  const style = document.createElement('style');
  style.id = 'gnk-mass-mail-v20-style';
  style.textContent = `
    .gnk-mail-head-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    #gnkMassMailOpen{background:linear-gradient(135deg,#b98b2d,#f4d37a)!important;color:#07101f!important;box-shadow:0 4px 0 #765314,0 9px 22px rgba(0,0,0,.32)!important}
    #gnkMassMailOpen:hover{filter:brightness(1.12)}
    #gnkMassMailOpen:active{transform:translateY(4px);box-shadow:0 1px 0 #765314,0 4px 10px rgba(0,0,0,.25)!important}
    .gnk-mass-overlay{position:fixed;inset:0;z-index:999999;background:rgba(1,6,15,.84);backdrop-filter:blur(8px);display:none;overflow:auto;padding:24px}
    .gnk-mass-overlay.open{display:block}
    .gnk-mass-dialog{width:min(1120px,96vw);margin:24px auto;border:1px solid rgba(244,211,122,.5);border-radius:24px;background:linear-gradient(145deg,#09172b,#111f37);color:#f8fafc;box-shadow:0 34px 100px rgba(0,0,0,.68);overflow:hidden}
    .gnk-mass-head{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(244,211,122,.2)}
    .gnk-mass-head h2{margin:0;color:#f4d37a;font-family:Georgia,serif}
    .gnk-mass-head p{margin:4px 0 0;color:#cbd5e1;font-size:12px}
    .gnk-mass-body{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px}
    .gnk-mass-card{border:1px solid rgba(244,211,122,.2);border-radius:18px;background:rgba(255,255,255,.045);padding:15px}
    .gnk-mass-card.full{grid-column:1/-1}
    .gnk-mass-card h3{margin:0 0 12px;color:#f4d37a;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
    .gnk-mass-card textarea{min-height:180px}
    .gnk-mass-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
    .gnk-mass-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .gnk-mass-pill{border:1px solid rgba(244,211,122,.25);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.06);font-size:12px}
    .gnk-mass-preview{min-height:180px;background:#fff;color:#111827;border-radius:14px;padding:16px;overflow:auto}
    .gnk-mass-log{min-height:120px;max-height:250px;overflow:auto;white-space:pre-wrap;background:#020812;border:1px solid rgba(244,211,122,.18);border-radius:14px;padding:12px;font:12px/1.5 Consolas,monospace;color:#dbeafe}
    .gnk-mass-note{font-size:12px;color:#cbd5e1;line-height:1.5}
    @media(max-width:900px){.gnk-mass-body{grid-template-columns:1fr}.gnk-mass-card.full{grid-column:auto}.gnk-mass-overlay{padding:7px}.gnk-mass-dialog{margin:7px auto}}
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'gnk-mass-overlay';
  modal.id = 'gnkMassOverlay';
  modal.innerHTML = `
    <section class="gnk-mass-dialog" role="dialog" aria-modal="true" aria-labelledby="gnkMassTitle">
      <div class="gnk-mass-head">
        <div><h2 id="gnkMassTitle">GNK ASG Mass Mail</h2><p>Priprema personalizirane kampanje — najviše ${MAX_RECIPIENTS} primatelja po kampanji.</p></div>
        <button id="gnkMassClose" type="button" aria-label="Zatvori">×</button>
      </div>
      <div class="gnk-mass-body">
        <div class="gnk-mass-card">
          <h3>Primatelji</h3>
          <label>CSV ili TXT datoteka</label>
          <input id="gnkMassCsv" type="file" accept=".csv,text/csv,.txt,text/plain">
          <label style="margin-top:12px">Ili zalijepite popis</label>
          <textarea id="gnkMassRecipients" placeholder="email,name,media,title,country,reference_code\neditor@example.com,Ana Horvat,Example Media,Glavna urednica,Croatia,GNK-001"></textarea>
          <div class="gnk-mass-actions">
            <button id="gnkMassAnalyze" class="gold" type="button">Analiziraj listu</button>
            <button id="gnkMassClear" type="button">Očisti</button>
          </div>
          <div class="gnk-mass-stats">
            <span class="gnk-mass-pill" id="gnkMassValid">Valjani: 0</span>
            <span class="gnk-mass-pill" id="gnkMassDuplicates">Duplikati: 0</span>
            <span class="gnk-mass-pill" id="gnkMassInvalid">Nevaljani: 0</span>
          </div>
        </div>

        <div class="gnk-mass-card">
          <h3>Personalizacija</h3>
          <div class="gnk-mass-note">Polja: <b>{{name}}</b>, <b>{{media}}</b>, <b>{{title}}</b>, <b>{{country}}</b>, <b>{{reference_code}}</b>, <b>{{email}}</b>.</div>
          <label style="margin-top:12px">Predmet</label>
          <input id="gnkMassSubject" placeholder="Predmet kampanje">
          <label style="margin-top:12px">Tekst poruke</label>
          <textarea id="gnkMassBody" placeholder="Poštovani {{title}} {{name}}, ..."></textarea>
          <div class="gnk-mass-actions">
            <button id="gnkMassImport" type="button">Preuzmi iz Mail Studija</button>
            <button id="gnkMassPreviewBtn" type="button">Pregled prvog</button>
            <button id="gnkMassSave" type="button">Spremi kampanju</button>
            <button id="gnkMassLoad" type="button">Učitaj kampanju</button>
          </div>
        </div>

        <div class="gnk-mass-card full">
          <h3>Pregled prve personalizirane poruke</h3>
          <div class="gnk-mass-preview" id="gnkMassPreview">Najprije analizirajte popis primatelja.</div>
        </div>

        <div class="gnk-mass-card full">
          <h3>Status kampanje</h3>
          <div class="gnk-mass-note">Lista se priprema i sprema kao kontrolirani red. Zaseban Mass Mail backend za slanje bit će povezan u sljedećem koraku.</div>
          <div class="gnk-mass-actions"><button id="gnkMassPrepare" class="gold" type="button">Pripremi red za slanje</button></div>
          <div class="gnk-mass-log" id="gnkMassLog">Mass Mail V20 spreman.</div>
        </div>
      </div>
    </section>`;
  document.body.appendChild(modal);

  const addButton = () => {
    if (q('gnkMassMailOpen')) return;
    const status = q('status');
    if (!status) return;
    let tools = document.querySelector('.gnk-mail-head-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'gnk-mail-head-tools';
      status.replaceWith(tools);
      tools.appendChild(status);
    }
    const button = document.createElement('button');
    button.id = 'gnkMassMailOpen';
    button.type = 'button';
    button.className = 'gold';
    button.textContent = 'Mass Mail';
    tools.insertBefore(button,status);
    button.addEventListener('click',() => {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      importStudio();
    });
  };

  const splitRow = line => line.split(line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',')).map(x => x.trim().replace(/^['"]|['"]$/g,''));
  const emailOk = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

  const analyze = () => {
    const lines = val('gnkMassRecipients').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const seen = new Set();
    let invalid = 0, duplicates = 0;
    recipients = [];
    const first = lines[0] ? splitRow(lines[0]).map(x => x.toLowerCase()) : [];
    const hasHeader = first.some(x => ['email','e-mail','mail'].includes(x));
    const start = hasHeader ? 1 : 0;
    for (let i = start; i < lines.length; i += 1) {
      const cols = splitRow(lines[i]);
      const email = String(cols[0] || '').trim();
      if (!emailOk(email)) { invalid += 1; continue; }
      const key = email.toLowerCase();
      if (seen.has(key)) { duplicates += 1; continue; }
      seen.add(key);
      recipients.push({email,name:cols[1] || '',media:cols[2] || '',title:cols[3] || '',country:cols[4] || '',reference_code:cols[5] || ''});
      if (recipients.length >= MAX_RECIPIENTS) break;
    }
    q('gnkMassValid').textContent = `Valjani: ${recipients.length}`;
    q('gnkMassDuplicates').textContent = `Duplikati: ${duplicates}`;
    q('gnkMassInvalid').textContent = `Nevaljani: ${invalid}`;
    log(`Analizirano: ${recipients.length} valjanih, ${duplicates} duplikata, ${invalid} nevaljanih.`);
    preview();
  };

  const personalize = (template,person,index) => {
    const code = person.reference_code || `GNK-ASG-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(index + 1).padStart(3,'0')}`;
    const values = {...person,reference_code:code};
    return String(template || '').replace(/\{\{\s*(name|media|title|country|reference_code|email)\s*\}\}/gi,(_,key) => values[key.toLowerCase()] || '');
  };

  const importStudio = () => {
    q('gnkMassSubject').value = String(q('subject')?.value || '');
    q('gnkMassBody').value = String(q('bodyText')?.value || '');
  };

  const preview = () => {
    if (!recipients.length) { q('gnkMassPreview').textContent = 'Najprije analizirajte popis primatelja.'; return; }
    const person = recipients[0];
    const subject = personalize(val('gnkMassSubject'),person,0);
    const body = personalize(val('gnkMassBody'),person,0);
    q('gnkMassPreview').innerHTML = `<b>Za:</b> ${esc(person.email)}<br><b>Predmet:</b> ${esc(subject)}<hr>${esc(body).replace(/\r?\n/g,'<br>')}`;
    log(`Pregled pripremljen za ${person.email}.`);
  };

  const save = () => {
    localStorage.setItem(STORE_KEY,JSON.stringify({raw:val('gnkMassRecipients'),subject:val('gnkMassSubject'),body:val('gnkMassBody'),savedAt:new Date().toISOString()}));
    log('Kampanja spremljena lokalno.');
  };

  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      q('gnkMassRecipients').value = data.raw || '';
      q('gnkMassSubject').value = data.subject || '';
      q('gnkMassBody').value = data.body || '';
      analyze();
      log('Kampanja učitana.');
    } catch (error) { log(`Greška učitavanja: ${error.message}`); }
  };

  q('gnkMassClose').addEventListener('click',() => { modal.classList.remove('open'); document.body.style.overflow=''; });
  q('gnkMassAnalyze').addEventListener('click',analyze);
  q('gnkMassClear').addEventListener('click',() => { q('gnkMassRecipients').value=''; recipients=[]; analyze(); });
  q('gnkMassImport').addEventListener('click',() => { importStudio(); log('Predmet i tekst preuzeti iz Mail Studija.'); });
  q('gnkMassPreviewBtn').addEventListener('click',preview);
  q('gnkMassSave').addEventListener('click',save);
  q('gnkMassLoad').addEventListener('click',load);
  q('gnkMassPrepare').addEventListener('click',() => {
    analyze();
    if (!recipients.length) { log('Nema valjanih primatelja.'); return; }
    save();
    setStatus(`Mass Mail red pripremljen · ${recipients.length} primatelja`);
    log(`Red za slanje pripremljen: ${recipients.length} primatelja.`);
  });
  q('gnkMassCsv').addEventListener('change',async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    q('gnkMassRecipients').value = await file.text();
    analyze();
    log(`Učitana datoteka: ${file.name}`);
  });

  const boot = () => {
    addButton();
    setTimeout(addButton,250);
    setTimeout(addButton,1000);
    document.documentElement.dataset.gnkMassMail = VERSION;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
