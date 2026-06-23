(() => {
  'use strict';
  const upgrade = root => {
    root.querySelectorAll?.('a[href="/operator-dashboard/"],a[href="/operator-dashboard"]').forEach(link => {
      link.href = '/admin-center/';
      link.dataset.gnkAdminCenter = '1';
    });
  };
  upgrade(document);
  document.addEventListener('DOMContentLoaded', () => upgrade(document), { once: true });
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) upgrade(node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();