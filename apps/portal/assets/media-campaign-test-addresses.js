(() => {
  if (window.__GNK_ASG_MEDIA_CAMPAIGN_TEST_ADDRESSES__) return;
  window.__GNK_ASG_MEDIA_CAMPAIGN_TEST_ADDRESSES__ = true;

  const TEST_ADDRESSES = [
    { firstName: 'RHT2', lastName: '', media: 'GNK ASG test', email: 'rht2@gmx.com', language: 'hr' },
    { firstName: 'Sefic20', lastName: '', media: 'GNK ASG test', email: 'sefic20@gmx.com', language: 'hr' }
  ];

  const $ = id => document.getElementById(id);
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function loadTestRecipients() {
    const input = $('recipientFile');
    if (!input || typeof DataTransfer === 'undefined' || typeof File === 'undefined') return;

    const rows = [
      'ime;prezime;medij;email;jezik',
      ...TEST_ADDRESSES.map(item => `${item.firstName};${item.lastName};${item.media};${item.email};${item.language}`)
    ];

    const file = new File([rows.join('\n')], 'gnk-asg-test-recipients.csv', { type: 'text/csv' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitForResult(successText, failureText, timeout = 45000) {
    const node = $('campaignStatus');
    if (!node) return Promise.reject(new Error('Nedostaje status slanja.'));

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const text = String(node.textContent || '');
        if (text.includes(successText)) {
          clearInterval(timer);
          resolve(text);
        } else if (text.includes(failureText)) {
          clearInterval(timer);
          reject(new Error(text));
        } else if (Date.now() - startedAt > timeout) {
          clearInterval(timer);
          reject(new Error('Isteklo je vrijeme čekanja odgovora sustava.'));
        }
      }, 250);
    });
  }

  async function sendBothNow(originalButton, input, sendButton) {
    const pdf = $('pdfFile')?.files?.[0];
    if (!pdf) {
      $('campaignStatus').textContent = 'Odaberite PDF privitak prije slanja.';
      return;
    }

    sendButton.disabled = true;
    try {
      for (let index = 0; index < TEST_ADDRESSES.length; index += 1) {
        const address = TEST_ADDRESSES[index].email;
        input.value = address;
        $('campaignStatus').textContent = `Slanje ${index + 1}/${TEST_ADDRESSES.length} na ${address} s PDF-om…`;
        originalButton.click();
        await waitForResult(`Testna poruka poslana je na ${address}.`, 'Test nije uspio:');
        await wait(1000);
      }
      $('campaignStatus').textContent = `PDF test uspješno je poslan na ${TEST_ADDRESSES.map(item => item.email).join(' i ')}.`;
    } catch (error) {
      $('campaignStatus').textContent = error.message;
    } finally {
      sendButton.disabled = false;
    }
  }

  async function scheduleCampaign(createButton, scheduleButton) {
    const pdf = $('pdfFile')?.files?.[0];
    const scheduleValue = $('campaignSchedule')?.value;

    if (!pdf) {
      $('campaignStatus').textContent = 'Odaberite PDF privitak prije zakazivanja.';
      return;
    }

    if (!scheduleValue) {
      $('campaignStatus').textContent = 'Odaberite datum i vrijeme slanja.';
      return;
    }

    const scheduled = new Date(scheduleValue);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      $('campaignStatus').textContent = 'Vrijeme zakazivanja mora biti u budućnosti.';
      return;
    }

    scheduleButton.disabled = true;
    try {
      createButton.click();
      await waitForResult('Kampanja i PDF sigurno su spremljeni u testnom režimu.', 'Greška:');
      $('campaignStatus').textContent = `Kampanja s PDF-om spremljena je za ${scheduled.toLocaleString('hr-HR')}. Automatsko izvršenje zahtijeva aktivni Cloudflare Cron.`;
    } catch (error) {
      $('campaignStatus').textContent = error.message;
    } finally {
      scheduleButton.disabled = false;
    }
  }

  function init() {
    const input = $('testAddress');
    const originalButton = $('testSend');
    const createButton = $('createCampaign');
    if (!input || !originalButton || !createButton) return;

    input.value = TEST_ADDRESSES[0].email;
    input.readOnly = true;
    originalButton.style.display = 'none';
    createButton.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'campaign-actions';
    wrapper.setAttribute('data-gnk-test-addresses', 'true');

    const sendNowButton = document.createElement('button');
    sendNowButton.type = 'button';
    sendNowButton.className = 'primary';
    sendNowButton.textContent = 'Pošalji sada na obje testne adrese s PDF-om';
    sendNowButton.addEventListener('click', () => sendBothNow(originalButton, input, sendNowButton));

    const scheduleButton = document.createElement('button');
    scheduleButton.type = 'button';
    scheduleButton.textContent = 'Zakaži testnu kampanju s PDF-om';
    scheduleButton.addEventListener('click', () => scheduleCampaign(createButton, scheduleButton));

    wrapper.append(sendNowButton, scheduleButton);
    originalButton.insertAdjacentElement('afterend', wrapper);

    const note = document.createElement('p');
    note.className = 'campaign-note';
    note.textContent = 'Pošalji sada izvršava dva kontrolirana testa. Zakaži sprema kampanju i PDF s odabranim terminom; automatsko pozadinsko slanje uključit će se tek nakon aktivacije Cloudflare Crona.';
    wrapper.insertAdjacentElement('afterend', note);

    setTimeout(loadTestRecipients, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
