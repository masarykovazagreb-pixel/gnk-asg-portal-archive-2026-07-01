(() => {
  'use strict';
  const go = event => {
    const link = event.target.closest('[data-protected-route],[data-admin-route]');
    if (!link) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    location.assign(link.getAttribute('data-protected-route') || link.getAttribute('data-admin-route') || '/operator-dashboard/');
  };
  document.addEventListener('click', go);
  document.addEventListener('keydown', go);
})();
