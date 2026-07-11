(()=>{
  const sectors=['Strategija','Tehnologija','Financije','Pravo','Compliance','Mediji','Newsroom','Mail','Projekti','Dokumentacija','Sigurnost','Analitika'];
  const funcs=['Planiranje','Istraživanje','Analiza','Klasifikacija','Obrada podataka','Integracija','Pisanje','Uređivanje','Validacija','QA','Sigurnosna provjera','Lokalizacija','Dokumentiranje','Praćenje statusa','Izvještavanje','Arhiviranje'];
  const stages=['Intake','Classify','Research','Draft','Review','Approve','Publish','Audit'];
  const jobs={
    Intake:'zaprimanje i normalizacija ulaznog zadatka',
    Classify:'razvrstavanje prioriteta, područja i rizika',
    Research:'prikupljanje i strukturiranje relevantnih podataka',
    Draft:'izrada radnog nacrta ili operativnog prijedloga',
    Review:'provjera kvalitete, konzistentnosti i ograničenja',
    Approve:'evidentiranje odobrenja ili kontrolnog gatea',
    Publish:'priprema odobrenog izlaza za ciljanu distribuciju',
    Audit:'zapisivanje rezultata, statusa i revizijskog traga'
  };
  const q=document.getElementById('q');
  const sector=document.getElementById('sector');
  const stage=document.getElementById('stage');
  const rows=document.getElementById('rows');
  if(!q||!sector||!stage||!rows)return;
  const all=[];
  let n=1;
  for(const s of sectors)for(const f of funcs)for(const st of stages)all.push({code:'DWF-'+String(n++).padStart(4,'0'),sector:s,func:f,stage:st,job:jobs[st]});
  sectors.forEach(x=>sector.add(new Option(x,x)));
  stages.forEach(x=>stage.add(new Option(x,x)));
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function draw(){
    const t=q.value.toLowerCase();
    const selectedSector=sector.value;
    const selectedStage=stage.value;
    const view=all.filter(x=>(!selectedSector||x.sector===selectedSector)&&(!selectedStage||x.stage===selectedStage)&&(!t||Object.values(x).join(' ').toLowerCase().includes(t))).slice(0,300);
    rows.innerHTML=view.map(x=>`<tr><td class="code">${x.code}</td><td>${esc(x.sector)}</td><td>${esc(x.func)}</td><td>${esc(x.stage)}</td><td>${esc(x.job)}</td></tr>`).join('');
    if(!view.length)rows.innerHTML='<tr><td colspan="5">Nema rezultata za odabrane filtre.</td></tr>';
  }
  q.addEventListener('input',draw);
  sector.addEventListener('change',draw);
  stage.addEventListener('change',draw);
  draw();
})();