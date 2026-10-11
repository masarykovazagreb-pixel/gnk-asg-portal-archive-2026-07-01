import { ECB_FALLBACK_RATES_PER_EUR } from './fx.mjs';

export const STORE_KEY = 'adria-bank-demo.v1';
export const SCHEMA_VERSION = 8;
export const DEMO_BRAND = 'DEMO DESKTOP ADRIA BANK';
export const FX_SPREAD = 0.0035;
export const CRYPTO_SPREAD = 0.009;

export const COMPANY_PUBLIC_ADDRESS = Object.freeze({
  street: '1942 Broadway, Ste 314C', city: 'Boulder', region: 'Colorado', postalCode: '80302',
  country: 'United States', countryCode: 'US', currency: 'USD', language: 'en',
  status: 'public_listing_only', sourceNames: ['GNK DINAMO Ltd. website', 'FINA Info.BIZ'],
  sourceUrls: ['https://gnkdinamo.eu/', 'https://infobiz.fina.hr/tvrtka/gnk-dinamo-ltd/OIB-93063734103'],
  registryVerified: false, incorporationState: null, registeredAgentAddress: null, demoOnly: true
});

const ECB_FX_CURRENCIES = {
  USD: ['US dollar', 2], JPY: ['Japanese yen', 0], CZK: ['Czech koruna', 2], DKK: ['Danish krone', 2],
  GBP: ['Pound sterling', 2], HUF: ['Hungarian forint', 2], PLN: ['Polish złoty', 2], RON: ['Romanian leu', 2],
  SEK: ['Swedish krona', 2], CHF: ['Swiss franc', 2], ISK: ['Icelandic króna', 0], NOK: ['Norwegian krone', 2],
  TRY: ['Turkish lira', 2], AUD: ['Australian dollar', 2], BRL: ['Brazilian real', 2], CAD: ['Canadian dollar', 2],
  CNY: ['Chinese yuan renminbi', 2], HKD: ['Hong Kong dollar', 2], IDR: ['Indonesian rupiah', 2], ILS: ['Israeli new shekel', 2],
  INR: ['Indian rupee', 2], KRW: ['South Korean won', 0], MXN: ['Mexican peso', 2], MYR: ['Malaysian ringgit', 2],
  NZD: ['New Zealand dollar', 2], PHP: ['Philippine peso', 2], SGD: ['Singapore dollar', 2], THB: ['Thai baht', 2],
  ZAR: ['South African rand', 2]
};

export const CURRENCIES = {
  EUR: { name: 'Euro', eurRate: 1, decimals: 2 },
  ...Object.fromEntries(Object.entries(ECB_FX_CURRENCIES).map(([code, [name, decimals]]) => [code, {
    name, eurRate: 1 / ECB_FALLBACK_RATES_PER_EUR[code], decimals, ecbReference: true, referenceSource: 'ECB'
  }])),
  KES: { name: 'Kenyan shilling', eurRate: 1 / 145.92, decimals: 2, referenceSource: 'CBK' },
  AED: { name: 'UAE dirham', eurRate: 1 / (ECB_FALLBACK_RATES_PER_EUR.USD * 3.6725), decimals: 2, referenceSource: 'ECB EUR/USD + USD/AED peg' },
  BTC: { name: 'Bitcoin · offline sample', eurRate: 64280, decimals: 8, crypto: true },
  ETH: { name: 'Ether · offline sample', eurRate: 2485.4, decimals: 6, crypto: true },
  USDC: { name: 'USD Coin · offline simulation', eurRate: 0.9221, decimals: 2, crypto: true },
  GNKC: { name: 'GNK Credit · synthetic demo token', eurRate: 0.18, decimals: 4, crypto: true, demoToken: true },
  SOL: { name: 'Solana · offline sample', eurRate: 142.5, decimals: 8, crypto: true },
  LTC: { name: 'Litecoin · offline sample', eurRate: 64.2, decimals: 8, crypto: true },
  ADA: { name: 'Cardano · offline sample', eurRate: 0.43, decimals: 6, crypto: true },
  DOGE: { name: 'Dogecoin · offline sample', eurRate: 0.12, decimals: 4, crypto: true },
  KPW: { name: 'North Korean won · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false },
  IRR: { name: 'Iranian rial · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false },
  MMK: { name: 'Myanmar kyat · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false },
  LBP: { name: 'Lebanese pound · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false },
  VES: { name: 'Venezuelan bolívar · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false },
  CUP: { name: 'Cuban peso · no demo reference', decimals: 2, noEurReference: true, exchangeEnabled: false }
};

const BRANCH_SEEDS = [
  { id: 'BR-001', name: 'Zagreb · Jurišićeva', city: 'Zagreb', code: 'ZG01', manager: 'Maja Kovač', open: '08:00–18:00', cashCents: 48250000, tellers: 5 },
  { id: 'BR-002', name: 'Zagreb · Trešnjevka', city: 'Zagreb', code: 'ZG02', manager: 'Ivan Horvat', open: '08:00–17:00', cashCents: 31680000, tellers: 4 },
  { id: 'BR-003', name: 'Split · Marmontova', city: 'Split', code: 'ST01', manager: 'Lana Vuković', open: '08:00–17:00', cashCents: 28740000, tellers: 4 },
  { id: 'BR-004', name: 'Rijeka · Korzo', city: 'Rijeka', code: 'RI01', manager: 'Dino Jurić', open: '08:00–17:00', cashCents: 22190000, tellers: 3 },
  { id: 'BR-005', name: 'Osijek · Europska avenija', city: 'Osijek', code: 'OS01', manager: 'Petra Marić', open: '08:00–16:00', cashCents: 18360000, tellers: 3 },
  { id: 'BR-006', name: 'Dubrovnik · Stradun', city: 'Dubrovnik', code: 'DU01', manager: 'Niko Babić', open: '08:00–16:00', cashCents: 17420000, tellers: 2 }
].map(branch => ({ ...branch, country: 'Croatia', countryCode: 'HR', currency: 'EUR', language: 'hr', demoOnly: true }));

export const PLANNED_MARKETS = [
  { id: 'MKT-001', city: 'Zagreb', country: 'Croatia', countryCode: 'HR', currency: 'EUR', flag: '🇭🇷', market: 'Home-market concept', language: 'hr', regulator: 'HNB · Hanfa (service dependent)', authorityUrl: 'https://www.hnb.hr/en', phase: 'Licensing scoping' },
  { id: 'MKT-002', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', currency: 'EUR', flag: '🇩🇪', market: 'EU banking-union hub', language: 'de', regulator: 'ECB · BaFin · Bundesbank', authorityUrl: 'https://www.bafin.de/EN/Homepage/homepage_node.html', phase: 'EU passport assessment' },
  { id: 'MKT-003', city: 'Paris', country: 'France', countryCode: 'FR', currency: 'EUR', flag: '🇫🇷', market: 'Western Europe', language: 'fr', regulator: 'ECB · ACPR · AMF', authorityUrl: 'https://acpr.banque-france.fr/en', phase: 'EU passport assessment' },
  { id: 'MKT-004', city: 'Madrid', country: 'Spain', countryCode: 'ES', currency: 'EUR', flag: '🇪🇸', market: 'Iberian hub', language: 'es', regulator: 'ECB · Banco de España · CNMV', authorityUrl: 'https://www.bde.es/wbe/en/', phase: 'EU passport assessment' },
  { id: 'MKT-005', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', currency: 'CHF', flag: '🇨🇭', market: 'Swiss market concept', language: 'de', regulator: 'FINMA', authorityUrl: 'https://www.finma.ch/en/authorisation/banks-and-securities-firms/getting-licensed/banks/', phase: 'Independent licence review' },
  { id: 'MKT-006', city: 'London', country: 'United Kingdom', countryCode: 'GB', currency: 'GBP', flag: '🇬🇧', market: 'UK market concept', language: 'en', regulator: 'PRA · FCA', authorityUrl: 'https://www.fca.org.uk/firms/authorisation/when-required/banks-credit-unions-insurance', phase: 'Independent licence review' },
  { id: 'MKT-007', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', currency: 'KES', flag: '🇰🇪', market: 'East Africa concept', language: 'sw', regulator: 'Central Bank of Kenya', authorityUrl: 'https://www.centralbank.go.ke/', phase: 'Local-perimeter review' },
  { id: 'MKT-008', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', currency: 'AED', flag: '🇦🇪', market: 'Gulf market concept', language: 'ar', regulator: 'CBUAE · perimeter-specific authorities', authorityUrl: 'https://centralbank.ae/en/licensing/', phase: 'Local-perimeter review' },
  { id: 'MKT-009', city: 'Tokyo', country: 'Japan', countryCode: 'JP', currency: 'JPY', flag: '🇯🇵', market: 'Japan market concept', language: 'ja', regulator: 'JFSA · Local Finance Bureau', authorityUrl: 'https://www.fsa.go.jp/en/', phase: 'Local-perimeter review' },
  { id: 'MKT-010', city: 'Singapore', country: 'Singapore', countryCode: 'SG', currency: 'SGD', flag: '🇸🇬', market: 'Southeast Asia concept', language: 'zh', regulator: 'Monetary Authority of Singapore', authorityUrl: 'https://www.mas.gov.sg/', phase: 'Local-perimeter review' }
].map(market => ({ ...market, status: 'planning_only', premisesOpened: false, authorisationGranted: false, demoOnly: true }));

const FIRST_NAMES = ['Luka', 'Mia', 'Noa', 'Ema', 'David', 'Nika', 'Jakov', 'Sara', 'Petar', 'Lucija', 'Ivan', 'Lea', 'Filip', 'Ana', 'Marko', 'Iva', 'Leo', 'Marta', 'Karlo', 'Eva', 'Amir', 'Elena', 'Matej', 'Tara', 'Nikola', 'Mila', 'Roko', 'Dora', 'Lovro', 'Klara', 'Hana', 'Vito', 'Tea', 'Niko', 'Maja', 'Adrian', 'Lana', 'Tin', 'Nora', 'Elias'];
const LAST_NAMES = ['Kovač', 'Horvat', 'Babić', 'Marić', 'Novak', 'Jurić', 'Knežević', 'Božić', 'Vuković', 'Grgić', 'Perić', 'Radić', 'Matić', 'Pavić', 'Šimić', 'Kralj', 'Tomić', 'Filipović', 'Marković', 'Lovrić', 'Barišić', 'Vidović', 'Petrović', 'Šarić', 'Klarić', 'Soldo', 'Milić', 'Rukavina', 'Šegvić', 'Blažević'];
const COMPANIES = ['Jadran Studio', 'Plavi Val d.o.o.', 'Northstar Design', 'Maslina Market', 'Nova Luka Logistics', 'Orion Systems', 'Kamen & More', 'Adria Atelier', 'Bright Path Labs', 'Zeleni Kutak', 'Marea Travel', 'Urban Forma'];
const CITY_DATA = [
  ['Zagreb', 'HR', 'EUR'], ['Split', 'HR', 'EUR'], ['Rijeka', 'HR', 'EUR'], ['Osijek', 'HR', 'EUR'], ['Dubrovnik', 'HR', 'EUR'],
  ['Varaždin', 'HR', 'EUR'], ['Pula', 'HR', 'EUR'], ['Zadar', 'HR', 'EUR'], ['Ljubljana', 'SI', 'EUR'], ['Graz', 'AT', 'EUR'],
  ['München', 'DE', 'EUR'], ['Milano', 'IT', 'EUR'], ['Paris', 'FR', 'EUR'], ['Tokyo', 'JP', 'JPY'], ['Nairobi', 'KE', 'KES'], ['London', 'GB', 'GBP']
];
const TX_TYPES = [
  ['card_purchase', 'Card purchase', 'Card'], ['sepa_in', 'SEPA credit transfer', 'SEPA'], ['sepa_out', 'SEPA credit transfer', 'SEPA'],
  ['salary', 'Salary payment', 'SEPA'], ['utility', 'Utility bill', 'Standing order'], ['cash_in', 'Cash deposit', 'Branch'],
  ['cash_out', 'Cash withdrawal', 'Branch'], ['atm', 'ATM cash withdrawal', 'ATM'], ['internal', 'Internal transfer', 'Mobile'],
  ['subscription', 'Subscription', 'Card'], ['merchant', 'Merchant settlement', 'Business'], ['fee', 'Service fee', 'Core banking'],
  ['refund', 'Card refund', 'Card'], ['standing', 'Standing order', 'Standing order']
];
const COUNTERPARTIES = ['City Utilities', 'Harbour Foods', 'Northstar Design', 'Green Line Transit', 'Coastal Energy', 'Market Square', 'Lumen Telecom', 'Sunday Market', 'Studio Forma', 'Central Pharmacy', 'Marea Travel', 'Jadran Services', 'Fresh Basket', 'Blue Door Cafe', 'Public Services'];
const DEMO_BANK_SEEDS = [
  { id: 'DB-US-01', name: 'Delaware Atlantic Demo Bank', country: 'United States', countryCode: 'US', currency: 'USD', bic: createDemoBic('US'), authorityUrl: 'https://www.fdic.gov/' },
  { id: 'DB-US-02', name: 'Great Lakes Training Bank', country: 'United States', countryCode: 'US', currency: 'USD', bic: createDemoBic('US'), authorityUrl: 'https://www.fdic.gov/' },
  { id: 'DB-HR-01', name: 'Adria Local Simulator', country: 'Croatia', countryCode: 'HR', currency: 'EUR', bic: createDemoBic('HR'), authorityUrl: 'https://www.hnb.hr/en' },
  { id: 'DB-DE-01', name: 'Rhine Sample Bank', country: 'Germany', countryCode: 'DE', currency: 'EUR', bic: createDemoBic('DE'), authorityUrl: 'https://www.bafin.de/EN/Homepage/homepage_node.html' },
  { id: 'DB-CH-01', name: 'Alpine Practice Bank', country: 'Switzerland', countryCode: 'CH', currency: 'CHF', bic: createDemoBic('CH'), authorityUrl: 'https://www.finma.ch/en/' },
  { id: 'DB-GB-01', name: 'Crown Test Bank', country: 'United Kingdom', countryCode: 'GB', currency: 'GBP', bic: createDemoBic('GB'), authorityUrl: 'https://www.fca.org.uk/' },
  { id: 'DB-KE-01', name: 'Nairobi Sample Bank', country: 'Kenya', countryCode: 'KE', currency: 'KES', bic: createDemoBic('KE'), authorityUrl: 'https://www.centralbank.go.ke/' },
  { id: 'DB-AE-01', name: 'Gulf Training Bank', country: 'United Arab Emirates', countryCode: 'AE', currency: 'AED', bic: createDemoBic('AE'), authorityUrl: 'https://centralbank.ae/en/' },
  { id: 'DB-JP-01', name: 'Tokyo Sandbox Bank', country: 'Japan', countryCode: 'JP', currency: 'JPY', bic: createDemoBic('JP'), authorityUrl: 'https://www.fsa.go.jp/en/' },
  { id: 'DB-SG-01', name: 'Meridian Learning Bank', country: 'Singapore', countryCode: 'SG', currency: 'SGD', bic: createDemoBic('SG'), authorityUrl: 'https://www.mas.gov.sg/' }
].map(bank => ({ ...bank, status: 'fictional_demo_directory', networkConnected: false, licensed: false, demoOnly: true }));
const AML_RULES = [
  ['velocity', 'Unusual transaction velocity', 'high'], ['cash_pattern', 'Repeated cash activity — review context', 'medium'],
  ['profile_mismatch', 'Activity differs from expected profile', 'high'], ['cross_border', 'Cross-border activity — enhanced review', 'medium'],
  ['new_payee', 'New beneficiary and elevated value', 'medium'], ['pep_refresh', 'Periodic PEP-screening review due', 'low'],
  ['threshold', 'Multiple near-threshold movements', 'high'], ['crypto_origin', 'Crypto on/off-ramp — source-of-funds review', 'high']
];

function seededRandom(seed = 73021) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
function pad(n, length = 4) { return String(n).padStart(length, '0'); }

const IBAN_BBAN_LENGTHS = Object.freeze({ HR: 17, SI: 15, AT: 16, DE: 18, FR: 23, ES: 20, IT: 23, GB: 18, CH: 17, CZ: 20, DK: 14, HU: 24, PL: 24, RO: 20, SE: 20, NO: 11, IS: 22, PT: 21, NL: 14, BE: 12, LU: 16, IE: 18, GR: 23, CY: 24, MT: 27, EE: 16, LV: 17, LT: 16, SK: 20, FI: 14, AE: 19 });
export const IBAN_TOTAL_LENGTHS = Object.freeze(Object.fromEntries(Object.entries(IBAN_BBAN_LENGTHS).map(([country, length]) => [country, length + 4])));
const IBAN_BBAN_PATTERNS = Object.freeze({
  HR: /^\d{17}$/, SI: /^\d{15}$/, AT: /^\d{16}$/, DE: /^\d{18}$/,
  FR: /^\d{10}[A-Z0-9]{11}\d{2}$/, ES: /^\d{20}$/, IT: /^[A-Z]\d{10}[A-Z0-9]{12}$/,
  GB: /^[A-Z]{4}\d{14}$/, CH: /^\d{17}$/, CZ: /^\d{20}$/, DK: /^\d{14}$/,
  HU: /^\d{24}$/, PL: /^\d{24}$/, RO: /^[A-Z]{4}\d{16}$/, SE: /^\d{20}$/,
  NO: /^\d{11}$/, IS: /^\d{22}$/, PT: /^\d{21}$/, NL: /^[A-Z]{4}\d{10}$/,
  BE: /^\d{12}$/, LU: /^\d{16}$/, IE: /^[A-Z]{4}\d{14}$/, GR: /^\d{23}$/,
  CY: /^\d{24}$/, MT: /^[A-Z]{4}\d{5}[A-Z0-9]{18}$/, EE: /^\d{16}$/,
  LV: /^[A-Z]{4}\d{13}$/, LT: /^\d{16}$/, SK: /^\d{20}$/, FI: /^\d{14}$/, AE: /^\d{19}$/
});
const DOMESTIC_ACCOUNT_COUNTRIES = new Set(['US', 'KE', 'JP', 'SG']);

function numericMod97(value) {
  let remainder = 0;
  for (const character of String(value).toUpperCase()) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

export function ibanMod97(iban) {
  const value = String(iban || '').replaceAll(' ', '').toUpperCase();
  return value.length < 5 ? NaN : numericMod97(`${value.slice(4)}${value.slice(0, 4)}`);
}

function maskedReference(value, prefixLength = 2, suffixLength = 4) {
  const normalized = String(value || '').replace(/\s/g, '').toUpperCase();
  if (!normalized) return '';
  const visiblePrefix = normalized.slice(0, Math.min(prefixLength, Math.max(0, normalized.length - suffixLength)));
  const visibleSuffix = normalized.slice(-Math.min(suffixLength, normalized.length));
  return `${visiblePrefix}${'•'.repeat(Math.max(3, normalized.length - visiblePrefix.length - visibleSuffix.length))}${visibleSuffix}`;
}

export function validateIban(input) {
  const raw = String(input ?? '').trim();
  const normalized = raw.replace(/\s/g, '').toUpperCase();
  const country = normalized.slice(0, 2);
  const expectedLength = IBAN_TOTAL_LENGTHS[country] || null;
  const masked = maskedReference(normalized, 2, 4);
  const result = { type: 'iban', country: /^[A-Z]{2}$/.test(country) ? country : null, length: normalized.length, expectedLength, masked, valid: false, checksumValid: false, remainder: null, status: 'format_invalid' };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) return result;
  if (!expectedLength) return { ...result, status: 'country_unsupported' };
  if (normalized.length !== expectedLength) return { ...result, status: 'length_invalid' };
  const bban = normalized.slice(4);
  if (!IBAN_BBAN_PATTERNS[country]?.test(bban)) return { ...result, status: 'format_invalid' };
  const remainder = ibanMod97(normalized);
  const checksumValid = remainder === 1;
  return { ...result, valid: checksumValid, checksumValid, remainder, status: checksumValid ? 'format_checksum_only' : 'checksum_invalid' };
}

function luhnValid(number) {
  let sum = 0;
  let doubleDigit = false;
  for (let index = number.length - 1; index >= 0; index--) {
    let digit = Number(number[index]);
    if (doubleDigit) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(input) {
  const raw = String(input ?? '').trim();
  const compact = raw.replace(/[\s-]/g, '');
  const digitsOnly = /^\d+$/.test(compact);
  const masked = maskedReference(digitsOnly ? compact : compact.replace(/\D/g, ''), 0, 4);
  const result = { type: 'card_number', length: digitsOnly ? compact.length : compact.replace(/\D/g, '').length, masked, valid: false, luhnValid: false, luhnChecked: false, status: 'format_invalid' };
  if (!digitsOnly) return result;
  if (compact.length < 12 || compact.length > 19) return { ...result, status: 'length_invalid' };
  const checksumValid = luhnValid(compact);
  return { ...result, valid: checksumValid, luhnValid: checksumValid, luhnChecked: true, status: checksumValid ? 'luhn_format_only' : 'checksum_invalid' };
}

export function createDemoIban(countryCode, sequence) {
  const country = String(countryCode || '').toUpperCase();
  const bbanLength = IBAN_BBAN_LENGTHS[country];
  if (!bbanLength || DOMESTIC_ACCOUNT_COUNTRIES.has(country)) return null;
  const serial = String(Math.max(1, Number(sequence) || 1)).padStart(bbanLength, '0').slice(-bbanLength);
  // Italy's BBAN begins with a CIN letter. Other demo BBANs use safe numeric filler.
  const bban = country === 'IT' ? `Z${serial.slice(1)}` : serial;
  const validCheckDigits = String(98 - numericMod97(`${bban}${country}00`)).padStart(2, '0');
  // 00 is congruent to the valid check value 97 modulo 97, so avoid it in that case.
  const deliberatelyInvalid = validCheckDigits === '97' ? '01' : '00';
  return `${country}${deliberatelyInvalid}${bban}`;
}

export function createDemoBic(countryCode) {
  const country = String(countryCode || 'HR').toUpperCase();
  return `DEMO${/^[A-Z]{2}$/.test(country) ? country : 'ZZ'}2XXXX`;
}

function accountIdentifiers(countryCode, sequence) {
  const country = String(countryCode || 'HR').toUpperCase();
  const iban = createDemoIban(country, sequence);
  return {
    countryCode: country,
    iban,
    bic: createDemoBic(country),
    identifierKind: iban ? 'invalid_demo_iban' : 'domestic_demo_account_number',
    routingReady: false,
    demoOnly: true
  };
}
function isoDaysAgo(days, hour = 12, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
function randomName(rng, index, business = false) {
  if (business) return COMPANIES[(index / 11 | 0) % COMPANIES.length] + (index > 30 ? ` ${pad(index, 2)}` : '');
  return `${FIRST_NAMES[(index * 7 + Math.floor(rng() * FIRST_NAMES.length)) % FIRST_NAMES.length]} ${LAST_NAMES[(index * 13 + Math.floor(rng() * LAST_NAMES.length)) % LAST_NAMES.length]}`;
}
function percentCents(cents, pct) { return Math.round(cents * pct); }
function makeGlAccounts(state) {
  const demand = state.accounts.reduce((sum, account) => {
    const rate = CURRENCIES[account.currency]?.eurRate;
    return Number.isFinite(rate) && rate > 0 ? sum + Math.round(account.balanceCents * rate) : sum;
  }, 0);
  const term = state.deposits.reduce((sum, deposit) => sum + deposit.principalCents, 0);
  const vault = state.branches.reduce((sum, branch) => sum + branch.cashCents, 0);
  const atm = state.atms.reduce((sum, machine) => sum + machine.cashCents, 0);
  const digitalAssetLiabilities = (state.wallets || []).reduce((sum, wallet) => sum + (wallet.bookCents || 0), 0);
  const prepaidCardLiabilities = (state.cards || []).reduce((sum, card) => sum + (card.fundingType === 'prepaid' ? Math.max(0, Number(card.prepaidBalanceCents) || 0) : 0), 0);
  const loanBook = (state.loans || []).filter(loan => ['performing', 'arrears'].includes(loan.status)).reduce((sum, loan) => sum + loan.outstandingCents, 0);
  const nostroEurCents = (state.bankAccounts || []).filter(account => account.glCode === '1200').reduce((sum, account) => {
    const rate = CURRENCIES[account.currency]?.eurRate;
    return Number.isFinite(rate) && rate > 0 ? sum + Math.round(account.balanceCents * rate) : sum;
  }, 0);
  const settlementEurCents = (state.bankAccounts || []).filter(account => account.glCode === '1300').reduce((sum, account) => {
    const rate = CURRENCIES[account.currency]?.eurRate;
    return Number.isFinite(rate) && rate > 0 ? sum + Math.round(account.balanceCents * rate) : sum;
  }, 0);
  const assets = [18000000000, vault, atm, loanBook, nostroEurCents, settlementEurCents];
  const assetTotal = assets.reduce((sum, value) => sum + value, 0);
  const liabilities = demand + term + 42750000 + digitalAssetLiabilities + prepaidCardLiabilities;
  const equity = Math.max(1000000, assetTotal - liabilities);
  return [
    { code: '1000', name: 'Central bank reserves', group: 'asset', normal: 'debit', balanceCents: assets[0] },
    { code: '1010', name: 'Branch vault cash', group: 'asset', normal: 'debit', balanceCents: assets[1] },
    { code: '1020', name: 'ATM cash', group: 'asset', normal: 'debit', balanceCents: assets[2] },
    { code: '1100', name: 'Customer loan book', group: 'asset', normal: 'debit', balanceCents: assets[3] },
    { code: '1200', name: 'SWIFT / nostro position', group: 'asset', normal: 'debit', balanceCents: assets[4] },
    { code: '1300', name: 'Domestic settlement position', group: 'asset', normal: 'debit', balanceCents: assets[5] },
    { code: '2000', name: 'Customer current-account deposits', group: 'liability', normal: 'credit', balanceCents: demand },
    { code: '2010', name: 'Customer term deposits', group: 'liability', normal: 'credit', balanceCents: term },
    { code: '2020', name: 'Payment clearing / suspense', group: 'liability', normal: 'credit', balanceCents: 42750000 },
    { code: '2030', name: 'Synthetic prepaid-card stored-value liabilities', group: 'liability', normal: 'credit', balanceCents: prepaidCardLiabilities },
    { code: '2300', name: 'FX and digital-asset customer liabilities', group: 'liability', normal: 'credit', balanceCents: digitalAssetLiabilities },
    { code: '3000', name: 'Share capital and retained earnings', group: 'equity', normal: 'credit', balanceCents: equity },
    { code: '4000', name: 'FX / service income', group: 'income', normal: 'credit', balanceCents: 0 },
    { code: '4100', name: 'Interest income from loans', group: 'income', normal: 'credit', balanceCents: 0 },
    { code: '5000', name: 'Interest expense', group: 'expense', normal: 'debit', balanceCents: 0 }
  ];
}

export function createDemoState() {
  const rng = seededRandom();
  const branches = BRANCH_SEEDS.map(branch => ({ ...branch, country: 'Croatia', countryCode: 'HR', currency: 'EUR', language: 'hr', marketStatus: 'synthetic_domestic_branch_concept', demoOnly: true }));
  const customers = [];
  for (let i = 1; i <= 1000; i++) {
    const isBusiness = i % 11 === 0;
    const [city, country, currency] = CITY_DATA[(i * 7 + Math.floor(rng() * CITY_DATA.length)) % CITY_DATA.length];
    const risk = i % 17 === 0 ? 'high' : i % 7 === 0 ? 'medium' : 'low';
    const kyc = i % 19 === 0 ? 'expired' : i % 13 === 0 ? 'pending' : 'verified';
    customers.push({
      id: `C-2026-${pad(i)}`,
      name: randomName(rng, i, isBusiness),
      kind: isBusiness ? 'business' : 'personal',
      city,
      country,
      segment: isBusiness ? 'Business' : i % 5 === 0 ? 'Premium' : 'Everyday',
      risk,
      kyc,
      pep: i % 29 === 0,
      joinedAt: isoDaysAgo(140 + Math.floor(rng() * 1500), 11),
      email: `demo.customer.${pad(i)}@adria.invalid`,
      phone: `+385 1 555 ${pad(100 + i, 4)}`,
      occupation: isBusiness ? 'Registered business (synthetic)' : pick(rng, ['Engineer', 'Teacher', 'Designer', 'Healthcare professional', 'Consultant', 'Student', 'Entrepreneur', 'Project manager']),
      sourceOfFunds: pick(rng, ['Salary', 'Business revenue', 'Savings', 'Pension', 'Investment income']),
      expectedMonthlyCents: 80000 + Math.floor(rng() * 620000),
      branchId: branches[(i - 1) % branches.length].id,
      beneficialOwner: isBusiness ? 'Synthetic beneficial owner verified' : null,
      demoOnly: true
    });
  }

  const accounts = [];
  for (const [index, customer] of customers.entries()) {
    const number = accounts.length + 1;
    const start = customer.kind === 'business' ? 840000 + Math.floor(rng() * 1880000) : 155000 + Math.floor(rng() * 980000);
    accounts.push({
      id: `AC-${pad(number, 5)}`, customerId: customer.id, kind: 'current', currency: 'EUR',
      accountNumber: `DEMO-${customer.country}-${pad(number, 10)}`,
      ...accountIdentifiers(customer.country, number), balanceCents: start,
      status: index % 47 === 0 ? 'restricted' : 'active', openedAt: customer.joinedAt,
      label: customer.kind === 'business' ? 'Business current' : 'Personal current', demoOnly: true
    });
    if (customer.kind === 'business' || index % 12 === 5) {
      const secondaryNumber = accounts.length + 1;
      accounts.push({
        id: `AC-${pad(secondaryNumber, 5)}`, customerId: customer.id, kind: 'current', currency: 'EUR',
        accountNumber: `DEMO-${customer.country}-${pad(secondaryNumber, 10)}`,
        ...accountIdentifiers(customer.country, secondaryNumber), balanceCents: 260000 + Math.floor(rng() * 870000),
        status: 'active', openedAt: isoDaysAgo(20 + Math.floor(rng() * 700), 11), label: 'Secondary current', demoOnly: true
      });
    }
  }
  const multiCurrencyCustomers = customers.filter(customer => customer.kyc === 'verified' && accounts.some(account => account.customerId === customer.id && account.currency === 'EUR' && account.status === 'active'));
  const sampleForeignAccounts = [
    ['USD', 3750.25], ['GBP', 420.50], ['CHF', 980.00], ['JPY', 125000], ['PLN', 2600.00], ['SGD', 740.00]
  ];
  sampleForeignAccounts.forEach(([currency, balance], index) => {
    const customer = multiCurrencyCustomers[index];
    if (!customer) return;
    const number = accounts.length + 1;
    accounts.push({
      id: `AC-${pad(number, 5)}`, customerId: customer.id, kind: 'current', currency,
      accountNumber: `DEMO-${customer.country}-${pad(number, 10)}`,
      ...accountIdentifiers(customer.country, number), balanceCents: Math.round(balance * 100),
      status: 'active', openedAt: isoDaysAgo(12 + index), label: `${currency} personal current`, demoOnly: true
    });
  });
  const seededCurrencyCodes = Object.keys(CURRENCIES).filter(code => code !== 'EUR' && !CURRENCIES[code].crypto);
  seededCurrencyCodes.forEach((code, currencyIndex) => {
    for (let sampleIndex = 0; sampleIndex < 3; sampleIndex++) {
      const customer = multiCurrencyCustomers[(currencyIndex * 31 + sampleIndex * 67 + 17) % multiCurrencyCustomers.length];
      if (!customer || accounts.some(account => account.customerId === customer.id && account.currency === code)) continue;
      const number = accounts.length + 1;
      const meta = CURRENCIES[code];
      const nativeMajor = meta.noEurReference
        ? 180000 + currencyIndex * 12500 + sampleIndex * 2500
        : meta.decimals === 0 ? 2800 + currencyIndex * 180 + sampleIndex * 90 : 350 + currencyIndex * 47 + sampleIndex * 23;
      accounts.push({
        id: `AC-${pad(number, 5)}`, customerId: customer.id, kind: 'current', currency: code,
        accountNumber: `DEMO-${customer.country}-${pad(number, 10)}`,
        ...accountIdentifiers(customer.country, number), balanceCents: Math.round(nativeMajor * 100),
        status: 'active', openedAt: isoDaysAgo(6 + currencyIndex + sampleIndex),
        label: `${code} ${customer.kind === 'business' ? 'business' : 'personal'} sample`,
        valuationStatus: meta.noEurReference ? 'native_only_no_reference' : 'indicative_reference_only', demoOnly: true
      });
    }
  });

  const atms = [
    { id: 'ATM-001', name: 'Zagreb · Jurišićeva', branchId: 'BR-001', location: 'Jurišićeva 14, Zagreb', status: 'online', cashCents: 28940000, lastCheck: '07:42', dailyLimitCents: 700000 },
    { id: 'ATM-002', name: 'Zagreb · Trešnjevka', branchId: 'BR-002', location: 'Ozaljska 33, Zagreb', status: 'online', cashCents: 15750000, lastCheck: '07:36', dailyLimitCents: 700000 },
    { id: 'ATM-003', name: 'Split · Marmontova', branchId: 'BR-003', location: 'Marmontova 6, Split', status: 'online', cashCents: 13400000, lastCheck: '07:22', dailyLimitCents: 700000 },
    { id: 'ATM-004', name: 'Rijeka · Korzo', branchId: 'BR-004', location: 'Korzo 18, Rijeka', status: 'low', cashCents: 3820000, lastCheck: '06:58', dailyLimitCents: 700000 },
    { id: 'ATM-005', name: 'Osijek · Europska', branchId: 'BR-005', location: 'Europska avenija 3, Osijek', status: 'online', cashCents: 9750000, lastCheck: '07:18', dailyLimitCents: 700000 },
    { id: 'ATM-006', name: 'Dubrovnik · Stradun', branchId: 'BR-006', location: 'Stradun 21, Dubrovnik', status: 'maintenance', cashCents: 0, lastCheck: '06:15', dailyLimitCents: 700000 },
    { id: 'ATM-007', name: 'Zagreb · Glavni kolodvor', branchId: 'BR-001', location: 'Trg kralja Tomislava 12, Zagreb', status: 'online', cashCents: 21750000, lastCheck: '07:51', dailyLimitCents: 700000 },
    { id: 'ATM-008', name: 'Split · Trajektna luka', branchId: 'BR-003', location: 'Gat sv. Petra 1, Split', status: 'online', cashCents: 11200000, lastCheck: '07:14', dailyLimitCents: 700000 }
  ];

  const deposits = [];
  for (let i = 0; i < 24; i++) {
    const customer = customers[(i * 5 + 2) % customers.length];
    const account = accounts.find(item => item.customerId === customer.id && item.currency === 'EUR');
    const requested = 50000 + Math.floor(rng() * 310000);
    const principal = Math.min(requested, Math.max(15000, account.balanceCents - 30000));
    account.balanceCents -= principal;
    const termMonths = [3, 6, 12, 18][i % 4];
    const openDaysAgo = 5 + Math.floor(rng() * 280);
    const opened = new Date(isoDaysAgo(openDaysAgo));
    const maturity = new Date(opened);
    maturity.setMonth(maturity.getMonth() + termMonths);
    deposits.push({
      id: `TD-${pad(i + 1)}`, customerId: customer.id, accountId: account.id,
      principalCents: principal, annualRateBps: [180, 205, 225, 190][i % 4],
      termMonths, openedAt: opened.toISOString(), maturityAt: maturity.toISOString(),
      status: 'active', demoOnly: true
    });
  }

  const transactions = [];
  let transactionSequence = 1;
  for (const account of accounts) {
    const customer = customers.find(person => person.id === account.customerId);
    const count = 2 + Math.floor(rng() * 2);
    const openingBalanceCents = account.balanceCents;
    const generated = [];
    for (let i = 0; i < count; i++) {
      const [type, label, channel] = pick(rng, TX_TYPES);
      const isIncoming = ['sepa_in', 'salary', 'cash_in', 'merchant', 'refund'].includes(type) || (type === 'internal' && rng() > 0.5);
      const amountCents = customer.kind === 'business' ? 16000 + Math.floor(rng() * 235000) : 8000 + Math.floor(rng() * 78000);
      const direction = isIncoming ? 'in' : 'out';
      const day = Math.max(0, 90 - Math.floor((i + 1) * 90 / count) + Math.floor(rng() * 5));
      const posted = rng() > 0.035;
      generated.push({
        id: `TX-${pad(transactionSequence++, 6)}`, customerId: customer.id, accountId: account.id,
        date: isoDaysAgo(day, 7 + Math.floor(rng() * 13), Math.floor(rng() * 60)),
        type, label, direction, amountCents, currency: account.currency, channel,
        counterparty: pick(rng, COUNTERPARTIES), reference: `ADR-${pad(Math.floor(rng() * 999999), 6)}`,
        status: posted ? 'posted' : 'pending', balanceAfterCents: null,
        description: pick(rng, ['Regular account activity', 'Demo transaction', 'Recurring payment', 'Account movement']), demoOnly: true
      });
    }
    generated.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = openingBalanceCents;
    for (const item of generated) {
      if (item.status === 'posted') {
        if (item.direction === 'out' && item.amountCents > Math.max(0, balance - 5000)) {
          if (balance > 5000) item.amountCents = Math.max(1, balance - 5000);
          else item.status = 'pending';
        }
        if (item.status === 'posted') balance += item.direction === 'in' ? item.amountCents : -item.amountCents;
      }
      item.balanceAfterCents = balance;
    }
    account.balanceCents = Math.max(0, balance);
    transactions.push(...generated);
  }

  // Term-deposit funding appears as a customer-history movement and is part of the synthetic opening position.
  for (const deposit of deposits) {
    transactions.push({
      id: `TX-${pad(transactionSequence++, 6)}`, customerId: deposit.customerId, accountId: deposit.accountId,
      date: deposit.openedAt, type: 'savings_open', label: 'Term deposit placement', direction: 'out',
      amountCents: deposit.principalCents, currency: 'EUR', channel: 'Adria Bank', counterparty: 'Adria Savings',
      reference: deposit.id, status: 'posted', balanceAfterCents: null, description: `${deposit.termMonths}-month fixed-term deposit`, demoOnly: true
    });
  }

  const cards = customers.filter((_, index) => index % 2 === 0 || index % 7 === 2).map((customer, index) => {
    const account = accounts.find(item => item.customerId === customer.id);
    const prepaid = index % 37 === 0;
    const premium = !prepaid && index % 4 === 0;
    const dailyLimitCents = prepaid ? 250000 : premium ? 1500000 : 800000;
    return {
      id: `CARD-${pad(index + 1, 4)}`, customerId: customer.id, accountId: account.id,
      product: prepaid ? 'Adria Prepaid Virtual' : premium ? 'Adria Premium Virtual Debit' : 'Adria Virtual Debit',
      fundingType: prepaid ? 'prepaid' : 'debit', formFactor: 'virtual', last4: pad((index * 73 + 4817) % 10000),
      status: index % 17 === 0 ? 'locked' : index % 13 === 0 ? 'pending' : 'active',
      dailyLimitCents, monthlyLimitCents: prepaid ? 1000000 : premium ? 15000000 : 8000000,
      spentTodayCents: 0, spentMonthCents: 0, spendingDay: '', spendingMonth: '', prepaidBalanceCents: 0,
      controls: { onlineEnabled: true, internationalEnabled: false, recurringEnabled: true },
      issuedAt: isoDaysAgo(30 + index * 3), demoOnly: true
    };
  });

  const cases = [];
  const caseCount = 21;
  const eligibleTransactions = transactions.filter(tx => tx.status === 'posted');
  for (let i = 0; i < caseCount; i++) {
    const tx = eligibleTransactions[(i * 53 + 7) % eligibleTransactions.length];
    const customer = customers.find(person => person.id === tx.customerId);
    const [ruleCode, rule, severity] = AML_RULES[i % AML_RULES.length];
    cases.push({
      id: `AML-${pad(i + 1, 4)}`, customerId: customer.id, transactionId: tx.id, ruleCode,
      title: rule, severity: i % 6 === 0 ? 'high' : severity,
      status: i % 5 === 2 ? 'investigating' : 'open',
      createdAt: isoDaysAgo(i % 26, 8 + i % 8, i * 3 % 60),
      assignedTo: ['L. Kovač', 'A. Novak', 'M. Jurić'][i % 3], score: 42 + (i * 11) % 57,
      note: 'Synthetic alert for demonstration. Review context; no real-world screening was run.', demoOnly: true
    });
  }

  const payments = transactions.filter(tx => tx.currency === 'EUR' && ['sepa_out', 'sepa_in', 'salary', 'standing'].includes(tx.type)).slice(0, 18).map((tx, index) => {
    const customer = customers.find(item => item.id === tx.customerId);
    return {
    id: `PAY-${pad(index + 1, 5)}`, customerId: tx.customerId, accountId: tx.accountId,
    direction: tx.direction, rail: index % 4 === 0 ? 'SEPA Instant (sim)' : 'SEPA Credit Transfer (sim)',
    beneficiary: tx.counterparty, beneficiaryCountry: customer?.country || 'HR', beneficiaryIban: createDemoIban(customer?.country || 'HR', index + 731) || `DEMO-${customer?.country || 'HR'}-${pad(index + 731, 10)}`, beneficiaryBic: createDemoBic(customer?.country || 'HR'),
    amountCents: tx.amountCents, currency: 'EUR', reference: tx.reference,
    status: index % 7 === 0 ? 'awaiting_approval' : index % 11 === 0 ? 'returned' : 'settled_simulation',
    createdAt: tx.date, transactionId: tx.id, demoOnly: true
  };
  });

  const verifiedForLoans = customers.filter(customer => customer.kyc === 'verified' && customer.risk !== 'high');
  const fundedLoans = [];
  for (let i = 0; i < 38; i++) {
    const customer = verifiedForLoans[(i * 7 + 3) % verifiedForLoans.length];
    const account = accounts.find(item => item.customerId === customer.id && item.currency === 'EUR' && item.status === 'active');
    if (!account) continue;
    const principalCents = 3000000 + Math.floor(rng() * (14500000 + (customer.kind === 'business' ? 12500000 : 0)));
    const outstandingCents = Math.round(principalCents * (0.46 + rng() * 0.52));
    const termMonths = [12, 24, 36, 48, 60][i % 5];
    const openedDaysAgo = 45 + Math.floor(rng() * 950);
    fundedLoans.push({
      id: `LN-${pad(i + 1, 5)}`, customerId: customer.id, accountId: account.id,
      product: customer.kind === 'business' ? 'SME working capital' : i % 3 === 0 ? 'Personal loan' : 'Home improvement loan',
      principalCents, outstandingCents, annualRateBps: customer.kind === 'business' ? 635 + i % 250 : 595 + i % 380,
      termMonths, openedAt: isoDaysAgo(openedDaysAgo, 10),
      maturityAt: isoDaysAgo(Math.max(0, openedDaysAgo - termMonths * 30), 10),
      nextPaymentAt: isoDaysAgo(i % 13 === 0 ? 10 : -7 - (i % 25), 10), status: i % 13 === 0 ? 'arrears' : 'performing',
      purpose: customer.kind === 'business' ? 'Working capital (synthetic)' : 'Personal purpose (synthetic)',
      collateral: customer.kind === 'business' ? 'Illustrative business collateral' : 'Unsecured demonstration product',
      demoOnly: true
    });
  }
  const loanApplications = [];
  for (let i = 0; i < 4; i++) {
    const customer = verifiedForLoans[(i * 9 + 1) % verifiedForLoans.length];
    const account = accounts.find(item => item.customerId === customer.id && item.currency === 'EUR' && item.status === 'active');
    if (!account) continue;
    loanApplications.push({
      id: `LN-${pad(39 + i, 5)}`, customerId: customer.id, accountId: account.id,
      product: i % 2 ? 'Personal loan' : 'SME working capital', principalCents: 450000 + i * 190000,
      outstandingCents: 0, annualRateBps: 725, termMonths: 24 + i * 12,
      openedAt: new Date().toISOString(), maturityAt: null, nextPaymentAt: null,
      status: 'awaiting_approval', purpose: 'Demo application · synthetic', collateral: 'Pending underwriting', demoOnly: true
    });
  }
  const loans = [...fundedLoans, ...loanApplications];

  const additionalTreasuryPositions = [
    ['GBP', 'GB', 72000000], ['CHF', 'CH', 94500000], ['JPY', 'JP', 1850000000], ['PLN', 'DE', 410000000],
    ['SGD', 'SG', 51500000], ['KES', 'KE', 720000000], ['AED', 'AE', 63000000], ['CAD', 'CA', 81500000],
    ['AUD', 'AU', 45750000], ['INR', 'IN', 1250000000], ['CNY', 'CN', 320000000], ['SEK', 'SE', 35750000],
    ['NOK', 'NO', 28750000], ['BRL', 'BR', 213000000], ['ZAR', 'ZA', 155000000], ['CZK', 'CZ', 267500000],
    ['HUF', 'HU', 780000000], ['MXN', 'MX', 195000000], ['KPW', 'KP', 91000000000], ['IRR', 'IR', 42000000000],
    ['MMK', 'MM', 17000000000], ['LBP', 'LB', 80000000000], ['VES', 'VE', 21000000000], ['CUP', 'CU', 6800000000]
  ].map(([currency, countryCode, balanceCents], index) => ({
    id: `BK-${pad(index + 6, 3)}`, label: `Correspondent position · ${currency} ${CURRENCIES[currency].noEurReference ? 'native-only demo' : 'reference sample'}`,
    bank: 'Fictional correspondent simulator', countryCode, currency, balanceCents, glCode: '1200',
    bic: createDemoBic(countryCode), iban: createDemoIban(countryCode, index + 50),
    ref: `NOSTRO-DEMO-${currency}-${pad(index + 1, 3)}`, valuationStatus: CURRENCIES[currency].noEurReference ? 'native_only_no_reference' : 'indicative_reference_only', demoOnly: true
  }));
  const bankAccounts = [
    { id: 'BK-001', label: 'Central-bank reserve · demo', bank: 'Reserve position · local simulator', countryCode: 'HR', currency: 'EUR', balanceCents: 18000000000, glCode: '1000', ref: 'DEMO-RESERVE-001', bic: createDemoBic('HR'), iban: createDemoIban('HR', 1), demoOnly: true },
    { id: 'BK-002', label: 'Adria main settlement · demo', bank: 'Adria Bank · internal ledger', countryCode: 'HR', currency: 'EUR', balanceCents: 1820000000, glCode: '1200', ref: 'DEMO-MAIN-001', bic: createDemoBic('HR'), iban: createDemoIban('HR', 2), demoOnly: true },
    { id: 'BK-003', label: 'Correspondent position · EUR demo', bank: 'Fictional correspondent simulator', countryCode: 'DE', currency: 'EUR', balanceCents: 1020000000, glCode: '1200', ref: 'NOSTRO-DEMO-EUR-001', bic: createDemoBic('DE'), iban: createDemoIban('DE', 3), demoOnly: true },
    { id: 'BK-004', label: 'Correspondent position · USD demo', bank: 'Fictional correspondent simulator', countryCode: 'US', currency: 'USD', balanceCents: 790000000, glCode: '1200', ref: 'NOSTRO-DEMO-USD-001', bic: createDemoBic('US'), iban: createDemoIban('US', 4), demoOnly: true },
    { id: 'BK-005', label: 'Domestic clearing · demo', bank: 'Synthetic clearing simulator', countryCode: 'HR', currency: 'EUR', balanceCents: 2380000000, glCode: '1300', ref: 'CLEARING-DEMO-EUR-001', bic: createDemoBic('HR'), iban: createDemoIban('HR', 5), demoOnly: true },
    ...additionalTreasuryPositions
  ];

  const initialWalletCustomer = verifiedForLoans[1];
  const initialWallet = {
    id: `WAL-${initialWalletCustomer.id}-GNKC`, customerId: initialWalletCustomer.id, asset: 'GNKC',
    units: 250, bookCents: 4500, updatedAt: isoDaysAgo(4), demoOnly: true
  };
  const wallets = [
    initialWallet,
    { id: `WAL-${verifiedForLoans[2].id}-BTC`, customerId: verifiedForLoans[2].id, asset: 'BTC', units: 0.0138, bookCents: 88600, updatedAt: isoDaysAgo(2), demoOnly: true },
    { id: `WAL-${verifiedForLoans[3].id}-ETH`, customerId: verifiedForLoans[3].id, asset: 'ETH', units: 0.62, bookCents: 154100, updatedAt: isoDaysAgo(1), demoOnly: true },
    { id: `WAL-${verifiedForLoans[4].id}-USDC`, customerId: verifiedForLoans[4].id, asset: 'USDC', units: 825, bookCents: 76000, updatedAt: isoDaysAgo(3), demoOnly: true },
    ...['SOL', 'LTC', 'ADA', 'DOGE'].map((asset, index) => ({
      id: `WAL-${verifiedForLoans[index + 5].id}-${asset}`, customerId: verifiedForLoans[index + 5].id, asset,
      units: [4.25, 8.4, 1800, 950][index], bookCents: [60563, 53928, 77400, 11400][index],
      updatedAt: isoDaysAgo(index + 1), quoteStatus: 'offline_illustrative_sample', demoOnly: true
    }))
  ];
  const demoBanks = DEMO_BANK_SEEDS.map(bank => ({ ...bank }));
  const interbankAccounts = demoBanks.flatMap((bank, bankIndex) => [1, 2].map(sequence => {
    const number = bankIndex * 10 + sequence;
    return {
      id: `EXT-${bank.countryCode}-${pad(sequence, 4)}`, bankId: bank.id,
      accountName: `Synthetic beneficiary ${pad(number, 4)}`, accountNumber: `DEMO-${bank.countryCode}-${pad(number, 10)}`,
      ...accountIdentifiers(bank.countryCode, number),
      currency: bank.currency, balanceCents: (15000000 + number * 137500) * 100,
      status: 'active', demoOnly: true
    };
  }));
  const supportTickets = Array.from({ length: 14 }, (_, i) => ({
    id: `SUP-${pad(i + 1, 5)}`, customerId: customers[100 + i].id,
    category: ['Digital access', 'Account opening', 'Cards', 'Payments', 'FX reference'][i % 5],
    subject: ['Help with a demo login', 'Where is my account request?', 'How do I lock a demo card?', 'Payment rehearsal question', 'Understanding a daily reference rate'][i % 5],
    message: 'Synthetic training ticket. No personal or account credentials included.',
    status: i % 4 === 0 ? 'in_progress' : 'open', assignedTo: i % 3 === 0 ? 'Demo support team' : '',
    createdAt: isoDaysAgo(i % 8, 9 + i % 8), demoOnly: true
  }));
  const complaints = Array.from({ length: 6 }, (_, i) => ({
    id: `CMP-${pad(i + 1, 5)}`, customerId: customers[145 + i * 3].id,
    category: ['Payments', 'Account servicing', 'Card controls', 'Accessibility', 'Business banking', 'Savings information'][i],
    subject: ['Payment rehearsal status question', 'Sample account information unclear', 'Demo card lock control feedback', 'Portal readability feedback', 'Business profile details question', 'Illustrative savings rate wording'][i],
    message: 'Fictional complaint scenario for practice. No real transaction or personal data is involved.',
    status: ['received', 'investigating', 'response_ready', 'received', 'investigating', 'received'][i],
    priority: i === 2 ? 'high_demo' : 'standard_demo', assignedTo: i % 2 ? 'Demo complaints desk' : '',
    createdAt: isoDaysAgo(i + 1, 10 + i), practiceTargetAt: isoDaysAgo(i - 1), history: [], demoOnly: true
  }));

  const state = {
    schemaVersion: SCHEMA_VERSION,
    meta: { name: 'Adria Bank', environment: 'SIMULATION', operatingModel: 'digital_first_market_study', allLocationsPlanningOnly: true, companyLocation: { ...COMPANY_PUBLIC_ADDRESS }, createdAt: new Date().toISOString(), nextClient: 1001, nextAccount: accounts.length + 1, nextCard: cards.length + 1, nextTx: transactionSequence + 1, nextDeposit: deposits.length + 1, nextPayment: payments.length + 1, nextCase: cases.length + 1, nextTrade: 17, nextSwift: 12, nextLoan: loans.length + 1, nextInterbank: 1, nextSupportTicket: supportTickets.length + 1, nextComplaint: complaints.length + 1, nextCryptoTransfer: 1, nextOnboarding: 1, nextAudit: 3, nextJournal: 1, backgroundSequence: 0 },
    branches, plannedMarkets: PLANNED_MARKETS.map(market => ({ ...market })), customers, accounts, transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
    cards, deposits, atms, cases: cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), payments, loans, onboardingApplications: [],
    bankAccounts, wallets, walletTransfers: [], demoBanks, interbankAccounts, interbankTransfers: [], supportTickets, complaints, exchangeTrades: Array.from({ length: 16 }, (_, i) => {
      const customer = customers[(i * 9 + 3) % customers.length];
      const asset = ['USD', 'GBP', 'CHF', 'JPY', 'BTC', 'ETH', 'USDC', 'GNKC'][i % 8];
      const units = asset === 'BTC' ? 0.0021 + i * 0.00012 : asset === 'ETH' ? 0.06 + i * 0.012 : asset === 'GNKC' ? 110 + i * 22 : 120 + i * 24;
      return { id: `TRD-${pad(i + 1, 5)}`, customerId: customer.id, side: i % 3 === 0 ? 'sell' : 'buy', asset, units, eurCents: 17500 + i * 5300, spreadCents: 62 + i * 16, status: 'settled_simulation', createdAt: isoDaysAgo(i * 3, 10 + i % 8), demoOnly: true };
    }),
    swiftMessages: Array.from({ length: 11 }, (_, i) => ({
      id: `SWF-${pad(i + 1, 5)}`, direction: i % 4 === 0 ? 'incoming' : 'outgoing',
      type: i % 3 === 0 ? 'MT103' : i % 3 === 1 ? 'pacs.008' : 'MT199',
      beneficiary: pick(rng, COUNTERPARTIES), beneficiaryBank: pick(rng, ['Example Bank Europe', 'North Coast Bank (demo)', 'Adria Bank internal']),
      amountCents: 235000 + i * 12750, currency: i % 4 === 0 ? 'USD' : 'EUR',
      status: i % 5 === 0 ? 'awaiting_approval' : 'simulated', reference: `SWF-DEMO-${pad(i + 41, 6)}`,
      createdAt: isoDaysAgo(i * 2, 9 + i % 8), customerId: customers[(i * 4) % customers.length].id,
      demoOnly: true
    })),
    ledgerJournals: [], backgroundRuns: [], auditEvents: [
      { id: 'AUD-0001', at: new Date().toISOString(), actor: 'System', action: 'Demo environment initialized', detail: '1,000 synthetic customers · local demo records; public reference rates use a read-only feed', severity: 'info' },
      { id: 'AUD-0002', at: isoDaysAgo(0, 8, 12), actor: 'Compliance simulator', action: 'Scenario pack loaded', detail: 'Synthetic AML/KYC cases only; no external screening', severity: 'info' }
    ],
    settings: { language: 'hr', operator: 'Maja Kovač', role: 'operations_maker', demoAcknowledged: true, backgroundSimulationEnabled: true, backgroundIntervalMinutes: 5, keepRunningInTray: false, startWithWindows: false }
  };
  state.glAccounts = makeGlAccounts(state);
  return state;
}

function ensureBackgroundSettings(state) {
  state.meta ||= {};
  // Refresh the public-listing note while preserving the user's local demo records.
  state.meta.companyLocation = { ...COMPANY_PUBLIC_ADDRESS };
  delete state.meta.headquarters;
  state.settings ||= {};
  state.settings.backgroundSimulationEnabled = state.settings.backgroundSimulationEnabled !== false;
  const interval = Number(state.settings.backgroundIntervalMinutes);
  state.settings.backgroundIntervalMinutes = [1, 5, 15, 60].includes(interval) ? interval : 5;
  state.settings.keepRunningInTray = Boolean(state.settings.keepRunningInTray);
  state.settings.startWithWindows = Boolean(state.settings.startWithWindows);
  state.backgroundRuns ||= [];
  state.walletTransfers ||= [];
  state.complaints ||= [];
  state.meta.nextComplaint ||= state.complaints.length + 1;
  state.meta.nextCryptoTransfer ||= 1;
  state.meta.backgroundSequence = Number(state.meta.backgroundSequence) || 0;
  state.meta.nextAudit ||= Math.max(0, ...(state.auditEvents || []).map(item => Number(String(item.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
  state.meta.nextJournal ||= Math.max(0, ...(state.ledgerJournals || []).map(item => Number(String(item.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
  return state;
}

const DEFAULT_CARD_CONTROLS = Object.freeze({ onlineEnabled: true, internationalEnabled: false, recurringEnabled: true });
function migrateCardWorkflowState(state) {
  state.cards ||= [];
  for (const card of state.cards) {
    if (card.product === 'Adria Visa Debit') card.product = 'Adria Virtual Debit';
    if (card.product === 'Adria Premium Debit') card.product = 'Adria Premium Virtual Debit';
    card.fundingType ||= String(card.product || '').toLowerCase().includes('prepaid') ? 'prepaid' : 'debit';
    card.formFactor = 'virtual';
    card.prepaidBalanceCents = Number.isSafeInteger(card.prepaidBalanceCents) && card.prepaidBalanceCents >= 0 ? card.prepaidBalanceCents : 0;
    card.dailyLimitCents = Number.isSafeInteger(card.dailyLimitCents) && card.dailyLimitCents > 0 ? card.dailyLimitCents : 800000;
    card.monthlyLimitCents = Number.isSafeInteger(card.monthlyLimitCents) && card.monthlyLimitCents > 0 ? card.monthlyLimitCents : card.dailyLimitCents * 10;
    card.spentTodayCents = Number.isSafeInteger(card.spentTodayCents) && card.spentTodayCents >= 0 ? card.spentTodayCents : 0;
    card.spentMonthCents = Number.isSafeInteger(card.spentMonthCents) && card.spentMonthCents >= 0 ? card.spentMonthCents : 0;
    card.spendingDay = typeof card.spendingDay === 'string' ? card.spendingDay : '';
    card.spendingMonth = typeof card.spendingMonth === 'string' ? card.spendingMonth : '';
    card.controls = { ...DEFAULT_CARD_CONTROLS, ...(card.controls || {}) };
    card.demoOnly = true;
  }
  state.meta ||= {};
  state.onboardingApplications = Array.isArray(state.onboardingApplications) ? state.onboardingApplications : [];
  const highestOnboardingSequence = state.onboardingApplications.reduce((highest, application) => Math.max(highest, Number(String(application.id).match(/(\d+)$/)?.[1]) || 0), 0);
  state.meta.nextOnboarding = Math.max(Number(state.meta.nextOnboarding) || 1, highestOnboardingSequence + 1);
  const highestCardSequence = state.cards.reduce((highest, card) => Math.max(highest, Number(String(card.id).match(/(\d+)$/)?.[1]) || 0), 0);
  state.meta.nextCard = Math.max(Number(state.meta.nextCard) || 1, highestCardSequence + 1);
  state.glAccounts ||= makeGlAccounts(state);
  if (!state.glAccounts.some(account => account.code === '2030')) {
    const prepaidBalanceCents = state.cards.reduce((sum, card) => sum + (card.fundingType === 'prepaid' ? card.prepaidBalanceCents : 0), 0);
    state.glAccounts.push({ code: '2030', name: 'Synthetic prepaid-card stored-value liabilities', group: 'liability', normal: 'credit', balanceCents: prepaidBalanceCents });
  }
  state.schemaVersion = SCHEMA_VERSION;
  return ensureBackgroundSettings(state);
}

export function loadDemoState(storage = globalThis.localStorage) {
  if (!storage) return createDemoState();
  try {
    const saved = storage.getItem(STORE_KEY);
    if (!saved) return createDemoState();
    const state = JSON.parse(saved);
    const hasCoreCollections = ['customers', 'accounts', 'transactions', 'branches', 'plannedMarkets', 'demoBanks', 'interbankAccounts', 'interbankTransfers', 'supportTickets', 'complaints', 'wallets', 'walletTransfers', 'loans', 'deposits', 'cards'].every(key => Array.isArray(state[key]));
    const compatibleSchema = Number.isInteger(state.schemaVersion) && state.schemaVersion >= 6 && state.schemaVersion <= SCHEMA_VERSION;
    if (compatibleSchema && Array.isArray(state.customers) && state.customers.length >= 1000 && hasCoreCollections && (state.meta?.companyLocation?.countryCode === 'US' || state.meta?.headquarters?.countryCode === 'US')) return migrateCardWorkflowState(state);
  } catch { /* damaged demo storage is reset to the bundled synthetic scenario */ }
  return createDemoState();
}

export function saveDemoState(state, storage = globalThis.localStorage) {
  if (storage) storage.setItem(STORE_KEY, JSON.stringify(state));
}

export function moneyToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.');
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Amount is outside the supported range.');
  return cents;
}

export function addAudit(state, action, detail, actor = state.settings?.operator || 'Operator', severity = 'info') {
  const sequence = Number(state.meta.nextAudit) || ((state.auditEvents || []).reduce((max, event) => Math.max(max, Number(String(event.id).match(/(\d+)$/)?.[1]) || 0), 0) + 1);
  state.meta.nextAudit = sequence + 1;
  state.auditEvents.unshift({
    id: `AUD-${pad(sequence, 4)}`,
    at: new Date().toISOString(), actor, action, detail, severity
  });
  if (state.auditEvents.length > 300) state.auditEvents.length = 300;
}

function postJournal(state, description, lines, ref) {
  const debit = lines.reduce((sum, line) => sum + line.debitCents, 0);
  const credit = lines.reduce((sum, line) => sum + line.creditCents, 0);
  if (debit !== credit) throw new Error(`Ledger invariant failed: debits ${debit} do not equal credits ${credit}.`);
  if (lines.some(line => line.debitCents < 0 || line.creditCents < 0)) throw new Error('Negative ledger line rejected.');
  for (const line of lines) {
    const account = state.glAccounts.find(item => item.code === line.accountCode);
    if (!account) throw new Error(`Unknown general-ledger account ${line.accountCode}.`);
    account.balanceCents += account.normal === 'debit' ? line.debitCents - line.creditCents : line.creditCents - line.debitCents;
  }
  const sequence = Number(state.meta.nextJournal) || ((state.ledgerJournals || []).reduce((max, item) => Math.max(max, Number(String(item.id).match(/(\d+)$/)?.[1]) || 0), 0) + 1);
  state.meta.nextJournal = sequence + 1;
  const journal = { id: `JRN-${pad(sequence, 5)}`, ref, description, at: new Date().toISOString(), debitCents: debit, creditCents: credit, lines };
  state.ledgerJournals.unshift(journal);
  return journal;
}
function pushTransaction(state, fields) {
  const id = `TX-${pad(state.meta.nextTx++, 6)}`;
  const tx = { id, date: new Date().toISOString(), status: 'posted', currency: 'EUR', demoOnly: true, ...fields };
  state.transactions.unshift(tx);
  return tx;
}
function newCase(state, customerId, transactionId, title, severity = 'medium') {
  const item = {
    id: `AML-${pad(state.meta.nextCase++, 4)}`, customerId, transactionId, ruleCode: 'user_action', title,
    severity, status: 'open', score: severity === 'high' ? 89 : 65, assignedTo: 'Unassigned',
    createdAt: new Date().toISOString(), note: 'Automatically held by a demo risk rule. Review and disposition are illustrative only.', demoOnly: true
  };
  state.cases.unshift(item);
  return item;
}
function requireAccount(state, accountId, currency = null) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account || account.status !== 'active') throw new Error('Choose an active account.');
  if (currency && account.currency !== currency) throw new Error(`This operation requires a ${currency} account.`);
  return account;
}
function requireFunds(account, amountCents) {
  if (account.balanceCents < amountCents) throw new Error('Insufficient available funds in this demo account.');
}

export function createCustomer(state, input) {
  const name = String(input.name || '').trim();
  if (name.length < 2) throw new Error('Enter a customer or business name.');
  if (!input.syntheticConfirmed) throw new Error('Confirm that this is fictional demo data.');
  const idNum = state.meta.nextClient++;
  const customer = {
    id: `C-2026-${pad(idNum)}`, name, kind: input.kind === 'business' ? 'business' : 'personal',
    city: String(input.city || 'Zagreb').trim(), country: String(input.country || 'HR').trim().toUpperCase(),
    segment: input.kind === 'business' ? 'Business' : 'Everyday', risk: 'medium', kyc: 'pending', pep: false,
    joinedAt: new Date().toISOString(), email: String(input.email || `demo.customer.${pad(idNum)}@adria.invalid`).trim(),
    phone: '+385 1 555 0100', occupation: 'Demo record — verification pending', sourceOfFunds: 'Pending review',
    expectedMonthlyCents: 0, branchId: input.branchId || state.branches[0].id,
    beneficialOwner: input.kind === 'business' ? 'Beneficial-owner review pending' : null, demoOnly: true
  };
  state.customers.unshift(customer);
  addAudit(state, 'Customer record created', `${customer.id} · ${customer.name} · KYC pending`);
  return customer;
}

export function openAccount(state, customerId, currency = 'EUR') {
  const customer = state.customers.find(item => item.id === customerId);
  if (!customer) throw new Error('Customer not found.');
  if (!CURRENCIES[currency] || CURRENCIES[currency].crypto) throw new Error('Choose a supported fiat account currency.');
  const sequence = state.meta.nextAccount++;
  const account = {
    id: `AC-${pad(sequence, 5)}`, customerId, kind: 'current', currency,
    accountNumber: `DEMO-${customer.country}-${pad(sequence, 10)}`,
    ...accountIdentifiers(customer.country, sequence), balanceCents: 0,
    status: customer.kyc === 'verified' ? 'active' : 'restricted', openedAt: new Date().toISOString(),
    label: `${currency} ${customer.kind === 'business' ? 'Business' : 'Personal'} current`, demoOnly: true
  };
  state.accounts.unshift(account);
  addAudit(state, 'Local demo account opened', `${account.id} · ${customer.id} · ${currency}; no real account created`);
  return account;
}

export function createInternalTransfer(state, input) {
  const from = requireAccount(state, input.fromAccountId);
  const to = requireAccount(state, input.toAccountId);
  if (from.id === to.id) throw new Error('Source and destination accounts must be different.');
  if (from.currency !== to.currency) throw new Error('Internal transfers require matching currencies. Use the FX conversion rehearsal for currency changes.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  if (CURRENCIES[from.currency]?.decimals === 0 && amountCents % 100 !== 0) throw new Error(`${from.currency} demo amounts must be whole units.`);
  requireFunds(from, amountCents);
  from.balanceCents -= amountCents;
  to.balanceCents += amountCents;
  const reference = `IN-${pad(state.meta.nextTx, 6)}`;
  const referenceRate = CURRENCIES[from.currency]?.eurRate;
  const amountEurCents = Number.isFinite(referenceRate) && referenceRate > 0 ? Math.round(amountCents * referenceRate) : null;
  const txOut = pushTransaction(state, { customerId: from.customerId, accountId: from.id, type: 'internal', label: 'Internal transfer', direction: 'out', amountCents, currency: from.currency, channel: 'Adria Bank · demo', counterparty: state.customers.find(c => c.id === to.customerId)?.name || 'Adria demo customer', reference });
  pushTransaction(state, { customerId: to.customerId, accountId: to.id, type: 'internal', label: 'Internal transfer', direction: 'in', amountCents, currency: to.currency, channel: 'Adria Bank · demo', counterparty: state.customers.find(c => c.id === from.customerId)?.name || 'Adria demo customer', reference });
  if (amountEurCents !== null) {
    postJournal(state, 'Internal customer transfer', [
      { accountCode: '2000', debitCents: amountEurCents, creditCents: 0 },
      { accountCode: '2000', debitCents: 0, creditCents: amountEurCents }
    ], reference);
  }
  addAudit(state, 'Internal transfer simulated', `${reference} · ${from.id} → ${to.id} · ${from.currency}${amountEurCents === null ? ' · native-only memorandum; EUR value unavailable' : ''}`);
  return txOut;
}

export function runBackgroundSimulationTick(state, { now = new Date() } = {}) {
  if (state.settings?.backgroundSimulationEnabled === false) return { updated: false, status: 'paused' };
  const timestamp = new Date(now).toISOString();
  state.meta.backgroundSequence = (Number(state.meta.backgroundSequence) || 0) + 1;
  const sequence = state.meta.backgroundSequence;
  const eligible = state.accounts.filter(account => {
    const customer = state.customers.find(item => item.id === account.customerId);
    return account.status === 'active' && account.currency === 'EUR' && account.balanceCents >= 2000 && customer?.kyc === 'verified' && customer.risk === 'low';
  });
  const run = {
    id: `BG-${pad(sequence, 6)}`, at: timestamp, status: 'completed', type: 'synthetic_internal_transfer', source: 'local-rule-based-simulator',
    amountCents: 0, currency: 'EUR', reference: null, transactionId: null, demoOnly: true
  };
  if (eligible.length >= 2) {
    const fromIndex = (sequence * 17) % eligible.length;
    const from = eligible[fromIndex];
    const to = eligible.find((account, index) => index !== fromIndex && account.customerId !== from.customerId);
    if (to) {
      const amountCents = 500 + ((sequence * 977) % 1500);
      const transaction = createInternalTransfer(state, { fromAccountId: from.id, toAccountId: to.id, amountCents });
      run.amountCents = amountCents;
      run.reference = transaction.reference;
      run.transactionId = transaction.id;
      run.fromAccountId = from.id;
      run.toAccountId = to.id;
    } else run.status = 'no_distinct_customer_account';
  } else run.status = 'no_eligible_demo_accounts';

  run.ledgerBalanced = isBalanced(state);
  state.backgroundRuns ||= [];
  state.backgroundRuns.unshift(run);
  if (state.backgroundRuns.length > 250) state.backgroundRuns.length = 250;
  state.settings.backgroundLastTickAt = timestamp;
  if (state.transactions.length > 4500) state.transactions.length = 4000;
  if (state.ledgerJournals.length > 1000) state.ledgerJournals.length = 1000;
  if (state.auditEvents.length > 300) state.auditEvents.length = 300;
  return { updated: true, ...run };
}

export function convertBetweenAccounts(state, input) {
  const from = requireAccount(state, input.fromAccountId);
  const to = requireAccount(state, input.toAccountId);
  if (from.id === to.id) throw new Error('Choose two different accounts.');
  if (from.customerId !== to.customerId) throw new Error('Currency conversion is limited to the same demo customer.');
  if (from.currency === to.currency) throw new Error('Choose accounts in different currencies.');
  if (!CURRENCIES[from.currency] || !CURRENCIES[to.currency] || CURRENCIES[from.currency].crypto || CURRENCIES[to.currency].crypto) {
    throw new Error('Only supported fiat currencies can be converted between accounts.');
  }
  const customer = state.customers.find(item => item.id === from.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Currency conversion requires a verified demo KYC status.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  if (CURRENCIES[from.currency].decimals === 0 && amountCents % 100 !== 0) throw new Error(`${from.currency} demo amounts must be whole units.`);
  requireFunds(from, amountCents);

  const sourceRate = CURRENCIES[from.currency].eurRate;
  const targetRate = CURRENCIES[to.currency].eurRate;
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    throw new Error('No reference rate is configured for one of these currencies; it cannot be valued or converted in this demo.');
  }
  const sourceEurCents = Math.round(amountCents * sourceRate);
  const targetExactCents = sourceEurCents * (1 - FX_SPREAD) / targetRate;
  const targetQuantum = 10 ** (2 - CURRENCIES[to.currency].decimals);
  const targetCents = Math.floor(targetExactCents / targetQuantum) * targetQuantum;
  const targetEurCents = Math.round(targetCents * targetRate);
  const spreadCents = sourceEurCents - targetEurCents;
  if (targetCents <= 0 || spreadCents < 0) throw new Error('Conversion amount is below the supported demo minimum.');

  const reference = `FX-${pad(state.meta.nextTx, 6)}`;
  from.balanceCents -= amountCents;
  to.balanceCents += targetCents;
  pushTransaction(state, { customerId: customer.id, accountId: from.id, type: 'fx_conversion', label: `Convert ${from.currency} to ${to.currency}`, direction: 'out', amountCents, currency: from.currency, channel: 'Adria FX · demo', counterparty: `${targetCents / 100} ${to.currency}`, reference });
  pushTransaction(state, { customerId: customer.id, accountId: to.id, type: 'fx_conversion', label: `Convert ${from.currency} to ${to.currency}`, direction: 'in', amountCents: targetCents, currency: to.currency, channel: 'Adria FX · demo', counterparty: `${amountCents / 100} ${from.currency}`, reference });
  postJournal(state, `Multi-currency conversion ${from.currency}/${to.currency}`, [
    { accountCode: '2000', debitCents: sourceEurCents, creditCents: 0 },
    { accountCode: '2000', debitCents: 0, creditCents: targetEurCents },
    { accountCode: '4000', debitCents: 0, creditCents: spreadCents }
  ], reference);
  const conversion = {
    id: reference, customerId: customer.id, fromAccountId: from.id, toAccountId: to.id,
    fromCurrency: from.currency, toCurrency: to.currency, amountCents, receivedCents: targetCents,
    referenceRate: sourceRate / targetRate, spread: FX_SPREAD, spreadEurCents: spreadCents,
    referenceDate: input.referenceDate || null, source: input.source || 'ECB daily reference fallback',
    createdAt: new Date().toISOString(), status: 'settled_simulation', demoOnly: true
  };
  state.fxConversions ||= [];
  state.fxConversions.unshift(conversion);
  addAudit(state, 'Multi-currency conversion simulated', `${reference} · ${from.currency} ${amountCents / 100} → ${to.currency} ${targetCents / 100}; not a real FX transaction`);
  return conversion;
}

export function createExternalPayment(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  const beneficiary = String(input.beneficiary || '').trim();
  if (beneficiary.length < 2) throw new Error('Enter a beneficiary name.');
  const id = `PAY-${pad(state.meta.nextPayment++, 5)}`;
  const beneficiaryCountry = String(input.country || 'HR').toUpperCase();
  const beneficiaryIban = createDemoIban(beneficiaryCountry, Number(id.slice(-5))) || `DEMO-${beneficiaryCountry}-${pad(Number(id.slice(-5)), 10)}`;
  const beneficiaryBic = createDemoBic(beneficiaryCountry);
  const highRisk = amountCents >= 1000000 || state.customers.find(c => c.id === account.customerId)?.risk === 'high';
  const payment = {
    id, customerId: account.customerId, accountId: account.id, direction: 'out',
    rail: input.rail === 'instant' ? 'SEPA Instant (sim)' : 'SEPA Credit Transfer (sim)',
    beneficiary, beneficiaryCountry, beneficiaryIban, beneficiaryBic, amountCents,
    currency: 'EUR', reference: String(input.reference || `DEMO-${id}`), status: 'awaiting_approval',
    createdAt: new Date().toISOString(), transactionId: null, notes: String(input.notes || ''), demoOnly: true
  };
  state.payments.unshift(payment);
  if (highRisk) newCase(state, account.customerId, null, amountCents >= 1000000 ? 'High-value payment — enhanced review' : 'Payment from higher-risk demo profile', 'high');
  addAudit(state, 'External payment queued', `${id} · checker approval required · no payment rail connected`, 'Operations maker');
  return payment;
}

export function createIncomingPayment(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === account.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Incoming payment rehearsal requires a verified demo KYC status.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  const sender = String(input.sender || '').trim();
  if (sender.length < 2) throw new Error('Enter a fictional sender name.');
  const id = `PAY-${pad(state.meta.nextPayment++, 5)}`;
  const country = String(input.country || 'HR').toUpperCase();
  const payment = {
    id, customerId: customer.id, accountId: account.id, direction: 'in',
    rail: input.rail === 'instant' ? 'SEPA Instant incoming (sim)' : 'SEPA Credit Transfer incoming (sim)',
    beneficiary: customer.name, beneficiaryCountry: account.countryCode || customer.country,
    beneficiaryIban: account.iban || account.accountNumber, beneficiaryBic: account.bic || createDemoBic(account.countryCode),
    sender, senderCountry: country, senderIban: createDemoIban(country, Number(id.slice(-5))) || `DEMO-${country}-${pad(Number(id.slice(-5)), 10)}`,
    senderBic: createDemoBic(country), amountCents, currency: 'EUR',
    reference: String(input.reference || `DEMO-${id}`).slice(0, 35), status: 'awaiting_approval',
    createdAt: new Date().toISOString(), transactionId: null,
    notes: String(input.notes || 'Synthetic incoming-credit rehearsal; no funds arrived from an external bank.'), demoOnly: true
  };
  state.payments.unshift(payment);
  addAudit(state, 'Incoming payment rehearsal queued', `${id} · ${account.id} · local checker review only; no incoming rail connected`);
  return payment;
}

export function cancelPayment(state, paymentId, reason = '') {
  const payment = state.payments.find(item => item.id === paymentId);
  if (!payment || payment.status !== 'awaiting_approval') throw new Error('Only a queued demo payment can be stopped before local approval.');
  payment.status = 'cancelled';
  payment.cancelledAt = new Date().toISOString();
  payment.cancelReason = String(reason || 'Stopped before checker approval').slice(0, 160);
  addAudit(state, 'Demo payment stopped locally', `${payment.id} · no payment instruction was transmitted`);
  return payment;
}

export function approvePayment(state, paymentId) {
  const payment = state.payments.find(item => item.id === paymentId);
  if (!payment || payment.status !== 'awaiting_approval') throw new Error('Payment is not awaiting approval.');
  const account = requireAccount(state, payment.accountId, 'EUR');
  payment.approvedAt = new Date().toISOString();
  payment.approvedBy = 'Supervisor (demo)';
  if (payment.direction === 'in') {
    account.balanceCents += payment.amountCents;
    payment.status = 'settled_simulation';
    const tx = pushTransaction(state, { customerId: payment.customerId, accountId: account.id, type: 'sepa_in', label: 'Incoming SEPA credit (simulated)', direction: 'in', amountCents: payment.amountCents, channel: payment.rail, counterparty: payment.sender || 'Fictional remitter', reference: payment.reference, description: 'Locally credited after demo checker review. No payment was received over a network.' });
    payment.transactionId = tx.id;
    postJournal(state, 'Simulated incoming SEPA credit', [
      { accountCode: '1300', debitCents: payment.amountCents, creditCents: 0 },
      { accountCode: '2000', debitCents: 0, creditCents: payment.amountCents }
    ], payment.id);
    addAudit(state, 'Incoming payment credited in simulation', `${payment.id} · ${account.id} · no external funds received`, 'Supervisor (demo)');
    return payment;
  }
  requireFunds(account, payment.amountCents);
  account.balanceCents -= payment.amountCents;
  payment.status = 'approved_simulation';
  const tx = pushTransaction(state, { customerId: payment.customerId, accountId: account.id, type: 'sepa_out', label: 'SEPA payment (simulated)', direction: 'out', amountCents: payment.amountCents, channel: payment.rail, counterparty: payment.beneficiary, reference: payment.reference, description: 'Checker-approved in local simulation. Not submitted to a payment network.' });
  payment.transactionId = tx.id;
  const settlement = payment.rail.startsWith('SEPA Instant') ? '1300' : '2020';
  postJournal(state, 'Simulated outbound SEPA payment', [
    { accountCode: '2000', debitCents: payment.amountCents, creditCents: 0 },
    { accountCode: settlement, debitCents: 0, creditCents: payment.amountCents }
  ], payment.id);
  addAudit(state, 'Checker approved payment (simulation)', `${payment.id} · marked approved locally; no funds transmitted`, 'Supervisor (demo)');
  return payment;
}

export function createInterbankTransfer(state, input) {
  const from = requireAccount(state, input.fromAccountId);
  const destination = state.interbankAccounts?.find(item => item.id === input.toAccountId && item.status === 'active');
  if (!destination) throw new Error('Choose an active fictional beneficiary account from the demo directory.');
  const bank = state.demoBanks?.find(item => item.id === destination.bankId && item.status === 'fictional_demo_directory');
  if (!bank) throw new Error('The fictional beneficiary bank is not in the local demo directory.');
  if (from.currency !== destination.currency || bank.currency !== destination.currency) throw new Error('Source and destination currencies must match. Convert currency first.');
  const customer = state.customers.find(item => item.id === from.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Demo payment rehearsal requires a verified demo KYC status.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  if (CURRENCIES[from.currency]?.decimals === 0 && amountCents % 100 !== 0) throw new Error(`${from.currency} demo amounts must be whole units.`);
  requireFunds(from, amountCents);
  state.meta.nextInterbank ||= 1;
  const id = `IBT-${pad(state.meta.nextInterbank++, 6)}`;
  const transfer = {
    id, customerId: customer.id, fromAccountId: from.id, toAccountId: destination.id,
    fromBank: 'Adria Bank · local demo ledger', toBankId: bank.id, toBank: bank.name,
    beneficiary: destination.accountName, beneficiaryAccount: destination.accountNumber,
    beneficiaryIban: destination.iban, beneficiaryCountry: bank.countryCode, bic: bank.bic, amountCents, currency: from.currency,
    reference: String(input.reference || `DEMO-${id}`).slice(0, 35), purpose: String(input.purpose || 'Demo interbank transfer').slice(0, 80),
    status: 'awaiting_approval', createdAt: new Date().toISOString(), demoOnly: true
  };
  state.interbankTransfers ||= [];
  state.interbankTransfers.unshift(transfer);
  if (customer.risk === 'high') newCase(state, customer.id, null, 'Interbank rehearsal from higher-risk demo profile', 'high');
  addAudit(state, 'Interbank demo transfer queued', `${id} · ${from.id} → ${destination.id} at ${bank.name}; local checker approval only`);
  return transfer;
}

export function approveInterbankTransfer(state, transferId) {
  const transfer = state.interbankTransfers?.find(item => item.id === transferId);
  if (!transfer || transfer.status !== 'awaiting_approval') throw new Error('Interbank demo transfer is not awaiting approval.');
  const from = requireAccount(state, transfer.fromAccountId);
  if (from.customerId !== transfer.customerId) throw new Error('The source account no longer belongs to the synthetic customer on this transfer.');
  const customer = state.customers.find(item => item.id === transfer.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Checker approval requires the same verified demo KYC status.');
  const destination = state.interbankAccounts?.find(item => item.id === transfer.toAccountId && item.status === 'active');
  if (!destination || destination.bankId !== transfer.toBankId || destination.currency !== transfer.currency || from.currency !== transfer.currency) {
    throw new Error('The fictional destination account is no longer available for this currency.');
  }
  requireFunds(from, transfer.amountCents);
  const referenceRate = CURRENCIES[transfer.currency]?.eurRate;
  if (!Number.isFinite(referenceRate) || referenceRate <= 0) throw new Error('This currency has no demo EUR reference and cannot be settled in the EUR teaching ledger.');
  const amountEurCents = Math.round(transfer.amountCents * referenceRate);
  from.balanceCents -= transfer.amountCents;
  destination.balanceCents += transfer.amountCents;
  transfer.status = 'settled_simulation';
  transfer.approvedAt = new Date().toISOString();
  transfer.settledAt = transfer.approvedAt;
  transfer.approvedBy = 'Checker (demo)';
  transfer.network = 'Local fictional-bank ledger simulator · no external network';
  const tx = pushTransaction(state, {
    customerId: transfer.customerId, accountId: from.id, type: 'interbank_out',
    label: 'Bank-to-bank transfer · demo', direction: 'out', amountCents: transfer.amountCents,
    currency: transfer.currency, channel: 'Interbank simulator', counterparty: `${transfer.beneficiary} · ${transfer.toBank}`,
    reference: transfer.reference, description: transfer.network
  });
  transfer.transactionId = tx.id;
  postJournal(state, 'Fictional interbank transfer rehearsal', [
    { accountCode: '2000', debitCents: amountEurCents, creditCents: 0 },
    { accountCode: '2020', debitCents: 0, creditCents: amountEurCents }
  ], transfer.id);
  addAudit(state, 'Interbank demo transfer settled locally', `${transfer.id} · ${transfer.currency} ${transfer.amountCents / 100} credited to fictional ${transfer.toBank}; no real payment was sent`);
  return transfer;
}

export function verifyDemoReference(state, input) {
  const type = String(input.type || '').toLowerCase();
  const value = String(input.value || '').trim();
  if (!value) throw new Error('Enter a demo reference to check.');
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  if (type === 'iban') {
    const check = validateIban(value);
    const detail = check.expectedLength
      ? `${check.masked} · ${check.country} · ${check.length}/${check.expectedLength} characters · ${check.checksumValid ? 'MOD-97 remainder 1' : `MOD-97 ${check.remainder ?? 'not checked'}`}`
      : `${check.masked} · ${check.country || 'unknown country'} · ${check.length} characters · supported IBAN country/length not found`;
    return {
      type, status: check.status, label: check.valid ? 'IBAN format and checksum pass' : 'IBAN format/checksum did not pass', detail,
      note: 'Local syntax, country length and MOD-97 only. This does not confirm an account, bank, owner or reachability; the entered value is not saved or routed.'
    };
  }
  if (type === 'pan' || type === 'card_number') {
    const check = validateCardNumber(value);
    return {
      type: 'card_number', status: check.status, label: check.valid ? 'Card-number format and Luhn pass' : 'Card format/check digit did not pass',
      detail: `${check.masked || 'unreadable number'} · ${check.length} digits · ${check.luhnValid ? 'Luhn check digit matches' : check.luhnChecked ? 'Luhn check digit does not match' : 'Luhn check not evaluated'}`,
      note: 'Format/check digit only; no card-network, issuer, account, expiry, CVV or authorisation lookup. Use synthetic test values only. The entered value is not saved or transmitted.'
    };
  }
  if (type === 'bank') {
    const bicShapeValid = /^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/.test(normalized);
    const bank = state.demoBanks?.find(item => item.bic === normalized || item.id.toUpperCase() === normalized);
    return bank
      ? { type, status: 'synthetic_directory_match', label: bank.name, detail: `${bank.country} · ${bank.currency} · ${bank.bic}`, note: 'Fictional local directory match only. No real registry, licence or SWIFT lookup.' }
      : { type, status: bicShapeValid ? 'format_only' : 'not_found', label: bicShapeValid ? 'BIC-shaped text only' : 'No local match', detail: normalized, note: 'This is not proof that a bank exists, is licensed, or owns the identifier.' };
  }
  if (type === 'account') {
    const account = [...(state.accounts || []), ...(state.interbankAccounts || [])].find(item =>
      [item.id, item.accountNumber, item.iban].filter(Boolean).some(reference => reference.replace(/\s+/g, '').toUpperCase() === normalized)
    );
    return account
      ? { type, status: 'synthetic_account_match', label: account.id, detail: `${account.currency} · ${account.status} · demo-only`, note: 'Local synthetic account record match only. No external bank confirmation or ownership check.' }
      : { type, status: 'not_found', label: 'No local demo account match', detail: normalized, note: 'No external bank or account lookup was performed.' };
  }
  if (type === 'card') {
    const card = state.cards?.find(item => item.id.toUpperCase() === normalized || item.last4 === normalized);
    return card
      ? { type, status: 'synthetic_card_match', label: `${card.id} · •••• ${card.last4}`, detail: `${card.product} · ${card.status}`, note: 'Masked local demo-token lookup only. No issuer, card network, PAN or authorisation check.' }
      : { type, status: 'not_found', label: 'No local demo card match', detail: normalized, note: 'Do not enter a real card number. No external card lookup was performed.' };
  }
  throw new Error('Choose a bank/BIC, demo account, or masked demo card reference.');
}

export function createSupportTicket(state, input) {
  const customer = state.customers.find(item => item.id === input.customerId);
  if (!customer) throw new Error('Choose a fictional demo customer.');
  if (!input.syntheticConfirmed) throw new Error('Confirm that this is a synthetic support request.');
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  if (subject.length < 3 || subject.length > 80 || message.length < 5 || message.length > 400) throw new Error('Add a short demo-only subject and message.');
  const suppliedText = `${subject} ${message}`;
  if (/(?:^|\D)\d(?:[\s-]*\d){11,18}(?=\D|$)/.test(suppliedText) || /\b(password|passcode|cvv|cvc|pin|ssn|social security|passport|national id)\s*[:=]/i.test(suppliedText)) {
    throw new Error('Do not enter real account numbers, card data, passwords or government IDs in this demo.');
  }
  state.supportTickets ||= [];
  state.meta.nextSupportTicket ||= state.supportTickets.length + 1;
  const ticket = {
    id: `SUP-${pad(state.meta.nextSupportTicket++, 5)}`, customerId: customer.id,
    category: String(input.category || 'General').slice(0, 40), subject, message,
    status: 'open', assignedTo: '', createdAt: new Date().toISOString(), demoOnly: true
  };
  state.supportTickets.unshift(ticket);
  addAudit(state, 'Synthetic customer support ticket created', `${ticket.id} · ${customer.id} · no external call-centre service`);
  return ticket;
}

export function updateSupportTicket(state, ticketId, status, note = '') {
  const ticket = state.supportTickets?.find(item => item.id === ticketId);
  if (!ticket || !['open', 'in_progress', 'resolved'].includes(status)) throw new Error('Support ticket or requested status is invalid.');
  ticket.status = status;
  ticket.assignedTo = status === 'open' ? ticket.assignedTo || '' : state.settings?.operator || 'Demo support agent';
  ticket.lastNote = String(note || '').slice(0, 300);
  ticket.updatedAt = new Date().toISOString();
  addAudit(state, 'Demo support ticket updated', `${ticket.id} · ${status}; local training record only`);
  return ticket;
}

function containsSensitiveDemoInput(value) {
  return /(?:^|\D)\d(?:[\s-]*\d){11,18}(?=\D|$)/.test(String(value || '')) || /\b(password|passcode|cvv|cvc|pin|ssn|social security|passport|national id)\s*[:=]/i.test(String(value || ''));
}

export function createComplaint(state, input) {
  const customer = state.customers.find(item => item.id === input.customerId);
  if (!customer) throw new Error('Choose a fictional demo customer.');
  if (!input.syntheticConfirmed) throw new Error('Confirm that this is a fictional complaint rehearsal.');
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  if (subject.length < 3 || subject.length > 90 || message.length < 10 || message.length > 600) throw new Error('Add a short fictional complaint subject and description.');
  if (containsSensitiveDemoInput(`${subject} ${message}`)) throw new Error('Do not enter real account, card, password or government-ID details in this demo.');
  state.complaints ||= [];
  state.meta.nextComplaint ||= state.complaints.length + 1;
  const now = new Date();
  const practiceTarget = new Date(now);
  practiceTarget.setDate(practiceTarget.getDate() + 15);
  const complaint = {
    id: `CMP-${pad(state.meta.nextComplaint++, 5)}`, customerId: customer.id,
    category: String(input.category || 'General').slice(0, 50), subject, message,
    priority: input.priority === 'high' ? 'high_demo' : 'standard_demo', status: 'received',
    assignedTo: '', createdAt: now.toISOString(), practiceTargetAt: practiceTarget.toISOString(),
    acknowledgement: 'Local demo acknowledgement only; no email or legal notice was sent.',
    history: [{ at: now.toISOString(), status: 'received', note: 'Received in the local fictional practice queue.' }], demoOnly: true
  };
  state.complaints.unshift(complaint);
  addAudit(state, 'Synthetic complaint logged', `${complaint.id} · ${customer.id} · no external complaint service`);
  return complaint;
}

export function updateComplaint(state, complaintId, status, note = '') {
  const complaint = state.complaints?.find(item => item.id === complaintId);
  const allowed = ['received', 'investigating', 'response_ready', 'resolved', 'escalated', 'reopened'];
  if (!complaint || !allowed.includes(status)) throw new Error('Demo complaint or requested status is invalid.');
  const text = String(note || '').trim().slice(0, 500);
  if (containsSensitiveDemoInput(text)) throw new Error('Do not enter real account, card, password or government-ID details in this demo.');
  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  complaint.assignedTo = state.settings?.operator || 'Demo complaints reviewer';
  if (text) {
    complaint.staffNote = text;
    if (status === 'response_ready' || status === 'resolved') complaint.customerVisibleResponse = text;
  }
  complaint.history ||= [];
  complaint.history.unshift({ at: complaint.updatedAt, status, note: text || 'Status changed in the local demo.' });
  if (complaint.history.length > 30) complaint.history.length = 30;
  addAudit(state, 'Demo complaint updated', `${complaint.id} · ${status} · practice workflow only`);
  return complaint;
}

export function recordCashOperation(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const branch = state.branches.find(item => item.id === input.branchId);
  if (!branch) throw new Error('Choose a branch.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  const type = input.operation === 'withdrawal' ? 'cash_out' : 'cash_in';
  const reference = `CSH-${pad(state.meta.nextTx, 6)}`;
  if (type === 'cash_out') {
    requireFunds(account, amountCents);
    if (branch.cashCents < amountCents) throw new Error('Branch simulated vault does not have enough cash.');
    account.balanceCents -= amountCents;
    branch.cashCents -= amountCents;
  } else {
    account.balanceCents += amountCents;
    branch.cashCents += amountCents;
  }
  const tx = pushTransaction(state, { customerId: account.customerId, accountId: account.id, type, label: type === 'cash_in' ? 'Branch cash deposit' : 'Branch cash withdrawal', direction: type === 'cash_in' ? 'in' : 'out', amountCents, channel: `Branch · ${branch.code}`, counterparty: branch.name, reference });
  postJournal(state, type === 'cash_in' ? 'Teller cash deposit' : 'Teller cash withdrawal', type === 'cash_in' ? [
    { accountCode: '1010', debitCents: amountCents, creditCents: 0 }, { accountCode: '2000', debitCents: 0, creditCents: amountCents }
  ] : [
    { accountCode: '2000', debitCents: amountCents, creditCents: 0 }, { accountCode: '1010', debitCents: 0, creditCents: amountCents }
  ], reference);
  addAudit(state, `Teller ${input.operation}`, `${reference} · ${branch.code} · ${account.id}`);
  return tx;
}

export function issueCard(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === account.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Card issuance is restricted until the demo KYC status is verified.');
  const productType = ['premium', 'prepaid'].includes(input.product) ? input.product : 'standard';
  const seq = state.meta.nextCard++;
  const prepaid = productType === 'prepaid';
  const premium = productType === 'premium';
  const dailyLimitCents = prepaid ? 250000 : premium ? 1500000 : 800000;
  const card = {
    id: `CARD-${pad(seq, 4)}`, customerId: customer.id, accountId: account.id,
    product: prepaid ? 'Adria Prepaid Virtual' : premium ? 'Adria Premium Virtual Debit' : 'Adria Virtual Debit',
    fundingType: prepaid ? 'prepaid' : 'debit', formFactor: 'virtual',
    last4: pad((seq * 719 + 4187) % 10000), status: 'active', dailyLimitCents,
    monthlyLimitCents: prepaid ? 1000000 : premium ? 15000000 : 8000000,
    spentTodayCents: 0, spentMonthCents: 0, spendingDay: '', spendingMonth: '', prepaidBalanceCents: 0,
    controls: { ...DEFAULT_CARD_CONTROLS }, issuedAt: new Date().toISOString(), demoOnly: true
  };
  state.cards.unshift(card);
  addAudit(state, 'Virtual demo card token issued', `${card.id} · ${card.product} · token suffix only · no PAN, issuer or network`);
  return card;
}

export function setCardStatus(state, cardId, status) {
  const card = state.cards.find(item => item.id === cardId);
  if (!card || !['active', 'locked', 'cancelled'].includes(status)) throw new Error('Card or requested status is invalid.');
  if (card.status === status) return card;
  const allowedTransition = card.status === 'active' ? ['locked', 'cancelled'].includes(status)
    : card.status === 'locked' ? ['active', 'cancelled'].includes(status) : false;
  if (!allowedTransition) throw new Error('Only an active or locked demo card can change status; cancelled cards cannot be reopened.');

  const refundCents = status === 'cancelled' && card.fundingType === 'prepaid' ? card.prepaidBalanceCents : 0;
  const refundAccount = refundCents > 0 ? state.accounts.find(account => account.id === card.accountId) : null;
  if (refundCents > 0 && (!refundAccount || refundAccount.status !== 'active' || refundAccount.currency !== 'EUR')) {
    throw new Error('The linked active EUR demo account is needed to return a prepaid balance before card cancellation.');
  }
  if (refundCents > 0 && !['2000', '2030'].every(code => state.glAccounts.some(account => account.code === code))) {
    throw new Error('The local ledger is not ready to return this synthetic prepaid balance.');
  }

  card.status = status;
  if (refundCents > 0) {
    refundAccount.balanceCents += refundCents;
    card.prepaidBalanceCents = 0;
    const reference = `CARD-REFUND-${card.id}`;
    pushTransaction(state, {
      customerId: card.customerId, accountId: refundAccount.id, type: 'card_refund',
      label: 'Prepaid demo balance returned on cancellation', direction: 'in', amountCents: refundCents,
      currency: 'EUR', channel: 'Virtual card · local simulation', counterparty: 'Adria Prepaid Virtual · demo', reference,
      description: 'Remaining stored value returned to the linked synthetic EUR account; no issuer was contacted.'
    });
    postJournal(state, 'Return synthetic prepaid balance on card cancellation', [
      { accountCode: '2030', debitCents: refundCents, creditCents: 0 },
      { accountCode: '2000', debitCents: 0, creditCents: refundCents }
    ], reference);
  }
  addAudit(state, 'Demo card status changed', `${card.id} · ${status}${refundCents ? ` · ${refundCents} cents returned locally` : ''}`);
  return card;
}

export function setCardControls(state, cardId, input) {
  const card = state.cards.find(item => item.id === cardId);
  if (!card || card.status === 'cancelled' || card.status === 'pending') throw new Error('Choose an issued, non-cancelled demo card to manage.');
  const dailyLimitCents = input.dailyLimitCents;
  const monthlyLimitCents = input.monthlyLimitCents;
  const maxDaily = card.fundingType === 'prepaid' ? 500000 : card.product.includes('Premium') ? 5000000 : 2000000;
  const maxMonthly = card.fundingType === 'prepaid' ? 2500000 : card.product.includes('Premium') ? 25000000 : 10000000;
  if (!Number.isSafeInteger(dailyLimitCents) || dailyLimitCents < 100 || dailyLimitCents > maxDaily) throw new Error(`Set a daily limit between EUR 1.00 and EUR ${(maxDaily / 100).toLocaleString('en-GB')}.`);
  if (!Number.isSafeInteger(monthlyLimitCents) || monthlyLimitCents < dailyLimitCents || monthlyLimitCents > maxMonthly) throw new Error(`The monthly limit must be at least the daily limit and no more than EUR ${(maxMonthly / 100).toLocaleString('en-GB')}.`);
  card.dailyLimitCents = dailyLimitCents;
  card.monthlyLimitCents = monthlyLimitCents;
  card.controls = {
    onlineEnabled: Boolean(input.onlineEnabled),
    internationalEnabled: Boolean(input.internationalEnabled),
    recurringEnabled: Boolean(input.recurringEnabled)
  };
  addAudit(state, 'Local demo card controls updated', `${card.id} · online ${card.controls.onlineEnabled ? 'on' : 'off'} · international ${card.controls.internationalEnabled ? 'on' : 'off'} · recurring ${card.controls.recurringEnabled ? 'on' : 'off'} · no issuer connection`);
  return card;
}

export function loadPrepaidCard(state, cardId, amountCents) {
  const card = state.cards.find(item => item.id === cardId);
  if (!card || card.fundingType !== 'prepaid') throw new Error('Choose a synthetic prepaid virtual card.');
  if (card.status !== 'active') throw new Error('Only an active prepaid demo card can be loaded.');
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 100000) throw new Error('A local prepaid load must be between EUR 1.00 and EUR 1,000.00.');
  const maxBalanceCents = 250000;
  if (card.prepaidBalanceCents + amountCents > maxBalanceCents) throw new Error('This demo prepaid token has a maximum stored value of EUR 2,500.00.');
  const account = requireAccount(state, card.accountId, 'EUR');
  if (account.customerId !== card.customerId) throw new Error('The card and funding account do not have the same demo owner.');
  requireFunds(account, amountCents);
  if (!['2000', '2030'].every(code => state.glAccounts.some(item => item.code === code))) throw new Error('The local ledger is not ready to load a synthetic prepaid balance.');

  account.balanceCents -= amountCents;
  card.prepaidBalanceCents += amountCents;
  const reference = `CARD-LOAD-${card.id}-${pad(state.meta.nextTx, 6)}`;
  const transaction = pushTransaction(state, {
    customerId: card.customerId, accountId: account.id, type: 'card_load',
    label: 'Prepaid virtual-card load · demo', direction: 'out', amountCents, currency: 'EUR',
    channel: 'Virtual card · local simulation', counterparty: card.product, reference,
    description: 'Local movement from a synthetic EUR account to a prepaid demo-token balance; no processor or payment rail.'
  });
  postJournal(state, 'Load synthetic prepaid-card balance', [
    { accountCode: '2000', debitCents: amountCents, creditCents: 0 },
    { accountCode: '2030', debitCents: 0, creditCents: amountCents }
  ], reference);
  addAudit(state, 'Synthetic prepaid virtual card loaded', `${card.id} · EUR ${(amountCents / 100).toFixed(2)} · local ledger only`);
  return { card, account, transaction };
}

export function simulateCardPurchase(state, input) {
  const card = state.cards.find(item => item.id === input.cardId);
  if (!card || card.status !== 'active') throw new Error('Choose an active demo card; locked, pending or cancelled cards cannot be used.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive demo purchase amount.');
  const merchant = String(input.merchant || '').trim();
  if (merchant.length < 2 || merchant.length > 60 || containsSensitiveDemoInput(merchant)) throw new Error('Choose a fictional merchant label only; do not enter real card or account data.');
  const channel = ['online', 'in_person', 'recurring'].includes(input.channel) ? input.channel : 'in_person';
  card.controls = { ...DEFAULT_CARD_CONTROLS, ...(card.controls || {}) };
  if (channel === 'online' && !card.controls.onlineEnabled) throw new Error('Online demo purchases are disabled by this card control.');
  if (channel === 'recurring' && !card.controls.recurringEnabled) throw new Error('Recurring demo purchases are disabled by this card control.');
  if (input.international && !card.controls.internationalEnabled) throw new Error('International demo purchases are disabled by this card control.');

  const account = state.accounts.find(item => item.id === card.accountId);
  if (!account || account.status !== 'active' || account.currency !== 'EUR' || account.customerId !== card.customerId) throw new Error('An active linked synthetic EUR account is required for this card rehearsal.');
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const spentToday = card.spendingDay === today ? card.spentTodayCents : 0;
  const spentMonth = card.spendingMonth === month ? card.spentMonthCents : 0;
  if (spentToday + amountCents > card.dailyLimitCents) throw new Error('Demo purchase exceeds the card daily limit.');
  if (spentMonth + amountCents > card.monthlyLimitCents) throw new Error('Demo purchase exceeds the card monthly limit.');
  if (card.fundingType === 'prepaid') {
    if (card.prepaidBalanceCents < amountCents) throw new Error('Insufficient synthetic prepaid-card balance. Load the local demo token first.');
  } else {
    requireFunds(account, amountCents);
  }
  const fundingCode = card.fundingType === 'prepaid' ? '2030' : '2000';
  if (![fundingCode, '2020'].every(code => state.glAccounts.some(item => item.code === code))) throw new Error('The local card rehearsal ledger is not ready.');

  if (card.fundingType === 'prepaid') card.prepaidBalanceCents -= amountCents;
  else account.balanceCents -= amountCents;
  card.spendingDay = today;
  card.spendingMonth = month;
  card.spentTodayCents = spentToday + amountCents;
  card.spentMonthCents = spentMonth + amountCents;
  const reference = `CARD-PURCHASE-${card.id}-${pad(state.meta.nextTx, 6)}`;
  const transaction = pushTransaction(state, {
    customerId: card.customerId, accountId: account.id, type: 'card_purchase',
    label: card.fundingType === 'prepaid' ? 'Prepaid virtual-card purchase · demo' : 'Virtual-card purchase · demo',
    direction: 'out', amountCents, currency: 'EUR', channel: `Virtual card · ${channel.replace('_', ' ')} · local`,
    counterparty: merchant, reference,
    description: `Fictional ${input.international ? 'international' : 'domestic'} purchase rehearsal. No PAN, issuer processor, card network or live authorisation.`
  });
  postJournal(state, card.fundingType === 'prepaid' ? 'Synthetic prepaid-card purchase rehearsal' : 'Synthetic virtual-card purchase rehearsal', [
    { accountCode: fundingCode, debitCents: amountCents, creditCents: 0 },
    { accountCode: '2020', debitCents: 0, creditCents: amountCents }
  ], reference);
  addAudit(state, 'Local virtual-card purchase simulated', `${card.id} · ${merchant} · EUR ${(amountCents / 100).toFixed(2)} · no issuer or network`);
  return { card, account, transaction };
}

export function openSavingsDeposit(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === account.customerId);
  if (customer?.kyc !== 'verified') throw new Error('New savings products require verified demo KYC.');
  const amountCents = input.amountCents;
  const termMonths = Number(input.termMonths);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  if (![3, 6, 12, 18, 24].includes(termMonths)) throw new Error('Choose an available term.');
  requireFunds(account, amountCents);
  account.balanceCents -= amountCents;
  const id = `TD-${pad(state.meta.nextDeposit++, 4)}`;
  const openedAt = new Date();
  const maturityAt = new Date(openedAt);
  maturityAt.setMonth(maturityAt.getMonth() + termMonths);
  const deposit = { id, customerId: customer.id, accountId: account.id, principalCents: amountCents, annualRateBps: ({ 3: 145, 6: 175, 12: 205, 18: 215, 24: 225 })[termMonths], termMonths, openedAt: openedAt.toISOString(), maturityAt: maturityAt.toISOString(), status: 'active', demoOnly: true };
  state.deposits.unshift(deposit);
  const tx = pushTransaction(state, { customerId: customer.id, accountId: account.id, type: 'savings_open', label: 'Fixed-term savings placement', direction: 'out', amountCents, channel: 'Adria Savings', counterparty: 'Adria Bank · savings', reference: id, description: `${termMonths}-month simulated term deposit` });
  postJournal(state, 'Term deposit placement', [
    { accountCode: '2000', debitCents: amountCents, creditCents: 0 }, { accountCode: '2010', debitCents: 0, creditCents: amountCents }
  ], id);
  addAudit(state, 'Savings deposit opened', `${id} · ${termMonths} months · ${tx.id}`);
  return deposit;
}

export function matureSavingsDeposit(state, depositId) {
  const deposit = state.deposits.find(item => item.id === depositId);
  if (!deposit || deposit.status !== 'active') throw new Error('Active savings deposit not found.');
  const account = state.accounts.find(item => item.id === deposit.accountId);
  if (!account) throw new Error('Linked customer account is unavailable.');
  const interestCents = Math.round(deposit.principalCents * (deposit.annualRateBps / 10000) * (deposit.termMonths / 12));
  const total = deposit.principalCents + interestCents;
  deposit.status = 'matured_simulation';
  deposit.maturedAt = new Date().toISOString();
  deposit.interestPaidCents = interestCents;
  account.balanceCents += total;
  pushTransaction(state, { customerId: deposit.customerId, accountId: account.id, type: 'savings_mature', label: 'Savings maturity (simulated)', direction: 'in', amountCents: total, channel: 'Adria Savings', counterparty: 'Adria Bank · savings', reference: deposit.id, description: `Principal plus simulated interest: ${interestCents} cents` });
  postJournal(state, 'Term deposit maturity and interest', [
    { accountCode: '2010', debitCents: deposit.principalCents, creditCents: 0 },
    { accountCode: '5000', debitCents: interestCents, creditCents: 0 },
    { accountCode: '2000', debitCents: 0, creditCents: total }
  ], deposit.id);
  addAudit(state, 'Savings maturity simulated', `${deposit.id} · principal and indicative interest credited locally`);
  return deposit;
}

export function createLoanApplication(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === account.customerId);
  if (!customer || customer.kyc !== 'verified') throw new Error('Credit applications require verified demo KYC.');
  if (customer.risk === 'high') throw new Error('Higher-risk demo profiles require enhanced review before a credit application.');
  const amountCents = input.amountCents;
  const termMonths = Number(input.termMonths);
  if (!Number.isSafeInteger(amountCents) || amountCents < 100000 || amountCents > 5000000) throw new Error('Demo application amount must be between EUR 1,000 and EUR 50,000.');
  if (![12, 24, 36, 48, 60].includes(termMonths)) throw new Error('Choose a supported loan term.');
  const id = `LN-${pad(state.meta.nextLoan++, 5)}`;
  const allowedProducts = ['Personal loan', 'Home improvement loan', 'SME working capital', 'Overdraft facility'];
  const product = allowedProducts.includes(input.product) ? input.product : customer.kind === 'business' ? 'SME working capital' : 'Personal loan';
  const annualRateBps = product === 'Overdraft facility' ? 1250 : customer.kind === 'business' ? 775 : 825;
  const application = {
    id, customerId: customer.id, accountId: account.id,
    product,
    principalCents: amountCents, outstandingCents: 0, annualRateBps,
    termMonths, openedAt: new Date().toISOString(), maturityAt: null, nextPaymentAt: null,
    status: 'awaiting_approval', purpose: String(input.purpose || 'Synthetic demo application'),
    collateral: 'Pending underwriting (demo)', demoOnly: true
  };
  state.loans.unshift(application);
  addAudit(state, 'Synthetic credit application queued', `${application.id} · ${customer.id} · awaiting checker approval`);
  return application;
}

export function approveLoanApplication(state, loanId) {
  const loan = state.loans.find(item => item.id === loanId);
  if (!loan || loan.status !== 'awaiting_approval') throw new Error('Loan application is not awaiting approval.');
  const customer = state.customers.find(item => item.id === loan.customerId);
  if (customer?.kyc !== 'verified' || customer.risk === 'high') throw new Error('Customer requires an enhanced credit and KYC review.');
  requireAccount(state, loan.accountId, 'EUR');
  loan.status = 'approved_undisbursed';
  loan.approvedAt = new Date().toISOString();
  loan.approvedBy = 'Supervisor (demo)';
  addAudit(state, 'Credit application approved (simulation)', `${loan.id} · awaiting a separate simulated disbursement`, 'Supervisor (demo)');
  return loan;
}

export function disburseLoan(state, loanId) {
  const loan = state.loans.find(item => item.id === loanId);
  if (!loan || loan.status !== 'approved_undisbursed') throw new Error('Loan must be approved before simulated disbursement.');
  const account = requireAccount(state, loan.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === loan.customerId);
  if (!customer || customer.kyc !== 'verified' || customer.risk === 'high') throw new Error('Customer requires an enhanced credit and KYC review before disbursement.');
  if (!Number.isSafeInteger(loan.principalCents) || loan.principalCents <= 0) throw new Error('Invalid synthetic loan principal.');
  loan.status = 'performing';
  loan.outstandingCents = loan.principalCents;
  loan.disbursedAt = new Date().toISOString();
  const maturity = new Date(loan.disbursedAt);
  maturity.setMonth(maturity.getMonth() + loan.termMonths);
  loan.maturityAt = maturity.toISOString();
  loan.nextPaymentAt = new Date(Date.now() + 30 * 86400000).toISOString();
  account.balanceCents += loan.principalCents;
  pushTransaction(state, {
    customerId: customer.id, accountId: account.id, type: 'loan_disbursement', label: 'Credit disbursement (simulated)',
    direction: 'in', amountCents: loan.principalCents, channel: 'Adria Credit (demo)', counterparty: 'Adria Bank · credit',
    reference: loan.id, description: 'Synthetic credit disbursement; no real loan agreement.'
  });
  postJournal(state, 'Synthetic credit disbursement', [
    { accountCode: '1100', debitCents: loan.principalCents, creditCents: 0 },
    { accountCode: '2000', debitCents: 0, creditCents: loan.principalCents }
  ], loan.id);
  addAudit(state, 'Credit disbursement simulated', `${loan.id} · credited to synthetic account; no real loan granted`, 'Supervisor (demo)');
  return loan;
}

export function makeLoanRepayment(state, input) {
  const loan = state.loans.find(item => item.id === input.loanId);
  if (!loan || !['performing', 'arrears'].includes(loan.status)) throw new Error('Choose an active synthetic loan.');
  const account = requireAccount(state, input.accountId, 'EUR');
  if (account.id !== loan.accountId) throw new Error('Select the linked customer settlement account.');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  const monthlyInterestCents = Math.round(loan.outstandingCents * loan.annualRateBps / 10000 / 12);
  if (amountCents > loan.outstandingCents + monthlyInterestCents) throw new Error('Payment exceeds the outstanding principal plus one indicative monthly interest amount.');
  const interestCents = Math.min(amountCents, monthlyInterestCents);
  const principalCents = Math.min(loan.outstandingCents, amountCents - interestCents);
  if (principalCents <= 0) throw new Error('Payment must include an amount toward principal.');
  requireFunds(account, amountCents);
  account.balanceCents -= amountCents;
  loan.outstandingCents -= principalCents;
  loan.interestPaidCents = (loan.interestPaidCents || 0) + interestCents;
  loan.status = loan.outstandingCents <= 0 ? 'repaid_simulation' : 'performing';
  loan.lastPaymentAt = new Date().toISOString();
  const reference = `LR-${loan.id}-${pad(state.meta.nextTx, 5)}`;
  pushTransaction(state, {
    customerId: loan.customerId, accountId: account.id, type: 'loan_repayment', label: 'Credit instalment (simulated)',
    direction: 'out', amountCents, channel: 'Adria Credit (demo)', counterparty: 'Adria Bank · credit',
    reference, description: `Principal ${principalCents} cents; indicative interest ${interestCents} cents.`
  });
  postJournal(state, 'Synthetic credit repayment', [
    { accountCode: '2000', debitCents: amountCents, creditCents: 0 },
    { accountCode: '1100', debitCents: 0, creditCents: principalCents },
    { accountCode: '4100', debitCents: 0, creditCents: interestCents }
  ], reference);
  addAudit(state, 'Credit repayment simulated', `${loan.id} · principal and indicative interest posted locally`);
  return loan;
}

function getWallet(state, customerId, asset) {
  let wallet = state.wallets.find(item => item.customerId === customerId && item.asset === asset);
  if (!wallet) {
    wallet = { id: `WAL-${customerId}-${asset}`, customerId, asset, units: 0, bookCents: 0, updatedAt: new Date().toISOString(), demoOnly: true };
    state.wallets.push(wallet);
  }
  return wallet;
}
export function quoteExchange(asset, side, amount) {
  const item = CURRENCIES[asset];
  if (!item || asset === 'EUR' || !Number.isFinite(item.eurRate) || item.eurRate <= 0 || item.exchangeEnabled === false) {
    throw new Error('Choose a supported asset with a clearly labelled demo reference. Native-only currencies have no conversion quote.');
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Enter a valid positive amount.');
  const direction = side === 'sell' ? 'sell' : 'buy';
  const spread = item.crypto ? CRYPTO_SPREAD : FX_SPREAD;
  // Buy amount is entered in EUR; sell amount is entered in native asset units.
  const grossEur = direction === 'buy' ? amountNum : amountNum * item.eurRate;
  const netEur = grossEur * (1 - spread);
  const units = direction === 'buy' ? netEur / item.eurRate : amountNum;
  const payoutEur = direction === 'sell' ? netEur : 0;
  return { asset, side: direction, spread, units, grossEur, netEur, payoutEur, amount: amountNum, quoteEurPerUnit: item.eurRate };
}

export function executeExchangeTrade(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const customer = state.customers.find(item => item.id === account.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Exchange access requires verified demo KYC.');
  const asset = input.asset;
  if (!CURRENCIES[asset] || asset === 'EUR') throw new Error('Choose a supported currency or demo crypto-asset.');
  const side = input.side === 'sell' ? 'sell' : 'buy';
  const quote = quoteExchange(asset, side, input.amount);
  const wallet = getWallet(state, customer.id, asset);
  const spreadCents = Math.max(1, Math.round(quote.grossEur * quote.spread * 100));
  let eurCents;
  let tradeUnits;
  const reference = `TRD-${pad(state.meta.nextTrade++, 5)}`;
  if (side === 'buy') {
    eurCents = moneyToCents(quote.amount);
    tradeUnits = Number(quote.units.toFixed(CURRENCIES[asset].decimals));
    requireFunds(account, eurCents);
    account.balanceCents -= eurCents;
    const bookValueCents = eurCents - spreadCents;
    wallet.units = Number((wallet.units + tradeUnits).toFixed(CURRENCIES[asset].decimals));
    wallet.bookCents += bookValueCents;
    wallet.updatedAt = new Date().toISOString();
    postJournal(state, `Demo exchange buy ${asset}`, [
      { accountCode: '2000', debitCents: eurCents, creditCents: 0 },
      { accountCode: '2300', debitCents: 0, creditCents: bookValueCents },
      { accountCode: '4000', debitCents: 0, creditCents: spreadCents }
    ], reference);
  } else {
    tradeUnits = Number(quote.amount.toFixed(CURRENCIES[asset].decimals));
    if (wallet.units + 1e-12 < tradeUnits) throw new Error(`Insufficient ${asset} demo-wallet balance.`);
    const fraction = Math.min(1, tradeUnits / wallet.units);
    const bookValueCents = Math.round(wallet.bookCents * fraction);
    eurCents = Math.max(1, moneyToCents(quote.payoutEur));
    if (eurCents > bookValueCents) {
      postJournal(state, `Demo exchange sell ${asset}`, [
        { accountCode: '2300', debitCents: bookValueCents, creditCents: 0 },
        { accountCode: '4000', debitCents: eurCents - bookValueCents, creditCents: 0 },
        { accountCode: '2000', debitCents: 0, creditCents: eurCents }
      ], reference);
    } else {
      postJournal(state, `Demo exchange sell ${asset}`, [
        { accountCode: '2300', debitCents: bookValueCents, creditCents: 0 },
        { accountCode: '2000', debitCents: 0, creditCents: eurCents },
        { accountCode: '4000', debitCents: 0, creditCents: bookValueCents - eurCents }
      ], reference);
    }
    account.balanceCents += eurCents;
    wallet.units = Number(Math.max(0, wallet.units - tradeUnits).toFixed(CURRENCIES[asset].decimals));
    wallet.bookCents = Math.max(0, wallet.bookCents - bookValueCents);
    wallet.updatedAt = new Date().toISOString();
  }
  const trade = {
    id: reference, customerId: customer.id, accountId: account.id, side, asset, units: tradeUnits,
    eurCents, spreadCents, status: 'settled_simulation', createdAt: new Date().toISOString(),
    quoteEurPerUnit: CURRENCIES[asset].eurRate, note: 'Indicative offline demo quote; not a live market price.', demoOnly: true
  };
  state.exchangeTrades.unshift(trade);
  pushTransaction(state, { customerId: customer.id, accountId: account.id, type: 'exchange', label: `${side === 'buy' ? 'Buy' : 'Sell'} ${asset} (simulated)`, direction: side === 'buy' ? 'out' : 'in', amountCents: eurCents, channel: 'Adria Exchange', counterparty: `${asset} / EUR`, reference });
  addAudit(state, 'Exchange trade simulated', `${reference} · ${side} ${tradeUnits} ${asset} · local wallet only`);
  return trade;
}

function demoWalletAddress(value) {
  return /^DEMO-WALLET-[A-Z0-9-]{4,72}$/i.test(String(value || '').trim());
}

export function createCryptoTransfer(state, input) {
  const customer = state.customers.find(item => item.id === input.customerId);
  if (!customer || customer.kyc !== 'verified') throw new Error('Crypto wallet rehearsal requires verified demo KYC.');
  const asset = String(input.asset || '').toUpperCase();
  const meta = CURRENCIES[asset];
  if (!meta?.crypto || !Number.isFinite(meta.eurRate) || meta.eurRate <= 0) throw new Error('Choose a supported offline demo crypto asset.');
  const units = Number(input.units);
  if (!Number.isFinite(units) || units <= 0) throw new Error('Enter a positive asset amount.');
  const roundedUnits = Number(units.toFixed(meta.decimals));
  if (roundedUnits !== units) throw new Error(`Amount exceeds the ${meta.decimals}-decimal demo precision for ${asset}.`);
  const destination = String(input.destination || '').trim();
  if (!demoWalletAddress(destination)) throw new Error('Use a DEMO-WALLET-… destination. Real blockchain addresses are not accepted.');
  const wallet = getWallet(state, customer.id, asset);
  wallet.reservedUnits = Number(wallet.reservedUnits) || 0;
  if (wallet.units - wallet.reservedUnits + 1e-12 < roundedUnits) throw new Error(`Insufficient available ${asset} demo-wallet balance.`);
  wallet.reservedUnits += roundedUnits;
  state.walletTransfers ||= [];
  state.meta.nextCryptoTransfer ||= 1;
  const id = `CWT-${pad(state.meta.nextCryptoTransfer++, 6)}`;
  const transfer = {
    id, direction: 'out', customerId: customer.id, walletId: wallet.id, asset, units: roundedUnits,
    destination, network: 'LOCAL-DEMO · no blockchain', status: 'awaiting_approval',
    createdAt: new Date().toISOString(), demoOnly: true,
    note: 'Queued in the local rehearsal only. No blockchain, custodian or wallet network is connected.'
  };
  state.walletTransfers.unshift(transfer);
  addAudit(state, 'Demo crypto withdrawal queued', `${id} · ${roundedUnits} ${asset} · local-only fake destination`);
  return transfer;
}

export function createCryptoReceipt(state, input) {
  const customer = state.customers.find(item => item.id === input.customerId);
  if (!customer || customer.kyc !== 'verified') throw new Error('Crypto wallet rehearsal requires verified demo KYC.');
  const asset = String(input.asset || '').toUpperCase();
  const meta = CURRENCIES[asset];
  if (!meta?.crypto || !Number.isFinite(meta.eurRate) || meta.eurRate <= 0) throw new Error('Choose a supported offline demo crypto asset.');
  const units = Number(input.units);
  if (!Number.isFinite(units) || units <= 0) throw new Error('Enter a positive asset amount.');
  const roundedUnits = Number(units.toFixed(meta.decimals));
  if (roundedUnits !== units) throw new Error(`Amount exceeds the ${meta.decimals}-decimal demo precision for ${asset}.`);
  const sender = String(input.sender || '').trim();
  if (!demoWalletAddress(sender)) throw new Error('Use a DEMO-WALLET-… source. Real blockchain addresses are not accepted.');
  const wallet = getWallet(state, customer.id, asset);
  state.walletTransfers ||= [];
  state.meta.nextCryptoTransfer ||= 1;
  const id = `CWT-${pad(state.meta.nextCryptoTransfer++, 6)}`;
  const transfer = {
    id, direction: 'in', customerId: customer.id, walletId: wallet.id, asset, units: roundedUnits,
    source: sender, network: 'LOCAL-DEMO · no blockchain', status: 'awaiting_approval',
    createdAt: new Date().toISOString(), demoOnly: true,
    note: 'Pending fictional review. No tokens were received from a blockchain or third party.'
  };
  state.walletTransfers.unshift(transfer);
  addAudit(state, 'Demo crypto receipt queued', `${id} · ${roundedUnits} ${asset} · no external wallet connection`);
  return transfer;
}

export function approveCryptoTransfer(state, transferId) {
  const transfer = (state.walletTransfers || []).find(item => item.id === transferId);
  if (!transfer || transfer.status !== 'awaiting_approval') throw new Error('Crypto wallet rehearsal is not awaiting approval.');
  const customer = state.customers.find(item => item.id === transfer.customerId);
  if (customer?.kyc !== 'verified') throw new Error('Checker approval requires verified demo KYC.');
  const wallet = state.wallets.find(item => item.id === transfer.walletId);
  const meta = CURRENCIES[transfer.asset];
  if (!wallet || !meta?.crypto || !Number.isFinite(meta.eurRate) || meta.eurRate <= 0) throw new Error('The local demo wallet is unavailable.');
  if (transfer.direction === 'out') {
    if (wallet.units + 1e-12 < transfer.units) throw new Error(`Insufficient ${transfer.asset} demo-wallet balance.`);
    const fraction = Math.min(1, transfer.units / wallet.units);
    const bookCents = Math.round(wallet.bookCents * fraction);
    if (bookCents <= 0 || wallet.bookCents < bookCents) throw new Error('This amount has no positive local book value to journal in the demo ledger.');
    wallet.reservedUnits = Math.max(0, (Number(wallet.reservedUnits) || 0) - transfer.units);
    wallet.units = Number(Math.max(0, wallet.units - transfer.units).toFixed(meta.decimals));
    wallet.bookCents = Math.max(0, wallet.bookCents - bookCents);
    transfer.bookCents = bookCents;
    transfer.status = 'approved_simulation';
    postJournal(state, 'Demo crypto withdrawal · local rehearsal', [
      { accountCode: '2300', debitCents: bookCents, creditCents: 0 },
      { accountCode: '1300', debitCents: 0, creditCents: bookCents }
    ], transfer.id);
    pushTransaction(state, { customerId: customer.id, accountId: state.accounts.find(item => item.customerId === customer.id && item.currency === 'EUR')?.id || '', type: 'crypto_out', label: `Crypto wallet send · ${transfer.units} ${transfer.asset}`, direction: 'out', amountCents: bookCents, currency: 'EUR', channel: 'Local crypto rehearsal', counterparty: transfer.destination, reference: transfer.id, description: 'Indicative offline book value only. No blockchain transaction was created.' });
  } else {
    const bookCents = Math.max(1, Math.round(transfer.units * meta.eurRate * 100));
    wallet.units = Number((wallet.units + transfer.units).toFixed(meta.decimals));
    wallet.bookCents += bookCents;
    wallet.updatedAt = new Date().toISOString();
    transfer.bookCents = bookCents;
    transfer.status = 'settled_simulation';
    postJournal(state, 'Demo crypto receipt · local rehearsal', [
      { accountCode: '1300', debitCents: bookCents, creditCents: 0 },
      { accountCode: '2300', debitCents: 0, creditCents: bookCents }
    ], transfer.id);
    pushTransaction(state, { customerId: customer.id, accountId: state.accounts.find(item => item.customerId === customer.id && item.currency === 'EUR')?.id || '', type: 'crypto_in', label: `Crypto wallet receipt · ${transfer.units} ${transfer.asset}`, direction: 'in', amountCents: bookCents, currency: 'EUR', channel: 'Local crypto rehearsal', counterparty: transfer.source, reference: transfer.id, description: 'Offline sample book value only. No blockchain deposit was received.' });
  }
  wallet.updatedAt = new Date().toISOString();
  transfer.approvedAt = new Date().toISOString();
  transfer.approvedBy = 'Checker (demo)';
  addAudit(state, 'Crypto wallet rehearsal approved locally', `${transfer.id} · no blockchain or custodian connectivity`, 'Checker (demo)');
  return transfer;
}

export function cancelCryptoTransfer(state, transferId) {
  const transfer = (state.walletTransfers || []).find(item => item.id === transferId);
  if (!transfer || transfer.status !== 'awaiting_approval') throw new Error('Only a queued wallet rehearsal can be cancelled.');
  if (transfer.direction === 'out') {
    const wallet = state.wallets.find(item => item.id === transfer.walletId);
    if (wallet) wallet.reservedUnits = Math.max(0, (Number(wallet.reservedUnits) || 0) - transfer.units);
  }
  transfer.status = 'cancelled';
  transfer.cancelledAt = new Date().toISOString();
  addAudit(state, 'Crypto wallet rehearsal cancelled', `${transfer.id} · nothing was broadcast`);
  return transfer;
}

export function simulateAtmWithdrawal(state, input) {
  const atm = state.atms.find(item => item.id === input.atmId);
  if (!atm || atm.status !== 'online') throw new Error('Choose an online demo ATM.');
  const account = requireAccount(state, input.accountId, 'EUR');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  if (amountCents > atm.dailyLimitCents) throw new Error('Amount exceeds this demo ATM daily limit.');
  if (account.balanceCents < amountCents || atm.cashCents < amountCents) throw new Error('Insufficient account or ATM demo cash.');
  account.balanceCents -= amountCents;
  atm.cashCents -= amountCents;
  atm.lastCheck = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const tx = pushTransaction(state, { customerId: account.customerId, accountId: account.id, type: 'atm', label: 'ATM cash withdrawal (simulated)', direction: 'out', amountCents, channel: `ATM · ${atm.id}`, counterparty: atm.name, reference: `ATM-${pad(state.meta.nextTx, 6)}` });
  postJournal(state, 'ATM cash withdrawal', [
    { accountCode: '2000', debitCents: amountCents, creditCents: 0 }, { accountCode: '1020', debitCents: 0, creditCents: amountCents }
  ], tx.reference);
  addAudit(state, 'ATM withdrawal simulated', `${atm.id} · ${account.id} · no physical cash dispensed`);
  return tx;
}

export function createSwiftMessage(state, input) {
  const account = requireAccount(state, input.accountId, 'EUR');
  const amountCents = input.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter a valid positive amount.');
  const beneficiary = String(input.beneficiary || '').trim();
  const suppliedBic = String(input.bic || '').trim().toUpperCase().replace(/\s/g, '');
  if (beneficiary.length < 2) throw new Error('Enter a beneficiary name.');
  const beneficiaryCountry = String(input.country || suppliedBic.slice(4, 6) || 'HR').toUpperCase();
  const bic = suppliedBic || createDemoBic(beneficiaryCountry);
  if (!/^DEMO[A-Z]{2}2XXXX$/.test(bic) || bic.slice(4, 6) !== beneficiaryCountry) throw new Error('Use the generated DEMO-only BIC matching the selected beneficiary country.');
  const id = `SWF-${pad(state.meta.nextSwift++, 5)}`;
  const message = {
    id, direction: 'outgoing', type: 'MT103', beneficiary,
    beneficiaryBank: String(input.bank || 'Fictional correspondent (demo)').trim(), bic, beneficiaryCountry,
    beneficiaryIban: createDemoIban(beneficiaryCountry, Number(id.slice(-5))) || `DEMO-${beneficiaryCountry}-${pad(Number(id.slice(-5)), 10)}`, amountCents, currency: 'EUR',
    customerId: account.customerId, accountId: account.id, status: 'awaiting_approval',
    reference: `DEMO-${id}`, createdAt: new Date().toISOString(), purpose: String(input.purpose || 'Demo payment'),
    demoOnly: true, mt103: `:20:${id}\n:23B:CRED\n:32A:${new Date().toISOString().slice(2, 10).replaceAll('-', '')}EUR${(amountCents / 100).toFixed(2)}\n:50K:${account.id}\n:59:${beneficiary}\n:57A:${bic}\n:70:${String(input.purpose || 'DEMO PAYMENT').slice(0, 35)}\n:71A:SHA`
  };
  state.swiftMessages.unshift(message);
  addAudit(state, 'SWIFT-format message prepared', `${id} · MT103 demo draft · no SWIFT connection`);
  return message;
}

export function approveSwiftMessage(state, messageId) {
  const message = state.swiftMessages.find(item => item.id === messageId);
  if (!message || message.status !== 'awaiting_approval') throw new Error('Message is not awaiting approval.');
  const account = requireAccount(state, message.accountId, 'EUR');
  requireFunds(account, message.amountCents);
  account.balanceCents -= message.amountCents;
  message.status = 'approved_simulation';
  message.approvedAt = new Date().toISOString();
  message.note = 'Checker approved for local rehearsal only; MT103 was not transmitted.';
  pushTransaction(state, { customerId: message.customerId, accountId: account.id, type: 'swift_out', label: 'International payment (simulation)', direction: 'out', amountCents: message.amountCents, channel: 'SWIFT lab', counterparty: message.beneficiary, reference: message.reference, description: 'Approved in local simulation; not sent to SWIFT.' });
  postJournal(state, 'Simulated SWIFT nostro settlement', [
    { accountCode: '2000', debitCents: message.amountCents, creditCents: 0 },
    { accountCode: '1200', debitCents: 0, creditCents: message.amountCents }
  ], message.id);
  addAudit(state, 'SWIFT checker approval simulated', `${message.id} · not transmitted to SWIFT`, 'Supervisor (demo)');
  return message;
}

export function updateCaseStatus(state, caseId, status, note = '') {
  const item = state.cases.find(entry => entry.id === caseId);
  if (!item || !['open', 'investigating', 'escalated', 'closed'].includes(status)) throw new Error('AML case or requested status is invalid.');
  item.status = status;
  item.updatedAt = new Date().toISOString();
  if (note.trim()) item.reviewNote = note.trim();
  item.assignedTo = state.settings?.operator || 'Demo analyst';
  addAudit(state, 'AML case disposition changed', `${item.id} · ${status} · synthetic case`);
  return item;
}

export function updateCustomerKyc(state, customerId, status) {
  const customer = state.customers.find(item => item.id === customerId);
  if (!customer || !['pending', 'verified', 'expired', 'edd'].includes(status)) throw new Error('Customer or requested KYC status is invalid.');
  customer.kyc = status;
  if (customer.kycRequest) {
    customer.kycRequest.status = status;
    customer.kycRequest.reviewedAt = new Date().toISOString();
    customer.kycRequest.reviewedBy = state.settings?.operator || 'Demo reviewer';
  }
  if (status === 'verified') {
    for (const account of state.accounts.filter(item => item.customerId === customerId && item.status === 'restricted')) account.status = 'active';
  }
  addAudit(state, 'Demo KYC status changed', `${customer.id} · ${status}; no identity verification performed`);
  return customer;
}

export function submitDemoKycRequest(state, customerId, syntheticConfirmed, details = {}) {
  const customer = state.customers.find(item => item.id === customerId);
  if (!customer) throw new Error('Customer not found.');
  if (!syntheticConfirmed) throw new Error('Confirm that this is a synthetic verification rehearsal.');
  if (customer.kyc === 'verified') throw new Error('This demo profile is already marked verified.');
  const allowedSources = new Set(['salary', 'business_revenue', 'savings', 'pension', 'investment', 'other_synthetic']);
  const allowedPurposes = new Set(['daily_personal', 'salary_receipts', 'business_operations', 'savings', 'cross_border_practice', 'other_synthetic']);
  const allowedBands = new Set(['under_2k', '2k_10k', '10k_50k', 'over_50k', 'unknown_synthetic']);
  const allowedDocuments = new Set(['synthetic_identity_sample', 'synthetic_address_sample', 'synthetic_register_sample', 'synthetic_ownership_chart']);
  const sourceOfFunds = String(details.sourceOfFunds || 'other_synthetic');
  const purpose = String(details.purpose || 'other_synthetic');
  const expectedMonthlyBand = String(details.expectedMonthlyBand || 'unknown_synthetic');
  if (!allowedSources.has(sourceOfFunds) || !allowedPurposes.has(purpose) || !allowedBands.has(expectedMonthlyBand)) throw new Error('Choose from the fictional KYC rehearsal categories.');
  const mockDocuments = [...new Set(Array.isArray(details.mockDocuments) ? details.mockDocuments.map(String).filter(value => allowedDocuments.has(value)) : [])];
  const now = new Date().toISOString();
  customer.kycRequest = {
    sourceOfFunds, purpose, expectedMonthlyBand, mockDocuments,
    ownershipSectionReviewed: Boolean(details.ownershipSectionReviewed && customer.kind === 'business'),
    syntheticRiskScenario: details.syntheticRiskScenario === 'enhanced_review_demo' ? 'enhanced_review_demo' : 'standard_demo',
    submittedAt: now, status: 'pending', demoOnly: true
  };
  customer.kyc = 'pending';
  customer.kycSubmittedAt = now;
  addAudit(state, 'Online KYC request simulated', `${customer.id} · fictional category checklist only; no identity values or documents were collected`);
  return customer;
}

const DEMO_ONBOARDING_PRODUCTS = new Set(['personal_account', 'multi_currency', 'virtual_debit', 'prepaid_virtual', 'business_account']);
const DEMO_IDENTITY_SCENARIOS = new Set(['test_pass_demo', 'manual_review_demo', 'unavailable_demo']);
const DEMO_SCREENING_SCENARIOS = new Set(['clear_demo', 'possible_match_demo', 'escalation_demo']);
const DEMO_ONBOARDING_STATUSES = new Set(['reviewed_demo', 'needs_info_demo', 'closed_demo']);

export function submitDemoOnboardingApplication(state, input = {}) {
  if (state.onboardingApplications.length >= 500) throw new Error('The local demo onboarding queue is full. Reset the synthetic scenario to continue.');
  const customer = state.customers.find(item => item.id === input.customerId && item.demoOnly === true);
  if (!customer) throw new Error('Choose an existing synthetic demo persona.');
  if (!input.syntheticConfirmed || !input.noRealDataConfirmed) throw new Error('Confirm that this is a fictional rehearsal and contains no real personal data.');
  const customerKind = String(input.customerKind || customer.kind);
  if (!['personal', 'business'].includes(customerKind) || customerKind !== customer.kind) throw new Error('The demo applicant type must match the selected synthetic persona.');
  const countryCode = String(input.countryCode || '').trim().toUpperCase();
  if (!(state.plannedMarkets || []).some(market => market.countryCode === countryCode)) throw new Error('Choose one of the planning-only demo markets.');
  const products = [...new Set(Array.isArray(input.products) ? input.products.map(String) : [])];
  if (!products.length || products.some(product => !DEMO_ONBOARDING_PRODUCTS.has(product))) throw new Error('Choose at least one available fictional demo product.');
  if (customerKind === 'personal' && products.includes('business_account')) throw new Error('The synthetic personal scenario cannot request a business account.');
  const identityScenario = String(input.identityScenario || '');
  const screeningScenario = String(input.screeningScenario || '');
  if (!DEMO_IDENTITY_SCENARIOS.has(identityScenario) || !DEMO_SCREENING_SCENARIOS.has(screeningScenario)) throw new Error('Choose an available synthetic identity and screening test scenario.');
  const sequence = Number(state.meta.nextOnboarding) || 1;
  state.meta.nextOnboarding = sequence + 1;
  const now = new Date().toISOString();
  const enhancedPath = identityScenario !== 'test_pass_demo' || screeningScenario !== 'clear_demo';
  const application = {
    id: `ONB-${pad(sequence, 5)}`, customerId: customer.id, customerKind, countryCode,
    products, identityScenario, screeningScenario, reviewPath: enhancedPath ? 'enhanced_review_demo' : 'standard_review_demo',
    status: 'submitted_demo', submittedAt: now, updatedAt: now,
    history: [{ at: now, status: 'submitted_demo', actor: 'Customer portal · demo', note: 'Local training scenario submitted; no personal identifiers, identity documents, biometrics or external checks were collected.' }],
    demoOnly: true
  };
  state.onboardingApplications.unshift(application);
  addAudit(state, 'Demo online onboarding submitted', `${application.id} · ${customerKind}/${countryCode} · controlled synthetic choices only`);
  return application;
}

export function updateDemoOnboardingApplication(state, applicationId, status) {
  const application = (state.onboardingApplications || []).find(item => item.id === applicationId && item.demoOnly === true);
  if (!application) throw new Error('Demo onboarding application not found.');
  if (!DEMO_ONBOARDING_STATUSES.has(status)) throw new Error('Choose an allowed demo review status.');
  const transitions = {
    submitted_demo: new Set(['reviewed_demo', 'needs_info_demo', 'closed_demo']),
    needs_info_demo: new Set(['reviewed_demo', 'closed_demo']),
    reviewed_demo: new Set(),
    closed_demo: new Set()
  };
  if (!transitions[application.status]?.has(status)) throw new Error('This demo application is no longer available for that status change.');
  const now = new Date().toISOString();
  application.status = status;
  application.updatedAt = now;
  application.reviewedBy = state.settings?.operator || 'Demo reviewer';
  application.history ||= [];
  application.history.push({
    at: now, status, actor: application.reviewedBy,
    note: status === 'reviewed_demo' ? 'Training review completed; no account was opened and no identity or sanctions verification occurred.'
      : status === 'needs_info_demo' ? 'Training scenario returned for fictional follow-up; no real applicant was contacted.'
        : 'Training scenario closed locally; no banking service or customer relationship was created.'
  });
  if (application.history.length > 10) application.history.splice(0, application.history.length - 10);
  addAudit(state, 'Demo online onboarding status changed', `${application.id} · ${status}; no real account or customer decision`);
  return application;
}

export function exportAsCsv(state, filters = {}) {
  const headers = ['transaction_id', 'date', 'customer_id', 'customer_name', 'account_id', 'type', 'direction', 'amount', 'currency', 'channel', 'counterparty', 'reference', 'status', 'demo_only', 'document_brand'];
  const escape = value => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = state.transactions.filter(tx => (!filters.customerId || tx.customerId === filters.customerId) && (!filters.accountId || tx.accountId === filters.accountId)).map(tx => {
    const customer = state.customers.find(item => item.id === tx.customerId);
    return [tx.id, tx.date, tx.customerId, customer?.name, tx.accountId, tx.type, tx.direction, (tx.amountCents / 100).toFixed(2), tx.currency, tx.channel, tx.counterparty, tx.reference, tx.status, 'true', DEMO_BRAND];
  });
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
}

export function getCustomer(state, customerId) { return state.customers.find(customer => customer.id === customerId); }
export function getAccount(state, accountId) { return state.accounts.find(account => account.id === accountId); }
export function accountBalanceEur(state, account) {
  const rate = CURRENCIES[account.currency]?.eurRate;
  return Number.isFinite(rate) && rate > 0 ? account.balanceCents * rate : null;
}
export function totalCustomerDepositsCents(state) {
  // EUR-equivalent totals exclude native-only positions rather than inventing a 1:1 rate.
  const accounts = state.accounts.reduce((sum, account) => {
    const eur = accountBalanceEur(state, account);
    return eur === null ? sum : sum + Math.round(eur);
  }, 0);
  const savings = state.deposits.filter(item => item.status === 'active').reduce((sum, item) => sum + item.principalCents, 0);
  const prepaid = (state.cards || []).reduce((sum, card) => sum + (card.fundingType === 'prepaid' ? card.prepaidBalanceCents || 0 : 0), 0);
  return accounts + savings + prepaid;
}
export function isBalanced(state) {
  return state.ledgerJournals.every(journal => journal.debitCents === journal.creditCents && journal.lines.reduce((sum, line) => sum + line.debitCents, 0) === journal.lines.reduce((sum, line) => sum + line.creditCents, 0));
}
