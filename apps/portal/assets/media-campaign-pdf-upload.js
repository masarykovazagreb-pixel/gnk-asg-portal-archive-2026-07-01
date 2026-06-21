(() => {
  if (window.__GNK_MEDIA_CAMPAIGN_PDF_UPLOAD__) return;
  window.__GNK_MEDIA_CAMPAIGN_PDF_UPLOAD__ = true;

  const TOKEN_KEY = 'GNK_ASG_OPERATOR_TOKEN';
  const CAMPAIGN_KEY = 'GNK_ASG_MEDIA_CAMPAIGN_ID';
  const status = message => {
    const target = document.getElementById('campaignStatus');
    if (target) target.textContent = message;
  };

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => reject(reader.error || new Error('Greška čitanja PDF-a.'));
      reader.readAsDataURL(file);
    });
  }

  async function waitForCampaign(previousId) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const currentId = localStorage.getItem(CAMPAIGN_KEY) || '';
      if (currentId && currentId !== previousId) return currentId;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return '';
  }

  async function uploadPdf(campaignId, file) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    if (!token) throw new Error('Nedostaje operator token.');
    if (!file) throw new Error('PDF nije odabran.');
    if (file.size > 8000000) throw new Error('PDF je veći od 8 MB.');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Privitak mora biti PDF.');
    }

    const response = await fetch(`/api/mail-agent/media-campaign/${encodeURIComponent(campaignId)}/attachment`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-operator-token': token
      },
      body: JSON.stringify({
        pdfAttachment: {
          filename: file.name,
          mimeType: 'application/pdf',
          size: file.size,
          base64: await readAsBase64(file)
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function bind() {
    const button = document.getElementById('createCampaign');
    const input = document.getElementById('pdfFile');
    if (!button || !input) return;

    button.addEventListener('click', async () => {
      const file = input.files?.[0];
      const previousId = localStorage.getItem(CAMPAIGN_KEY) || '';
      if (!file) return;

      const campaignId = await waitForCampaign(previousId);
      if (!campaignId) return;

      try {
        status('Kampanja je spremljena. Sigurno učitavanje PDF-a…');
        await uploadPdf(campaignId, file);
        status('Kampanja i PDF privitak sigurno su spremljeni u testnom režimu.');
      } catch (error) {
        status(`Kampanja je spremljena, ali PDF nije učitan: ${error.message}`);
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();
})();
