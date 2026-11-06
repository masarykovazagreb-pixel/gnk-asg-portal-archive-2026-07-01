(() => {
  const root = document.getElementById('tvornica');
  if (!root) return;
  const controls = root.querySelector('[data-fc-controls]');
  const search = root.querySelector('#fc-search');
  const filter = root.querySelector('#fc-filter');
  const result = root.querySelector('[data-fc-result]');
  const cards = [...root.querySelectorAll('[data-fc-agent]')];
  if (!controls || !search || !filter || !result) return;
  const update = () => {
    const term = search.value.trim().toLocaleLowerCase('hr');
    let visible = 0;
    for (const card of cards) {
      const match = (filter.value === 'all' || card.dataset.fcState === filter.value) && card.textContent.toLocaleLowerCase('hr').includes(term);
      card.hidden = !match;
      if (match) visible++;
    }
    result.textContent = `Prikazano ${visible} od ${cards.length} uloga.`;
  };
  search.addEventListener('input', update);
  filter.addEventListener('change', update);
  controls.hidden = false;
  update();
})();
