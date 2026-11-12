// Only explicitly checked station identities. Unknown slugs must not fall back to
// the local slug: the external app silently displays its central station for some.
const stations = Object.freeze({
  hrvatska: 'hrvatska',
  japan: 'japan',
  kenija: 'kenija',
  saudijska: 'saudska',
  gvana: 'gana',
  marsalovi: 'maršalovi',
});

export function externalStationSection(slug) {
  const known = Object.hasOwn(stations, slug);
  const url = known ? `https://j1hex9qg03f0-d.space-z.ai/?country=${encodeURIComponent(stations[slug])}` : 'https://j1hex9qg03f0-d.space-z.ai/';
  const label = known ? 'Otvori izdanje za ovu zemlju na vanjskom portalu ↗' : 'Otvori središnji imenik vanjskog portala ↗';
  const note = known ? '' : '<p>Izravna poveznica za ovu zemlju još nije potvrđena; potražite izdanje u vanjskom imeniku.</p>\n    ';
  return `  <div class="section" data-external-station="v1">
    <h2>Povezana stanica AKTUAL MEDIA</h2>
    <p><a href="${url}" rel="external noopener noreferrer">${label}</a></p>
    ${note}<p>Vanjski portal ima vlastiti sadržaj i može prikazivati demonstracijske ili automatski obrađene naslove. Provjerite izvornik i datum.</p>
  </div>\n\n`;
}
