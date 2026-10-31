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
.fc{margin:2rem 0;padding:clamp(1.1rem,3vw,2rem);border-radius:18px;background:#0c1928;color:#f3f5fa;border:1px solid #30465c}.fc *{box-sizing:border-box}.fc a{color:#b8dcff}.fc-kicker{color:#eacb83;text-transform:uppercase;letter-spacing:.14em;font-size:.75rem;font-weight:800}.fc h2{font:800 clamp(1.8rem,4vw,2.8rem)/1.12 Georgia,serif;margin:.3rem 0}.fc-intro{max-width:76ch;color:#d4dfeb}.fc-stats,.fc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.75rem;margin:1.25rem 0}.fc-stat,.fc-card{padding:1rem;border:1px solid #41556b;border-radius:12px;background:#14263a}.fc-stat strong{display:block;font-size:1.8rem;color:#f0d38e}.fc-card h3{font-size:1.1rem;margin:.7rem 0}.fc-card p{margin:.5rem 0;color:#d6e0eb}.fc-card-top{display:flex;justify-content:space-between;gap:.5rem;font-weight:700}.fc-state{font-size:.78rem;color:#ffdf9a}.fc-small{font-size:.82rem}.fc-filter{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end}.fc-filter label{display:grid;gap:.3rem}.fc-filter input,.fc-filter select{font:inherit;padding:.55rem;border-radius:6px;border:1px solid #9baec2;background:#fff;color:#102030}.fc-note{font-size:.88rem;color:#d6e0eb}.fc [hidden]{display:none!important}
</style>
<p class="fc-kicker">GNK ASG · AKTUAL MEDIA</p><h2 id="fc-title">Tvornica ideja i agenata</h2>
<p class="fc-intro">Jedno mjesto za pregled registara, provjera i pripreme izdanja. Ovo je deterministički sustav skripti i ljudskih koraka — nije samostalni AI koji sam piše ili objavljuje.</p>
<div class="fc-stats"><div class="fc-stat"><strong>${agents.length}</strong>uloga u tvorničkom registru</div><div class="fc-stat"><strong>${count('live')}</strong>država označenih kao live u registru</div><div class="fc-stat"><strong>${count('preparing')}</strong>država u pripremi</div><div class="fc-stat"><strong>${count('planned')}</strong>planiranih država</div></div>
<p class="fc-note">Status agenata je spremljeni snimak od <time>${esc(date)}</time>, nije mjerenje uživo. „Kapija prošla” znači samo da je navedena provjera prošla, ne da je zadatak ili objava dovršena.</p>
<h3>Kako radi</h3><p>Registar → izvori i prava → priprema → provjere → ljudsko odobrenje. Novi kanali se ne objavljuju samo zato što postoji predložak ili planirana domena.</p>
<div class="fc-filter" data-fc-controls hidden><label for="fc-search">Pretraži uloge<input id="fc-search" type="search" placeholder="Naziv ili zadatak"></label><label for="fc-filter">Stanje snimka<select id="fc-filter"><option value="all">Sva stanja</option><option value="done">Kapija prošla</option><option value="ready">Spremno za rad</option><option value="waiting">Čeka ovisnosti</option><option value="human">Ljudska odluka</option><option value="skipped">Nije provjereno</option><option value="unknown">Nema snimka</option></select></label><p class="fc-note" data-fc-result aria-live="polite"></p></div>
<div class="fc-grid">${cards || '<p>Registar uloga nije dostupan.</p>'}</div>
<p class="fc-note">Za rad s izvorima, licencama i objavama potrebni su provjere i urednik. Vanjske objave i spajanje promjena ne izvršavaju se s ove stranice. <a href="/izdanja/">Pregled izdanja</a> · <a href="/status/">Status mreže</a></p>
</section><script src="/assets/factory-center-v1.js" defer></script>
<!-- factory-center-v1:end -->`;
}
