(() => {
  if (window.__GNK_MEDIA_CAMPAIGN_PDF_UPLOAD__) return;
  window.__GNK_MEDIA_CAMPAIGN_PDF_UPLOAD__ = true;

  // PDF upload is handled by media-campaign-studio.js through the shared
  // session-only operator vault. This compatibility module intentionally
  // performs no token reads, no storage writes and no duplicate upload.
})();
