'use strict';

const LANGUAGE_KEY = 'gnk_asg_language';
const AUDIT_ORIGIN = 'http://127.0.0.1:4173';

/**
 * Prepare the shared Lighthouse browser before each audited URL.
 *
 * The portal intentionally redirects a first-time visitor with no stored
 * preference to an available English alternate. Lighthouse does not expose
 * navigator.webdriver as true, so Chrome locale flags alone do not suppress
 * that visitor redirect. Seed the explicit Croatian preference on the local
 * audit origin and keep storage between Lighthouse navigations.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string}} context
 */
module.exports = async (browser, context) => {
  const target = new URL(context.url);
  if (target.origin !== AUDIT_ORIGIN) {
    throw new Error(`LHCI language preparation refused unexpected origin: ${target.origin}`);
  }

  const page = await browser.newPage();
  try {
    await page.goto(`${AUDIT_ORIGIN}/robots.txt`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.evaluate((key) => {
      window.localStorage.setItem(key, 'hr');
    }, LANGUAGE_KEY);
  } finally {
    await page.close();
  }
};
