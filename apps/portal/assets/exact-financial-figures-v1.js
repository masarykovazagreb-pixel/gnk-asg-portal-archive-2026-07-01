(() => {
  'use strict';
  if (window.__GNK_ASG_EXACT_FINANCIAL_FIGURES_V1__) return;
  window.__GNK_ASG_EXACT_FINANCIAL_FIGURES_V1__ = true;
  const exact = new Map([
    ['504,00 mil. €', '504.' + '000.' + '000,00 €'],
    ['46,40 mil. €', '46.' + '400.' + '000,00 €'],
    ['46,21 mil. €', '46.' + '210.' + '000,00 €'],
    ['4,7046 mlrd. €', '4.' + '704.' + '600.' + '000,00 €'],
    ['3,4830 mlrd. €', '3.' + '483.' + '000.' + '000,00 €'],
    ['982,48 mil. €', '982.' + '480.' + '000,00 €'],
    ['€4.70B', '€4.' + '7046B'],
    ['€982.48M', '€982.' + '48M'],
    ['€504M', '€504.' + '00M']
  ]);
  function apply() {
    document.querySelectorAll('strong,.fc-val').forEach(node => {
      const value = node.textContent.trim();
      if (exact.has(value)) node.textContent = exact.get(value);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();