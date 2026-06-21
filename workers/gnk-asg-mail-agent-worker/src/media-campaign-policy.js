export const MEDIA_CAMPAIGN_LIMITS = Object.freeze({
  maxRecipientsPerBatch: 100,
  maxSendPerMinute: 10,
  requireOperatorToken: true,
  requirePdfAttachment: true,
  allowPauseResume: true,
  trackStatuses: ['queued', 'sent', 'tested', 'failed', 'remaining', 'paused']
});

export function normaliseMediaRecipient(row = {}) {
  return {
    firstName: clean(row.firstName || row.ime),
    lastName: clean(row.lastName || row.prezime),
    media: clean(row.media || row.medij || row.company),
    email: clean(row.email || row.eMail || row.mail).toLowerCase()
  };
}

export function recipientDisplayName(recipient) {
  const name = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim();
  return name || recipient.media || recipient.email;
}

export function validateMediaRecipient(recipient) {
  if (!recipient.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient.email)) {
    return 'invalid_email';
  }
  if (!recipient.media) return 'missing_media';
  return '';
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
