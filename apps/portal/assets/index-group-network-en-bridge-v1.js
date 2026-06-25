(() => {
  'use strict';
  const section = document.getElementById('group-network');
  if (!section || document.getElementById('mreza-grupe')) return;
  const anchor = document.createElement('span');
  anchor.id = 'group-network';
  anchor.setAttribute('aria-hidden','true');
  anchor.style.cssText = 'display:block;position:relative;top:-90px;height:0;visibility:hidden;pointer-events:none';
  section.before(anchor);
  section.id = 'mreza-grupe';
})();
