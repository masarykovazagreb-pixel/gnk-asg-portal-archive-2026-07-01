// Javni prikaz postojećeg registra i spremljenog snimka. Nije izvršni agent.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states = { done:'Kapija prošla', ready:'Spremno za rad', waiting:'Čeka ovisnosti', human:'Ljudska odluka', skipped:'Nije provjereno' };

export function renderFactoryCenter(config, board, registry) {
  const agents = Array.isArray(config?.agents) ? config.agents : [];
  const snapshot = Array.isArray(board?.agents) ? board.agents : [];
  const byId = new Map(snapshot.map(a => [a.id, a]));
  const countries = Array.isArray(registry?.countries) ? registry.countries : [];
  const count = status => countries.filter(c => c.status === status).length;
  const date = board?.generatedAt || 'datum nije dostupan';
  // JSON isključivo s podacima koji su već javni u registru, siguran unutar script oznake.
  const planData = JSON.stringify(countries.map(({cca2,id,country,status,channelId,liveUrl}) => ({cca2,id,country,status,channelId,liveUrl})))
    .replace(/[<>&]/g, c => ({'<':'\\u003c','>':'\\u003e','&':'\\u0026'}[c]));
  const cards = agents.map(a => {
    const state = byId.get(a.id)?.state;
    const label = states[state] || 'Nema snimka';
    const mode = ({script:'pravila i skripte',hybrid:'skripta i ljudski pregled',human:'ljudski pregled'})[a.mode] || 'nije određeno';
    const deps = Array.isArray(a.depends_on) && a.depends_on.length ? a.depends_on.join(', ') : 'nema';
    return `<article class="fc-card" data-fc-agent data-fc-state="${esc(states[state] ? state : 'unknown')}"><div class="fc-card-top"><span>${esc(a.id)}</span><span class="fc-state">${esc(label)}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.role)}</p><p class="fc-small">Način: ${esc(mode)} · Ovisnosti: ${esc(deps)}</p></article>`;
  }).join('\n');
  return `<!-- factory-center-v1:start -->
<section class="fc" id="tvornica" aria-labelledby="fc-title">
<style>
.fc{margin:2rem 0;padding:clamp(1.1rem,3vw,2rem);border-radius:18px;background:#0c1928;color:#f3f5fa;border:1px solid #30465c}.fc *{box-sizing:border-box}.fc a{color:#b8dcff}.fc-kicker{color:#eacb83;text-transform:uppercase;letter-spacing:.14em;font-size:.75rem;font-weight:800}.fc h2{font:800 clamp(1.8rem,4vw,2.8rem)/1.12 Georgia,serif;margin:.3rem 0}.fc-intro{max-width:76ch;color:#d4dfeb}.fc-stats,.fc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.75rem;margin:1.25rem 0}.fc-stat,.fc-card{padding:1rem;border:1px solid #41556b;border-radius:12px;background:#14263a}.fc-stat strong{display:block;font-size:1.8rem;color:#f0d38e}.fc-card h3{font-size:1.1rem;margin:.7rem 0}.fc-card p{margin:.5rem 0;color:#d6e0eb}.fc-card-top{display:flex;justify-content:space-between;gap:.5rem;font-weight:700}.fc-state{font-size:.78rem;color:#ffdf9a}.fc-small{font-size:.82rem}.fc-filter{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end}.fc-filter label{display:grid;gap:.3rem}.fc-filter input,.fc-filter select{font:inherit;padding:.55rem;border-radius:6px;border:1px solid #9baec2;background:#fff;color:#102030}.fc-note{font-size:.88rem;color:#d6e0eb}.fc [hidden]{display:none!important}.fc-plan{margin:1.5rem 0;padding:1.25rem;border-radius:12px;background:#172f45;border:1px solid #556c82}.fc-plan form{display:grid;gap:.65rem;max-width:46rem}.fc-plan input[type=url]{font:inherit;padding:.7rem;border:1px solid #9baec2;border-radius:6px;color:#102030;background:#fff;min-width:0}.fc-plan fieldset{border:1px solid #7890a4;border-radius:8px}.fc-plan fieldset label{margin-right:1rem}.fc-plan button{justify-self:start;font:700 1rem system-ui;padding:.7rem 1.1rem;border:0;border-radius:6px;background:#f0d38e;color:#102030;cursor:pointer}.fc-plan button:focus-visible,.fc-plan input:focus-visible{outline:3px solid #fff;outline-offset:3px}.fc-plan ul{padding-left:1.4rem}
</style>
<p class="fc-kicker">GNK ASG · AKTUAL MEDIA</p><h2 id="fc-title">Tvornica ideja i agenata</h2>
<p class="fc-intro">Jedno mjesto za pregled registara, provjera i pripreme izdanja. Ovo je deterministički sustav skripti i ljudskih koraka — nije samostalni AI koji sam piše ili objavljuje.</p>
<div class="fc-stats"><div class="fc-stat"><strong>${agents.length}</strong>uloga u tvorničkom registru</div><div class="fc-stat"><strong>${count('live')}</strong>država označenih kao live u registru</div><div class="fc-stat"><strong>${count('preparing')}</strong>država u pripremi</div><div class="fc-stat"><strong>${count('planned')}</strong>planiranih država</div></div>
<p class="fc-note">Status agenata je spremljeni snimak od <time>${esc(date)}</time>, nije mjerenje uživo. „Kapija prošla” znači samo da je navedena provjera prošla, ne da je zadatak ili objava dovršena.</p>
<h3>Kako radi</h3><p>Registar → izvori i prava → priprema → provjere → ljudsko odobrenje. Novi kanali se ne objavljuju samo zato što postoji predložak ili planirana domena.</p>
<section class="fc-plan" aria-labelledby="fc-plan-title"><h3 id="fc-plan-title">Plan objave: Hrvatska ili svijet</h3>
<p>Odaberite opseg i unesite adresu vlastite objave. Plan prikazuje kandidate i nedostupna izdanja; ne šalje, ne objavljuje i ne potvrđuje sadržaj.</p>
<form id="factory-publication-plan" hidden><label for="factory-plan-url">Adresa objave na gnk-asg.hr</label><input id="factory-plan-url" name="url" type="url" required placeholder="https://gnk-asg.hr/objave/…" autocomplete="url"><fieldset><legend>Opseg planiranja</legend><label><input type="radio" name="scope" value="hr" checked> Hrvatska</label><label><input type="radio" name="scope" value="svijet"> Cijeli svijet</label></fieldset><button type="submit">Prikaži plan</button></form>
<noscript><p>Za interaktivni plan potreban je JavaScript. Bez njega su uloge i pregled država ispod vidljivi.</p></noscript>
<div id="factory-plan-result" aria-live="polite"></div><script type="application/json" id="factory-plan-countries">${planData}</script></section>
<div class="fc-filter" data-fc-controls hidden><label for="fc-search">Pretraži uloge<input id="fc-search" type="search" placeholder="Naziv ili zadatak"></label><label for="fc-filter">Stanje snimka<select id="fc-filter"><option value="all">Sva stanja</option><option value="done">Kapija prošla</option><option value="ready">Spremno za rad</option><option value="waiting">Čeka ovisnosti</option><option value="human">Ljudska odluka</option><option value="skipped">Nije provjereno</option><option value="unknown">Nema snimka</option></select></label><p class="fc-note" data-fc-result aria-live="polite"></p></div>
<div class="fc-grid">${cards || '<p>Registar uloga nije dostupan.</p>'}</div>
<p class="fc-note">Za rad s izvorima, licencama i objavama potrebni su provjere i urednik. Vanjske objave i spajanje promjena ne izvršavaju se s ove stranice. <a href="/izdanja/">Pregled izdanja</a> · <a href="/status/">Status mreže</a></p>
</section><script src="/assets/factory-center-v1.js" defer></script><script type="module" src="/assets/publication-plan-ui-v1.mjs"></script>
<!-- factory-center-v1:end -->`;
}
