const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function countryNavigation(country, cities, base = 'https://gnk-asg.hr/gnk-aktual/') {
  const related = cities.filter(city => city.country === country.slug);
  const links = related.map(city => `<li><a href="${escape(base)}grad/${encodeURIComponent(city.slug)}/">${escape(city.nameLocal)}</a></li>`).join('');
  return `  <nav class="section" data-world-navigation="v1" aria-label="Mreža izdanja">
    <h2>Mreža izdanja</h2>
    <p><a href="${escape(base)}media/">Svjetski imenik — sve zemlje i gradovi</a> · <a href="${escape(base)}">GNK Aktual</a></p>
    ${links ? `<p>Gradovi u ovom izdanju:</p><ul>${links}</ul>` : '<p>U ovom katalogu zasad nema gradskih izdanja za ovu zemlju.</p>'}
  </nav>\n\n`;
}
export function cityNavigation(city, country, base = 'https://gnk-asg.hr/gnk-aktual/') {
  if (!country || country.slug !== city.country) throw new Error(`Missing country for city ${city.slug}`);
  return `<nav data-world-navigation="v1" aria-label="Mreža izdanja"><a href="${escape(base)}media/">Svjetski imenik</a> · <a href="${escape(base)}media/${encodeURIComponent(country.slug)}/">${escape(country.nameLocal)} · ${escape(country.nameEn)}</a> · <a href="${escape(base)}">GNK Aktual</a></nav>\n`;
}
