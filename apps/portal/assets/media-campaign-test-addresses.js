(() => {
  if (window.__GNK_ASG_MEDIA_CAMPAIGN_TEST_ADDRESSES__) return;
  window.__GNK_ASG_MEDIA_CAMPAIGN_TEST_ADDRESSES__ = true;

  const TEST_ADDRESSES = [
    'rht2@gmx.com',
    'sefic20@gmx.com'
  ];

  function init() {
    const input = document.getElementById('testAddress');
    const originalButton = document.getElementById('testSend');
    if (!input || !originalButton) return;

    input.value = TEST_ADDRESSES[0];
    input.readOnly = true;

    const wrapper = document.createElement('div');
    wrapper.className = 'campaign-actions';
    wrapper.setAttribute('data-gnk-test-addresses', 'true');

    TEST_ADDRESSES.forEach((address, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Pošalji PDF test ${index + 1}: ${address}`;
      button.addEventListener('click', () => {
        input.value = address;
        originalButton.click();
      });
      wrapper.appendChild(button);
    });

    originalButton.style.display = 'none';
    originalButton.insertAdjacentElement('afterend', wrapper);

    const note = document.createElement('p');
    note.className = 'campaign-note';
    note.textContent = 'Test je zaključan na dvije odobrene adrese. Svaka testna poruka koristi PDF odabran u odjeljku Poruka i PDF.';
    wrapper.insertAdjacentElement('afterend', note);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
