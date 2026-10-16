(() => {
  'use strict';

  const fetchPublicJson = async (url) => {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Public reference request failed: ${response.status}`);
    return response.json();
  };

  const setCount = (key, value) => {
    const element = document.querySelector(`[data-ai-count="${key}"]`);
    if (element && Number.isFinite(value)) element.textContent = String(value);
  };

  Promise.all([
    fetchPublicJson('/data/assistant-knowledge.json'),
    fetchPublicJson('/ai-visibility/facts.json'),
    fetchPublicJson('/ai/assistant-reference-openapi.json'),
  ]).then(([reference, visibility, openApi]) => {
    const operations = Object.values(openApi.paths || {}).reduce((total, pathItem) => (
      total + Object.keys(pathItem || {}).filter((method) => method.toLowerCase() === 'get').length
    ), 0);
    setCount('entities', reference.entities?.length || 0);
    setCount('facts', visibility.facts?.length || 0);
    setCount('sources', reference.publicReferences?.length || 0);
    setCount('operations', operations);
  }).catch(() => {
    const status = document.querySelector('[data-ai-data-status]');
    if (status) status.textContent = 'Live counts are temporarily unavailable; the linked public files remain available below.';
  });

  const copyButton = document.querySelector('[data-copy-ai-guidance]');
  const copyStatus = document.querySelector('[data-copy-ai-status]');
  if (copyButton && copyStatus) {
    copyButton.addEventListener('click', async () => {
      copyButton.disabled = true;
      copyStatus.textContent = 'Preparing the public writing guidance…';
      try {
        const response = await fetch('/ai/assistant-system-prompt.txt', {
          method: 'GET',
          credentials: 'omit',
          headers: { Accept: 'text/plain' },
        });
        if (!response.ok) throw new Error(`Guidance request failed: ${response.status}`);
        const guidance = await response.text();
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
        await navigator.clipboard.writeText(guidance);
        copyStatus.textContent = 'Copied to your clipboard only. Nothing was sent to an AI service.';
      } catch {
        copyStatus.textContent = 'Copy is unavailable here. Use the download link above; no information was sent.';
      } finally {
        copyButton.disabled = false;
      }
    });
  }
})();
