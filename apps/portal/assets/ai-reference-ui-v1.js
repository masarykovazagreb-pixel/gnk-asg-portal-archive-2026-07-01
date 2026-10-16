(() => {
  'use strict';

  const isCroatian = document.documentElement.lang.toLowerCase().startsWith('hr');
  const text = (english, croatian) => (isCroatian ? croatian : english);
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
  const makeElement = (tagName, className, value) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value || text('Unknown date', 'Nepoznat datum');
    return new Intl.DateTimeFormat(isCroatian ? 'hr-HR' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(date);
  };

  const renderReviewStatus = (reviewedAt) => {
    const status = document.querySelector('[data-ai-review-status]');
    if (!status || !reviewedAt) return;
    const ageInDays = Math.floor((Date.now() - Date.parse(`${reviewedAt}T00:00:00Z`)) / 86400000);
    let freshness;
    if (ageInDays > 90) {
      freshness = text('A fresh human source review is overdue.', 'Preporučuje se novi ljudski pregled izvora; prethodni je dospio za obnovu.');
    } else if (ageInDays > 30) {
      freshness = text('A new human source review is recommended.', 'Preporučuje se novi ljudski pregled izvora.');
    } else if (ageInDays < 0) {
      freshness = text('The recorded review date is in the future; check the registry metadata.', 'Zabilježeni datum pregleda je u budućnosti; provjerite metapodatke registra.');
    } else {
      freshness = text('Recent recorded review date.', 'Nedavno zabilježen datum pregleda.');
    }
    const ageText = ageInDays >= 0
      ? text(`${ageInDays} day${ageInDays === 1 ? '' : 's'} ago`, `prije ${ageInDays} ${ageInDays === 1 ? 'dan' : 'dana'}`)
      : text('future date', 'datum u budućnosti');
    status.textContent = `${freshness} ${text('Last review recorded', 'Posljednji evidentirani pregled')}: ${formatDate(reviewedAt)} (${ageText}). ${text('This is historical review metadata, not live registry verification.', 'Ovo su povijesni metapodatci o pregledu, a ne provjera registra uživo.')}`;
  };

  const renderFacts = (factsData) => {
    const list = document.querySelector('[data-ai-fact-list]');
    if (!list) return;
    list.replaceChildren();
    const facts = Array.isArray(factsData.facts) ? factsData.facts : [];
    if (facts.length === 0) {
      list.append(makeElement('p', 'ai-empty-state', text('No public facts are available.', 'Nema dostupnih javnih činjenica.')));
      return;
    }
    const copyStatus = document.querySelector('[data-ai-fact-copy-status]');
    for (const fact of facts) {
      const card = makeElement('article', 'ai-fact-card');
      const subject = makeElement('h3', '', fact.subject || text('Public fact', 'Javna činjenica'));
      const statement = makeElement('p', '', isCroatian ? (fact.hr || fact.statement) : fact.statement);
      const metadata = makeElement('div', 'ai-fact-meta');
      metadata.append(
        makeElement('span', '', `${text('Review recorded', 'Pregled zabilježen')}: ${formatDate(factsData.reviewedAt)}`),
        makeElement('span', '', `${text('Published by', 'Izdavač')}: ${factsData.publisher || 'GNK ASG d.o.o.'}`),
      );
      const actions = makeElement('div', 'ai-fact-actions');
      const sourceLink = makeElement('a', '', text('Open cited source', 'Otvori navedeni izvor'));
      try {
        const sourceUrl = new URL(fact.source);
        if (sourceUrl.protocol === 'https:') {
          sourceLink.href = sourceUrl.href;
          sourceLink.rel = 'noopener noreferrer';
          actions.append(sourceLink);
        }
      } catch {
        // Invalid source URLs are omitted; validation in the repository catches them in CI.
      }
      const copyButton = makeElement('button', '', text('Copy citation', 'Kopiraj citat'));
      copyButton.type = 'button';
      copyButton.setAttribute('aria-label', text(`Copy citation for ${fact.subject || 'this fact'}`, `Kopiraj citat za: ${fact.subject || 'ovu činjenicu'}`));
      copyButton.addEventListener('click', async () => {
        const statementForCitation = isCroatian ? (fact.hr || fact.statement) : fact.statement;
        const citation = isCroatian
          ? `${statementForCitation} Izvor: ${fact.source} (datum pregleda u registru: ${factsData.reviewedAt}; nije provjera stanja uživo).`
          : `${statementForCitation} Source: ${fact.source} (review date recorded: ${factsData.reviewedAt}; not live verification).`;
        if (!navigator.clipboard?.writeText) {
          if (copyStatus) copyStatus.textContent = text('Clipboard access is unavailable; nothing was sent.', 'Međuspremnik nije dostupan; ništa nije poslano.');
          return;
        }
        try {
          await navigator.clipboard.writeText(citation);
          if (copyStatus) copyStatus.textContent = text('Citation copied locally. Nothing was sent to an AI service.', 'Citat je kopiran lokalno. Ništa nije poslano AI usluzi.');
        } catch {
          if (copyStatus) copyStatus.textContent = text('Copy failed; nothing was sent.', 'Kopiranje nije uspjelo; ništa nije poslano.');
        }
      });
      actions.append(copyButton);
      card.append(subject, statement, metadata, actions);
      list.append(card);
    }
  };

  const renderReviewHistory = (history) => {
    const list = document.querySelector('[data-ai-review-history-list]');
    if (!list) return;
    list.replaceChildren();
    const records = Array.isArray(history.records) ? [...history.records].reverse() : [];
    if (records.length === 0) {
      list.append(makeElement('p', 'ai-empty-state', text('No source review revisions are recorded yet.', 'Još nema zabilježenih revizija pregleda izvora.')));
      return;
    }
    for (const record of records) {
      const article = makeElement('article', 'ai-review-record');
      article.append(makeElement('h3', '', `${text('Review', 'Pregled')} ${record.revision}: ${formatDate(record.reviewedAt)}`));
      article.append(makeElement('p', '', `${text('Recorded', 'Zabilježeno')}: ${formatDate(record.recordedAt)} · ${text('Reviewer', 'Pregledao')}: ${record.reviewer} · ${text('Facts in snapshot', 'Činjenica u zapisu')}: ${record.factCount}`));
      const changeSummary = record.revision === 1
        ? `${text('Initial baseline snapshot; no earlier revision exists', 'Početni osnovni zapis; prethodna revizija ne postoji')}: ${(record.initialFactIds || record.reviewedFactIds || []).length} ${text('fact entries', 'stavki činjenica')}`
        : `${text('Changed fact entries in this revision', 'Promijenjene stavke činjenica u ovoj reviziji')}: ${(record.changedFactIds || []).length}${(record.removedFactIds || []).length ? `; ${text('removed', 'uklonjeno')}: ${record.removedFactIds.length}` : ''}`;
      article.append(makeElement('p', '', changeSummary));
      article.append(makeElement('p', '', record.note));
      article.append(makeElement('code', '', `${text('Snapshot SHA-256', 'SHA-256 otiska zapisa')}: ${record.snapshotSha256}`));
      list.append(article);
    }
  };

  const renderCounts = (reference, factsData, openApi) => {
    const operations = Object.values(openApi.paths || {}).reduce((total, pathItem) => (
      total + Object.keys(pathItem || {}).filter((method) => method.toLowerCase() === 'get').length
    ), 0);
    setCount('entities', reference.entities?.length || 0);
    setCount('facts', factsData.facts?.length || 0);
    setCount('sources', reference.publicReferences?.length || 0);
    setCount('operations', operations);
  };

  const copyGuidanceButton = document.querySelector('[data-copy-ai-guidance]');
  const copyGuidanceStatus = document.querySelector('[data-copy-ai-status]');
  if (copyGuidanceButton && copyGuidanceStatus) {
    copyGuidanceButton.addEventListener('click', async () => {
      copyGuidanceButton.disabled = true;
      copyGuidanceStatus.textContent = text('Preparing the public writing guidance…', 'Pripremaju se javne uredničke smjernice…');
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
        copyGuidanceStatus.textContent = text('Copied to your clipboard only. Nothing was sent to an AI service.', 'Kopirano je samo u vaš međuspremnik. Ništa nije poslano AI usluzi.');
      } catch {
        copyGuidanceStatus.textContent = text('Copy is unavailable here. Use the download link above; no information was sent.', 'Kopiranje ovdje nije dostupno. Upotrijebite poveznicu za preuzimanje; ništa nije poslano.');
      } finally {
        copyGuidanceButton.disabled = false;
      }
    });
  }

  Promise.allSettled([
    fetchPublicJson('/data/assistant-knowledge.json'),
    fetchPublicJson('/ai-visibility/facts.json'),
    fetchPublicJson('/ai/assistant-reference-openapi.json'),
    fetchPublicJson('/ai-visibility/source-history.json'),
  ]).then(([referenceResult, factsResult, openApiResult, historyResult]) => {
    const reference = referenceResult.status === 'fulfilled' ? referenceResult.value : null;
    const factsData = factsResult.status === 'fulfilled' ? factsResult.value : null;
    const openApi = openApiResult.status === 'fulfilled' ? openApiResult.value : null;
    const history = historyResult.status === 'fulfilled' ? historyResult.value : null;
    if (reference && factsData && openApi) renderCounts(reference, factsData, openApi);
    if (factsData) {
      renderFacts(factsData);
      renderReviewStatus(factsData.reviewedAt);
    }
    if (history) renderReviewHistory(history);
    const dataStatus = document.querySelector('[data-ai-data-status]');
    if (dataStatus && (!factsData || !history)) {
      dataStatus.textContent = text(
        'Some live counts or review-history details are temporarily unavailable. Public files are linked below; no external AI request was made.',
        'Neke brojke ili pojedinosti povijesti pregleda trenutačno nisu dostupne. Javne datoteke povezane su niže; nije poslan vanjski AI zahtjev.',
      );
    }
  });
})();
