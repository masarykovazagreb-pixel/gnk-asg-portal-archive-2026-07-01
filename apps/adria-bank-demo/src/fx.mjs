export const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
export const CBK_FOREX_URL = 'https://www.centralbank.go.ke/forex/';
export const ECB_FALLBACK_DATE = '2026-10-09';
export const CBK_FALLBACK_DATE = '2026-10-09';
export const CBK_FALLBACK_KES_PER_EUR = 145.92;

// Bundled fallback copied from the ECB's 9 October 2026 daily reference table.
// Values are units of foreign currency for EUR 1; these are not executable quotes.
export const ECB_FALLBACK_RATES_PER_EUR = Object.freeze({
  USD: 1.1206, JPY: 177.34, CZK: 24.369, DKK: 7.4751, GBP: 0.84763,
  HUF: 365.08, PLN: 4.3835, RON: 5.3406, SEK: 11.1675, CHF: 0.9313,
  ISK: 136.80, NOK: 10.7155, TRY: 55.1033, AUD: 1.6052, BRL: 5.6086,
  CAD: 1.5942, CNY: 7.4992, HKD: 8.7940, IDR: 20036.94, ILS: 3.4260,
  INR: 108.3965, KRW: 1503.27, MXN: 20.3950, MYR: 4.5777, NZD: 1.9961,
  PHP: 70.397, SGD: 1.4348, THB: 37.574, ZAR: 18.5270
});

function parseAttributes(raw) {
  return Object.fromEntries([...raw.matchAll(/([A-Za-z][\w.-]*)\s*=\s*(["'])(.*?)\2/g)].map(([, key, , value]) => [key, value]));
}

export function parseEcbDailyReference(xml) {
  if (typeof xml !== 'string' || xml.length < 40 || xml.length > 1_000_000) {
    throw new Error('ECB response is missing or outside the expected size.');
  }
  const rates = { EUR: 1 };
  let date = '';
  for (const match of xml.matchAll(/<(?:[A-Za-z][\w.-]*:)?Cube\b([^>]*)\/?>/g)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.time && /^\d{4}-\d{2}-\d{2}$/.test(attributes.time)) date = attributes.time;
    if (!attributes.currency || !attributes.rate) continue;
    const code = attributes.currency.toUpperCase();
    const rate = Number(attributes.rate);
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) rates[code] = rate;
  }
  if (!date || !rates.USD || Object.keys(rates).length < 10) {
    throw new Error('ECB response did not contain a valid daily reference table.');
  }
  return { date, rates, source: ECB_DAILY_URL };
}

export function parseCbkDailyReference(html) {
  if (typeof html !== 'string' || html.length < 100 || html.length > 5_000_000) {
    throw new Error('CBK response is missing or outside the expected size.');
  }
  const plain = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');
  const headingIndex = plain.toLowerCase().lastIndexOf('daily kes exchange rates');
  const section = headingIndex >= 0 ? plain.slice(headingIndex) : plain;
  const posted = [...section.matchAll(/posted\s*on\s*:?\s*(\d{1,2})[-\x2f](\d{1,2})[-\x2f](\d{4})/gi)].at(-1);
  const date = posted ? `${posted[3]}-${String(posted[2]).padStart(2, '0')}-${String(posted[1]).padStart(2, '0')}` : '';
  const euroMatch = [...section.matchAll(/(?:\bEURO\b|\bEUR\b)[^\d]{0,45}(\d{2,3}(?:,\d{3})?(?:\.\d+)?)/gi)].at(-1);
  const kesPerEur = euroMatch ? Number(euroMatch[1].replaceAll(',', '')) : NaN;
  if (!date || !Number.isFinite(kesPerEur) || kesPerEur <= 0) {
    throw new Error('CBK response did not contain a dated EUR/KES reference rate.');
  }
  return { date, kesPerEur, source: CBK_FOREX_URL };
}
