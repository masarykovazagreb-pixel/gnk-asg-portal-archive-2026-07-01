(() => {
  const root = document.getElementById('svijet-drzave');
  if (!root) return;
  const controls = root.querySelector('[data-wd-controls]');
  const search = root.querySelector('#wd-search');
  const filter = root.querySelector('#wd-filter');
  const result = root.querySelector('[data-wd-result]');
  const cards = [...root.querySelectorAll('[data-wd-country]')];
  if (!controls || !search || !filter || !result) return;
  const update = () => {
    const term = search.value.trim().toLocaleLowerCase('hr');
    let visible = 0;
    for (const card of cards) {
      const match = (filter.value === 'all' || card.dataset.wdStatus === filter.value) && card.textContent.toLocaleLowerCase('hr').includes(term);
      card.hidden = !match;
      if (match) visible++;
    }
    result.textContent = `Prikazano ${visible} od ${cards.length} država.`;
  };
  search.addEventListener('input', update);
  filter.addEventListener('change', update);
  controls.hidden = false;
  update();
})();
