const BINDING_PATTERNS = [
  /potpisan(?:a|o|i)?\s+(?:je\s+)?(?:ugovor|sporazum)/iu,
  /odobren(?:a|o|i)?\s+(?:je\s+)?(?:isplata|kredit|proračun)/iu,
  /isplaćen(?:a|o|i)?/iu,
  /pravomoćn(?:a|o|i)?/iu,
  /konačn(?:a|o|i)?\s+odluka/iu
];

const FINANCIAL_PATTERN = /(?:€|eur|eura|kn|kuna|milijun|tisuć|prihod|dobit|trošak|budžet|kredit|dug|likvidnost)/iu;
const UNSOURCED_CERTAINTY = /\b(?:sigurno|definitivno|nesporno|zajamčeno|bez rizika)\b/iu;

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('hr-HR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function overlapScore(a, b) {
  const left = new Set(normalize(a).split(' ').filter((token) => token.length > 3));
  const right = new Set(normalize(b).split(' ').filter((token) => token.length > 3));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

function classifyDraft(draft, cycle) {
  const findings = [];
  const text = `${draft.title ?? ''} ${draft.body ?? ''}`;
  const relatedComment = cycle.comments?.find((comment) => normalize(comment.text) === normalize(draft.body));

  if (draft.status !== 'DRAFT_ONLY' || draft.public !== false || draft.publishAt !== null) {
    findings.push({ code: 'PUBLICATION_CONTROL_BROKEN', severity: 'critical', message: 'Stavka nije strogo privatni DRAFT_ONLY.' });
  }

  if (BINDING_PATTERNS.some((pattern) => pattern.test(text))) {
    findings.push({ code: 'BINDING_CLAIM', severity: 'high', message: 'Tekst zvuči kao obvezujuća ili izvršena korporativna radnja.' });
  }

  if (FINANCIAL_PATTERN.test(text) && !/\b(?:ACTUAL|COMMITTED|FORECAST|SIMULATED)\b/u.test(text)) {
    findings.push({ code: 'FINANCIAL_CLASS_MISSING', severity: 'high', message: 'Financijski navod nema izričitu klasifikaciju.' });
  }

  if (UNSOURCED_CERTAINTY.test(text)) {
    findings.push({ code: 'UNSUPPORTED_CERTAINTY', severity: 'medium', message: 'Formulacija izražava sigurnost veću od dostupnih dokaza.' });
  }

  if (relatedComment && (!Array.isArray(relatedComment.evidenceRefs) || relatedComment.evidenceRefs.length === 0)) {
    findings.push({ code: 'EVIDENCE_MISSING', severity: 'high', message: 'Komentar nema dokaznu referencu.' });
  }

  const informational = ['plan', 'bilten', 'projekti', 'rizici', 'misljenja', 'ovisnosti', 'zadaci', 'krediti', 'newsroom', 'workeri', 'zapisnik'];
  if (!informational.includes(draft.tab)) {
    findings.push({ code: 'UNKNOWN_TAB', severity: 'medium', message: `Nepoznat ciljni tab: ${draft.tab}` });
  }

  return findings;
}

export function reviewCycle(cycle, previousCycles = []) {
  const items = [];
  const priorDrafts = previousCycles.flatMap((item) => item.drafts ?? []);

  for (const draft of cycle.drafts ?? []) {
    const findings = classifyDraft(draft, cycle);
    const closest = priorDrafts
      .map((prior) => ({ id: prior.id, score: overlapScore(`${draft.title} ${draft.body}`, `${prior.title} ${prior.body}`) }))
      .sort((a, b) => b.score - a.score)[0];

    if (closest?.score >= 0.72) {
      findings.push({
        code: 'NEAR_DUPLICATE',
        severity: closest.score >= 0.88 ? 'high' : 'medium',
        message: `Sadržajno previše slično ranijem draftu (${Math.round(closest.score * 100)}%).`,
        relatedId: closest.id
      });
    }

    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    const highest = findings.reduce((max, finding) => Math.max(max, rank[finding.severity] ?? 0), 0);
    const decision = highest >= 4 ? 'REJECT' : highest >= 3 ? 'HOLD' : highest >= 2 ? 'REVISE' : 'PASS_INTERNAL';

    items.push({ draftId: draft.id, tab: draft.tab, decision, findings });
  }

  const counts = items.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] ?? 0) + 1;
    return acc;
  }, {});

  return {
    schemaVersion: 'offline-workforce-review/v1',
    mode: 'OFFLINE',
    date: cycle.date,
    publicReleaseAllowed: false,
    reviewedItems: items,
    counts,
    passed: items.every((item) => item.decision !== 'REJECT'),
    controls: {
      humanApprovalRequired: true,
      productionWriteAllowed: false,
      publicPublishingAllowed: false
    }
  };
}
