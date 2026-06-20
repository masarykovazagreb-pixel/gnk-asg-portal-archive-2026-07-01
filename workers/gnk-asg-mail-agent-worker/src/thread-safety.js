export const HOLD_CATEGORIES = Object.freeze([
  'legal',
  'contract',
  'financial_commitment',
  'payment_instruction',
  'complaint_or_claim',
  'personal_data_request',
  'security_incident',
  'media_statement',
  'employment',
  'government_or_court',
  'reputation'
]);

export function mustHoldForApproval(decision = {}) {
  if (decision.autoSend === false) return true;
  if (decision.risk === 'high') return true;
  return HOLD_CATEGORIES.includes(String(decision.category || '').toLowerCase());
}

export function preserveThreadHeaders(mail = {}) {
  return {
    sourceMessageId: mail.messageId || '',
    inReplyTo: mail.messageId || mail.inReplyTo || '',
    references: [mail.references, mail.messageId].filter(Boolean).join(' ').trim()
  };
}
