import {
  STORE_KEY, CURRENCIES, COMPANY_PUBLIC_ADDRESS, createDemoIban, createDemoBic, FX_SPREAD, CRYPTO_SPREAD,
  createDemoState, loadDemoState, saveDemoState, moneyToCents, createCustomer, openAccount,
  createInternalTransfer, convertBetweenAccounts, createExternalPayment, approvePayment,
  createInterbankTransfer, approveInterbankTransfer, verifyDemoReference, createSupportTicket, updateSupportTicket, recordCashOperation,
  issueCard, setCardStatus, setCardControls, loadPrepaidCard, simulateCardPurchase, openSavingsDeposit, matureSavingsDeposit,
  createLoanApplication, approveLoanApplication, disburseLoan, makeLoanRepayment,
  quoteExchange, executeExchangeTrade, simulateAtmWithdrawal, createSwiftMessage,
  approveSwiftMessage, updateCaseStatus, updateCustomerKyc, submitDemoKycRequest, exportAsCsv, DEMO_BRAND,
  createIncomingPayment, cancelPayment, createCryptoTransfer, createCryptoReceipt, approveCryptoTransfer, cancelCryptoTransfer,
  createComplaint, updateComplaint, accountBalanceEur,
  submitDemoOnboardingApplication, updateDemoOnboardingApplication,
  getCustomer, getAccount, totalCustomerDepositsCents, isBalanced, addAudit, runBackgroundSimulationTick
} from './core.mjs';
import { supportedLanguages, translate } from './i18n.mjs';
import { ECB_DAILY_URL, CBK_FOREX_URL, ECB_FALLBACK_DATE, ECB_FALLBACK_RATES_PER_EUR, CBK_FALLBACK_DATE, CBK_FALLBACK_KES_PER_EUR, parseEcbDailyReference, parseCbkDailyReference } from './fx.mjs';
import { localAssistantReply } from './assistant.mjs';
import { INTEROP_IDEAS, INTEROP_FEATURES, INTEROP_SYSTEMS, interopLocalizedText, ensureInteropLabState, activeInteropSystem, selectInteropSystem, toggleInteropConnector, refreshInteropConnector, runInteropFeature, resetInteropLab } from './interop-lab.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const main = $('#mainContent');
const nav = $('#primaryNav');
const modalRoot = $('#modalRoot');
const toastRegion = $('#toastRegion');
const languageSelect = $('#languageSelect');
const STAFF_LEVELS = [
  { id: 'platform_admin', level: 1, label: 'rolePlatformAdmin', scope: 'roleScopePlatform', operator: 'Luka Babić' },
  { id: 'group_admin', level: 2, label: 'roleGroupAdmin', scope: 'roleScopeGroup', operator: 'Ivana Radić' },
  { id: 'country_manager', level: 3, label: 'roleCountryManager', scope: 'roleScopeCountry', operator: 'David Novak' },
  { id: 'branch_manager', level: 4, label: 'roleBranchManager', scope: 'roleScopeBranch', operator: 'Maja Kovač' },
  { id: 'checker', level: 5, label: 'roleChecker', scope: 'roleScopeReview', operator: 'Ivan Novak' },
  { id: 'operations_maker', level: 6, label: 'roleMaker', scope: 'roleScopeOperations', operator: 'Maja Kovač' },
  { id: 'auditor', level: 7, label: 'roleAuditor', scope: 'roleScopeAudit', operator: 'Ana Kralj' }
];
let state = loadDemoState();
ensureInteropLabState(state);
const requestedLanguage = new URLSearchParams(location.search).get('lang');
const languageFromEntry = supportedLanguages.some(language => language.code === requestedLanguage) ? requestedLanguage : null;
if (languageFromEntry) state.settings.language = languageFromEntry;
let currentView = document.body.dataset.startView || 'overview';
let portalCustomerId = state.accounts.find(account => account.status === 'active' && state.customers.find(customer => customer.id === account.customerId)?.kyc === 'verified')?.customerId || state.customers[0]?.id;
let paymentTab = 'orders';
let amlTab = 'cases';
let supportTab = 'tickets';
let exchangeTab = 'fx';
let interopTab = 'workbench';
let interopCategory = 'all';
let exchangeSide = 'buy';
let exchangeCustomerId = null;
let currentSearchPopover;
let pendingConfirmation = null;
let ecbFetchPromise = null;
let cbkFetchPromise = null;
let optionalMarketFeed = { status: 'idle', reference: null, message: '' };
let optionalMarketFeedPromise = null;
const fxReferenceData = {
  ecb: { status: 'bundled-sample', rateDate: ECB_FALLBACK_DATE, fetchedAt: null, source: 'Bundled ECB reference sample', rates: { EUR: 1, ...ECB_FALLBACK_RATES_PER_EUR } },
  cbk: { status: 'bundled-sample', rateDate: CBK_FALLBACK_DATE, fetchedAt: null, source: 'Bundled CBK indicative-rate sample', kesPerEur: CBK_FALLBACK_KES_PER_EUR }
};
const assistantChats = new Map();
let referenceCheckResult = null;
let browserSimulationTimer = null;
let backgroundTickUnsubscribe = null;
let backgroundDesktopSupported = Boolean(window.adriaDemo?.setBackgroundPreferences);
const filterState = {
  customers: { q: '', kyc: 'all', risk: 'all', page: 1 },
  accounts: { q: '', status: 'all', currency: 'all', page: 1 },
  payments: { q: '', status: 'all', page: 1 },
  transactions: { q: '', type: 'all', page: 1 },
  cards: { q: '', status: 'all', page: 1 },
  savings: { q: '', status: 'all', page: 1 },
  loans: { q: '', status: 'all', page: 1 },
  cases: { q: '', severity: 'all', status: 'open', page: 1 },
  complaints: { q: '', status: 'all', page: 1 },
  branches: { page: 1 },
  onboarding: { q: '', status: 'all', page: 1 },
  ledger: { page: 1 }
};
const PAGE_SIZE = 12;

const navGroups = [
  { label: 'bankOperations', items: [
    ['overview', 'overview', 'overview'], ['customers', 'customers', 'users'], ['accounts', 'accounts', 'account'],
    ['payments', 'payments', 'payments'], ['cards', 'cards', 'card'], ['savings', 'savings', 'savings'], ['loans', 'loans', 'loan'],
    ['branches', 'branchesCash', 'branch'], ['atms', 'atmNetwork', 'atm']
  ] },
  { label: 'customerChannels', items: [['portal', 'customerPortal', 'portal'], ['onboarding', 'onlineOnboarding', 'verify'], ['support', 'callCentre', 'support']] },
  { label: 'controls', items: [['aml', 'amlKyc', 'shield'], ['complaints', 'complaints', 'support'], ['swift', 'swiftLab', 'swift'], ['exchange', 'exchange', 'exchange'], ['interop', 'interoperability', 'globe'], ['institutions', 'institutions', 'bank'], ['checker', 'localChecks', 'verify']] },
  { label: 'finance', items: [['ledger', 'ledger', 'ledger'], ['reports', 'reports', 'reports'], ['settings', 'settings', 'settings']] }
];

function visibleNavGroups() {
  if (document.body.dataset.surface === 'client') return [{ label: 'customerChannels', items: [['portal', 'customerPortal', 'portal'], ['complaints', 'complaints', 'support'], ['exchange', 'exchange', 'exchange'], ['support', 'callCentre', 'support']] }];
  return navGroups;
}

const iconPaths = {
  overview: '<path d="M4 19V9m6 10V5m6 14v-7m6 7V3"/><path d="M2 21h21"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/>',
  account: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/>',
  payments: '<path d="M4 7h16M4 12h11M4 17h7"/><path d="m17 15 3 3 3-3"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/>',
  savings: '<path d="M5 9h13a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a5 5 0 0 1-5-5v-3a2 2 0 0 1 2-2Z"/><path d="m6 9 2-4h7l2 4m4 1 2-2M7 14h.01"/>',
  loan: '<path d="M4 3h12l4 4v14H4z"/><path d="M16 3v5h4M8 12h8m-8 4h5"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M17.5 15.5v4m-1-3h1.4a.9.9 0 0 1 0 1.8h-.8"/>',
  branch: '<path d="m3 10 9-6 9 6v10H3Z"/><path d="M8 20v-6h8v6M7 10h.01M12 10h.01M17 10h.01"/>',
  atm: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8v5H8zm1 9h6m-6 3h4"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  swift: '<path d="M5 7h14M5 12h10M5 17h14"/><path d="m15 9 4 3-4 3"/>',
  exchange: '<path d="M7 7h14l-3-3m3 3-3 3M17 17H3l3 3m-3-3 3-3"/>',
  ledger: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/><path d="M3 6v15h14"/>',
  reports: '<path d="M4 20V9m5 11V4m5 16v-7m5 7V6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1L11 7.4h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 2Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 4.5 4.5"/>',
  bank: '<path d="m3 9 9-5 9 5M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M2 22h20"/>',
  portal: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21a8 8 0 0 1 16 0m-8-6v6m-4-3h8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  spark: '<path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5L12 3Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shieldCheck: '<path d="m12 22 1.8-.9C18 19 20 15.5 20 11V5l-8-3-8 3v6c0 4.5 2 8 6.2 10.1L12 22Z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<path d="M12 5v14m-7-7h14"/>',
  support: '<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="5" height="8" rx="2"/><rect x="16" y="12" width="5" height="8" rx="2"/><path d="M19 20a3 3 0 0 1-3 2h-2"/>',
  verify: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5m-12-10 2 2 4-4"/>',
  cash: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
function icon(name, cls = '') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`; }

function t(key) { return translate(state.settings.language || 'hr', key); }
function currentStaffRole() { return STAFF_LEVELS.find(role => role.id === state.settings.role) || STAFF_LEVELS[5]; }
function canWrite() { return currentStaffRole().level < 7; }
function canApprove() { return currentStaffRole().level <= 5; }
function canReviewCompliance() { return currentStaffRole().level <= 5; }
function canAdminister() { return currentStaffRole().level <= 2; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function locale() { return supportedLanguages.find(item => item.code === state.settings.language)?.locale || 'hr-HR'; }
function currency(valueCents, currencyCode = 'EUR', options = {}) {
  const amount = Number(valueCents || 0) / 100;
  try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: currencyCode, maximumFractionDigits: options.digits ?? 2, minimumFractionDigits: options.minimum ?? 0 }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currencyCode}`; }
}
function currencyMajor(amount, currencyCode = 'EUR', maximumFractionDigits = 2) {
  try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: currencyCode, maximumFractionDigits, minimumFractionDigits: 0 }).format(Number(amount) || 0); }
  catch { return `${Number(amount || 0).toFixed(2)} ${currencyCode}`; }
}
function compactCurrency(cents) {
  const amount = (Number(cents) || 0) / 100;
  try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(amount); }
  catch { return `€${Math.round(amount).toLocaleString()}`; }
}
function fmtDate(value, withTime = false) {
  if (!value || Number.isNaN(new Date(value).valueOf())) return '—';
  try {
    return new Intl.DateTimeFormat(locale(), withTime ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch { return new Date(value).toLocaleDateString(); }
}
function fmtTime(value) {
  if (!value || Number.isNaN(new Date(value).valueOf())) return '—';
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function initials(name) {
  return String(name || 'AB').trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toLocaleUpperCase(locale());
}
function customerById(id) { return state.customers.find(item => item.id === id); }
function accountById(id) { return state.accounts.find(item => item.id === id); }
function labelStatus(status) {
  const key = ({ settled_simulation: 'settledSimulation', awaiting_approval: 'awaitingApproval', approved_simulation: 'settledSimulation', approved_undisbursed: 'approvedUndisbursed', repaid_simulation: 'repaidSimulation', matured_simulation: 'closed', in_review: 'investigating', in_progress: 'inProgress', cash_in: 'posted', active: 'active', synthetic_directory_match: 'directoryMatch', synthetic_account_match: 'accountMatch', synthetic_card_match: 'cardMatch', submitted_demo: 'submittedDemo', reviewed_demo: 'reviewedDemo', needs_info_demo: 'needsInfoDemo', closed_demo: 'closedDemo', format_only: 'formatOnly', format_checksum_only: 'formatChecksumOnly', luhn_format_only: 'luhnFormatOnly', checksum_invalid: 'checksumInvalid', format_invalid: 'formatInvalid', length_invalid: 'lengthInvalid', country_unsupported: 'countryUnsupported', not_found: 'notFound' })[status] || status;
  return t(key) === key ? String(status || '—').replaceAll('_', ' ') : t(key);
}
function badge(status, extra = '') {
  const normalized = String(status || 'neutral').toLowerCase();
  const type = ['verified', 'active', 'online', 'posted', 'settled_simulation', 'approved_simulation', 'performing', 'repaid_simulation', 'closed', 'reviewed_demo'].includes(normalized) ? 'success'
    : ['pending', 'expired', 'awaiting_approval', 'approved_undisbursed', 'investigating', 'warning', 'low', 'maintenance', 'submitted_demo', 'needs_info_demo'].includes(normalized) ? 'warning'
    : ['high', 'blocked', 'restricted', 'escalated', 'cancelled', 'arrears', 'checksum_invalid', 'format_invalid', 'length_invalid', 'country_unsupported'].includes(normalized) ? 'danger'
    : ['medium', 'edd', 'crypto', 'format_only', 'format_checksum_only', 'luhn_format_only'].includes(normalized) ? 'info' : 'neutral';
  return `<span class="badge ${type} ${extra}">${esc(labelStatus(status))}</span>`;
}
function pageHeading(titleKey, subtitleKey, actions = '') {
  const title = t(titleKey);
  $('#crumbTitle').textContent = title;
  const printAction = `<button class="btn print-page-action" data-action="print-current">${icon('reports')}${esc(t('printPage'))}</button>`;
  return `<div class="page-heading"><div class="page-title-wrap"><div class="eyebrow"><i class="tiny-dot"></i>${esc(t('safeLearning'))}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(t(subtitleKey))}</p><small class="page-watermark">${DEMO_BRAND}</small></div><div class="heading-actions">${actions}${printAction}</div></div>`;
}
function renderWorkspaceContextBar() {
  if (document.body.dataset.surface === 'client') return '';
  const system = activeInteropSystem(state);
  return `<aside class="workspace-context-strip" aria-label="${esc(t('interopContextBar'))}"><span class="workspace-context-orb">${esc(system.flag)}</span><span class="workspace-context-copy"><small>${esc(t('interopContextBar'))}</small><strong>${esc(system.name)}</strong></span><span class="workspace-context-meta">${esc(system.currency)} · ${esc(system.city)}</span><button class="workspace-context-action" data-action="interop-context-open">${icon('exchange')}${esc(t('interopOpenWorkbench'))}</button></aside>`;
}
function renderInteropSystemSwitcher() {
  const active = activeInteropSystem(state);
  const cards = INTEROP_SYSTEMS.map(system => {
    const isActive = system.id === active.id;
    return `<article class="interop-system-card ${isActive ? 'is-active' : ''}" data-system-id="${esc(system.id)}"><div class="interop-system-card-top"><span class="interop-system-flag">${esc(system.flag)}</span><span class="badge ${isActive ? 'success' : 'neutral'}">${esc(isActive ? t('interopSystemActive') : t('interopFictionalSystem'))}</span></div><h3>${esc(system.name)}</h3><p class="interop-system-location">${esc(system.city)} · ${esc(system.country)}</p><div class="interop-system-details"><span><small>${esc(t('interopSystemCurrency'))}</small><strong>${esc(system.currency)}</strong></span><span><small>${esc(t('interopSystemTimezone'))}</small><strong>${esc(system.timezone)}</strong></span></div><p class="interop-system-note">${esc(languageForSystemNote(system))}</p>${button('interop-system-select', isActive ? t('interopSystemActive') : t('interopSystemSwitch'), isActive ? 'small secondary' : 'small primary', isActive ? 'check' : 'exchange', `data-id="${esc(system.id)}" ${isActive ? 'disabled aria-current="true"' : ''}`)}</article>`;
  }).join('');
  return `<section class="interop-systems-shell"><div class="interop-systems-heading"><div><span class="eyebrow"><i class="tiny-dot"></i>${esc(t('interopSystemProfile'))}</span><h2>${esc(t('interopSystemTitle'))}</h2><p>${esc(t('interopSystemSub'))}</p></div><span class="interop-local-stamp">${esc(t('localOnly'))}</span></div><div class="interop-system-grid">${cards}</div><div class="interop-system-boundary"><span>i</span>${esc(t('interopSystemBoundary'))}</div></section>`;
}
function languageForSystemNote(system) {
  return state.settings.language === 'hr' ? system.noteHr : system.noteEn;
}

function button(action, label, style = '', iconName = '', attrs = '') {
  const staffConsole = document.body.dataset.surface !== 'client' && currentView !== 'portal';
  const writeActions = ['new-customer', 'new-account', 'new-account-for', 'transfer', 'new-payment', 'incoming-payment', 'cancel-payment', 'crypto-send', 'crypto-receive', 'cancel-crypto', 'new-complaint', 'cash-operation', 'issue-card', 'new-deposit', 'new-loan', 'repay-loan', 'atm-withdrawal', 'new-swift', 'mature-savings', 'card-status', 'card-controls', 'card-load', 'card-purchase', 'card-cancel', 'reconcile-atms', 'new-interbank', 'new-support-ticket', 'support-status', 'account-conversion', 'toggle-background-simulation', 'onboarding-status', 'interop-connector-toggle', 'interop-connector-refresh', 'interop-feature-run', 'interop-system-select', 'interop-reset'];
  const approvalActions = ['approve-loan', 'disburse-loan', 'approve-payment', 'approve-swift', 'approve-interbank', 'approve-crypto'];
  const restricted = staffConsole && ((writeActions.includes(action) && !canWrite()) || (approvalActions.includes(action) && !canApprove()) || (action === 'reset-demo' && !canAdminister()));
  const permissionAttrs = restricted ? `disabled title="${esc(!canWrite() ? t('roleReadOnly') : !canApprove() ? t('roleCheckerOnly') : t('roleAdminOnly'))}"` : '';
  return `<button class="btn ${style}" data-action="${esc(action)}" ${permissionAttrs} ${attrs}>${iconName ? `<span class="btn-icon">${icon(iconName)}</span>` : ''}${esc(label)}</button>`;
}
function panel(title, body, options = {}) {
  const description = options.description ? `<p class="panel-description">${esc(options.description)}</p>` : '';
  const actions = options.actions ? `<div class="panel-actions">${options.actions}</div>` : '';
  return `<section class="panel ${options.className || ''}"><div class="panel-header"><div><h2 class="panel-title">${esc(title)}</h2>${description}</div>${actions}</div>${body}</section>`;
}
function emptyState(text = t('noRecords')) { return `<div class="empty-state">${esc(text)}</div>`; }
function pager(listName, page, count, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return `<div class="table-pager"><span>${count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} / ${count}` : `0 / 0`} ${esc(t('records'))}</span><div class="pager-actions"><button data-action="page" data-list="${listName}" data-dir="prev" aria-label="Previous page" ${page <= 1 ? 'disabled' : ''}>‹</button><span class="badge neutral">${page} / ${pages}</span><button data-action="page" data-list="${listName}" data-dir="next" aria-label="Next page" ${page >= pages ? 'disabled' : ''}>›</button></div></div>`;
}
function paged(items, listName, size = PAGE_SIZE) {
  const filter = filterState[listName];
  const pages = Math.max(1, Math.ceil(items.length / size));
  if (filter.page > pages) filter.page = pages;
  const from = (filter.page - 1) * size;
  return { items: items.slice(from, from + size), footer: pager(listName, filter.page, items.length, size) };
}
function tableShell(headers, rows, footer = '', noRows = t('noRecords')) {
  const body = rows.length ? rows.join('') : `<tr><td colspan="${headers.length}">${emptyState(noRows)}</td></tr>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(value => `<th>${esc(value)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>${footer}`;
}
function formatClient(customer, action = 'customer-open') {
  if (!customer) return '<span class="muted">—</span>';
  return `<button class="customer-cell row-link" data-action="${action}" data-id="${esc(customer.id)}"><span class="customer-avatar ${customer.kind === 'business' ? 'business' : ''}">${esc(initials(customer.name))}</span><span><strong>${esc(customer.name)}</strong><small>${esc(customer.id)} · ${esc(customer.kind === 'business' ? t('business') : t('personal'))}</small></span></button>`;
}
function amountWithDirection(tx) {
  const plus = tx.direction === 'in';
  return `<span class="${plus ? 'amount-positive' : 'amount-negative'}">${plus ? '+' : '−'}${currency(tx.amountCents, tx.currency || 'EUR')}</span>`;
}
function txLabel(tx) {
  const map = {
    internal: state.settings.language === 'hr' ? 'Interni prijenos' : 'Internal transfer',
    cash_in: t('depositCash'), cash_out: t('withdrawCash'), atm: state.settings.language === 'hr' ? 'Podizanje na bankomatu' : 'ATM withdrawal',
    savings_open: state.settings.language === 'hr' ? 'Oročena štednja' : 'Term savings placement',
    savings_mature: state.settings.language === 'hr' ? 'Dospijeće štednje' : 'Savings maturity',
    exchange: state.settings.language === 'hr' ? 'Zamjena valute / imovine' : 'FX / asset exchange',
    sepa_out: state.settings.language === 'hr' ? 'SEPA plaćanje' : 'SEPA payment',
    swift_out: state.settings.language === 'hr' ? 'Međunarodno plaćanje' : 'International payment',
    card_purchase: state.settings.language === 'hr' ? 'Kartična kupnja' : 'Card purchase',
    sepa_in: state.settings.language === 'hr' ? 'SEPA priljev' : 'SEPA credit transfer',
    loan_disbursement: t('loanDisbursement'), loan_repayment: t('loanRepayment'),
    salary: state.settings.language === 'hr' ? 'Isplata plaće' : 'Salary payment',
    utility: state.settings.language === 'hr' ? 'Režijski račun' : 'Utility bill',
    subscription: state.settings.language === 'hr' ? 'Pretplata' : 'Subscription',
    merchant: state.settings.language === 'hr' ? 'Namira trgovca' : 'Merchant settlement',
    fee: state.settings.language === 'hr' ? 'Naknada usluge' : 'Service fee',
    refund: state.settings.language === 'hr' ? 'Povrat kartične transakcije' : 'Card refund',
    standing: state.settings.language === 'hr' ? 'Trajni nalog' : 'Standing order',
    crypto_in: state.settings.language === 'hr' ? 'Primitak kriptoimovine · simulacija' : 'Crypto receipt · simulation',
    crypto_out: state.settings.language === 'hr' ? 'Slanje kriptoimovine · simulacija' : 'Crypto send · simulation'
  };
  return map[tx.type] || tx.label || tx.type;
}
function selectOptions(items, valueKey, labelFn, selected = '') {
  return items.map(item => `<option value="${esc(item[valueKey])}" ${item[valueKey] === selected ? 'selected' : ''}>${esc(labelFn(item))}</option>`).join('');
}
function activeEurAccounts() { return state.accounts.filter(account => account.currency === 'EUR' && account.status === 'active'); }
function customerAccounts(customerId) { return state.accounts.filter(account => account.customerId === customerId); }
function accountLabel(account) {
  const customer = customerById(account.customerId);
  return `${account.id} · ${customer?.name || account.customerId} · ${account.currency} ${currency(account.balanceCents, account.currency)}`;
}

function prettyIban(value) {
  const normalized = String(value || '').replaceAll(' ', '');
  return normalized ? normalized.match(/.{1,4}/g).join(' ') : 'Domestic demo ID · no IBAN';
}
function prettyRoutingIdentifier(value) {
  const normalized = String(value || '').trim();
  return /^DEMO-[A-Z]{2}-/.test(normalized) ? normalized : prettyIban(normalized);
}
function accountRouteSummary(account) {
  return `${prettyRoutingIdentifier(account.iban || account.accountNumber)} · ${account.bic || createDemoBic(account.countryCode || 'HR')} · DEMO only`;
}
function openPrintDocument(title, body) {
  const root = $('#printRoot');
  if (!root) { window.print(); return; }
  root.innerHTML = `<article class="print-document"><header class="print-document-header"><div class="print-brand">${DEMO_BRAND}</div><div class="print-doc-meta">${esc(title)} · ${esc(fmtDate(new Date().toISOString(), true))}</div></header>${body}<footer class="print-document-footer"><strong>${DEMO_BRAND}</strong><span>${esc(t('printDisclaimer'))}</span><span>${esc(t('brandFooter'))}</span></footer></article>`;
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('printing-document');
  const clear = () => {
    root.innerHTML = '';
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('printing-document');
  };
  window.addEventListener('afterprint', clear, { once: true });
  setTimeout(() => { try { window.print(); } catch { clear(); } }, 60);
  setTimeout(clear, 60000);
}
function printStatement(customerId = portalCustomerId, accountId = '') {
  const customer = customerById(customerId);
  if (!customer) return;
  const accounts = customerAccounts(customerId).filter(account => !accountId || account.id === accountId);
  const transactions = state.transactions.filter(tx => tx.customerId === customerId && (!accountId || tx.accountId === accountId)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const accountRows = accounts.map(account => `<tr><td>${esc(account.id)} · ${esc(account.label)}</td><td>${esc(account.currency)}</td><td class="mono">${esc(accountRouteSummary(account))}</td><td class="num">${esc(currency(account.balanceCents, account.currency))}</td></tr>`).join('');
  const transactionRows = transactions.map(tx => `<tr><td>${esc(fmtDate(tx.date, true))}</td><td>${esc(tx.id)} · ${esc(txLabel(tx))}</td><td>${esc(tx.counterparty || tx.channel || '—')}</td><td>${esc(tx.reference || '—')}</td><td>${esc(labelStatus(tx.status))}</td><td class="num ${tx.direction === 'in' ? 'print-positive' : ''}">${tx.direction === 'in' ? '+' : '−'}${esc(currency(tx.amountCents, tx.currency || 'EUR'))}</td></tr>`).join('');
  const title = t('accountStatement');
  openPrintDocument(title, `<h1>${esc(title)}</h1><p class="print-lead">${esc(customer.name)} · ${esc(customer.id)} · ${esc(customer.kind === 'business' ? t('business') : t('personal'))} · ${esc(customer.city)}, ${esc(customer.country)}</p><div class="print-alert">${DEMO_BRAND} — synthetic statement preview only. This is not a bank-issued document, proof of funds, account confirmation or live transaction history.</div><h2>${esc(t('myAccounts'))}</h2><table><thead><tr><th>${esc(t('account'))}</th><th>${esc(t('currency'))}</th><th>${esc(t('demoIbanOrDomesticId'))} / BIC · demo</th><th class="num">${esc(t('balance'))}</th></tr></thead><tbody>${accountRows}</tbody></table><h2>${esc(t('transactionHistory'))} · ${transactions.length}</h2><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('transaction'))}</th><th>${esc(t('counterparty'))}</th><th>${esc(t('reference'))}</th><th>${esc(t('status'))}</th><th class="num">${esc(t('amount'))}</th></tr></thead><tbody>${transactionRows || `<tr><td colspan="6">${esc(t('noTransactions'))}</td></tr>`}</tbody></table><p class="print-note">Values are fictional local balances. Currencies without a configured reference are excluded from EUR-equivalent totals; no conversion is implied.</p>`);
}
function printTransaction(transactionId) {
  const tx = state.transactions.find(item => item.id === transactionId);
  if (!tx) return;
  const customer = customerById(tx.customerId);
  const account = accountById(tx.accountId);
  openPrintDocument(t('transactionReceipt'), `<h1>${esc(t('transactionReceipt'))}</h1><p class="print-lead">${esc(txLabel(tx))} · ${esc(tx.id)}</p><div class="print-alert">${DEMO_BRAND} — transaction rehearsal receipt only. No payment rail, cash dispenser, card network, blockchain or real funds were involved.</div><table><tbody><tr><th>${esc(t('client'))}</th><td>${esc(customer?.name || tx.customerId)} · ${esc(customer?.id || '')}</td></tr><tr><th>${esc(t('account'))}</th><td>${esc(account?.id || tx.accountId || '—')} · ${esc(account?.currency || tx.currency || 'EUR')}</td></tr><tr><th>${esc(t('amount'))}</th><td>${esc(amountWithDirection(tx).replace(/<[^>]*>/g, ''))}</td></tr><tr><th>${esc(t('counterparty'))}</th><td>${esc(tx.counterparty || '—')}</td></tr><tr><th>${esc(t('reference'))}</th><td>${esc(tx.reference || '—')}</td></tr><tr><th>${esc(t('date'))}</th><td>${esc(fmtDate(tx.date, true))}</td></tr><tr><th>${esc(t('status'))}</th><td>${esc(labelStatus(tx.status))}</td></tr><tr><th>${esc(t('channel'))}</th><td>${esc(tx.channel || 'Local demo')}</td></tr></tbody></table>`);
}
function printPayment(paymentId) {
  const payment = state.payments.find(item => item.id === paymentId);
  if (!payment) return;
  const incoming = payment.direction === 'in';
  openPrintDocument(incoming ? t('incomingPayment') : t('paymentInstruction'), `<h1>${esc(incoming ? t('incomingPayment') : t('paymentInstruction'))}</h1><p class="print-lead">${esc(payment.id)} · ${esc(payment.rail)} · ${esc(labelStatus(payment.status))}</p><div class="print-alert">${DEMO_BRAND} — SEPA-shaped local rehearsal only. This is not a bank transfer instruction and was not transmitted or received.</div><table><tbody><tr><th>${esc(t('client'))}</th><td>${esc(customerById(payment.customerId)?.name || payment.customerId)}</td></tr><tr><th>${esc(incoming ? t('sender') : t('beneficiary'))}</th><td>${esc(incoming ? payment.sender || 'Fictional remitter' : payment.beneficiary)}</td></tr><tr><th>${esc(t('country'))}</th><td>${esc(incoming ? payment.senderCountry || '—' : payment.beneficiaryCountry || '—')}</td></tr><tr><th>${esc(t('demoIbanOrDomesticId'))} · not routable</th><td class="mono">${esc(prettyRoutingIdentifier(incoming ? payment.senderIban : payment.beneficiaryIban))}</td></tr><tr><th>BIC · demo only</th><td class="mono">${esc(incoming ? payment.senderBic || '—' : payment.beneficiaryBic || '—')}</td></tr><tr><th>${esc(t('amount'))}</th><td>${esc(currency(payment.amountCents, payment.currency))}</td></tr><tr><th>${esc(t('reference'))}</th><td>${esc(payment.reference)}</td></tr><tr><th>${esc(t('date'))}</th><td>${esc(fmtDate(payment.createdAt, true))}</td></tr></tbody></table>`);
}
function printSwift(messageId) {
  const message = state.swiftMessages.find(item => item.id === messageId);
  if (!message) return;
  openPrintDocument(t('swiftLab'), `<h1>${esc(t('swiftLab'))} · ${esc(message.type)}</h1><p class="print-lead">${esc(message.id)} · ${esc(labelStatus(message.status))}</p><div class="print-alert">${DEMO_BRAND} — message-shaped draft only. No SWIFT, correspondent, screening, settlement or financial-messaging network is connected.</div><table><tbody><tr><th>${esc(t('beneficiary'))}</th><td>${esc(message.beneficiary)}</td></tr><tr><th>${esc(t('country'))}</th><td>${esc(message.beneficiaryCountry || '—')}</td></tr><tr><th>BIC · demo only</th><td class="mono">${esc(message.bic)}</td></tr><tr><th>${esc(t('demoIbanOrDomesticId'))} · not routable</th><td class="mono">${esc(prettyRoutingIdentifier(message.beneficiaryIban))}</td></tr><tr><th>${esc(t('amount'))}</th><td>${esc(currency(message.amountCents, message.currency))}</td></tr><tr><th>${esc(t('reference'))}</th><td>${esc(message.reference)}</td></tr></tbody></table><h2>Local-format preview · not transmitted</h2><pre class="swift-code print-code">${esc(message.mt103 || '')}</pre>`);
}
function updateDemoRoutingDisplay(form) {
  const country = form?.elements?.country?.value || 'HR';
  const serial = Number(form?.elements?.accountSequence?.value || 1);
  const iban = form?.elements?.iban || form?.elements?.senderIban;
  const bic = form?.elements?.bic || form?.elements?.senderBic;
  if (iban) iban.value = prettyRoutingIdentifier(createDemoIban(country, serial) || `DEMO-${country}-${String(serial).padStart(10, '0')}`);
  const routeField = iban?.closest('.form-field');
  if (routeField?.querySelector('label')) routeField.querySelector('label').textContent = t('demoIbanOrDomesticId');
  if (bic) bic.value = createDemoBic(country);
}
function updateStaticText() {
  document.documentElement.lang = state.settings.language || 'hr';
  document.documentElement.dir = state.settings.language === 'ar' ? 'rtl' : 'ltr';
  languageSelect.value = state.settings.language || 'hr';
  $$('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  const staffRole = currentStaffRole();
  if ($('#operatorName')) $('#operatorName').textContent = state.settings.operator || staffRole.operator;
  if ($('#operatorRole')) $('#operatorRole').textContent = `L${staffRole.level} · ${t(staffRole.label)}`;
  if ($('.operator-profile .avatar')) $('.operator-profile .avatar').textContent = initials(state.settings.operator || staffRole.operator);
  if ($('.top-avatar')) $('.top-avatar').textContent = initials(state.settings.operator || staffRole.operator);
  const now = new Date();
  const todayStamp = $('#todayStamp');
  if (todayStamp) todayStamp.textContent = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  if ($('#globalSearch')) $('#globalSearch').placeholder = t('searchPlaceholder');
}
function renderNavigation() {
  const highPriorityCount = state.cases.filter(item => item.status !== 'closed').length;
  const groups = visibleNavGroups();
  nav.innerHTML = groups.map((group, groupIndex) => `<div class="nav-section-label">${esc(t(group.label))}</div>${group.items.map(([view, labelKey, iconName]) => {
    const badgeText = view === 'aml' && highPriorityCount ? `<span class="nav-badge">${Math.min(99, highPriorityCount)}</span>` : '';
    return `<button class="nav-item ${currentView === view ? 'active' : ''} ${view === 'exchange' ? 'exchange-nav' : ''}" data-view="${view}" aria-current="${currentView === view ? 'page' : 'false'}"><span class="nav-icon">${icon(iconName)}</span><span class="nav-label">${esc(t(labelKey))}</span>${badgeText}</button>`;
  }).join('')}${groupIndex < groups.length - 1 ? '<div class="nav-divider"></div>' : ''}`).join('');
}

function buildChart() {
  const now = new Date();
  const points = [];
  for (let day = 13; day >= 0; day--) {
    const date = new Date(now); date.setDate(now.getDate() - day);
    const bucket = state.transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.toDateString() === date.toDateString() && tx.status === 'posted';
    });
    const volume = bucket.reduce((sum, tx) => sum + tx.amountCents, 0) / 100;
    points.push({ date, volume });
  }
  const max = Math.max(1800, ...points.map(item => item.volume));
  const coords = points.map((item, index) => ({ x: 39 + index * 50, y: 131 - (item.volume / max) * 93 }));
  const line = coords.map(point => `${point.x},${point.y}`).join(' ');
  const area = `M ${coords[0].x} 139 L ${line.replaceAll(' ', ' L ')} L ${coords.at(-1).x} 139 Z`;
  const labels = [0, 3, 6, 9, 13].map(index => {
    const label = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(points[index].date);
    return `<text class="chart-label" x="${coords[index].x}" y="169" text-anchor="middle">${esc(label)}</text>`;
  }).join('');
  const grid = [35, 66, 97, 128].map(y => `<line class="chart-gridline" x1="30" x2="690" y1="${y}" y2="${y}"/>`).join('');
  const last = coords.at(-1);
  return `<div class="chart-canvas"><svg viewBox="0 0 720 180" role="img" aria-label="Synthetic transaction trend"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3fc9b2" stop-opacity=".22"/><stop offset="1" stop-color="#3fc9b2" stop-opacity="0"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><polyline class="chart-line-secondary" points="${coords.map((point, index) => `${point.x},${Math.max(34, point.y - 14 + Math.sin(index) * 4)}`).join(' ')}"/><polyline class="chart-line" points="${line}"/><circle class="chart-last-point" cx="${last.x}" cy="${last.y}" r="4"/>${labels}</svg></div>`;
}
function renderOverview() {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const todayTransactions = state.transactions.filter(tx => new Date(tx.date) >= dayStart && tx.status === 'posted');
  const todayCount = todayTransactions.length + state.payments.filter(payment => new Date(payment.createdAt) >= dayStart).length;
  const posted30 = state.transactions.filter(tx => new Date(tx.date) >= new Date(now.getTime() - 30 * 86400000) && tx.status === 'posted');
  const volume30 = posted30.reduce((sum, tx) => sum + tx.amountCents, 0);
  const deposits = totalCustomerDepositsCents(state);
  const liquidityEurCents = state.bankAccounts.reduce((sum, account) => {
    const rate = CURRENCIES[account.currency]?.eurRate;
    return Number.isFinite(rate) && rate > 0 ? sum + Math.round(account.balanceCents * rate) : sum;
  }, 0);
  const liquidityCents = liquidityEurCents;
  const pendingKyc = state.customers.filter(customer => ['pending', 'expired', 'edd'].includes(customer.kyc)).length;
  const openCases = state.cases.filter(item => item.status !== 'closed').length;
  const activeCustomers = state.customers.filter(customer => customer.kyc === 'verified').length;
  const companyLocation = state.meta.companyLocation || { city: 'Boulder', region: 'Colorado' };
  const title = pageHeading('overview', 'dashSub', `<span class="badge info">${esc(t('demoOnly'))}</span><span class="badge neutral">${esc(companyLocation.city)}, ${esc(companyLocation.region)} · listed address</span>${button('new-customer', t('newCustomer'), 'primary', 'plus')}`);
  const metrics = `<div class="grid metrics-grid">
    <article class="metric-card"><div class="metric-top"><span>${esc(t('totalDeposits'))}</span><i class="metric-icon">${icon('savings')}</i></div><div class="metric-value">${esc(compactCurrency(deposits))}</div><div class="metric-foot"><span class="positive">+2.8%</span><span>${esc(t('sinceYesterday'))}</span></div><svg class="metric-spark" viewBox="0 0 75 28"><path d="M2 23 12 20 21 21 31 13 40 16 50 9 59 12 72 4" fill="none" stroke="#63c9b2" stroke-width="1.7" stroke-linecap="round"/></svg></article>
    <article class="metric-card"><div class="metric-top"><span>${esc(t('paymentsToday'))}</span><i class="metric-icon blue">${icon('payments')}</i></div><div class="metric-value">${todayCount}<small>${esc(t('activity').toLowerCase())}</small></div><div class="metric-foot"><span>${esc(t('localSimulation'))}</span></div><svg class="metric-spark" viewBox="0 0 75 28"><path d="M2 21 11 19 21 21 31 12 42 14 51 8 62 13 72 4" fill="none" stroke="#7b9ce4" stroke-width="1.7" stroke-linecap="round"/></svg></article>
    <article class="metric-card"><div class="metric-top"><span>${esc(t('activeCustomers'))}</span><i class="metric-icon purple">${icon('users')}</i></div><div class="metric-value">${activeCustomers}<small>/ ${state.customers.length}</small></div><div class="metric-foot"><span>${esc(t('kycPending'))}: ${pendingKyc}</span></div><svg class="metric-spark" viewBox="0 0 75 28"><path d="M2 22 12 18 22 20 33 11 43 13 54 7 64 10 72 3" fill="none" stroke="#a489c8" stroke-width="1.7" stroke-linecap="round"/></svg></article>
    <article class="metric-card"><div class="metric-top"><span>${esc(t('liquidity'))}</span><i class="metric-icon orange">${icon('bank')}</i></div><div class="metric-value">${esc(compactCurrency(liquidityCents))}</div><div class="metric-foot"><span class="positive">${esc(t('availableToMove'))}</span></div><svg class="metric-spark" viewBox="0 0 75 28"><path d="M2 23 12 20 22 15 32 18 42 11 52 13 62 6 72 4" fill="none" stroke="#e0b476" stroke-width="1.7" stroke-linecap="round"/></svg></article>
  </div>`;
  const activityRows = state.transactions.slice(0, 7).map(tx => {
    const customer = customerById(tx.customerId);
    return `<div class="activity-row"><span class="activity-icon ${tx.direction === 'out' ? 'out' : ''}">${icon(tx.direction === 'in' ? 'arrow' : 'payments')}</span><div class="activity-copy"><strong>${esc(txLabel(tx))}</strong><small>${esc(customer?.name || tx.customerId)} · ${esc(tx.counterparty || tx.channel)}</small></div><div class="activity-amount ${tx.direction === 'in' ? 'in' : ''}">${esc(amountWithDirection(tx))}<small>${esc(fmtTime(tx.date))}</small></div></div>`;
  }).join('');
  const trend = `<div class="chart-summary"><strong>${esc(compactCurrency(volume30))}</strong><span>+8.4%</span></div><p class="panel-description">${esc(t('monthlyVolume'))} · ${esc(t('sampleValue').toLowerCase())}</p>${buildChart()}`;
  const bankRows = state.bankAccounts.map((account, index) => {
    const iconClass = index === 0 ? 'reserve' : '';
    const label = index === 0 ? t('centralReserve') : index === 1 ? t('mainAccount') : account.label;
    return `<div class="bank-account-row"><div class="bank-account-left"><i class="bank-account-icon ${iconClass}">${icon(index === 0 ? 'bank' : 'account')}</i><div><strong>${esc(label)}</strong><small>${esc(account.bank)} · ${esc(account.ref)}</small></div></div><span class="bank-account-amount">${esc(currency(account.balanceCents, account.currency))}</span></div>`;
  }).join('');
  const branchPills = state.branches.map(branch => `<span class="branch-pill"><i></i>${esc(branch.code)} · ${esc(branch.city)}</span>`).join('');
  const lower = `<div class="grid lower-grid">
    ${panel(t('mainAccount'), `<div class="balance-total"><div class="balance-total-top"><span>${esc(t('localSimulation'))} · EUR equivalent</span><span class="balance-chip">${esc(t('cleared'))}</span></div><strong>${esc(currency(liquidityCents))}</strong><small>${esc(t('liquidityAvailable'))}</small></div><div class="bank-account-list">${bankRows.slice(0, 4)}</div><div class="branch-strip">${branchPills}</div>`, { description: t('cashPositions'), actions: `<button class="panel-link" data-view="ledger">${esc(t('viewAll'))} →</button>` })}
    ${panel(t('quickActions'), `<div class="quick-actions"><button class="quick-action" data-action="new-customer"><i>${icon('users')}</i><span>${esc(t('openClient'))}<small>${esc(t('customerRecord'))}</small></span></button><button class="quick-action" data-action="transfer"><i class="blue">${icon('exchange')}</i><span>${esc(t('internalTransfer'))}<small>${esc(t('localLedger'))}</small></span></button><button class="quick-action" data-action="cash-operation"><i class="orange">${icon('cash')}</i><span>${esc(t('cashOperation'))}<small>${esc(t('branchesCash'))}</small></span></button><button class="quick-action" data-action="issue-card"><i class="purple">${icon('card')}</i><span>${esc(t('issueCard'))}<small>${esc(t('cards'))}</small></span></button></div><div class="compliance-mini"><div class="compliance-mini-title">${icon('shieldCheck')} ${esc(t('openCases'))}<b>${openCases} ${esc(t('openCase').toLowerCase())}</b></div><p>${esc(t('amlSub'))}</p></div>`, { description: t('localSimulation') })}
  </div>`;
  return `${title}${metrics}<div class="grid overview-grid">${panel(t('monthlyVolume'), trend, { description: t('thisMonth'), actions: `<div class="period-tabs"><button class="active">${esc(t('thisMonth'))}</button><button>${esc(t('thisWeek'))}</button><button>${esc(t('today'))}</button></div>` })}${panel(t('recentActivity'), `<div class="activity-list">${activityRows || emptyState(t('noTransactions'))}</div>`, { description: `${todayCount} ${t('processedToday').toLowerCase()}`, actions: `<button class="panel-link" data-view="payments">${esc(t('viewAll'))} →</button>` })}</div>${lower}<div class="grid two-col" style="margin-top:16px">${renderAssistant('staff')}${panel(t('staffGuide'), renderProcedureGuide('staff'), { description: t('staffGuideSub') })}</div>`;
}

function assistantChat(audience, customerId = '') {
  const key = audience === 'staff' ? 'staff' : `customer:${customerId}`;
  if (!assistantChats.has(key)) assistantChats.set(key, []);
  return assistantChats.get(key);
}
function renderAssistant(audience, customer = null) {
  const messages = assistantChat(audience, customer?.id || '');
  const promptList = audience === 'staff'
    ? [['assistantPromptAml', 'How should I review an AML alert?'], ['assistantPromptRates', 'Explain the ECB reference rates'], ['assistantPromptSwift', 'How do I prepare a SWIFT draft?']]
    : [['assistantPromptBalance', 'Show my balances'], ['assistantPromptFx', 'How do I convert currency?'], ['assistantPromptCard', 'How can I lock a card?']];
  const transcript = messages.length ? messages.slice(-6).map(message => `<div class="assistant-message ${message.role}"><small>${message.role === 'user' ? esc(t('you')) : esc(t('localCopilot'))}</small><p>${esc(message.text)}</p></div>`).join('')
    : `<div class="assistant-empty">${esc(t('assistantWelcome'))}</div>`;
  const body = `<div class="assistant-transcript">${transcript}</div><div class="assistant-prompts">${promptList.map(([labelKey, question]) => `<button type="button" class="assistant-prompt" data-action="assistant-prompt" data-audience="${audience}" data-question="${esc(question)}">${esc(t(labelKey))}</button>`).join('')}</div><form class="assistant-form" data-form="assistant-${audience}"><input name="question" maxlength="220" required autocomplete="off" placeholder="${esc(t('assistantPlaceholder'))}"><button class="btn primary" type="submit">${esc(t('send'))}</button></form><p class="assistant-disclaimer">${esc(t('assistantDisclaimer'))}</p>`;
  return panel(t('assistantTitle'), body, { description: audience === 'staff' ? t('staffAssistantSub') : t('customerAssistantSub'), actions: '<span class="badge info">LOCAL · RULE-BASED</span>' });
}
function renderProcedureGuide(audience) {
  const steps = audience === 'staff'
    ? [['1 · Prepare', 'Use only fictional records; check role and maker/checker state.'], ['2 · Review', 'Use the synthetic AML/KYC queue; do not imply real screening.'], ['3 · Approve', 'Use the local demo checker; inspect the audit entry and ledger.'], ['4 · Explain', 'Tell the customer nothing was sent to a payment network.']]
    : [['1 · Open', 'Choose a fictional profile and request a demo currency account.'], ['2 · Verify', 'Submit a synthetic KYC rehearsal; do not enter real ID details.'], ['3 · Manage', 'Try a local transfer, FX conversion, savings, card or credit flow.'], ['4 · Review', 'Check the activity history; no real funds move.']];
  return `<div class="procedure-guide">${steps.map(([title, text]) => `<div class="procedure-step"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`).join('')}</div>`;
}

function onboardingNextStep(status) {
  const key = ({ submitted_demo: 'onboardingNextSubmitted', needs_info_demo: 'onboardingNextNeedsInfo', reviewed_demo: 'onboardingNextReviewed', closed_demo: 'onboardingNextClosed' })[status] || 'onboardingNextSubmitted';
  return t(key);
}

function renderPortal() {
  const customer = customerById(portalCustomerId) || state.customers[0];
  if (!customer) return emptyState();
  const accounts = customerAccounts(customer.id);
  const eurBalance = accounts.filter(account => account.status === 'active').reduce((sum, account) => {
    const eur = accountBalanceEur(state, account);
    return eur === null ? sum : sum + Math.round(eur);
  }, 0);
  const cards = state.cards.filter(card => card.customerId === customer.id);
  const loans = (state.loans || []).filter(loan => loan.customerId === customer.id);
  const savingsDeposits = (state.deposits || []).filter(deposit => deposit.customerId === customer.id);
  const transactions = state.transactions.filter(tx => tx.customerId === customer.id).slice(0, 6);
  const pendingPayments = state.payments.filter(payment => payment.customerId === customer.id && payment.direction === 'out' && payment.status === 'awaiting_approval').slice(0, 4);
  const customerCrypto = state.wallets.filter(wallet => wallet.customerId === customer.id && wallet.units > 0);
  const customerComplaints = (state.complaints || []).filter(complaint => complaint.customerId === customer.id).slice(0, 3);
  const customerOptions = state.customers.slice().sort((a, b) => a.name.localeCompare(b.name, locale())).map(item => `<option value="${esc(item.id)}" ${item.id === customer.id ? 'selected' : ''}>${esc(item.name)} · ${esc(item.id)} · ${esc(labelStatus(item.kyc))}</option>`).join('');
  const accountRows = accounts.length ? accounts.map(account => `<div class="bank-account-row"><div class="bank-account-left"><i class="bank-account-icon">${icon('account')}</i><div><strong>${esc(account.label)} · ${esc(account.currency)}</strong><small class="mono">${esc(accountRouteSummary(account))}</small></div></div><div class="bank-account-amount">${esc(currency(account.balanceCents, account.currency))}<small class="sub-cell">${badge(account.status)}</small></div></div>`).join('') : emptyState(t('noAccounts'));
  const cardRows = cards.length ? cards.slice(0, 4).map(card => {
    const statusAction = ['active', 'locked'].includes(card.status) ? `<button class="btn small" data-action="card-status" data-id="${esc(card.id)}" data-status="${card.status === 'active' ? 'locked' : 'active'}">${esc(card.status === 'active' ? t('lockCard') : t('unlockCard'))}</button>` : badge(card.status);
    const loadAction = card.fundingType === 'prepaid' && card.status === 'active' ? `<button class="btn small" data-action="card-load" data-id="${esc(card.id)}">${esc(t('cardLoad'))}</button>` : '';
    const purchaseAction = card.status === 'active' ? `<button class="btn small" data-action="card-purchase" data-id="${esc(card.id)}">${esc(t('simulateCardPurchase'))}</button>` : '';
    const balance = card.fundingType === 'prepaid' ? ` · ${esc(t('prepaidBalance'))}: ${esc(currency(card.prepaidBalanceCents || 0))}` : '';
    return `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('card')}</span><div><strong>${esc(card.product)} · ${esc(t('cardTokenSuffix'))} ${esc(card.last4)}</strong><small>${esc(t('status'))}: ${esc(labelStatus(card.status))} · ${esc(t('virtualTokenOnly'))}${balance}</small></div><div class="card-portal-actions">${statusAction}<button class="btn small" data-action="card-controls" data-id="${esc(card.id)}">${esc(t('cardControls'))}</button>${loadAction}${purchaseAction}</div></div>`;
  }).join('') : emptyState(t('noRecords'));
  const loanRows = loans.length ? loans.map(loan => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('loan')}</span><div><strong>${esc(loan.product)} · ${esc(currency(loan.outstandingCents))}</strong><small>${esc(loan.id)} · ${esc(t('nextPayment'))}: ${esc(loan.nextPaymentAt ? fmtDate(loan.nextPaymentAt) : '—')}</small></div>${badge(loan.status)}</div>`).join('') : emptyState(t('noRecords'));
  const savingsRows = savingsDeposits.length ? savingsDeposits.map(deposit => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('savings')}</span><div><strong>${esc(currency(deposit.principalCents))} · ${deposit.termMonths} ${esc(t('term').toLowerCase())}</strong><small>${esc(deposit.id)} · ${esc(t('maturity'))}: ${esc(fmtDate(deposit.maturityAt))} · ${(deposit.annualRateBps / 100).toFixed(2)}% indicative</small></div>${badge(deposit.status)}</div>`).join('') : emptyState(t('noRecords'));
  const activityRows = transactions.map(tx => `<div class="activity-row"><span class="activity-icon ${tx.direction === 'out' ? 'out' : ''}">${icon(tx.direction === 'in' ? 'arrow' : 'payments')}</span><div class="activity-copy"><strong>${esc(txLabel(tx))}</strong><small>${esc(tx.counterparty || tx.channel)} · ${esc(fmtDate(tx.date, true))}</small></div><div class="activity-amount ${tx.direction === 'in' ? 'in' : ''}">${esc(amountWithDirection(tx))}<button class="panel-link" data-action="print-transaction" data-id="${esc(tx.id)}">${esc(t('print'))}</button></div></div>`).join('');
  const hasCurrencyPair = new Set(accounts.filter(account => account.status === 'active' && !CURRENCIES[account.currency]?.crypto).map(account => account.currency)).size > 1;
  const actionButtons = `<div class="portal-actions"><button class="btn primary" data-action="portal-open-account">${icon('account')}${esc(t('openCurrencyAccount'))}</button><button class="btn" data-action="portal-onboarding">${icon('verify')}${esc(t('startDemoOnboarding'))}</button><button class="btn" data-action="portal-convert" ${hasCurrencyPair ? '' : `disabled title="${esc(t('needsMultipleCurrencies'))}"`}>${icon('exchange')}${esc(t('convertAccounts'))}</button><button class="btn" data-action="portal-interbank">${icon('bank')}${esc(t('interbankTransfer'))}</button><button class="btn" data-action="portal-kyc" ${customer.kyc === 'verified' ? 'disabled title="Demo profile is already marked verified"' : ''}>${icon('shieldCheck')}${esc(t('startDemoKyc'))}</button><button class="btn" data-action="portal-transfer">${icon('exchange')}${esc(t('newTransfer'))}</button><button class="btn" data-action="portal-payment">${icon('payments')}${esc(t('paySomeone'))}</button><button class="btn" data-action="portal-incoming">${icon('arrow')}${esc(t('receivePayment'))}</button><button class="btn" data-action="portal-loan">${icon('loan')}${esc(t('applyForCredit'))}</button><button class="btn" data-action="portal-deposit">${icon('savings')}${esc(t('newDeposit'))}</button><button class="btn" data-action="portal-card">${icon('card')}${esc(t('manageCards'))}</button><button class="btn" data-action="portal-exchange">${icon('globe')}${esc(t('openExchange'))}</button><button class="btn" data-action="portal-crypto-send">${icon('arrow')}${esc(t('cryptoSend'))}</button><button class="btn" data-action="portal-crypto-receive">${icon('arrow')}${esc(t('cryptoReceive'))}</button><button class="btn" data-action="portal-support">${icon('support')}${esc(t('contactSupport'))}</button><button class="btn" data-action="portal-complaint">${icon('support')}${esc(t('newComplaint'))}</button></div>`;
  const customerTickets = (state.supportTickets || []).filter(ticket => ticket.customerId === customer.id).slice(0, 3);
  const ticketRows = customerTickets.length ? customerTickets.map(ticket => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('support')}</span><div><strong>${esc(ticket.subject)}</strong><small>${esc(ticket.id)} · ${esc(fmtDate(ticket.createdAt, true))}</small></div>${badge(ticket.status)}</div>`).join('') : emptyState(t('noRecords'));
  const demoApplications = (state.onboardingApplications || []).filter(application => application.customerId === customer.id).slice(0, 4);
  const demoApplicationRows = demoApplications.length ? demoApplications.map(application => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('verify')}</span><div><strong>${esc(application.id)} · ${esc(t(application.reviewPath === 'enhanced_review_demo' ? 'onboardingEnhancedPath' : 'onboardingStandardPath'))}</strong><small>${esc(fmtDate(application.submittedAt, true))} · ${esc(onboardingNextStep(application.status))}</small></div>${badge(application.status)}</div>`).join('') : emptyState(t('noOnboardingApplications'));
  const onboardingPanel = panel(t('onlineOnboarding'), demoApplicationRows, { description: t('onboardingBoundary'), actions: `<button class="btn small primary" data-action="portal-onboarding">${esc(t('startDemoOnboarding'))}</button>` });
  const pendingPaymentRows = pendingPayments.length ? pendingPayments.map(payment => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('payments')}</span><div><strong>${esc(payment.beneficiary)} · ${esc(currency(payment.amountCents, payment.currency))}</strong><small>${esc(payment.id)} · ${esc(t('awaitingApproval'))} · not sent</small></div><button class="btn small danger" data-action="cancel-payment" data-id="${esc(payment.id)}">${esc(t('stopPayment'))}</button></div>`).join('') : emptyState(t('noPendingPayments'));
  const cryptoRows = customerCrypto.length ? customerCrypto.slice(0, 4).map(wallet => `<div class="portal-mini-row"><span class="portal-mini-icon">${esc(wallet.asset.slice(0, 2))}</span><div><strong>${esc(wallet.asset)} · ${new Intl.NumberFormat(locale(), { maximumFractionDigits: CURRENCIES[wallet.asset]?.decimals || 2 }).format(wallet.units)}</strong><small>${esc(t('digitalAssetNotice'))}</small></div></div>`).join('') : emptyState(t('noRecords'));
  const complaintRows = customerComplaints.length ? customerComplaints.map(complaint => `<div class="portal-mini-row"><span class="portal-mini-icon">${icon('support')}</span><div><strong>${esc(complaint.subject)}</strong><small>${esc(complaint.id)} · ${esc(complaint.customerVisibleResponse || t('complaintLocalOnly'))}</small></div>${badge(complaint.status)}</div>`).join('') : emptyState(t('noRecords'));
  const standalonePortalLink = document.body.dataset.surface === 'client' ? '' : `<a class="btn" href="./client.html">${esc(t('openClientPortal'))} ↗</a>`;
  return `${pageHeading('customerPortal', 'portalSub', `${standalonePortalLink}<button class="btn" data-action="print-statement" data-id="${esc(customer.id)}">${esc(t('printStatement'))}</button><button class="btn" data-action="export-statement" data-id="${esc(customer.id)}">${esc(t('exportStatement'))}</button><span class="badge warning">${esc(t('demoOnly'))}</span>`)}<section class="portal-hero"><div class="portal-hero-main"><div class="eyebrow"><i class="tiny-dot"></i>ADRIA BANK · ${esc(t('customerPortal'))}</div><h2>${esc(t('welcomeBack'))}, ${esc(customer.name.split(' ')[0])}</h2><p>${esc(customer.city)}, ${esc(customer.country)} · ${esc(customer.id)} · ${badge(customer.kyc)}</p><div class="portal-balance"><small>${esc(t('availableBalance'))} · ${esc(t('sampleValue'))}</small><strong>${esc(compactCurrency(eurBalance))}</strong><span>${accounts.filter(account => account.status === 'active').length} active multi-currency demo account(s) · ${esc(t('digitalFirstGoal'))}</span></div></div><div class="portal-profile"><label for="portalCustomerSelect">${esc(t('selectProfile'))}</label><select id="portalCustomerSelect">${customerOptions}</select><div class="portal-profile-note">${icon('shieldCheck')}<span>${esc(t('userPortalNotice'))} ${esc(t('noCustomerLogin'))}</span></div></div></section>${actionButtons}<div class="stats-row"><div class="stat-tile"><small>${esc(t('myAccounts'))}</small><strong>${accounts.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('myCards'))}</small><strong>${cards.filter(card => card.status === 'active').length}</strong><span>${esc(t('active'))}</span></div><div class="stat-tile"><small>${esc(t('myCredit'))}</small><strong>${loans.filter(loan => ['performing','arrears'].includes(loan.status)).length}</strong><span>${esc(t('loanBook'))}</span></div><div class="stat-tile"><small>${esc(t('myActivity'))}</small><strong>${state.transactions.filter(tx => tx.customerId === customer.id).length}</strong><span>${esc(t('localSimulation'))}</span></div></div><div class="grid two-col"><div class="grid" style="align-content:start;gap:15px">${panel(t('myAccounts'), accountRows, { description: t('accountsSub') })}${panel(t('myCredit'), loanRows, { description: t('loansSub') })}${panel(t('savings'), savingsRows, { description: t('savingsSub') })}</div><div class="grid" style="align-content:start;gap:15px">${panel(t('myCards'), cardRows, { description: t('cardsSub') })}${panel(t('myActivity'), `<div class="activity-list">${activityRows || emptyState(t('noTransactions'))}</div>`, { description: `${transactions.length} ${t('records')}` })}</div></div><div class="grid two-col" style="margin-top:14px">${onboardingPanel}${panel(t('contactSupport'), ticketRows, { description: t('supportHistory') })}${panel(t('complaints'), complaintRows, { description: t('complaintDemoDisclosure'), actions: `<button class="btn small" data-action="portal-complaint">${esc(t('newComplaint'))}</button>` })}${panel(t('wallets'), cryptoRows, { description: t('digitalAssetNotice'), actions: `<button class="btn small" data-action="portal-crypto-send">${esc(t('cryptoSend'))}</button>` })}${panel(t('pendingPayments'), pendingPaymentRows, { description: t('stopBeforeApproval') })}${panel(t('customerGuide'), renderProcedureGuide('customer'), { description: t('digitalFirstGoal') })}</div>${state.settings.backgroundSimulationEnabled !== false ? `<div class="notice info" style="margin-top:12px"><b>i</b><span>${esc(t('backgroundSafety'))} · ${esc(t('backgroundActive'))}</span></div>` : ''}${renderAssistant('customer', customer)}<div class="notice warn" style="margin-top:14px"><b>!</b><span>${esc(t('userPortalNotice'))}</span></div>`;
}

function renderCustomers() {
  const f = filterState.customers;
  const query = f.q.toLocaleLowerCase(locale());
  const filtered = state.customers.filter(customer => {
    const search = `${customer.id} ${customer.name} ${customer.city} ${customer.country} ${customer.email}`.toLocaleLowerCase(locale());
    return (!query || search.includes(query)) && (f.kyc === 'all' || customer.kyc === f.kyc) && (f.risk === 'all' || customer.risk === f.risk);
  }).sort((a, b) => a.name.localeCompare(b.name, locale()));
  const page = paged(filtered, 'customers');
  const rows = page.items.map(customer => `<tr><td>${formatClient(customer)}</td><td>${esc(customer.city)}, ${esc(customer.country)}</td><td>${esc(customer.segment)}</td><td>${badge(customer.risk)}</td><td>${badge(customer.kyc)}</td><td>${customerAccounts(customer.id).length}</td><td>${esc(fmtDate(customer.joinedAt))}</td><td><button class="row-action" data-action="customer-open" data-id="${esc(customer.id)}" aria-label="View details">···</button></td></tr>`);
  const content = tableShell([t('client'), t('city'), t('segment'), t('risk'), t('kyc'), t('accounts'), t('date'), t('actions')], rows, page.footer);
  const verified = state.customers.filter(customer => customer.kyc === 'verified').length;
  const kycFollow = state.customers.length - verified;
  return `${pageHeading('customers', 'customersSub', `${button('new-customer', t('newCustomer'), 'primary', 'plus')}${button('new-account', t('newAccount'), '', 'account')}`)}
    <div class="stats-row"><div class="stat-tile"><small>${esc(t('totalClients'))}</small><strong>${state.customers.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('verified'))} KYC</small><strong>${verified}</strong><span>${Math.round(verified / Math.max(state.customers.length, 1) * 100)}%</span></div><div class="stat-tile"><small>${esc(t('kycPending'))}</small><strong>${kycFollow}</strong><span>${esc(t('nextReview'))}</span></div><div class="stat-tile"><small>${esc(t('openCases'))}</small><strong>${state.cases.filter(item => item.status !== 'closed').length}</strong><span>${esc(t('illustrative'))}</span></div></div>
    <section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="customers" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="customers" data-filter-field="kyc"><option value="all">${esc(t('allStatuses'))} · KYC</option>${['verified','pending','expired','edd'].map(value => `<option value="${value}" ${f.kyc === value ? 'selected' : ''}>${esc(t(value))}</option>`).join('')}</select><select class="filter-select" data-filter-list="customers" data-filter-field="risk"><option value="all">${esc(t('allRisk'))}</option>${['low','medium','high'].map(value => `<option value="${value}" ${f.risk === value ? 'selected' : ''}>${esc(t(value))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge neutral">${filtered.length} ${esc(t('results'))}</span></div></div>${content}</section>`;
}

function renderAccounts() {
  const f = filterState.accounts;
  const query = f.q.toLocaleLowerCase(locale());
  const filtered = state.accounts.filter(account => {
    const customer = customerById(account.customerId);
    const text = `${account.id} ${account.accountNumber || ''} ${account.iban} ${account.label} ${customer?.name || ''} ${account.currency}`.toLocaleLowerCase(locale());
    return (!query || text.includes(query)) && (f.status === 'all' || account.status === f.status) && (f.currency === 'all' || account.currency === f.currency);
  });
  const page = paged(filtered, 'accounts');
  const rows = page.items.map(account => {
    const customer = customerById(account.customerId);
    return `<tr><td>${formatClient(customer)}</td><td><span class="mono">${esc(account.id)}</span><small class="sub-cell">${esc(account.accountNumber || account.label)}</small></td><td class="mono">${esc(prettyRoutingIdentifier(account.iban || account.accountNumber))}<small class="sub-cell">${esc(account.identifierKind === 'invalid_demo_iban' ? 'deliberately invalid checksum' : 'domestic demo ID')}</small></td><td class="mono">${esc(account.bic || createDemoBic(account.countryCode))}</td><td>${esc(account.currency)}${CURRENCIES[account.currency]?.noEurReference ? `<small class="sub-cell">${esc(t('noReferenceRate'))}</small>` : ''}</td><td><strong>${esc(currency(account.balanceCents, account.currency))}</strong></td><td>${badge(account.status)}</td><td>${esc(fmtDate(account.openedAt))}</td><td><button class="btn small" data-action="print-statement" data-id="${esc(account.customerId)}" data-account-id="${esc(account.id)}">${esc(t('print'))}</button><button class="row-action" data-action="customer-open" data-id="${esc(account.customerId)}">···</button></td></tr>`;
  });
  const balances = state.accounts.reduce((sum, account) => {
    const eur = accountBalanceEur(state, account);
    return eur === null ? sum : sum + Math.round(eur);
  }, 0);
  const nativeOnlyCount = state.accounts.filter(account => account.status === 'active' && accountBalanceEur(state, account) === null).length;
  return `${pageHeading('accounts', 'accountsSub', `${button('new-account', t('newAccount'), 'primary', 'plus')}${button('transfer', t('internalTransfer'), '', 'exchange')}`)}
    <div class="stats-row"><div class="stat-tile"><small>${esc(t('totalAccounts'))}</small><strong>${state.accounts.length}</strong><span>${esc(t('active'))}: ${state.accounts.filter(item => item.status === 'active').length}</span></div><div class="stat-tile"><small>${esc(t('totalDeposits'))}</small><strong>${esc(compactCurrency(totalCustomerDepositsCents(state)))}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('available'))} · EUR</small><strong>${esc(compactCurrency(balances))}</strong><span>${esc(t('localSimulation'))}</span></div><div class="stat-tile"><small>${esc(t('nativeOnlyPositions'))}</small><strong>${nativeOnlyCount}</strong><span>${esc(t('noReferenceRate'))}</span></div></div>
    <section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="accounts" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="accounts" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${['active','restricted','blocked'].map(value => `<option value="${value}" ${f.status === value ? 'selected' : ''}>${esc(t(value))}</option>`).join('')}</select><select class="filter-select" data-filter-list="accounts" data-filter-field="currency"><option value="all">${esc(t('all'))} ${esc(t('currency').toLowerCase())}</option>${['EUR', ...accountCurrencies()].map(value => `<option value="${value}" ${f.currency === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge info">${esc(t('accountHelp'))}</span></div></div>${tableShell([t('client'), t('account'), t('demoIbanOrDomesticId'), 'BIC · DEMO', t('currency'), t('balance'), t('status'), t('date'), t('actions')], rows, page.footer)}</section>`;
}

function renderPayments() {
  const f = paymentTab === 'orders' ? filterState.payments : filterState.transactions;
  const viewAction = `<div class="exchange-tabs"><button data-action="payment-tab" data-tab="orders" class="${paymentTab === 'orders' ? 'active' : ''}">${esc(t('payments'))}</button><button data-action="payment-tab" data-tab="history" class="${paymentTab === 'history' ? 'active' : ''}">${esc(t('transactionHistory'))}</button></div>`;
  let body;
  if (paymentTab === 'orders') {
    const query = f.q.toLocaleLowerCase(locale());
    const filtered = state.payments.filter(payment => {
      const customer = customerById(payment.customerId);
      const text = `${payment.id} ${payment.beneficiary} ${payment.sender || ''} ${payment.beneficiaryIban} ${payment.reference} ${customer?.name || ''}`.toLocaleLowerCase(locale());
      return (!query || text.includes(query)) && (f.status === 'all' || payment.status === f.status);
    });
    const page = paged(filtered, 'payments');
    const rows = page.items.map(payment => {
      const customer = customerById(payment.customerId);
      const incoming = payment.direction === 'in';
      const counterparty = incoming ? payment.sender || payment.beneficiary : payment.beneficiary;
      const route = incoming ? payment.senderIban : payment.beneficiaryIban;
      const country = incoming ? payment.senderCountry : payment.beneficiaryCountry;
      const approveAction = payment.status === 'awaiting_approval' && canApprove() ? `<button class="btn small soft-teal" data-action="approve-payment" data-id="${esc(payment.id)}">${esc(incoming ? t('approveIncoming') : t('approve'))}</button>` : '';
      const stopAction = !incoming && payment.status === 'awaiting_approval' && canWrite() ? `<button class="btn small danger" data-action="cancel-payment" data-id="${esc(payment.id)}">${esc(t('stopPayment'))}</button>` : '';
      return `<tr><td><span class="mono">${esc(payment.id)}</span><small class="sub-cell">${esc(payment.reference)}</small></td><td><span class="badge ${incoming ? 'success' : 'info'}">${esc(incoming ? t('incoming') : t('outgoing'))}</span></td><td>${formatClient(customer)}</td><td>${esc(counterparty)}<small class="sub-cell">${esc(country || '—')} · ${esc(prettyRoutingIdentifier(route))}</small><small class="sub-cell mono">${esc(incoming ? payment.senderBic || '—' : payment.beneficiaryBic || '—')} · DEMO BIC</small></td><td>${esc(payment.rail)}</td><td>${esc(currency(payment.amountCents, payment.currency))}</td><td>${badge(payment.status)}</td><td>${esc(fmtDate(payment.createdAt))}</td><td class="action-cell">${approveAction}${stopAction}<button class="btn small" data-action="print-payment" data-id="${esc(payment.id)}">${esc(t('print'))}</button></td></tr>`;
    });
    body = `<div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="payments" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="payments" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${['awaiting_approval','settled_simulation','approved_simulation','cancelled','returned'].map(value => `<option value="${value}" ${f.status === value ? 'selected' : ''}>${esc(labelStatus(value))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge warning">${state.payments.filter(item => item.status === 'awaiting_approval').length} ${esc(t('approvals').toLowerCase())}</span></div></div>${tableShell([t('reference'), t('direction'), t('client'), t('beneficiary'), t('rail'), t('amount'), t('status'), t('date'), t('actions')], rows, page.footer)}<div style="padding:0 14px 13px"><div class="notice info"><b>i</b><span>${esc(t('approvalNotice'))} ${esc(t('incomingPaymentDisclosure'))}</span></div></div>`;
  } else {
    const query = f.q.toLocaleLowerCase(locale());
    const filtered = state.transactions.filter(tx => {
      const customer = customerById(tx.customerId);
      const text = `${tx.id} ${txLabel(tx)} ${tx.counterparty} ${tx.reference} ${customer?.name || ''} ${tx.channel}`.toLocaleLowerCase(locale());
      return (!query || text.includes(query)) && (f.type === 'all' || tx.type === f.type);
    });
    const page = paged(filtered, 'transactions');
    const rows = page.items.map(tx => `<tr><td><span class="mono">${esc(tx.id)}</span><small class="sub-cell">${esc(tx.reference || '—')}</small></td><td>${formatClient(customerById(tx.customerId))}</td><td><strong>${esc(txLabel(tx))}</strong><small class="sub-cell">${esc(tx.channel || '—')}</small></td><td>${esc(tx.counterparty || '—')}</td><td>${amountWithDirection(tx)}</td><td>${badge(tx.status)}</td><td>${esc(fmtDate(tx.date, true))}</td><td><button class="btn small" data-action="print-transaction" data-id="${esc(tx.id)}">${esc(t('print'))}</button></td></tr>`);
    const typeOptions = [...new Set(state.transactions.map(tx => tx.type))];
    body = `<div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="transactions" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="transactions" data-filter-field="type"><option value="all">${esc(t('allTypes'))}</option>${typeOptions.map(value => `<option value="${esc(value)}" ${f.type === value ? 'selected' : ''}>${esc(txLabel({ type: value, label: value }))}</option>`).join('')}</select></div><div class="toolbar-right">${button('download-csv', t('downloadCsv'), 'small', 'download')}</div></div>${tableShell([t('transaction'), t('client'), t('category'), t('counterparty'), t('amount'), t('status'), t('date'), t('actions')], rows, page.footer)}`;
  }
  const settled = state.payments.filter(payment => ['settled_simulation','approved_simulation'].includes(payment.status)).length;
  const incomingCount = state.payments.filter(payment => payment.direction === 'in').length;
  const awaiting = state.payments.filter(payment => payment.status === 'awaiting_approval').length;
  return `${pageHeading('payments', 'paymentsSub', `${button('transfer', t('internalTransfer'), '', 'exchange')}${button('new-payment', t('newPayment'), '', 'plus')}${button('incoming-payment', t('receivePayment'), 'primary', 'arrow')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('payments'))}</small><strong>${state.payments.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('receivePayment'))}</small><strong>${incomingCount}</strong><span>${esc(t('noExternalFunds'))}</span></div><div class="stat-tile"><small>${esc(t('awaitingApproval'))}</small><strong>${awaiting}</strong><span>${esc(t('approvalRequired'))}</span></div><div class="stat-tile"><small>${esc(t('settledSimulation'))}</small><strong>${settled}</strong><span>${esc(t('localSimulation'))}</span></div></div><section class="panel"><div class="toolbar"><div class="toolbar-left">${viewAction}</div><div class="toolbar-right"><span class="badge info">${esc(t('controlsNotWired'))}</span></div></div>${body}</section>`;
}

function renderCards() {
  const f = filterState.cards;
  const query = f.q.toLocaleLowerCase(locale());
  const filtered = state.cards.filter(card => {
    const customer = customerById(card.customerId);
    return (!query || `${card.id} ${card.product} ${customer?.name || ''} ${card.last4}`.toLocaleLowerCase(locale()).includes(query)) && (f.status === 'all' || card.status === f.status);
  });
  const page = paged(filtered, 'cards');
  const rows = page.items.map(card => {
    const customer = customerById(card.customerId);
    const activeOrLocked = ['active', 'locked'].includes(card.status);
    const nextStatus = card.status === 'active' ? 'locked' : 'active';
    const statusAction = activeOrLocked ? `<button class="btn small" data-action="card-status" data-id="${esc(card.id)}" data-status="${nextStatus}">${esc(card.status === 'active' ? t('lockCard') : t('unlockCard'))}</button>` : '';
    const controlsAction = activeOrLocked ? `<button class="btn small" data-action="card-controls" data-id="${esc(card.id)}">${esc(t('cardControls'))}</button>` : '';
    const loadAction = card.fundingType === 'prepaid' && card.status === 'active' ? `<button class="btn small" data-action="card-load" data-id="${esc(card.id)}">${esc(t('cardLoad'))}</button>` : '';
    const purchaseAction = card.status === 'active' ? `<button class="btn small" data-action="card-purchase" data-id="${esc(card.id)}">${esc(t('simulateCardPurchase'))}</button>` : '';
    const cancelAction = activeOrLocked ? `<button class="btn small danger" data-action="card-cancel" data-id="${esc(card.id)}">${esc(t('closeCard'))}</button>` : '';
    const controls = card.controls || {};
    const actionCell = canWrite() ? `<div class="card-table-actions">${statusAction}${controlsAction}${loadAction}${purchaseAction}${cancelAction}</div>` : `<span class="badge neutral">${esc(t('roleReadOnly'))}</span>`;
    const limits = `${currency(card.dailyLimitCents)} / ${currency(card.monthlyLimitCents || 0)}`;
    const flags = `${t('onlinePayments')}: ${t(controls.onlineEnabled === false ? 'disabled' : 'enabled')} · ${t('internationalPayments')}: ${t(controls.internationalEnabled ? 'enabled' : 'disabled')} · ${t('recurringPayments')}: ${t(controls.recurringEnabled === false ? 'disabled' : 'enabled')}`;
    return `<tr><td>${formatClient(customer)}</td><td><strong>${esc(card.product)}</strong><small class="sub-cell">${esc(card.formFactor === 'virtual' ? t('virtualTokenOnly') : card.formFactor)}</small></td><td><span class="mono">DEMO · ${esc(card.last4)}</span></td><td>${esc(accountById(card.accountId)?.id || '—')}</td><td>${esc(limits)}</td><td>${card.fundingType === 'prepaid' ? `<strong>${esc(currency(card.prepaidBalanceCents || 0))}</strong>` : '—'}</td><td>${badge(card.status)}</td><td><small>${esc(flags)}</small></td><td>${esc(fmtDate(card.issuedAt))}</td><td>${actionCell}</td></tr>`;
  });
  const active = state.cards.filter(card => card.status === 'active').length;
  const locked = state.cards.filter(card => card.status === 'locked').length;
  const prepaidValue = state.cards.reduce((sum, card) => sum + (card.fundingType === 'prepaid' ? card.prepaidBalanceCents || 0 : 0), 0);
  const prepaidCount = state.cards.filter(card => card.fundingType === 'prepaid').length;
  const stats = `<div class="stats-row"><div class="stat-tile"><small>${esc(t('cardProducts'))}</small><strong>${state.cards.length}</strong><span>${esc(t('virtualTokenOnly'))}</span></div><div class="stat-tile"><small>${esc(t('active'))}</small><strong>${active}</strong><span>${esc(t('statusChanged'))}</span></div><div class="stat-tile"><small>${esc(t('locked'))}</small><strong>${locked}</strong><span>${esc(t('localCardControls'))}</span></div><div class="stat-tile"><small>${esc(t('prepaidBalance'))} · ${prepaidCount}</small><strong>${esc(currency(prepaidValue))}</strong><span>${esc(t('localSimulation'))}</span></div></div>`;
  const cardPreview = `<div class="card-banner"><div class="card-banner-label"><span>ADRIA BANK · ${esc(t('virtualToken'))}</span><span>DEMO</span></div><div class="card-chip"></div><div class="card-number">${esc(t('demoToken'))} · 4817</div><div class="card-holder-row"><span>${esc(t('syntheticData'))}</span><span>${esc(t('noRealCardDetails'))}</span></div><div class="card-brand">adria<span>bank</span></div></div><div class="security-strip"><strong>${esc(t('demoOnly'))}</strong><span>${esc(t('virtualTokenOnly'))}</span></div>`;
  return `${pageHeading('cards', 'cardsSub', `${button('issue-card', t('newCard'), 'primary', 'plus')}${button('card-purchase', t('simulateCardPurchase'), '', 'card')}`)}${stats}<section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="cards" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="cards" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${['active','locked','pending','cancelled'].map(value => `<option value="${value}" ${f.status === value ? 'selected' : ''}>${esc(t(value) || labelStatus(value))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge info">${esc(t('virtualTokenOnly'))}</span></div></div>${tableShell([t('client'), t('product'), t('cardTokenSuffix'), t('account'), `${t('cardDailyLimit')} / ${t('cardMonthlyLimit')}`, t('prepaidBalance'), t('status'), t('cardUsageControls'), t('date'), t('actions')], rows, page.footer)}</section><div class="grid two-col" style="margin-top:14px"><div class="grid" style="align-content:start">${panel(t('productCard'), cardPreview, { description: t('localSimulation') })}</div><div class="notice info"><b>i</b><span>${esc(t('cardWorkflowBoundary'))}</span></div></div>`;
}

function renderSavings() {
  const f = filterState.savings;
  const query = f.q.toLocaleLowerCase(locale());
  const filtered = state.deposits.filter(deposit => {
    const customer = customerById(deposit.customerId);
    return (!query || `${deposit.id} ${customer?.name || ''}`.toLocaleLowerCase(locale()).includes(query)) && (f.status === 'all' || deposit.status === f.status);
  });
  const page = paged(filtered, 'savings');
  const rows = page.items.map(deposit => {
    const customer = customerById(deposit.customerId);
    const interest = Math.round(deposit.principalCents * deposit.annualRateBps / 10000 * deposit.termMonths / 12);
    const matureButton = deposit.status === 'active' && canWrite() ? `<button class="btn small" data-action="mature-savings" data-id="${esc(deposit.id)}">${esc(t('mature'))}</button>` : '';
    return `<tr><td><span class="mono">${esc(deposit.id)}</span></td><td>${formatClient(customer)}</td><td>${esc(currency(deposit.principalCents))}</td><td>${deposit.termMonths} ${esc(t('months3').split(' ')[1] || 'mo.')}</td><td>${(deposit.annualRateBps / 100).toFixed(2)}%</td><td>${esc(currency(interest))}</td><td>${esc(fmtDate(deposit.maturityAt))}</td><td>${badge(deposit.status)}</td><td>${matureButton}</td></tr>`;
  });
  const activeTotal = state.deposits.filter(item => item.status === 'active').reduce((sum, item) => sum + item.principalCents, 0);
  const next = state.deposits.filter(item => item.status === 'active').sort((a,b) => new Date(a.maturityAt) - new Date(b.maturityAt)).slice(0, 4);
  return `${pageHeading('savings', 'savingsSub', button('new-deposit', t('newDeposit'), 'primary', 'plus'))}<div class="stats-row"><div class="stat-tile"><small>${esc(t('termDeposits'))}</small><strong>${state.deposits.filter(item => item.status === 'active').length}</strong><span>${esc(t('active'))}</span></div><div class="stat-tile"><small>${esc(t('totalDeposits'))}</small><strong>${esc(compactCurrency(activeTotal))}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('maturitySoon'))}</small><strong>${next.length}</strong><span>${esc(t('sevenDays'))}</span></div><div class="stat-tile"><small>${esc(t('rate'))}</small><strong>1.45–2.25%</strong><span>${esc(t('sampleValue'))}</span></div></div><div class="grid two-col"><section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="savings" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="savings" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option><option value="active" ${f.status === 'active' ? 'selected' : ''}>${esc(t('active'))}</option><option value="matured_simulation" ${f.status === 'matured_simulation' ? 'selected' : ''}>${esc(t('closed'))}</option></select></div></div>${tableShell([t('reference'), t('client'), t('amount'), t('term'), t('rate'), 'Indicative interest', t('maturity'), t('status'), t('actions')], rows, page.footer)}</section><div class="grid" style="align-content:start">${panel(t('maturitySoon'), next.length ? `<div class="timeline">${next.map(item => `<div class="timeline-item"><i class="timeline-dot ${new Date(item.maturityAt) < new Date() ? 'warn' : ''}"></i><div class="timeline-text"><strong>${esc(customerById(item.customerId)?.name || item.customerId)} · ${esc(currency(item.principalCents))}</strong><small>${esc(item.id)} · ${item.termMonths} ${esc(t('term').toLowerCase())}</small></div><span class="timeline-date">${esc(fmtDate(item.maturityAt))}</span></div>`).join('')}</div>` : emptyState(t('noRecords')), { description: t('illustrative') })}<div class="notice"><b>!</b><span>Indicative demo rate only. No customer contract, disclosure or deposit guarantee is created by this sandbox.</span></div></div></div>`;
}

function renderLoans() {
  const f = filterState.loans;
  const query = f.q.toLocaleLowerCase(locale());
  const loanRows = state.loans || [];
  const filtered = loanRows.filter(loan => {
    const customer = customerById(loan.customerId);
    const text = `${loan.id} ${loan.product} ${loan.purpose} ${customer?.name || ''} ${loan.customerId}`.toLocaleLowerCase(locale());
    return (!query || text.includes(query)) && (f.status === 'all' || loan.status === f.status);
  });
  const page = paged(filtered, 'loans');
  const rows = page.items.map(loan => {
    const customer = customerById(loan.customerId);
    let action = '';
    if (loan.status === 'awaiting_approval' && canApprove()) action = `<button class="btn small" data-action="approve-loan" data-id="${esc(loan.id)}">${esc(t('approveLoan'))}</button>`;
    else if (loan.status === 'approved_undisbursed' && canApprove()) action = `<button class="btn small primary" data-action="disburse-loan" data-id="${esc(loan.id)}">${esc(t('disburseLoan'))}</button>`;
    else if (['performing', 'arrears'].includes(loan.status) && canWrite()) action = `<button class="btn small" data-action="repay-loan" data-id="${esc(loan.id)}">${esc(t('repayLoan'))}</button>`;
    return `<tr><td><span class="mono">${esc(loan.id)}</span><small class="sub-cell">${esc(loan.product)}</small></td><td>${formatClient(customer)}</td><td>${esc(currency(loan.principalCents))}</td><td><strong>${esc(currency(loan.outstandingCents))}</strong></td><td>${(loan.annualRateBps / 100).toFixed(2)}%</td><td>${loan.nextPaymentAt ? esc(fmtDate(loan.nextPaymentAt)) : '—'}</td><td>${badge(loan.status)}</td><td>${action}</td></tr>`;
  });
  const funded = loanRows.filter(loan => ['performing', 'arrears'].includes(loan.status));
  const bookCents = funded.reduce((sum, loan) => sum + loan.outstandingCents, 0);
  const pendingCount = loanRows.filter(loan => ['awaiting_approval', 'approved_undisbursed'].includes(loan.status)).length;
  const arrearsCents = funded.filter(loan => loan.status === 'arrears').reduce((sum, loan) => sum + loan.outstandingCents, 0);
  const statusOptions = ['awaiting_approval', 'approved_undisbursed', 'performing', 'arrears', 'repaid_simulation'];
  const sidePanel = `<div class="credit-summary"><div class="credit-summary-row"><span>${esc(t('fundedLoans'))}</span><strong>${funded.length}</strong></div><div class="credit-summary-row"><span>${esc(t('awaitingApproval'))}</span><strong>${pendingCount}</strong></div><div class="credit-summary-row"><span>${esc(t('arrears'))}</span><strong>${esc(currency(arrearsCents))}</strong></div><div class="credit-summary-row"><span>${esc(t('settlementAccount'))}</span><strong>EUR · local demo</strong></div></div><div class="form-banner warn" style="margin-top:14px">${esc(t('loanDisclosure'))}</div>`;
  return `${pageHeading('loans', 'loansSub', button('new-loan', t('newLoan'), 'primary', 'plus'))}<div class="stats-row"><div class="stat-tile"><small>${esc(t('loanBook'))}</small><strong>${esc(compactCurrency(bookCents))}</strong><span>${esc(t('syntheticBalance'))}</span></div><div class="stat-tile"><small>${esc(t('fundedLoans'))}</small><strong>${funded.length}</strong><span>${esc(t('performing'))} · ${funded.filter(loan => loan.status === 'performing').length}</span></div><div class="stat-tile"><small>${esc(t('loanApplications'))}</small><strong>${loanRows.filter(loan => loan.status === 'awaiting_approval').length}</strong><span>${esc(t('awaitingApproval'))}</span></div><div class="stat-tile"><small>${esc(t('arrears'))}</small><strong>${esc(compactCurrency(arrearsCents))}</strong><span>${funded.filter(loan => loan.status === 'arrears').length} ${esc(t('loanCases'))}</span></div></div><div class="grid two-col"><section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="loans" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="loans" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${statusOptions.map(status => `<option value="${status}" ${f.status === status ? 'selected' : ''}>${esc(labelStatus(status))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge info">${esc(t('localSimulation'))}</span></div></div>${tableShell([t('reference'), t('client'), t('principal'), t('outstanding'), t('rate'), t('nextPayment'), t('status'), t('actions')], rows, page.footer)}</section><div class="grid" style="align-content:start;gap:13px">${panel(t('creditPortfolio'), sidePanel, { description: t('indicativeCredit') })}<div class="notice info"><b>i</b><span>${esc(t('loanAccountingNote'))}</span></div></div></div>`;
}

function renderBranches() {
  const totalCash = state.branches.reduce((sum, branch) => sum + branch.cashCents, 0);
  const activeAtms = state.atms.filter(atm => atm.status === 'online').length;
  const branchCards = state.branches.map(branch => {
    const atms = state.atms.filter(atm => atm.branchId === branch.id);
    const availableCash = branch.cashCents;
    return `<article class="branch-card"><div class="branch-card-top"><i class="branch-icon">${icon('branch')}</i><span class="badge warning">${esc(t('demoOnly'))}</span></div><h3>${esc(branch.name)}</h3><p>${esc(branch.code)} · ${esc(branch.city)}, ${esc(branch.country || 'Croatia')} · ${esc(branch.currency || 'EUR')} / ${esc((branch.language || 'hr').toUpperCase())}</p><div class="branch-meta"><div><small>${esc(t('cash'))} · demo</small><strong>${esc(currency(availableCash))}</strong></div><div><small>${esc(t('teller'))}s</small><strong>${branch.tellers} desks</strong></div><div><small>${esc(t('manager'))}</small><strong>${esc(branch.manager)}</strong></div><div><small>${esc(t('machine'))}</small><strong>${atms.length} ${esc(t('linked').toLowerCase())}</strong></div></div></article>`;
  }).join('');
  const marketCards = (state.plannedMarkets || []).map(market => {
    const targetLanguage = supportedLanguages.find(language => language.code === market.language);
    const languageName = targetLanguage?.label.replace(/^[A-Z]{2}\s+/, '') || market.language;
    return `<article class="market-card"><div class="market-card-top"><span class="market-flag">${esc(market.flag)}</span><span class="badge warning">${esc(t('planningOnly'))}</span></div><h3>${esc(market.city)}</h3><p>${esc(market.country)} · ${esc(market.market)}</p><div class="market-detail"><small>${esc(t('marketPhase'))}</small><strong>${esc(market.phase)}</strong></div><div class="market-detail"><small>${esc(t('regulator'))}</small><strong>${esc(market.regulator)}</strong><a class="source-link" href="${esc(market.authorityUrl)}" target="_blank" rel="noreferrer">${esc(t('openOfficialSource'))} ↗</a></div><div class="market-card-foot"><span>${esc(market.currency || '—')} · ${esc(t('targetLanguage'))}: ${esc(market.language.toUpperCase())} · ${esc(languageName)}</span><span>${esc(t('notLicensed'))}</span></div></article>`;
  }).join('');
  const companyLocation = state.meta.companyLocation || { ...COMPANY_PUBLIC_ADDRESS };
  const headquartersCard = `<article class="market-card headquarters-card"><div class="market-card-top"><span class="market-flag">🇺🇸</span><span class="badge info">${esc(t('publicCompanyAddress'))}</span></div><h3>${esc(companyLocation.city)}, ${esc(companyLocation.region)}</h3><p>${esc(companyLocation.street)} · ${esc(companyLocation.city)}, ${esc(companyLocation.region)} ${esc(companyLocation.postalCode)}</p><div class="market-detail"><small>${esc(t('companyAddressListedBy'))}</small><strong>GNK DINAMO Ltd. website · FINA Info.BIZ</strong></div><div class="market-card-foot"><span>${esc(t('companyAddressNotVerified'))}</span><span>${esc(t('companyLegalSeatUnverified'))}</span><span>${esc(t('companyAffiliationNote'))}</span></div><div class="company-location-sources"><a href="https://gnkdinamo.eu/" target="_blank" rel="noreferrer">Company website ↗</a><a href="https://infobiz.fina.hr/tvrtka/gnk-dinamo-ltd/OIB-93063734103" target="_blank" rel="noreferrer">FINA Info.BIZ ↗</a></div></article>`;
  const bankPos = `<div class="cash-stack">${state.branches.map(branch => `<div><div class="cash-item-top"><span>${esc(branch.name)}</span><strong>${esc(currency(branch.cashCents))}</strong></div><div class="progress-track"><span style="width:${Math.min(100, Math.max(8, branch.cashCents / 500000))}%"></span></div></div>`).join('')}</div>`;
  return `${pageHeading('branchesCash', 'branchesSub', `${button('cash-operation', t('cashOperation'), 'primary', 'cash')}${button('transfer', t('internalTransfer'), '', 'exchange')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('simulatedBranches'))}</small><strong>${state.branches.length}</strong><span>${esc(t('syntheticBranch'))}</span></div><div class="stat-tile"><small>${esc(t('branchCash'))}</small><strong>${esc(compactCurrency(totalCash))}</strong><span>${esc(t('sampleValue'))}</span></div><div class="stat-tile"><small>${esc(t('machine'))}</small><strong>${state.atms.length}</strong><span>${activeAtms} ${esc(t('online').toLowerCase())} · demo</span></div><div class="stat-tile"><small>${esc(t('teller'))} desks</small><strong>${state.branches.reduce((sum, branch) => sum + branch.tellers, 0)}</strong><span>${esc(t('controlsNotWired'))}</span></div></div><div class="grid two-col"><div><h2 class="section-label">${esc(t('simulatedBranches'))} · ${state.branches.length}</h2><div class="grid branch-grid">${branchCards}</div></div><div class="grid" style="align-content:start">${panel(t('cashCoverage'), bankPos, { description: t('branchCashNote') })}<div class="notice info"><b>i</b><span>Cash counter actions post to the synthetic demo ledger only. Teller identity, dual control, counterfeit detection and end-of-day cash balancing are not implemented controls.</span></div></div></div><section class="market-planner"><div class="market-planner-header"><div><div class="eyebrow"><i class="tiny-dot"></i>ADRIA BANK · ${esc(t('planningOnly'))}</div><h2>${esc(t('globalExpansion'))}</h2><p>${esc(t('marketStudy'))}</p></div><span class="badge neutral">${(state.plannedMarkets || []).length} ${esc(t('proposedMarkets'))}</span></div><div class="notice warn" style="margin-bottom:15px"><b>!</b><span>${esc(t('marketNotice'))}</span></div><div class="market-grid">${headquartersCard}${marketCards}</div></section>`;
}

function renderAtms() {
  const totalCash = state.atms.reduce((sum, atm) => sum + atm.cashCents, 0);
  const atms = state.atms.map(atm => {
    const branch = state.branches.find(item => item.id === atm.branchId);
    const statusClass = atm.status === 'online' ? 'success' : atm.status === 'low' ? 'warning' : atm.status === 'maintenance' ? 'neutral' : 'danger';
    const action = atm.status === 'online' ? `<button class="btn small" data-action="atm-withdrawal" data-id="${esc(atm.id)}">${esc(t('simulateWithdrawal'))}</button>` : '';
    return `<div class="atm-card"><i class="atm-icon">${icon('atm')}</i><div class="atm-card-main"><strong>${esc(atm.name)}</strong><small>${esc(atm.location)} · ${esc(branch?.code || '')}</small></div><div class="atm-card-right"><strong>${esc(currency(atm.cashCents))}</strong><small><span class="badge ${statusClass}">${esc(t(atm.status === 'low' ? 'warning' : atm.status))}</span></small></div>${action}</div>`;
  }).join('');
  return `${pageHeading('atmNetwork', 'atmSub', button('atm-withdrawal', t('simulateWithdrawal'), 'primary', 'cash'))}<div class="stats-row"><div class="stat-tile"><small>${esc(t('machine'))}</small><strong>${state.atms.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('online'))}</small><strong>${state.atms.filter(atm => atm.status === 'online').length}</strong><span>${esc(t('statusChanged'))}</span></div><div class="stat-tile"><small>${esc(t('atmCash'))}</small><strong>${esc(compactCurrency(totalCash))}</strong><span>${esc(t('sampleValue'))}</span></div><div class="stat-tile"><small>${esc(t('warning'))}</small><strong>${state.atms.filter(atm => atm.status === 'low').length}</strong><span>${esc(t('maintenance'))}: ${state.atms.filter(atm => atm.status === 'maintenance').length}</span></div></div><div class="grid two-col"><div class="grid">${atms}</div><div class="grid" style="align-content:start">${panel(t('reconciliation'), `<div class="detail-grid"><div class="detail-cell"><small>${esc(t('cash'))} · fleet</small><strong>${esc(currency(totalCash))}</strong></div><div class="detail-cell"><small>${esc(t('online'))}</small><strong>${state.atms.filter(atm => atm.status === 'online').length} / ${state.atms.length}</strong></div><div class="detail-cell"><small>${esc(t('lastCheck'))}</small><strong>${esc(fmtTime(new Date().toISOString()))}</strong></div></div><div class="light-divider"></div><button class="btn soft-teal" data-action="reconcile-atms">${icon('shieldCheck')}${esc(t('reconcile'))}</button>`, { description: t('controlsNotWired') })}<div class="notice"><b>!</b><span>ATM switch, HSM, card processor, cash cassette sensors and physical dispensing are not connected. This action is a ledger rehearsal only.</span></div></div></div>`;
}

function renderAml() {
  const openCases = state.cases.filter(item => item.status !== 'closed');
  const highCount = openCases.filter(item => item.severity === 'high').length;
  const kycDue = state.customers.filter(customer => customer.kyc !== 'verified');
  const tabBar = `<div class="exchange-tabs"><button data-action="aml-tab" data-tab="cases" class="${amlTab === 'cases' ? 'active' : ''}">${esc(t('openCases'))} (${openCases.length})</button><button data-action="aml-tab" data-tab="kyc" class="${amlTab === 'kyc' ? 'active' : ''}">KYC / onboarding (${kycDue.length})</button></div>`;
  let body;
  if (amlTab === 'cases') {
    const f = filterState.cases;
    const query = f.q.toLocaleLowerCase(locale());
    const filtered = state.cases.filter(item => {
      const customer = customerById(item.customerId);
      const text = `${item.id} ${item.title} ${customer?.name || ''} ${item.transactionId || ''}`.toLocaleLowerCase(locale());
      return item.status !== 'closed' && (!query || text.includes(query)) && (f.severity === 'all' || item.severity === f.severity) && (f.status === 'all' || item.status === f.status);
    });
    const page = paged(filtered, 'cases');
    const rows = page.items.map(item => {
      const customer = customerById(item.customerId);
      const tx = state.transactions.find(entry => entry.id === item.transactionId);
      return `<tr><td><span class="mono">${esc(item.id)}</span><small class="sub-cell">${esc(fmtDate(item.createdAt, true))}</small></td><td>${formatClient(customer)}</td><td><strong>${esc(item.title)}</strong><small class="sub-cell">${esc(tx ? `${txLabel(tx)} · ${currency(tx.amountCents)}` : 'Synthetic scenario')}</small></td><td>${badge(item.severity)}</td><td><div class="risk-meter"><div class="risk-meter-track"><i style="width:${Math.min(100, item.score)}%"></i></div><strong>${item.score}</strong></div></td><td>${badge(item.status)}</td><td>${esc(item.assignedTo || '—')}</td><td><button class="btn small" data-action="case-open" data-id="${esc(item.id)}">${esc(t('review'))}</button></td></tr>`;
    });
    body = `<div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="cases" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="cases" data-filter-field="severity"><option value="all">${esc(t('allRisk'))}</option>${['high','medium','low'].map(value => `<option value="${value}" ${f.severity === value ? 'selected' : ''}>${esc(t(value))}</option>`).join('')}</select></div><div class="toolbar-right">${tabBar}</div></div>${tableShell([t('reference'), t('client'), t('review'), t('priority'), t('score'), t('status'), t('assigned'), t('actions')], rows, page.footer)}`;
  } else {
    const f = filterState.customers;
    const filtered = kycDue.filter(customer => !f.q || `${customer.id} ${customer.name} ${customer.city}`.toLocaleLowerCase(locale()).includes(f.q.toLocaleLowerCase(locale()))).sort((a,b) => a.kyc.localeCompare(b.kyc));
    const page = paged(filtered, 'customers');
    const rows = page.items.map(customer => `<tr><td>${formatClient(customer)}</td><td>${esc(customer.city)}, ${esc(customer.country)}</td><td>${badge(customer.risk)}</td><td>${badge(customer.kyc)}</td><td>${esc(customer.kycRequest?.sourceOfFunds || customer.sourceOfFunds)}</td><td>${customer.kind === 'business' ? esc(customer.beneficialOwner || t('noData')) : '—'}</td><td><button class="btn small soft-teal" data-action="kyc-review" data-id="${esc(customer.id)}">${esc(t('review'))}</button></td></tr>`);
    body = `<div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="customers" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><span class="badge warning">${esc(t('pending'))}: ${kycDue.filter(customer => customer.kyc === 'pending').length}</span></div><div class="toolbar-right">${tabBar}</div></div>${tableShell([t('client'), t('city'), t('risk'), t('kyc'), t('sourceFunds'), t('beneficialOwner'), t('actions')], rows, page.footer)}`;
  }
  const rules = `<div class="grid" style="gap:8px">${['amlRule1','amlRule2','amlRule3','amlRule4','amlRule5','amlRule6'].map((key, i) => `<div class="setting-row"><span class="setting-row-copy"><strong>${i + 1}. ${esc(t(key))}</strong><small>${esc(t('illustrative'))} · <a class="source-link" href="https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng" target="_blank" rel="noreferrer">AMLR (EU) 2024/1624</a></small></span>${badge(i < 2 ? 'simulated' : 'notConnected')}</div>`).join('')}</div>`;
  return `${pageHeading('amlKyc', 'amlSub', `${button('view-compliance', t('compliance'), '', 'shield')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('openCases'))}</small><strong>${openCases.length}</strong><span>${esc(t('illustrative'))}</span></div><div class="stat-tile"><small>${esc(t('high'))} priority</small><strong>${highCount}</strong><span>${esc(t('review'))}</span></div><div class="stat-tile"><small>KYC ${esc(t('pending'))}</small><strong>${kycDue.length}</strong><span>${esc(t('nextReview'))}</span></div><div class="stat-tile"><small>${esc(t('screening'))}</small><strong>${esc(t('notConnected'))}</strong><span>${esc(t('controlsNotWired'))}</span></div></div><div class="grid two-col"><section class="panel"><div class="toolbar"><div class="toolbar-left">${tabBar}</div><div class="toolbar-right"><span class="badge warning">${esc(t('demoOnly'))}</span></div></div>${body}</section><div class="grid" style="align-content:start">${panel(t('compliance'), rules, { description: t('complianceBody') })}<div class="notice danger"><b>!</b><span>Alerts are synthetic test cases. This is not transaction monitoring, sanctions screening, PEP screening, a suspicious-transaction reporting system or an MLRO workflow.</span></div><div class="security-strip"><strong>EU AML package</strong><span>AMLR application date: 10 Jul 2027</span></div></div></div>`;
}

function renderSwift() {
  const waiting = state.swiftMessages.filter(message => message.status === 'awaiting_approval').length;
  const nostro = state.bankAccounts.filter(account => account.glCode === '1200').reduce((sum, account) => {
    const rate = CURRENCIES[account.currency]?.eurRate;
    return Number.isFinite(rate) && rate > 0 ? sum + account.balanceCents * rate : sum;
  }, 0);
  const rows = state.swiftMessages.map(message => {
    const customer = customerById(message.customerId);
    const approve = message.status === 'awaiting_approval' && canApprove() ? `<button class="btn small soft-teal" data-action="approve-swift" data-id="${esc(message.id)}">${esc(t('approve'))}</button>` : '';
    return `<tr><td><span class="mono">${esc(message.id)}</span><small class="sub-cell">${esc(message.type)} · ${esc(message.direction)}</small></td><td>${formatClient(customer)}</td><td>${esc(message.beneficiary)}<small class="sub-cell">${esc(message.bic || '—')}</small></td><td>${esc(currency(message.amountCents, message.currency))}</td><td>${badge(message.status)}</td><td>${esc(fmtDate(message.createdAt, true))}</td><td>${approve}<button class="btn small" data-action="print-swift" data-id="${esc(message.id)}">${esc(t('print'))}</button><button class="row-action" data-action="swift-open" data-id="${esc(message.id)}">···</button></td></tr>`;
  });
  const mainBankAccount = state.bankAccounts.find(account => account.id === 'BK-002');
  const list = `<div class="grid three-col"><div class="detail-cell"><small>${esc(t('mainAccount'))}</small><strong>${esc(currency(mainBankAccount?.balanceCents || 0))}</strong><small class="sub-cell">${esc(mainBankAccount?.ref || '')} · DEMO IBAN</small></div><div class="detail-cell"><small>${esc(t('nostro'))}</small><strong>${esc(currency(Math.round(nostro * 100)))}</strong><small class="sub-cell">${state.bankAccounts.filter(account => account.glCode === '1200').length} sandbox positions</small></div><div class="detail-cell"><small>${esc(t('awaitingApproval'))}</small><strong>${waiting}</strong><small class="sub-cell">${esc(t('controlsNotWired'))}</small></div></div>`;
  return `${pageHeading('swiftLab', 'swiftSub', button('new-swift', t('newSwift'), 'primary', 'plus'))}<div class="notice danger" style="margin-bottom:14px"><b>!</b><span>${esc(t('swiftDisclaimer'))}. MT103 / ISO 20022 examples below are local rehearsal data and are never transmitted.</span></div><div class="grid two-col" style="margin-bottom:15px">${panel(t('mainAccount'), list, { description: t('swiftFlow') })}${panel(t('swiftLab'), `<div class="cash-stack"><div class="cash-item-top"><span>${esc(t('swiftMain'))}</span><strong>${esc(mainBankAccount?.ref || '')}</strong></div><div class="cash-item-top"><span>${esc(t('swiftNostro'))} · EUR</span><strong>${esc(state.bankAccounts.find(item => item.id === 'BK-003')?.ref || '')}</strong></div><div class="cash-item-top"><span>${esc(t('swiftNostro'))} · USD</span><strong>${esc(state.bankAccounts.find(item => item.id === 'BK-004')?.ref || '')}</strong></div><div class="light-divider"></div><span class="badge warning">${esc(t('approvalRequired'))}</span></div>`, { description: t('localSimulation') })}</div><section class="panel"><div class="toolbar"><div class="toolbar-left"><h2 class="panel-title">${esc(t('message'))} queue</h2><span class="badge neutral">${state.swiftMessages.length}</span></div><div class="toolbar-right"><span class="badge info">${esc(t('demoOnly'))}</span></div></div>${tableShell([t('reference'), t('client'), t('beneficiary'), t('amount'), t('status'), t('date'), t('actions')], rows)}</section><div class="grid two-col" style="margin-top:15px">${panel('Message path', `<div class="swift-status"><span>1 · ${esc(t('message'))}</span><span class="badge success">${esc(t('simulated'))}</span></div><div class="swift-status"><span>2 · ${esc(t('screening'))} / sanctions</span><span class="badge neutral">${esc(t('notConnected'))}</span></div><div class="swift-status"><span>3 · ${esc(t('approvals'))} · dual control</span><span class="badge warning">${esc(t('required'))}</span></div><div class="swift-status"><span>4 · Network transmission</span><span class="badge danger">${esc(t('notConnected'))}</span></div>`, { description: t('controlsNotWired') })}${panel('ISO 20022 / SWIFT', `<p class="panel-description" style="line-height:1.8">This lab helps rehearse message fields, beneficiary validation, approvals and reconciliation concepts. A production integration needs authorised bank participation, connectivity, screening, reconciliation, security controls, business continuity and scheme-specific testing.</p><div class="security-strip"><strong>${esc(t('localOnly'))}</strong><span>MT103 format preview · pacs.008 sample records</span></div>`)}</div>`;
}

function fiatAssets() { return Object.keys(CURRENCIES).filter(code => code !== 'EUR' && !CURRENCIES[code].crypto && Number.isFinite(CURRENCIES[code].eurRate) && CURRENCIES[code].eurRate > 0 && CURRENCIES[code].exchangeEnabled !== false); }
function accountCurrencies() { return Object.keys(CURRENCIES).filter(code => code !== 'EUR' && !CURRENCIES[code].crypto); }
function digitalAssets() { return Object.keys(CURRENCIES).filter(code => CURRENCIES[code].crypto); }
function assetName(asset) {
  const key = asset.toLowerCase();
  return t(key) === key ? CURRENCIES[asset]?.name || asset : t(key);
}
function rateBoard(assets) {
  return `<div class="grid rate-grid">${assets.map(asset => {
    const item = CURRENCIES[asset];
    const fiatRate = item.crypto ? item.eurRate : 1 / item.eurRate;
    const rateDate = item.referenceDate || (item.referenceSource === 'CBK' ? CBK_FALLBACK_DATE : ECB_FALLBACK_DATE);
    const feedStatus = item.referenceSource === 'CBK' ? fxReferenceData.cbk.status : fxReferenceData.ecb.status;
    const rateStatus = item.referenceStatus || (String(feedStatus).startsWith('bundled-sample') ? feedStatus : 'bundled-sample');
    const feed = item.crypto ? 'Offline illustrative sample' : item.referenceSource === 'CBK' ? `CBK daily indicative · ${rateDate} · ${rateStatus}` : item.referenceSource?.includes('peg') ? `ECB daily + USD/AED peg · ${rateDate} · ${rateStatus}` : `ECB daily · ${rateDate} · ${rateStatus}`;
    return `<article class="rate-card"><div class="rate-card-top"><i class="rate-token ${item.crypto ? 'crypto' : ''}">${esc(asset.slice(0, 2))}</i><span>${esc(assetName(asset))} <small>${esc(asset)}</small></span></div><strong>${item.crypto ? esc(currencyMajor(item.eurRate, 'EUR', 2)) : `1 EUR = ${new Intl.NumberFormat(locale(), { maximumFractionDigits: ['JPY','KRW','ISK'].includes(asset) ? 2 : 4 }).format(fiatRate)} ${esc(asset)}`}</strong><small>${esc(feed)} · reference only, not a transaction quote</small></article>`;
  }).join('')}</div>`;
}
function renderOptionalMarketFeed() {
  let statusText = t('marketFeedIdle');
  let resultMarkup = '';
  if (optionalMarketFeed.status === 'loading') statusText = t('marketFeedLoading');
  if (optionalMarketFeed.status === 'unconfigured') statusText = t('marketFeedNoKey');
  if (optionalMarketFeed.status === 'unavailable') statusText = t('marketFeedUnavailable');
  if (optionalMarketFeed.status === 'ready' && optionalMarketFeed.reference) {
    const reference = optionalMarketFeed.reference;
    statusText = t('marketFeedReturned');
    resultMarkup = `<div class="market-feed-result"><strong>1 EUR = ${new Intl.NumberFormat(locale(), { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(reference.rate)} USD</strong><small>${esc(t('marketFeedAsOf'))}: ${esc(fmtDate(reference.timestamp, true))} · ${esc(reference.provider || 'Twelve Data')}</small></div>`;
  }
  const disabled = optionalMarketFeed.status === 'loading' ? 'disabled' : '';
  return `<section class="panel optional-market-panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('marketFeedTitle'))}</h2><p class="panel-description">${esc(t('marketFeedPair'))}</p></div><span class="badge neutral">OPTIONAL · READ-ONLY</span></div><div class="market-feed-status" role="status" aria-live="polite"><i class="${optionalMarketFeed.status === 'ready' ? 'ready' : ''}"></i><span>${esc(statusText)}</span></div>${resultMarkup}<div class="market-feed-controls"><button class="btn small" data-action="fetch-market-reference" ${disabled}>${icon('globe')}${esc(optionalMarketFeed.status === 'loading' ? t('marketFeedLoading') : t('marketFeedFetch'))}</button><a class="source-link" href="https://twelvedata.com/docs" target="_blank" rel="noreferrer">${esc(t('marketFeedProviderDocs'))} ↗</a></div><div class="notice info market-feed-notice"><b>i</b><span>${esc(t('marketFeedBoundary'))} ${esc(t('marketFeedSetup'))}</span></div></section>`;
}
async function refreshOptionalMarketFeed() {
  if (optionalMarketFeedPromise) return optionalMarketFeedPromise;
  optionalMarketFeed = { status: 'loading', reference: null, message: '' };
  if (currentView === 'exchange') renderView();
  optionalMarketFeedPromise = (async () => {
    try {
      let result;
      if (typeof window.adriaDemo?.getOptionalMarketReference === 'function') {
        result = await window.adriaDemo.getOptionalMarketReference();
      } else {
        const response = await fetch('/api/market/eur-usd', { cache: 'no-store', credentials: 'same-origin' });
        result = await response.json();
      }
      optionalMarketFeed = result?.ok
        ? { status: 'ready', reference: result, message: '' }
        : { status: result?.configured === false ? 'unconfigured' : 'unavailable', reference: null, message: result?.message || '' };
    } catch {
      optionalMarketFeed = { status: 'unavailable', reference: null, message: '' };
    } finally {
      optionalMarketFeedPromise = null;
      if (currentView === 'exchange') renderView();
    }
    return optionalMarketFeed;
  })();
  return optionalMarketFeedPromise;
}
function applyEcbReference(reference) {
  fxReferenceData.ecb = { status: 'daily-reference', rateDate: reference.date, fetchedAt: new Date().toISOString(), source: reference.source || ECB_DAILY_URL, rates: reference.rates };
  for (const [code, item] of Object.entries(CURRENCIES)) {
    if (item.ecbReference && Number.isFinite(reference.rates[code]) && reference.rates[code] > 0) {
      item.eurRate = 1 / reference.rates[code];
      item.referenceDate = reference.date;
      item.referenceStatus = 'daily-reference';
    }
  }
  if (Number.isFinite(reference.rates.USD) && reference.rates.USD > 0) {
    CURRENCIES.AED.eurRate = 1 / (reference.rates.USD * 3.6725);
    CURRENCIES.AED.referenceDate = reference.date;
    CURRENCIES.AED.referenceStatus = 'daily-reference · USD/AED peg assumption';
  }
}
function applyCbkReference(reference) {
  fxReferenceData.cbk = { status: 'daily-indicative', rateDate: reference.date, fetchedAt: new Date().toISOString(), source: reference.source || CBK_FOREX_URL, kesPerEur: reference.kesPerEur };
  CURRENCIES.KES.eurRate = 1 / reference.kesPerEur;
  CURRENCIES.KES.referenceDate = reference.date;
  CURRENCIES.KES.referenceStatus = 'daily-indicative';
}
async function readFxReference(kind) {
  const electronMethod = kind === 'ecb' ? window.adriaDemo?.getEcbDailyReference : window.adriaDemo?.getCbkDailyReference;
  if (typeof electronMethod === 'function') {
    const result = await electronMethod();
    if (!result?.ok) throw new Error(result?.error || `${kind.toUpperCase()} reference feed is unavailable.`);
    return kind === 'ecb' ? parseEcbDailyReference(result.xml) : parseCbkDailyReference(result.html);
  }
  const response = await fetch(`/api/fx/${kind}`, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${kind.toUpperCase()} reference endpoint returned ${response.status}.`);
  const text = await response.text();
  return kind === 'ecb' ? parseEcbDailyReference(text) : parseCbkDailyReference(text);
}
function refreshOneFxSource(kind) {
  if (kind === 'ecb') {
    if (!ecbFetchPromise) ecbFetchPromise = readFxReference('ecb').then(applyEcbReference).catch(error => {
      if (fxReferenceData.ecb.status === 'bundled-sample') fxReferenceData.ecb.status = 'bundled-sample · feed unavailable';
      throw error;
    }).finally(() => { ecbFetchPromise = null; });
    return ecbFetchPromise;
  }
  if (!cbkFetchPromise) cbkFetchPromise = readFxReference('cbk').then(applyCbkReference).catch(error => {
    if (fxReferenceData.cbk.status === 'bundled-sample') fxReferenceData.cbk.status = 'bundled-sample · feed unavailable';
    throw error;
  }).finally(() => { cbkFetchPromise = null; });
  return cbkFetchPromise;
}
async function refreshFxReferences(notify = false) {
  const results = await Promise.allSettled([refreshOneFxSource('ecb'), refreshOneFxSource('cbk')]);
  const success = results.some(result => result.status === 'fulfilled');
  if (notify) toast(success ? t('fxRefreshComplete') : t('fxRefreshUnavailable'), success ? 'success' : 'warning');
  if (currentView === 'exchange' && !modalRoot.childElementCount) renderView();
  return success;
}
function conversionReferenceDetails(fromCode, toCode) {
  const codes = [fromCode, toCode];
  const parts = [];
  if (codes.includes('KES')) parts.push(`CBK indicative ${fxReferenceData.cbk.rateDate}`);
  if (codes.some(code => CURRENCIES[code]?.ecbReference || code === 'AED')) parts.push(`ECB daily ${fxReferenceData.ecb.rateDate}`);
  return { referenceDate: [...new Set(parts.map(part => part.split(' ').at(-1)))].join(' / '), source: [...new Set(parts)].join(' + ') || 'Bundled indicative demo sample' };
}
function walletValue(wallet) {
  const item = CURRENCIES[wallet.asset];
  return item && Number.isFinite(item.eurRate) && item.eurRate > 0 ? wallet.units * item.eurRate : null;
}
function renderExchange() {
  const assets = exchangeTab === 'fx' ? fiatAssets() : digitalAssets();
  const scopeCustomerId = document.body.dataset.surface === 'client' ? portalCustomerId : exchangeCustomerId;
  const accountIds = state.accounts.filter(account => account.currency === 'EUR' && account.status === 'active' && customerById(account.customerId)?.kyc === 'verified' && (!scopeCustomerId || account.customerId === scopeCustomerId));
  const customerWallets = state.wallets.filter(wallet => wallet.units > 0.00000001 && (!scopeCustomerId || wallet.customerId === scopeCustomerId));
  const totalWalletEur = customerWallets.reduce((sum, wallet) => sum + (walletValue(wallet) ?? 0), 0);
  const inputLabel = exchangeSide === 'buy' ? t('amountInputBuy') : t('amountInputSell');
  const sideButtons = `<div class="exchange-tabs"><button data-action="exchange-side" data-side="buy" class="${exchangeSide === 'buy' ? 'active' : ''}">${esc(t('buy'))}</button><button data-action="exchange-side" data-side="sell" class="${exchangeSide === 'sell' ? 'active' : ''}">${esc(t('sell'))}</button></div>`;
  const assetOptions = assets.map(asset => `<option value="${asset}">${esc(asset)} · ${esc(assetName(asset))}</option>`).join('');
  const accountOptions = accountIds.map(account => `<option value="${esc(account.id)}">${esc(account.id)} · ${esc(customerById(account.customerId)?.name || '')} · ${esc(account.currency)} ${esc(currency(account.balanceCents, account.currency))}</option>`).join('');
  const walletRows = customerWallets.length ? customerWallets.slice(0, 9).map(wallet => `<div class="position-row"><i class="position-coin">${esc(wallet.asset.slice(0, 2))}</i><div class="position-copy"><strong>${esc(assetName(wallet.asset))} · ${esc(wallet.asset)}</strong><small>${new Intl.NumberFormat(locale(), { maximumFractionDigits: CURRENCIES[wallet.asset]?.decimals || 2 }).format(wallet.units)} ${esc(wallet.asset)} · ${esc(customerById(wallet.customerId)?.name || wallet.customerId)}</small></div><div class="position-value">${walletValue(wallet) === null ? 'No reference' : esc(currencyMajor(walletValue(wallet)))}<small class="sub-cell">${esc(t('sampleValue'))}</small></div></div>`).join('') : emptyState('No demo wallet positions yet. Complete a simulated buy to create one.');
  const visibleTrades = state.exchangeTrades.filter(trade => !scopeCustomerId || trade.customerId === scopeCustomerId);
  const trades = visibleTrades.slice(0, 8).map(trade => `<tr><td><span class="mono">${esc(trade.id)}</span><small class="sub-cell">${esc(fmtDate(trade.createdAt, true))}</small></td><td>${formatClient(customerById(trade.customerId))}</td><td><span class="badge ${trade.side === 'buy' ? 'success' : 'warning'}">${esc(t(trade.side))} ${esc(trade.asset)}</span></td><td>${new Intl.NumberFormat(locale(), { maximumFractionDigits: CURRENCIES[trade.asset]?.decimals || 2 }).format(trade.units)} ${esc(trade.asset)}</td><td>${esc(currency(trade.eurCents))}</td><td>${esc(currency(trade.spreadCents))}</td><td>${badge(trade.status)}</td></tr>`);
  const exchangeScope = scopeCustomerId ? `<span class="badge info">${esc(t('customerPortal'))}: ${esc(customerById(scopeCustomerId)?.name || scopeCustomerId)}</span>` : '';
  const pageIntro = pageHeading('exchange', 'exchangeSub', `${exchangeScope}<span class="badge warning">${esc(t('demoOnly'))}</span>${button('account-conversion', t('convertAccounts'), '', 'exchange')}<a class="btn" href="./exchange.html" target="_blank" rel="noreferrer">${icon('globe')}Separate desk ↗</a>`);
  const form = `<form class="panel" data-form="exchange" id="exchangeForm"><div class="panel-header"><div><h2 class="panel-title">${esc(t('createTrade'))}</h2><p class="panel-description">${esc(t('localSimulation'))} · ${esc(t('approvalNotice'))}</p></div>${sideButtons}</div><div class="form-grid"><div class="form-field"><label>${esc(t('asset'))}</label><select name="asset" id="exchangeAsset" class="form-control" required>${assetOptions}</select></div><div class="form-field"><label>${esc(inputLabel)}</label><input name="amount" id="exchangeAmount" type="number" min="0.01" step="0.01" required placeholder="100.00"><span class="form-help">${esc(exchangeSide === 'buy' ? t('expectedOutput') : t('amountInputSell'))}</span></div><div class="form-field full"><label>${esc(t('settlementAccount'))}</label><select name="accountId" required>${accountOptions}</select></div><div class="form-field full"><div class="quote-box" id="exchangeQuote"><div class="quote-box-row"><span>${esc(t('indicativeRate'))}</span><strong>—</strong></div><div class="quote-box-row"><span>${esc(t('fee'))}</span><strong>—</strong></div><div class="quote-box-total"><span>${esc(t('expectedOutput'))}</span><strong>—</strong></div></div></div><div class="form-field full"><label class="form-check"><input type="checkbox" name="acknowledge" required><span>${esc(t('quoteDisclosure'))} ${esc(t('notLivePrice'))}</span></label></div></div><div class="form-banner warn" style="margin-top:12px">${esc(exchangeTab === 'crypto' ? t('digitalAssetNotice') : t('fiatNotice'))}</div><div class="modal-actions"><button class="btn primary" type="submit">${icon('exchange')}${esc(t('executeTrade'))}</button></div></form>`;
  const scopedWalletTransfers = (state.walletTransfers || []).filter(transfer => !scopeCustomerId || transfer.customerId === scopeCustomerId);
  const transferRows = scopedWalletTransfers.slice(0, 12).map(transfer => {
    const incoming = transfer.direction === 'in';
    const label = incoming ? t('cryptoIncoming') : t('cryptoOutgoing');
    const address = incoming ? transfer.source : transfer.destination;
    const canCancel = transfer.status === 'awaiting_approval' && (document.body.dataset.surface === 'client' ? transfer.customerId === portalCustomerId : canWrite());
    const actions = `${transfer.status === 'awaiting_approval' && canApprove() ? `<button class="btn small soft-teal" data-action="approve-crypto" data-id="${esc(transfer.id)}">${esc(t('approveCrypto'))}</button>` : ''}${canCancel ? `<button class="btn small danger" data-action="cancel-crypto" data-id="${esc(transfer.id)}">${esc(t('cancelCrypto'))}</button>` : ''}`;
    return `<tr><td><span class="mono">${esc(transfer.id)}</span><small class="sub-cell">${esc(fmtDate(transfer.createdAt, true))}</small></td><td>${document.body.dataset.surface === 'client' ? '' : formatClient(customerById(transfer.customerId))}<span class="badge info">${esc(label)}</span></td><td>${new Intl.NumberFormat(locale(), { maximumFractionDigits: CURRENCIES[transfer.asset]?.decimals || 8 }).format(transfer.units)} ${esc(transfer.asset)}<small class="sub-cell mono">${esc(address || '')}</small></td><td>${esc(transfer.network)}</td><td>${badge(transfer.status)}</td><td class="action-cell">${actions || '—'}</td></tr>`;
  });
  const walletQueue = panel(t('walletQueue'), tableShell([t('reference'), ...(document.body.dataset.surface === 'client' ? [] : [t('client')]), t('amount'), t('channel'), t('status'), t('actions')], transferRows, '', t('noWalletTransfers')), { description: t('digitalAssetNotice'), actions: `<button class="btn small" data-action="crypto-send">${esc(t('cryptoSend'))}</button><button class="btn small" data-action="crypto-receive">${esc(t('cryptoReceive'))}</button>` });
  const wallets = panel(t('portfolio'), `<div class="balance-total"><div class="balance-total-top"><span>${esc(t('sampleValue'))} · ${esc(t('localSimulation'))}</span><span class="balance-chip">${customerWallets.length} positions</span></div><strong>${esc(currencyMajor(totalWalletEur))}</strong><small>${esc(t('eurValue'))} · ${esc(t('notLivePrice'))}</small></div><div class="bank-account-list">${walletRows}</div>`, { description: t('controlsNotWired'), actions: `<button class="btn small" data-action="crypto-send">${esc(t('cryptoSend'))}</button><button class="btn small" data-action="crypto-receive">${esc(t('cryptoReceive'))}</button>` });
  const rates = panel(t('quoteTable'), rateBoard(assets), { description: t('quoteDisclosure'), actions: `<button class="btn small" data-action="refresh-fx">${esc(t('refreshReference'))}</button><span class="badge neutral">${esc(t('notLivePrice'))}</span>` });
  const history = panel(t('recentTrades'), tableShell([t('reference'), t('client'), t('direction'), t('amount'), 'EUR', t('fee'), t('status')], trades), { description: `${visibleTrades.length} ${t('records')}` });
  return `${pageIntro}<section class="exchange-hero"><div class="eyebrow"><i class="tiny-dot"></i>ADRIA EXCHANGE · SEPARATE DESK</div><h2>${esc(t('exchange'))}</h2><p>Dedicated treasury workflow · fiat FX + a strictly offline digital-asset rehearsal ledger</p><div class="exchange-hero-actions"><button class="btn ${exchangeTab === 'fx' ? 'primary' : ''}" data-action="exchange-tab" data-tab="fx">⇄ ${esc(t('fx'))}</button><button class="btn ${exchangeTab === 'crypto' ? 'primary' : ''}" data-action="exchange-tab" data-tab="crypto">◈ ${esc(t('crypto'))}</button><span class="badge warning">${esc(t('notConnected'))}</span></div></section><div style="height:13px"></div>${rates}<div style="margin-top:13px">${renderOptionalMarketFeed()}</div><div class="grid two-col" style="margin-top:15px;align-items:start">${form}<div class="grid" style="gap:15px">${wallets}${walletQueue}${history}</div></div><div class="security-strip"><strong>${esc(t('quoteDisclosure'))}</strong><span>FIAT and crypto virtual balances are local sample records and do not leave this application.</span></div>`;
}

function renderLedger() {
  const assetAccounts = state.glAccounts.filter(account => account.group === 'asset');
  const liabilityAccounts = state.glAccounts.filter(account => account.group === 'liability');
  const assets = assetAccounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const liabilities = liabilityAccounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const equity = state.glAccounts.filter(account => ['equity','income'].includes(account.group)).reduce((sum, account) => sum + account.balanceCents, 0) - state.glAccounts.filter(account => account.group === 'expense').reduce((sum, account) => sum + account.balanceCents, 0);
  const f = filterState.ledger;
  const page = paged(state.ledgerJournals, 'ledger');
  const rows = page.items.map(journal => `<tr><td><span class="mono">${esc(journal.id)}</span></td><td>${esc(journal.ref || '—')}</td><td><strong>${esc(journal.description)}</strong><small class="sub-cell">${esc(fmtDate(journal.at, true))}</small></td><td>${journal.lines.length}</td><td>${esc(currency(journal.debitCents))}</td><td>${esc(currency(journal.creditCents))}</td><td>${badge(journal.debitCents === journal.creditCents ? 'verified' : 'high')}</td><td><button class="row-action" data-action="journal-open" data-id="${esc(journal.id)}">···</button></td></tr>`);
  const glRows = state.glAccounts.map(account => `<tr><td class="mono">${esc(account.code)}</td><td>${esc(account.name)}</td><td>${esc(account.group)}</td><td>${esc(account.normal === 'debit' ? t('debit') : t('credit'))}</td><td><strong>${esc(currency(account.balanceCents))}</strong></td></tr>`);
  const bankRows = state.bankAccounts.map(account => `<tr><td>${esc(account.label)}</td><td>${esc(account.bank)}</td><td><span class="mono">${esc(account.ref)}</span></td><td>${esc(account.currency)}</td><td>${esc(currency(account.balanceCents, account.currency))}</td><td>${badge('simulated')}</td></tr>`);
  return `${pageHeading('ledger', 'ledgerSub', `${button('export-json', t('exportJson'), '', 'download')}${button('download-csv', t('downloadCsv'), 'primary', 'download')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('totalAssets'))}</small><strong>${esc(compactCurrency(assets))}</strong><span>${esc(t('sampleValue'))}</span></div><div class="stat-tile"><small>${esc(t('customerLiabilities'))}</small><strong>${esc(compactCurrency(liabilities))}</strong><span>${esc(t('customerDeposits'))}</span></div><div class="stat-tile"><small>${esc(t('capital'))} + P&amp;L</small><strong>${esc(compactCurrency(equity))}</strong><span>${esc(t('openingBalance'))}</span></div><div class="stat-tile"><small>${esc(t('journal'))}</small><strong>${state.ledgerJournals.length}</strong><span>${isBalanced(state) ? '✓ ' + t('cleared') : t('review')}</span></div></div><div class="notice info" style="margin-bottom:14px"><b>i</b><span>Initial positions are a static teaching scenario. Demo journals enforce equal debit and credit totals; this is not a chart of accounts, IFRS/CRR return, statutory ledger or reconciliation to real bank statements.</span></div><div class="grid" style="gap:15px"><section class="panel"><div class="toolbar"><div class="toolbar-left"><h2 class="panel-title">${esc(t('journal'))}</h2><span class="badge success">${isBalanced(state) ? esc(t('cleared')) : esc(t('review'))}</span></div><div class="toolbar-right"><span class="badge neutral">${state.ledgerJournals.length} ${esc(t('records'))}</span></div></div>${tableShell([t('code'), t('reference'), t('description'), 'Lines', t('debit'), t('credit'), t('status'), t('actions')], rows, page.footer)}</section><div class="grid two-col"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Chart of accounts</h2><p class="panel-description">Synthetic opening ledger and local simulation postings</p></div></div>${tableShell([t('code'), t('account'), t('category'), 'Normal balance', t('balance')], glRows)}</section><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('mainAccount'))}</h2><p class="panel-description">${esc(t('controlsNotWired'))}</p></div></div>${tableShell([t('account'), t('bank'), t('reference'), t('currency'), t('balance'), t('status')], bankRows)}</section></div></div>`;
}

const regulatorySources = [
  { title: 'Delaware Office of the State Bank Commissioner', url: 'https://banking.delaware.gov/', tag: 'USA · STATE BANKING' },
  { title: 'FDIC · deposit insurance and bank data', url: 'https://www.fdic.gov/', tag: 'USA · BANK DATA' },
  { title: 'HNB · authorisation and supervision of credit institutions', url: 'https://www.hnb.hr/en/core-functions/supervision/basics-and-objectives', tag: 'CROATIA · LICENSING' },
  { title: 'ECB · daily euro foreign exchange reference rates', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', tag: 'DAILY INDICATIVE DATA' },
  { title: 'Central Bank of Kenya · indicative foreign exchange rates', url: 'https://www.centralbank.go.ke/forex/', tag: 'KENYA · INDICATIVE DATA' },
  { title: 'Central Bank of the UAE · licensing', url: 'https://centralbank.ae/en/licensing/', tag: 'UAE · LICENSING' },
  { title: 'Japan Financial Services Agency', url: 'https://www.fsa.go.jp/en/', tag: 'JAPAN · REGULATOR' },
  { title: 'Monetary Authority of Singapore', url: 'https://www.mas.gov.sg/', tag: 'SINGAPORE · REGULATOR' },
  { title: 'FINMA · Swiss Financial Market Supervisory Authority', url: 'https://www.finma.ch/en/', tag: 'SWITZERLAND · REGULATOR' },
  { title: 'BaFin · German Federal Financial Supervisory Authority', url: 'https://www.bafin.de/EN/Homepage/homepage_node.html', tag: 'GERMANY · REGULATOR' },
  { title: 'UK Prudential Regulation Authority', url: 'https://www.bankofengland.co.uk/prudential-regulation', tag: 'UK · PRUDENTIAL' },
  { title: 'UK Financial Conduct Authority', url: 'https://www.fca.org.uk/', tag: 'UK · CONDUCT' },
  { title: 'EU Capital Requirements Regulation (CRR) and Directive (CRD)', url: 'https://eur-lex.europa.eu/eli/reg/2013/575/oj/eng', tag: 'PRUDENTIAL' },
  { title: 'Croatia · Consumer Credit Act NN 86/2026 · effective 20 November 2026', url: 'https://narodne-novine.nn.hr/eli/sluzbeni/2026/86/1071', tag: 'CREDIT' },
  { title: 'EU Consumer Credit Directive 2023/2225 · applies from 20 November 2026', url: 'https://eur-lex.europa.eu/EN/legal-content/summary/consumer-credit-agreements-2023.html', tag: 'CONSUMER CREDIT' },
  { title: 'HNB · Loans and prior authorisation to grant credit', url: 'https://www.hnb.hr/en/about-us/consumer-protection/key-information/loans', tag: 'CREDIT AUTHORISATION' },
  { title: 'EU AML Regulation 2024/1624 (AMLR) · applies 10 July 2027', url: 'https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng', tag: 'AML/CFT' },
  { title: 'EBA · remote customer onboarding guidelines', url: 'https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-guidelines-remote-customer-onboarding', tag: 'KYC' },
  { title: 'Croatian Ministry of Finance · FIU / suspicious-transaction reporting', url: 'https://mfin.gov.hr/istaknute-teme/ured-za-sprjecavanje-pranja-novca/143', tag: 'FIU' },
  { title: 'EU Transfer of Funds Regulation 2023/1113 · crypto Travel Rule', url: 'https://eur-lex.europa.eu/eli/reg/2023/1113/oj/eng', tag: 'TRAVEL RULE' },
  { title: 'MiCA Regulation 2023/1114 · crypto-asset services', url: 'https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng', tag: 'CRYPTO' },
  { title: 'Hanfa · MiCA crypto authorisation in Croatia', url: 'https://www.hanfa.hr/news/provision-of-crypto-asset-services-from-1-july-2026-crypto-licence-and-registration-in-hanfa-registers-mandatory-for-providers-consumers-urged-to-exercise-caution/', tag: 'CROATIA' },
  { title: 'DORA Regulation 2022/2554 · applies 17 January 2025', url: 'https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng', tag: 'ICT RISK' },
  { title: 'EU instant payments Regulation 2024/886 · payee verification', url: 'https://eur-lex.europa.eu/eli/reg/2024/886/oj/eng', tag: 'PAYMENTS' },
  { title: 'Croatian Deposit Insurance Agency · insured amount / €100,000 limit', url: 'https://www.haod.hr/sustav-osiguranja-depozita/osigurani-iznos', tag: 'DEPOSIT GUARANTEE' },
  { title: 'GDPR · Regulation (EU) 2016/679', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng', tag: 'PRIVACY' },
  { title: 'PSD2 · payment services and strong customer authentication', url: 'https://eur-lex.europa.eu/eli/dir/2015/2366/oj/eng', tag: 'PAYMENTS' }
];
function renderReports() {
  const monthly = state.transactions.filter(tx => new Date(tx.date) > new Date(Date.now() - 30 * 86400000));
  const riskCounts = ['low','medium','high'].map(risk => state.customers.filter(customer => customer.risk === risk).length);
  const channelCounts = ['Card','SEPA','Branch','ATM','Mobile'].map(channel => state.transactions.filter(tx => tx.channel.includes(channel)).length);
  const maxChannel = Math.max(1, ...channelCounts);
  const sourceRows = regulatorySources.map(source => `<tr><td><span class="badge info">${esc(source.tag)}</span></td><td><a class="source-link" href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.title)} ↗</a></td><td>${esc(t('official'))}</td></tr>`);
  const riskSum = Math.max(1, riskCounts.reduce((sum, value) => sum + value, 0));
  const riskPanel = `<div class="segment-bar"><span style="width:${riskCounts[0] / riskSum * 100}%"></span><span style="width:${riskCounts[1] / riskSum * 100}%"></span><span style="width:${riskCounts[2] / riskSum * 100}%"></span></div><div class="segment-legend"><span><i></i>${esc(t('low'))} ${riskCounts[0]}</span><span><i></i>${esc(t('medium'))} ${riskCounts[1]}</span><span><i></i>${esc(t('high'))} ${riskCounts[2]}</span></div>`;
  const channelPanel = `<div class="cash-stack">${['Card','SEPA','Branch','ATM','Mobile'].map((channel, i) => `<div><div class="cash-item-top"><span>${esc(channel)}</span><strong>${channelCounts[i]}</strong></div><div class="progress-track ${i === 3 ? 'orange' : ''}"><span style="width:${channelCounts[i] / maxChannel * 100}%"></span></div></div>`).join('')}</div>`;
  return `${pageHeading('reports', 'reportsSub', `${button('download-csv', t('downloadCsv'), '', 'download')}${button('export-json', t('exportJson'), 'primary', 'download')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('totalMovement'))} · 30d</small><strong>${esc(compactCurrency(monthly.reduce((sum, tx) => sum + tx.amountCents, 0)))}</strong><span>${monthly.length} ${esc(t('transaction').toLowerCase())}</span></div><div class="stat-tile"><small>${esc(t('totalClients'))}</small><strong>${state.customers.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('openCases'))}</small><strong>${state.cases.filter(item => item.status !== 'closed').length}</strong><span>${esc(t('illustrative'))}</span></div><div class="stat-tile"><small>${esc(t('journal'))} controls</small><strong>${isBalanced(state) ? 'PASS' : 'CHECK'}</strong><span>${state.ledgerJournals.length} balanced demo postings</span></div></div><div class="grid two-col" style="margin-bottom:15px">${panel(t('customersRisk'), riskPanel, { description: t('sampleValue') })}${panel(t('paymentMix'), channelPanel, { description: t('monthlyVolume') })}</div><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('compliance'))} · ${esc(t('official'))}</h2><p class="panel-description">Primary source reading list checked for this demo brief · 10 Oct 2026</p></div><span class="badge warning">${esc(t('notConnected'))}</span></div><div class="notice warn" style="margin-bottom:12px"><b>!</b><span>Not a complete legal inventory. National implementation, supervisory guidance, product perimeter, group structure and rule changes require Croatian banking, AML, payments, crypto, privacy, tax, consumer and prudential counsel plus direct regulator engagement.</span></div>${tableShell([t('category'), t('description'), t('status')], sourceRows)}</section>`;
}

function renderInstitutions() {
  const banks = state.demoBanks || [];
  const transfers = state.interbankTransfers || [];
  const bankRows = banks.map(bank => `<tr><td><strong>${esc(bank.name)}</strong><small class="sub-cell">${esc(bank.id)}</small></td><td>${esc(bank.country)} · ${esc(bank.countryCode)}</td><td>${esc(bank.currency)}</td><td class="mono">${esc(bank.bic)} · test-shaped</td><td><a class="source-link" href="${esc(bank.authorityUrl)}" target="_blank" rel="noreferrer">${esc(t('regulatorLink'))} ↗</a></td><td><span class="badge warning">${esc(t('fictionalNotConnected'))}</span></td></tr>`);
  const transferRows = transfers.map(transfer => {
    const action = transfer.status === 'awaiting_approval' && canApprove() ? `<button class="btn small primary" data-action="approve-interbank" data-id="${esc(transfer.id)}">${esc(t('simulateSettlement'))}</button>` : transfer.status === 'awaiting_approval' ? `<span class="badge warning">${esc(t('awaitingApproval'))}</span>` : badge(transfer.status);
    return `<tr><td><span class="mono">${esc(transfer.id)}</span><small class="sub-cell">${esc(fmtDate(transfer.createdAt, true))}</small></td><td>${esc(customerById(transfer.customerId)?.name || transfer.customerId)}<small class="sub-cell">${esc(transfer.fromAccountId)}</small></td><td>${esc(transfer.beneficiary)}<small class="sub-cell">${esc(transfer.toBank)} · ${esc(transfer.beneficiaryAccount)}</small></td><td><strong>${esc(currency(transfer.amountCents, transfer.currency))}</strong></td><td>${action}</td></tr>`;
  });
  const beneficiaryRows = (state.interbankAccounts || []).slice(0, 10).map(account => {
    const bank = banks.find(item => item.id === account.bankId);
    return `<tr><td class="mono">${esc(account.id)}</td><td>${esc(bank?.name || account.bankId)}</td><td>${esc(account.accountName)}</td><td class="mono">${esc(account.accountNumber)}</td><td>${esc(account.currency)}</td><td>${esc(t('syntheticRecord'))}</td></tr>`;
  });
  return `${pageHeading('institutions', 'institutionsSub', `${button('new-interbank', t('interbankTransfer'), 'primary', 'exchange')}${button('local-checker', t('localChecks'), '', 'verify')}`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('fictionalBanks'))}</small><strong>${banks.length}</strong><span>${esc(t('fictionalNotConnected'))}</span></div><div class="stat-tile"><small>${esc(t('demoBeneficiaries'))}</small><strong>${(state.interbankAccounts || []).length}</strong><span>${esc(t('syntheticRecord'))}</span></div><div class="stat-tile"><small>${esc(t('interbankQueue'))}</small><strong>${transfers.filter(item => item.status === 'awaiting_approval').length}</strong><span>${esc(t('localCheckerOnly'))}</span></div><div class="stat-tile"><small>${esc(t('proposedMarkets'))}</small><strong>${(state.plannedMarkets || []).length}</strong><span>${esc(t('planningOnly'))}</span></div></div><div class="notice warn" style="margin-bottom:14px"><b>!</b><span>${esc(t('interbankDemoDisclosure'))}</span></div>${renderInteropSystemSwitcher()}<section class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('demoBankDirectory'))}</h2><p class="panel-description">${esc(t('directorySub'))}</p></div><span class="badge warning">${esc(t('fictionalNotConnected'))}</span></div>${tableShell([t('institution'), t('country'), t('currency'), t('bic'), t('regulator'), t('connectivity')], bankRows)}</section><section class="panel" style="margin-top:15px"><div class="panel-header"><div><h2 class="panel-title">${esc(t('interbankQueue'))}</h2><p class="panel-description">${esc(t('localCheckerOnly'))}</p></div><span class="badge neutral">${transfers.length} ${esc(t('records'))}</span></div>${tableShell([t('reference'), t('client'), t('beneficiary'), t('amount'), t('actions')], transferRows)}</section><div class="grid two-col" style="margin-top:15px">${panel(t('fictionalBeneficiaryDirectory'), tableShell([t('reference'), t('institution'), t('beneficiary'), t('accountNumber'), t('currency'), t('status')], beneficiaryRows), { description: t('syntheticDirectoryOnly') })}${panel(t('internationalMarkets'), `<div class="timeline">${(state.plannedMarkets || []).map(market => `<div class="timeline-item"><i class="timeline-dot"></i><div class="timeline-text"><strong>${esc(market.flag)} ${esc(market.city)} · ${esc(market.currency)}</strong><small>${esc(market.regulator)} · ${esc(market.language.toUpperCase())}</small></div><a class="source-link" href="${esc(market.authorityUrl)}" target="_blank" rel="noreferrer">${esc(t('regulatorLink'))} ↗</a></div>`).join('')}</div>`, { description: t('planningOnly') })}</div>`;
}
function renderChecker() {
  const result = referenceCheckResult ? `<div class="checker-result"><div class="checker-result-top"><strong>${esc(referenceCheckResult.label)}</strong>${badge(referenceCheckResult.status)}</div><p>${esc(referenceCheckResult.detail)}</p><small>${esc(referenceCheckResult.note)}</small></div>` : `<div class="checker-placeholder">${icon('verify')}<p>${esc(t('checkerNoResult'))}</p></div>`;
  const pending = (state.interbankTransfers || []).filter(transfer => transfer.status === 'awaiting_approval');
  const pendingRows = pending.map(transfer => `<tr><td class="mono">${esc(transfer.id)}</td><td>${esc(transfer.toBank)}</td><td>${esc(transfer.beneficiary)}</td><td>${esc(currency(transfer.amountCents, transfer.currency))}</td><td>${canApprove() ? `<button class="btn small primary" data-action="approve-interbank" data-id="${esc(transfer.id)}">${esc(t('simulateSettlement'))}</button>` : `<span class="badge warning">${esc(t('checkerRequired'))}</span>`}</td></tr>`);
  const checkForm = `<form class="reference-check-form" data-form="reference-check"><div class="form-field"><label>${esc(t('checkType'))}</label><select name="type"><option value="bank">${esc(t('bankBic'))}</option><option value="account">${esc(t('demoAccount'))}</option><option value="card">${esc(t('maskedCard'))}</option><option value="iban">${esc(t('ibanChecksum'))}</option><option value="pan">${esc(t('cardNumberFormat'))}</option></select></div><div class="form-field"><label>${esc(t('demoReference'))}</label><input id="referenceCheckInput" name="value" maxlength="44" required autocomplete="off" placeholder="${esc(t('formatOnlyInput'))}"><span class="form-help">${esc(t('referencePrivacy'))}</span></div><button class="btn primary" type="submit">${icon('verify')}${esc(t('runLocalCheck'))}</button></form>`;
  return `${pageHeading('localChecks', 'localChecksSub', `${button('clear-check-result', t('clear'), '', 'close')}${button('refresh-fx', t('refreshReference'), '', 'exchange')}`)}<div class="notice danger" style="margin-bottom:15px"><b>!</b><span>${esc(t('checkerDisclaimer'))}</span></div><div class="grid two-col"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('localReferenceChecker'))}</h2><p class="panel-description">${esc(t('localCheckerOnly'))}</p></div><span class="badge info">${esc(t('runsLocally'))}</span></div>${checkForm}${result}</section><div class="grid" style="align-content:start;gap:14px">${panel(t('interbankQueue'), tableShell([t('reference'), t('institution'), t('beneficiary'), t('amount'), t('actions')], pendingRows), { description: t('makerCheckerSub') })}${panel(t('checkSteps'), `<div class="procedure-guide"><div class="procedure-step"><strong>1 · ${esc(t('chooseDemoRecord'))}</strong><p>${esc(t('checkerStepOne'))}</p></div><div class="procedure-step"><strong>2 · ${esc(t('inspectResult'))}</strong><p>${esc(t('checkerStepTwo'))}</p></div><div class="procedure-step"><strong>3 · ${esc(t('recordOutcome'))}</strong><p>${esc(t('checkerStepThree'))}</p></div></div>`, { description: t('trainingOnly') })}</div></div>`;
}
function renderSupport() {
  const allTickets = state.supportTickets || [];
  const customerOnly = document.body.dataset.surface === 'client';
  const tickets = customerOnly ? allTickets.filter(ticket => ticket.customerId === portalCustomerId) : allTickets;
  const rows = tickets.map(ticket => {
    const customer = customerById(ticket.customerId);
    const nextStatus = ticket.status === 'open' ? 'in_progress' : ticket.status === 'resolved' ? 'open' : 'resolved';
    const actionLabel = ticket.status === 'open' ? t('startHandling') : ticket.status === 'resolved' ? t('reopenTicket') : t('resolveTicket');
    const action = !customerOnly && canWrite() ? `<button class="btn small" data-action="support-status" data-id="${esc(ticket.id)}" data-status="${nextStatus}">${esc(actionLabel)}</button>` : badge(ticket.status);
    return `<tr><td><span class="mono">${esc(ticket.id)}</span><small class="sub-cell">${esc(fmtDate(ticket.createdAt, true))}</small></td><td>${customer ? formatClient(customer) : esc(ticket.customerId)}</td><td><strong>${esc(ticket.subject)}</strong><small class="sub-cell">${esc(ticket.category)} · ${esc(ticket.message)}</small></td><td>${esc(ticket.assignedTo || t('unassigned'))}</td><td>${customerOnly ? '—' : `<input class="support-note-field" id="support-note-${esc(ticket.id)}" maxlength="300" value="${esc(ticket.lastNote || '')}" placeholder="${esc(t('staffNote'))}">`}</td><td>${badge(ticket.status)}</td><td>${action}</td></tr>`;
  });
  const headingActions = customerOnly ? button('portal-support', t('newSupportTicket'), 'primary', 'plus') : button('new-support-ticket', t('newSupportTicket'), 'primary', 'plus');
  return `${pageHeading('callCentre', customerOnly ? 'supportCustomerSub' : 'supportStaffSub', headingActions)}<div class="notice warn" style="margin-bottom:14px"><b>!</b><span>${esc(t('supportDemoDisclosure'))}</span></div><div class="stats-row"><div class="stat-tile"><small>${esc(t('openTickets'))}</small><strong>${tickets.filter(ticket => ticket.status === 'open').length}</strong><span>${esc(t('localQueue'))}</span></div><div class="stat-tile"><small>${esc(t('inProgress'))}</small><strong>${tickets.filter(ticket => ticket.status === 'in_progress').length}</strong><span>${esc(t('callCentreRehearsal'))}</span></div><div class="stat-tile"><small>${esc(t('resolvedTickets'))}</small><strong>${tickets.filter(ticket => ticket.status === 'resolved').length}</strong><span>${esc(t('localOnly'))}</span></div><div class="stat-tile"><small>${esc(t('callCentre'))}</small><strong>${esc(t('notConnected'))}</strong><span>${esc(t('controlsNotWired'))}</span></div></div><div class="grid" style="gap:15px"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('callCentreQueue'))}</h2><p class="panel-description">${esc(customerOnly ? t('supportHistory') : t('callCentreRehearsal'))}</p></div><span class="badge warning">${esc(t('demoOnly'))}</span></div>${tableShell([t('reference'), t('client'), t('subject'), t('assigned'), t('staffNote'), t('status'), t('actions')], rows)}</section>${panel(t('callHandlingGuide'), `<div class="procedure-guide"><div class="procedure-step"><strong>1 · ${esc(t('greetAndScope'))}</strong><p>${esc(t('callStepOne'))}</p></div><div class="procedure-step"><strong>2 · ${esc(t('verifyDemoOnly'))}</strong><p>${esc(t('callStepTwo'))}</p></div><div class="procedure-step"><strong>3 · ${esc(t('routeAndRecord'))}</strong><p>${esc(t('callStepThree'))}</p></div><div class="procedure-step"><strong>4 · ${esc(t('closeAndExplain'))}</strong><p>${esc(t('callStepFour'))}</p></div></div>`, { description: t('supportDemoDisclosure') })}</div>`;
}

function renderComplaints() {
  const customerOnly = document.body.dataset.surface === 'client';
  const scoped = (state.complaints || []).filter(complaint => !customerOnly || complaint.customerId === portalCustomerId);
  const f = filterState.complaints;
  const query = f.q.toLocaleLowerCase(locale());
  const filtered = scoped.filter(complaint => {
    const customer = customerById(complaint.customerId);
    const text = `${complaint.id} ${complaint.subject} ${complaint.category} ${customer?.name || ''}`.toLocaleLowerCase(locale());
    return (!query || text.includes(query)) && (f.status === 'all' || complaint.status === f.status);
  });
  const page = paged(filtered, 'complaints');
  const rows = page.items.map(complaint => {
    const customer = customerById(complaint.customerId);
    const response = complaint.customerVisibleResponse ? `<small class="sub-cell">${esc(t('complaintResponse'))}: ${esc(complaint.customerVisibleResponse)}</small>` : '';
    return `<tr><td><span class="mono">${esc(complaint.id)}</span><small class="sub-cell">${esc(fmtDate(complaint.createdAt, true))}</small></td>${customerOnly ? '' : `<td>${formatClient(customer)}</td>`}<td><strong>${esc(complaint.subject)}</strong><small class="sub-cell">${esc(complaint.category)} · ${esc(complaint.priority === 'high_demo' ? t('high') : t('standardDemo'))}</small>${response}</td><td>${badge(complaint.status)}</td><td>${esc(complaint.assignedTo || t('unassigned'))}</td><td>${customerOnly ? '—' : esc(fmtDate(complaint.practiceTargetAt))}</td><td><button class="btn small" data-action="complaint-open" data-id="${esc(complaint.id)}">${esc(t('complaintAction'))}</button></td></tr>`;
  });
  const openCount = scoped.filter(complaint => !['resolved'].includes(complaint.status)).length;
  const responseCount = scoped.filter(complaint => complaint.status === 'response_ready').length;
  const resolvedCount = scoped.filter(complaint => complaint.status === 'resolved').length;
  const createAction = customerOnly ? 'portal-complaint' : 'new-complaint';
  const titleSub = customerOnly ? 'complaintDemoDisclosure' : 'complaintWorkflow';
  const statusValues = ['received', 'investigating', 'response_ready', 'resolved', 'escalated', 'reopened'];
  return `${pageHeading('complaints', titleSub, button(createAction, t('newComplaint'), 'primary', 'plus'))}<div class="notice warn" style="margin-bottom:14px"><b>!</b><span>${esc(t('complaintDemoDisclosure'))}</span></div><div class="stats-row"><div class="stat-tile"><small>${esc(t('complaintQueue'))}</small><strong>${scoped.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('openCases'))}</small><strong>${openCount}</strong><span>${esc(t('inReview'))}</span></div><div class="stat-tile"><small>${esc(t('responseReady'))}</small><strong>${responseCount}</strong><span>${esc(t('localOnly'))}</span></div><div class="stat-tile"><small>${esc(t('resolved'))}</small><strong>${resolvedCount}</strong><span>${esc(t('localSimulation'))}</span></div></div><section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="complaints" data-filter-field="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="complaints" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${statusValues.map(status => `<option value="${status}" ${f.status === status ? 'selected' : ''}>${esc(t(status) || labelStatus(status))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge warning">${esc(t('localOnly'))}</span></div></div>${tableShell([t('reference'), ...(customerOnly ? [] : [t('client')]), t('subject'), t('status'), t('assigned'), t('complaintTarget'), t('actions')], rows, page.footer)}<div class="notice info" style="margin:0 14px 14px"><b>i</b><span>${esc(t('complaintWorkflow'))}</span></div></section>`;
}

function renderInteroperability() {
  const lab = ensureInteropLabState(state);
  const system = activeInteropSystem(state);
  const language = state.settings.language || 'hr';
  const copy = (item, hrKey, enKey) => interopLocalizedText(item, language, item.idea ? 'feature' : 'idea', hrKey === 'detailHr' || hrKey === 'descriptionHr' ? 'description' : 'title');
  const systemBanks = lab.bankConnectors.filter(item => item.systemId === system.id);
  const systemVenues = lab.venues.filter(item => item.systemId === system.id);
  const enabledBanks = systemBanks.filter(item => item.status === 'connected_demo').length;
  const enabledVenues = systemVenues.filter(item => item.status === 'connected_demo').length;
  const readScopes = systemBanks.filter(item => item.status === 'connected_demo').reduce((sum, item) => sum + (item.permissions || []).length, 0);
  const latest = (lab.lastResult?.systemId === system.id ? lab.lastResult : null) || lab.runs.find(run => run.systemId === system.id) || null;
  const latestFeature = latest ? INTEROP_FEATURES.find(item => item.id === latest.featureId) : null;
  const latestSummary = latest ? (language === 'hr' ? latest.summaryHr : latest.summaryEn) : '';
  const ideasById = new Map(INTEROP_IDEAS.map(idea => [idea.id, idea]));
  const categoryKeys = ['banking', 'payments', 'controls', 'crypto', 'operations'];
  const categoryLabel = category => t(({ banking: 'interopCategoryBanking', payments: 'interopCategoryPayments', controls: 'interopCategoryControls', crypto: 'interopCategoryCrypto', operations: 'interopCategoryOperations' })[category] || 'interopCategoryBanking');
  const statusBadge = connector => `<span class="badge ${connector.status === 'connected_demo' ? 'success' : 'neutral'}">${esc(t(connector.status === 'connected_demo' ? 'interopActive' : 'interopPaused'))}</span>`;
  const scopeLabel = scope => ({ balances: t('balance'), transactions: t('transactionHistory') })[scope] || scope;
  const connectorCard = (connector, bank = false) => {
    const scopes = bank ? (connector.permissions || []).map(scopeLabel).join(' · ') || '—' : Object.keys(connector.markets || {}).join(' · ');
    const detail = bank ? `${connector.country} · ${connector.protocol}` : `${connector.region} · ${connector.feeBps} bp sample fee`;
    const toggleLabel = connector.status === 'connected_demo' ? t('interopPause') : t('interopEnable');
    const toggleIcon = connector.status === 'connected_demo' ? 'close' : 'plus';
    const toggle = button('interop-connector-toggle', toggleLabel, 'small', toggleIcon, `data-id="${esc(connector.id)}" ${lab.killSwitch ? 'disabled' : ''}`);
    const refresh = bank && connector.status === 'connected_demo' ? button('interop-connector-refresh', t('interopRefresh'), 'small', 'clock', `data-id="${esc(connector.id)}" ${lab.killSwitch ? 'disabled' : ''}`) : '';
    const lastSync = bank && connector.lastSyncAt ? `<small>${esc(t('interopSnapshot'))}: ${esc(fmtDate(connector.lastSyncAt, true))}</small>` : '';
    const latency = Number.isFinite(connector.latencyMs) ? `<small>${esc(t('interopLatency'))}: ${connector.latencyMs} ms</small>` : '';
    return `<article class="interop-connector-card"><div class="interop-connector-top"><div class="interop-connector-mark">${icon(bank ? 'bank' : 'exchange')}</div><div class="interop-connector-title"><strong>${esc(connector.name)}</strong><small>${esc(detail)}</small></div>${statusBadge(connector)}</div><div class="interop-connector-meta"><span><b>${esc(t(bank ? 'interopPermissions' : 'interopProtocol'))}</b>${esc(scopes)}</span>${latency}${lastSync}</div><div class="interop-connector-foot"><span class="interop-readonly">${esc(bank ? t('interopReadOnlyValue') : t('interopNoOrders'))}</span><div class="interop-actions">${toggle}${refresh}</div></div></article>`;
  };
  const tabs = `<div class="interop-tabs" role="tablist" aria-label="${esc(t('interoperability'))}"><button role="tab" aria-selected="${interopTab === 'workbench'}" data-action="interop-tab" data-tab="workbench" class="${interopTab === 'workbench' ? 'active' : ''}">${esc(t('interopWorkbench'))}</button><button role="tab" aria-selected="${interopTab === 'ideas'}" data-action="interop-tab" data-tab="ideas" class="${interopTab === 'ideas' ? 'active' : ''}">${esc(t('interopIdeas'))}</button></div>`;
  const headerActions = `${button('interop-export', t('exportJson'), '', 'download')}${button('interop-reset', t('interopReset'), '', 'close')}`;
  const heading = pageHeading('interoperability', 'interopSub', `${headerActions}<span class="badge warning">${esc(t('localOnly'))}</span>`);
  const boundary = `<div class="notice warn interop-boundary"><b>!</b><span>${esc(t('interopBoundary'))}</span></div>`;
  const systemSwitcher = renderInteropSystemSwitcher();

  if (interopTab === 'ideas') {
    const ideaCards = INTEROP_IDEAS.map((idea, index) => `<article class="interop-idea-card"><div class="interop-idea-number">${String(index + 1).padStart(2, '0')}</div><div class="interop-idea-copy"><span class="interop-category-tag">${esc(categoryLabel(idea.category || 'banking'))}</span><h3>${esc(copy(idea, 'hr', 'en'))}</h3><p>${esc(copy(idea, 'detailHr', 'detailEn'))}</p></div><span class="badge info">${esc(t('demoOnly'))}</span></article>`).join('');
    const ideaView = panel(t('interopIdeas'), `<div class="interop-library-lede"><span class="interop-library-count">${INTEROP_IDEAS.length}</span><div><strong>${esc(t('interopAdditionalIdeas'))}</strong><p>${esc(t('interopIdeasIntro'))}</p></div></div><div class="interop-idea-grid">${ideaCards}</div>`, { description: `${INTEROP_IDEAS.length} · ${t('localOnly')}` });
    return `${heading}${tabs}${boundary}${systemSwitcher}${ideaView}`;
  }

  const bankCards = systemBanks.map(connector => connectorCard(connector, true)).join('');
  const venueCards = systemVenues.map(connector => connectorCard(connector)).join('');
  const categoryCounts = Object.fromEntries(categoryKeys.map(category => [category, INTEROP_FEATURES.filter(feature => feature.category === category).length]));
  const categoryTabs = `<div class="interop-category-tabs" role="group" aria-label="${esc(t('interopToolFilter'))}"><button data-action="interop-category" data-category="all" class="${interopCategory === 'all' ? 'active' : ''}" aria-pressed="${interopCategory === 'all'}">${esc(t('interopCategoryAll'))}<span>${INTEROP_FEATURES.length}</span></button>${categoryKeys.map(category => `<button data-action="interop-category" data-category="${category}" class="${interopCategory === category ? 'active' : ''}" aria-pressed="${interopCategory === category}">${esc(categoryLabel(category))}<span>${categoryCounts[category]}</span></button>`).join('')}</div>`;
  const visibleFeatures = INTEROP_FEATURES.filter(feature => interopCategory === 'all' || feature.category === interopCategory);
  const features = visibleFeatures.map(feature => {
    const idea = ideasById.get(feature.idea);
    const index = INTEROP_FEATURES.indexOf(feature);
    const isKillSwitch = feature.id === 'kill-switch';
    const actionName = isKillSwitch && lab.killSwitch ? t('interopRestore') : t('interopRun');
    const actionIcon = isKillSwitch && lab.killSwitch ? 'arrow' : 'spark';
    return `<article class="interop-tool-card" data-tool-id="${esc(feature.id)}" data-category="${esc(feature.category)}"><div class="interop-tool-top"><span class="interop-tool-number">${String(index + 1).padStart(2, '0')}</span><span class="interop-category-tag">${esc(categoryLabel(feature.category))}</span></div><h3>${esc(copy(feature, 'hr', 'en'))}</h3><p>${esc(copy(feature, 'descriptionHr', 'descriptionEn'))}</p><div class="interop-tool-link">${esc(copy(idea, 'hr', 'en'))}</div>${button('interop-feature-run', actionName, 'small primary', actionIcon, `data-id="${esc(feature.id)}" ${isKillSwitch && lab.killSwitch ? 'aria-pressed="true"' : ''}`)}</article>`;
  }).join('');
  const latestResult = latest ? `<div class="interop-result"><div class="interop-result-head"><div><span class="eyebrow"><i class="tiny-dot"></i>${esc(t('interopResult'))}</span><h3>${esc(latestFeature ? copy(latestFeature, 'hr', 'en') : latest.featureName || latest.featureId || t('interopWorkbench'))}</h3></div><time>${esc(fmtDate(latest.at, true))}</time></div><p>${esc(latestSummary || '')}</p><details><summary>${esc(t('interopJsonEvidence'))}</summary><pre>${esc(JSON.stringify(latest.evidence || {}, null, 2))}</pre></details></div>` : `<div class="interop-empty">${icon('spark')}<p>${esc(t('interopNoActivity'))}</p></div>`;
  const scopedRuns = lab.runs.filter(run => run.systemId === system.id);
  const activityRows = scopedRuns.slice(0, 8).map(run => {
    const feature = INTEROP_FEATURES.find(item => item.id === run.featureId);
    const label = feature ? copy(feature, 'hr', 'en') : run.featureName || run.featureId || (language === 'hr' ? 'Lokalna aktivnost konektora' : 'Local connector activity');
    return `<div class="interop-activity-row"><span class="interop-activity-icon">${icon(run.featureId === 'kill-switch' ? 'shield' : 'clock')}</span><div><strong>${esc(label)}</strong><small>${esc(language === 'hr' ? run.summaryHr || run.summaryEn || '' : run.summaryEn || run.summaryHr || '')}</small></div><time>${esc(fmtDate(run.at, true))}</time></div>`;
  }).join('');
  const activityPanel = panel(t('interopActivity'), activityRows ? `<div class="interop-activity-list">${activityRows}</div>` : `<div class="interop-empty"><p>${esc(t('interopNoActivity'))}</p></div>`, { description: t('interopExportHint') });
  const killSwitchState = lab.killSwitch ? `<div class="notice warn interop-pause-notice"><b>!</b><span>${esc(t('interopKillSwitch'))}: ${esc(t('interopPaused'))}. ${enabledBanks + enabledVenues} ${esc(t('interopEnabledCount'))}.</span></div>` : '';
  return `${heading}${tabs}${boundary}${systemSwitcher}${killSwitchState}<div class="stats-row interop-stats"><div class="stat-tile"><small>${esc(t('interopConnectorCount'))}</small><strong>${systemBanks.length + systemVenues.length}</strong><span>${esc(system.name)}</span></div><div class="stat-tile"><small>${esc(t('interopBanks'))}</small><strong>${enabledBanks} / ${systemBanks.length}</strong><span>${esc(t('interopReadOnlyValue'))}</span></div><div class="stat-tile"><small>${esc(t('interopVenues'))}</small><strong>${enabledVenues} / ${systemVenues.length}</strong><span>${esc(t('interopNoOrders'))}</span></div><div class="stat-tile"><small>${esc(t('interopReadScopes'))}</small><strong>${readScopes}</strong><span>${esc(t('interopMostRecent'))}: ${latest ? esc(fmtDate(latest.at, true)) : '—'}</span></div></div><div class="grid two-col interop-connectors"><div>${panel(t('interopBanks'), `<div class="interop-connector-grid">${bankCards || `<div class="interop-empty">${esc(t('interopNoActivity'))}</div>`}</div>`, { description: t('interopBankPanelSub') })}</div><div>${panel(t('interopVenues'), `<div class="interop-connector-grid">${venueCards || `<div class="interop-empty">${esc(t('interopNoActivity'))}</div>`}</div>`, { description: t('interopVenuePanelSub') })}</div></div><div class="grid two-col interop-output"><div>${panel(t('interopResult'), latestResult, { description: t('interopRunSuccess') })}</div><div>${activityPanel}</div></div>${panel(t('interopFunctions'), `${categoryTabs}<div class="interop-tool-grid">${features}</div>`, { description: `${visibleFeatures.length} / ${INTEROP_FEATURES.length} · ${t('interopWorkbench')}` })}`;
}

function renderSettings() {
  const langOptions = supportedLanguages.map(language => `<option value="${language.code}" ${state.settings.language === language.code ? 'selected' : ''}>${esc(language.label)}</option>`).join('');
  const activeRole = currentStaffRole();
  const roleRows = STAFF_LEVELS.map(role => `<tr class="${role.id === activeRole.id ? 'role-row-active' : ''}"><td><span class="role-level-chip">L${role.level}</span></td><td><strong>${esc(t(role.label))}</strong><small class="sub-cell">${role.id === activeRole.id ? esc(t('active')) : '—'}</small></td><td>${esc(t(role.scope))}</td></tr>`);
  const accessPanel = panel(t('roleCapabilities'), `<div class="notice info" style="margin-bottom:12px"><b>i</b><span>${esc(t('roleAccessHelp'))}</span></div>${tableShell([t('roleLevel'), t('operator'), t('roleCapabilities')], roleRows)}`, { description: '7 simulated banking role levels' });
  const auditRows = state.auditEvents.slice(0, 7).map(event => `<div class="audit-row"><i class="audit-mark">${icon(event.severity === 'warning' ? 'shield' : 'clock')}</i><div class="audit-copy"><strong>${esc(event.action)}</strong><small>${esc(event.actor)} · ${esc(event.detail)}</small></div><time class="audit-date">${esc(fmtDate(event.at, true))}</time></div>`).join('');
  const settingsPanel = panel(t('settings'), `<div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('languageSelect') || 'Interface language')}</strong><small>HR · EN · DE · FR · ES · AR · SW · JA · ZH</small></div><select id="settingsLanguage" class="filter-select">${langOptions}</select></div><div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('operator'))}</strong><small>${esc(state.settings.operator)} · L${activeRole.level} · ${esc(t(activeRole.label))}</small></div><button class="btn small" data-action="operator-menu">${esc(t('changeRole'))}</button></div><div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('localOnlyTitle'))}</strong><small>${esc(t('localOnlyBody'))}</small></div><span class="badge success">LOCAL</span></div><div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('syntheticData'))}</strong><small>${state.customers.length} customers · ${state.accounts.length} accounts · ${state.transactions.length} movements</small></div><span class="badge info">DEMO</span></div><div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('isBalanced') || 'Double-entry checks')}</strong><small>${esc(t('ledgerSub'))}</small></div><span class="badge ${isBalanced(state) ? 'success' : 'danger'}">${isBalanced(state) ? 'PASS' : 'CHECK'}</span></div>`, { description: t('settingsSub') });
  const desktopControls = Boolean(window.adriaDemo?.setBackgroundPreferences);
  const intervalOptions = [1, 5, 15, 60].map(minutes => `<option value="${minutes}" ${Number(state.settings.backgroundIntervalMinutes) === minutes ? 'selected' : ''}>${minutes} min</option>`).join('');
  const backgroundActive = state.settings.backgroundSimulationEnabled !== false;
  const lastBackground = state.settings.backgroundLastTickAt ? fmtDate(state.settings.backgroundLastTickAt, true) : t('backgroundNotRunYet');
  const backgroundPanel = panel(t('backgroundSimulationTitle'), `<div class="notice info" style="margin-bottom:10px"><b>i</b><span>${esc(t('backgroundSimulationDescription'))}</span></div><div class="background-status-grid"><div class="background-status-cell"><small>${esc(t('status'))}</small><strong>${esc(t(backgroundActive ? 'backgroundActive' : 'backgroundPaused'))}</strong></div><div class="background-status-cell"><small>${esc(t('backgroundRunCount'))}</small><strong id="backgroundRunCountValue">${state.meta.backgroundSequence || 0}</strong></div><div class="background-status-cell" style="grid-column:1 / -1"><small>${esc(t('backgroundLastTick'))}</small><strong id="backgroundLastTickValue">${esc(lastBackground)}</strong></div></div><div class="setting-row"><div class="setting-row-copy"><strong>${esc(t('backgroundInterval'))}</strong><small>${esc(t('backgroundSafety'))}</small></div><select id="backgroundInterval" class="filter-select">${intervalOptions}</select></div><div class="setting-row">${button('toggle-background-simulation', t(backgroundActive ? 'pauseBackground' : 'startBackground'), backgroundActive ? '' : 'primary')}</div><div class="background-check-row"><label for="backgroundKeepInTray">${esc(t('keepRunningInTray'))}<small>${esc(t('keepRunningInTrayHelp'))}</small></label><input id="backgroundKeepInTray" type="checkbox" ${state.settings.keepRunningInTray ? 'checked' : ''} ${desktopControls ? '' : 'disabled'}></div><div class="background-check-row"><label for="backgroundStartWithWindows">${esc(t('startWithWindows'))}<small>${esc(t('startWithWindowsHelp'))}</small></label><input id="backgroundStartWithWindows" type="checkbox" ${state.settings.startWithWindows ? 'checked' : ''} ${backgroundDesktopSupported && state.settings.keepRunningInTray ? '' : 'disabled'}></div>${desktopControls ? '' : `<div class="form-help">${esc(t('desktopBackgroundOnly'))}</div>`}${state.settings.backgroundLastError ? `<div class="notice warn" style="margin-top:10px"><b>!</b><span>${esc(state.settings.backgroundLastError)}</span></div>` : ''}`, { description: t('backgroundSimulationTitle') });
  const sources = `<div class="regulatory-source-list">${regulatorySources.map(source => `<div class="setting-row"><span class="setting-row-copy"><strong>${esc(source.title)}</strong><small>${esc(source.tag)}</small></span><a class="panel-link source-link" href="${esc(source.url)}" target="_blank" rel="noreferrer">Open ↗</a></div>`).join('')}</div>`;
  return `${pageHeading('settings', 'settingsSub', `${button('download-csv', t('downloadCsv'), '', 'download')}${button('export-json', t('exportJson'), '', 'download')}${button('reset-demo', t('resetDemo'), 'danger', 'close')}`)}<div class="grid settings-grid"><div class="grid" style="align-content:start;gap:15px">${settingsPanel}${backgroundPanel}${accessPanel}${panel(t('compliance'), `<div class="notice info" style="margin-bottom:11px"><b>i</b><span>${esc(t('complianceBody'))}</span></div>${sources}<div class="security-strip"><strong>Snapshot date</strong><span>Reviewed 10 Oct 2026 · not legal advice</span></div>`, { description: t('regulatorySources') || 'Selected primary sources' })}</div><div class="grid" style="align-content:start;gap:15px">${panel(t('history'), `<div class="audit-list">${auditRows}</div>`, { description: `${state.auditEvents.length} local events` })}<div class="panel"><div class="panel-header"><div><h2 class="panel-title">${esc(t('resetDemo'))}</h2><p class="panel-description">Reset restores the original fictional scenario and clears local browser changes.</p></div></div><button class="btn danger" data-action="reset-demo" ${canAdminister() ? '' : 'disabled'}>${icon('close')}${esc(t('resetDemo'))}</button></div><div class="notice"><b>!</b><span>The application does not implement production authentication, encryption/key management, immutable audit, bank settlement, access governance, DR, regulatory reporting or privacy controls.</span></div></div></div>`;
}

function renderOnboarding() {
  const applications = state.onboardingApplications || [];
  const filter = filterState.onboarding;
  const query = filter.q.toLocaleLowerCase(locale());
  const filtered = applications.filter(application => {
    const customer = customerById(application.customerId);
    return (filter.status === 'all' || application.status === filter.status)
      && (!query || `${application.id} ${customer?.id || application.customerId} ${application.countryCode} ${application.customerKind}`.toLocaleLowerCase(locale()).includes(query));
  }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const page = paged(filtered, 'onboarding');
  const rows = page.items.map(application => {
    const customer = customerById(application.customerId);
    const productLabels = application.products.map(product => t(({ personal_account: 'onboardingProductPersonal', multi_currency: 'onboardingProductMultiCurrency', virtual_debit: 'onboardingProductVirtualDebit', prepaid_virtual: 'onboardingProductPrepaid', business_account: 'onboardingProductBusiness' })[product] || product)).join(' · ');
    const reviewAction = `<button class="btn small" data-action="onboarding-detail" data-id="${esc(application.id)}">${esc(t('review'))}</button>`;
    let statusActions = `<span class="badge neutral">${esc(t('noAction'))}</span>`;
    if (canReviewCompliance() && application.status === 'submitted_demo') {
      statusActions = `<div class="onboarding-row-actions"><button class="btn small soft-teal" data-action="onboarding-status" data-id="${esc(application.id)}" data-status="reviewed_demo">${esc(t('markReviewedDemo'))}</button><button class="btn small" data-action="onboarding-status" data-id="${esc(application.id)}" data-status="needs_info_demo">${esc(t('requestDemoInfo'))}</button><button class="btn small danger" data-action="onboarding-status" data-id="${esc(application.id)}" data-status="closed_demo">${esc(t('closeDemoApplication'))}</button></div>`;
    } else if (canReviewCompliance() && application.status === 'needs_info_demo') {
      statusActions = `<div class="onboarding-row-actions"><button class="btn small soft-teal" data-action="onboarding-status" data-id="${esc(application.id)}" data-status="reviewed_demo">${esc(t('markReviewedDemo'))}</button><button class="btn small danger" data-action="onboarding-status" data-id="${esc(application.id)}" data-status="closed_demo">${esc(t('closeDemoApplication'))}</button></div>`;
    }
    return `<tr><td><span class="mono">${esc(application.id)}</span><small class="sub-cell">${esc(fmtDate(application.submittedAt, true))}</small></td><td>${customer ? formatClient(customer) : esc(application.customerId)}<small class="sub-cell">${esc(application.customerKind === 'business' ? t('business') : t('personal'))} · ${esc(application.countryCode)}</small></td><td>${esc(productLabels)}</td><td><small>${esc(t(application.reviewPath === 'enhanced_review_demo' ? 'onboardingEnhancedPath' : 'onboardingStandardPath'))}</small><small class="sub-cell">${esc(t(application.identityScenario))} · ${esc(t(application.screeningScenario))}</small></td><td>${badge(application.status)}</td><td>${reviewAction} ${statusActions}</td></tr>`;
  });
  const pending = applications.filter(application => ['submitted_demo', 'needs_info_demo'].includes(application.status)).length;
  const reviewed = applications.filter(application => application.status === 'reviewed_demo').length;
  const enhanced = applications.filter(application => application.reviewPath === 'enhanced_review_demo').length;
  const statusOptions = ['submitted_demo', 'needs_info_demo', 'reviewed_demo', 'closed_demo'];
  return `${pageHeading('onlineOnboarding', 'onlineOnboardingSub', `<span class="badge warning">${esc(t('demoOnly'))}</span>`)}<div class="stats-row"><div class="stat-tile"><small>${esc(t('demoApplications'))}</small><strong>${applications.length}</strong><span>${esc(t('allSynthetic'))}</span></div><div class="stat-tile"><small>${esc(t('pending'))}</small><strong>${pending}</strong><span>${esc(t('localQueue'))}</span></div><div class="stat-tile"><small>${esc(t('completedReviews'))}</small><strong>${reviewed}</strong><span>${esc(t('trainingOnly'))}</span></div><div class="stat-tile"><small>${esc(t('enhancedReviewDemo'))}</small><strong>${enhanced}</strong><span>${esc(t('noExternalScreening'))}</span></div></div><div class="notice warn" style="margin-bottom:14px"><b>!</b><span>${esc(t('onboardingBoundary'))}</span></div><section class="panel"><div class="toolbar"><div class="toolbar-left"><label class="filter-search">${icon('search')}<input data-filter-list="onboarding" data-filter-field="q" value="${esc(filter.q)}" placeholder="${esc(t('search'))}…"></label><select class="filter-select" data-filter-list="onboarding" data-filter-field="status"><option value="all">${esc(t('allStatuses'))}</option>${statusOptions.map(status => `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${esc(labelStatus(status))}</option>`).join('')}</select></div><div class="toolbar-right"><span class="badge info">${esc(t('localQueue'))}</span></div></div>${tableShell([t('applicationCode'), t('client'), t('requestedProducts'), t('reviewPath'), t('status'), t('actions')], rows, page.footer, t('noOnboardingApplications'))}</section>${panel(t('onboardingReviewGuide'), `<div class="procedure-guide"><div class="procedure-step"><strong>1 · ${esc(t('onboardingGuideRead'))}</strong><p>${esc(t('onboardingGuideOne'))}</p></div><div class="procedure-step"><strong>2 · ${esc(t('onboardingGuideReview'))}</strong><p>${esc(t('onboardingGuideTwo'))}</p></div><div class="procedure-step"><strong>3 · ${esc(t('onboardingGuideRecord'))}</strong><p>${esc(t('onboardingGuideThree'))}</p></div></div>`, { description: t('trainingOnly') })}`;
}

function renderView() {
  updateStaticText();
  renderNavigation();
  const renderers = {
    overview: renderOverview, portal: renderPortal, onboarding: renderOnboarding, customers: renderCustomers, accounts: renderAccounts, payments: renderPayments,
    cards: renderCards, savings: renderSavings, loans: renderLoans, branches: renderBranches, atms: renderAtms,
    aml: renderAml, complaints: renderComplaints, swift: renderSwift, exchange: renderExchange, interop: renderInteroperability, institutions: renderInstitutions, checker: renderChecker, support: renderSupport, ledger: renderLedger, reports: renderReports, settings: renderSettings
  };
  main.innerHTML = `${renderWorkspaceContextBar()}${(renderers[currentView] || renderOverview)()}`;
  const titleKey = ({ branches: 'branchesCash', atms: 'atmNetwork', aml: 'amlKyc', complaints: 'complaints', swift: 'swiftLab', portal: 'customerPortal', onboarding: 'onlineOnboarding', institutions: 'institutions', interop: 'interoperability', checker: 'localChecks', support: 'callCentre' })[currentView] || currentView;
  document.title = `${t(titleKey)} · Adria Bank Demo`;
  updateBackgroundRuntimeView();
  document.body.classList.toggle('exchange-page', currentView === 'exchange');
  document.body.classList.toggle('interop-page', currentView === 'interop');
  document.body.classList.toggle('client-surface', document.body.dataset.surface === 'client');
  $('#appShell').classList.remove('sidebar-open');
}
function navigate(view, pushHash = true) {
  const allowedViews = visibleNavGroups().flatMap(group => group.items.map(([key]) => key));
  if (!allowedViews.includes(view)) view = document.body.dataset.surface === 'client' ? 'portal' : 'overview';
  if (view !== 'exchange') exchangeCustomerId = null;
  currentView = view;
  if (pushHash && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  renderView();
  main.focus({ preventScroll: true });
}
function persist(render = true) {
  try { saveDemoState(state); }
  catch (error) { toast(`Local storage could not be updated: ${error.message}`, 'error'); }
  if (render) renderView();
}
function updateBackgroundIndicator() {
  const indicator = $('#backgroundLoopIndicator');
  if (!indicator) return;
  const active = state.settings.backgroundSimulationEnabled !== false;
  const interval = state.settings.backgroundIntervalMinutes || 5;
  indicator.textContent = `${t(active ? 'backgroundActive' : 'backgroundPaused')} · ${interval} min`;
  indicator.classList.toggle('paused', !active);
  indicator.title = `${t('backgroundSimulationDescription')} ${state.settings.backgroundLastTickAt ? `${t('backgroundLastTick')}: ${fmtDate(state.settings.backgroundLastTickAt, true)}` : t('backgroundNotRunYet')}`;
}
function updateBackgroundRuntimeView() {
  updateBackgroundIndicator();
  const count = $('#backgroundRunCountValue');
  if (count) count.textContent = String(state.meta.backgroundSequence || 0);
  const last = $('#backgroundLastTickValue');
  if (last) last.textContent = state.settings.backgroundLastTickAt ? fmtDate(state.settings.backgroundLastTickAt, true) : t('backgroundNotRunYet');
}
function executeBackgroundTick(payload = {}) {
  if (state.settings.backgroundSimulationEnabled === false) return;
  try {
    const result = runBackgroundSimulationTick(state, { now: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date() });
    if (!result.updated) return;
    delete state.settings.backgroundLastError;
    persist(false);
    updateBackgroundRuntimeView();
    if (!modalRoot.childElementCount) renderView();
  } catch (error) {
    state.settings.backgroundLastError = `${new Date().toISOString()} · ${String(error?.message || error).slice(0, 240)}`;
    persist(false);
    updateBackgroundRuntimeView();
    console.error('Local synthetic background cycle failed:', error);
  }
}
async function syncBackgroundRuntime() {
  const preferences = {
    enabled: state.settings.backgroundSimulationEnabled !== false,
    intervalMinutes: state.settings.backgroundIntervalMinutes || 5,
    keepRunningInTray: Boolean(state.settings.keepRunningInTray),
    startWithWindows: Boolean(state.settings.startWithWindows)
  };
  if (window.adriaDemo?.setBackgroundPreferences) {
    clearInterval(browserSimulationTimer);
    browserSimulationTimer = null;
    if (!backgroundTickUnsubscribe && window.adriaDemo.onBackgroundTick) {
      backgroundTickUnsubscribe = window.adriaDemo.onBackgroundTick(executeBackgroundTick);
    }
    try {
      const result = await window.adriaDemo.setBackgroundPreferences(preferences);
      backgroundDesktopSupported = Boolean(result?.supported);
      if (!backgroundDesktopSupported && state.settings.startWithWindows) {
        state.settings.startWithWindows = false;
        persist(false);
      }
    } catch (error) {
      backgroundDesktopSupported = false;
      console.warn('Desktop background preferences could not be applied:', error);
    }
  } else {
    backgroundDesktopSupported = false;
    if (browserSimulationTimer) clearInterval(browserSimulationTimer);
    browserSimulationTimer = preferences.enabled
      ? setInterval(() => executeBackgroundTick({ source: 'browser-background-loop' }), preferences.intervalMinutes * 60 * 1000)
      : null;
  }
  updateBackgroundRuntimeView();
}
function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  node.innerHTML = `<span>${type === 'error' ? '!' : type === 'warning' ? '⚠' : '✓'}</span><span>${esc(message)}</span>`;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 4200);
}
function closeModal() { modalRoot.innerHTML = ''; pendingConfirmation = null; }
function formField(labelKey, control, help = '', full = false) {
  return `<div class="form-field ${full ? 'full' : ''}"><label>${esc(t(labelKey))}</label>${control}${help ? `<small class="form-help">${esc(help)}</small>` : ''}</div>`;
}
function makeSelect(name, options, placeholder, value = '') {
  return `<select name="${esc(name)}" required><option value="">${esc(placeholder)}</option>${options.map(option => `<option value="${esc(option.value)}" ${option.value === value ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select>`;
}

const DEMO_COUNTRIES = [
  ['HR', 'Croatia'], ['SI', 'Slovenia'], ['AT', 'Austria'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['GB', 'United Kingdom'], ['CH', 'Switzerland'], ['US', 'United States'], ['KE', 'Kenya'],
  ['AE', 'United Arab Emirates'], ['JP', 'Japan'], ['SG', 'Singapore']
];
function demoCountrySelect(name = 'country', selected = 'HR') {
  return `<select name="${esc(name)}" data-demo-country required>${DEMO_COUNTRIES.map(([code, country]) => `<option value="${code}" ${code === selected ? 'selected' : ''}>${code} · ${esc(country)}</option>`).join('')}</select>`;
}
function modalShell(title, subtitle, formType, body, wide = false, submitLabel = 'create') {
  const actions = formType === 'onboarding'
    ? `<div class="modal-actions onboarding-modal-actions"><button type="button" class="btn" data-action="modal-close">${esc(t('cancel'))}</button><button type="button" class="btn" data-action="onboarding-back" hidden>${esc(t('onboardingBack'))}</button><button type="button" class="btn primary" data-action="onboarding-next">${esc(t('onboardingNext'))}</button><button type="submit" class="btn primary" data-action="onboarding-submit" hidden>${esc(t(submitLabel))}</button></div>`
    : `<div class="modal-actions"><button type="button" class="btn" data-action="modal-close">${esc(t('cancel'))}</button><button type="submit" class="btn primary">${esc(t(submitLabel))}</button></div>`;
  return `<div class="modal-scrim" data-action="modal-scrim"><section class="modal-panel ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" class="modal-close" data-action="modal-close" aria-label="${esc(t('close'))}">${icon('close')}</button></header><form data-form="${esc(formType)}" ${formType === 'onboarding' ? 'novalidate' : ''}><div class="modal-body">${body}${actions}</div></form><small class="modal-demo-footer">${DEMO_BRAND}</small></section></div>`;
}
function openModal(type, data = {}) {
  const accounts = activeEurAccounts().filter(account => !data.customerId || account.customerId === data.customerId);
  let title = '', subtitle = '', body = '', wide = false;
  switch (type) {
    case 'customer': {
      title = t('newCustomer'); subtitle = t('clientOnboardingNotice');
      body = `<div class="form-grid">${formField('customerName', '<input name="name" required maxlength="80" placeholder="Demo Customer 121">', t('customerKindHelp'))}${formField('customerType', `<select name="kind"><option value="personal">${esc(t('personal'))}</option><option value="business">${esc(t('business'))}</option></select>`)}${formField('city', '<input name="city" value="Zagreb" maxlength="60">')}${formField('country', '<input name="country" value="HR" maxlength="2">')}${formField('branchSelect', makeSelect('branchId', state.branches.map(branch => ({ value: branch.id, label: branch.name })), t('branchSelect')), '', true)}${formField('email', '<input name="email" type="email" placeholder="demo.customer.121@adria.invalid">', 'Use an .invalid address only.', true)}<div class="form-field full"><label class="form-check"><input type="checkbox" name="syntheticConfirmed" required><span>${esc(t('syntheticConfirm'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('clientOnboardingNotice'))}</div></div></div>`;
      break;
    }
    case 'account': {
      title = t('newAccount'); subtitle = t('accountHelp');
      const customers = state.customers.slice().sort((a,b) => a.name.localeCompare(b.name, locale())).map(customer => ({ value: customer.id, label: `${customer.name} · ${customer.id} · ${labelStatus(customer.kyc)}` }));
      const accountCurrencyOptions = ['EUR', ...accountCurrencies()].map(code => `<option value="${esc(code)}">${esc(code)} · ${esc(CURRENCIES[code].name)}</option>`).join('');
      body = `<div class="form-grid">${formField('chooseCustomer', makeSelect('customerId', customers, t('chooseCustomer'), data.customerId), t('customerOnboardingNotice') || t('clientOnboardingNotice'), true)}${formField('accountCurrency', `<select name="currency">${accountCurrencyOptions}</select>`)}${formField('accountDetails', '<select name="kind"><option value="current">Current account</option></select>')}<div class="form-field full"><div class="form-banner">${esc(t('accountCurrencyNotice'))}</div></div></div>`;
      break;
    }
    case 'transfer': {
      title = t('internalTransfer'); subtitle = t('approvalNotice'); wide = true;
      const transferAccounts = state.accounts.filter(account => account.status === 'active' && (!data.customerId || account.customerId === data.customerId));
      const options = transferAccounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('sourceAccount', makeSelect('fromAccountId', options, t('chooseAccount'), options[0]?.value))}${formField('destinationAccount', makeSelect('toAccountId', options, t('chooseAccount'), options[1]?.value))}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="250.00">')}${formField('paymentReference', '<input name="reference" maxlength="35" placeholder="Internal demo transfer">')}<div class="form-field full"><div class="form-banner">Same-currency only. Select accounts with the same currency. Demo ledger posts immediately to both fictional customer histories; no external network is involved.</div></div></div>`;
      break;
    }
    case 'account-conversion': {
      title = t('convertAccounts'); subtitle = t('indicativeRate'); wide = true;
      const eligibleAccounts = state.accounts.filter(account => account.status === 'active' && customerById(account.customerId)?.kyc === 'verified' && (!data.customerId || account.customerId === data.customerId) && !CURRENCIES[account.currency]?.crypto);
      const options = eligibleAccounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      const context = data.customerId ? customerById(data.customerId)?.name || data.customerId : t('all');
      const sourceLabel = `${fxReferenceData.ecb.source} · ${fxReferenceData.ecb.rateDate}; ${fxReferenceData.cbk.source} · ${fxReferenceData.cbk.rateDate}`;
      body = `<div class="form-grid">${formField('sourceAccount', makeSelect('fromAccountId', options, t('chooseAccount'), options[0]?.value))}${formField('destinationAccount', makeSelect('toAccountId', options, t('chooseAccount'), options[1]?.value))}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="100.00">', t('amountInputSell'))}<div class="form-field"><label>${esc(t('customer'))}</label><input value="${esc(context)}" disabled></div><div class="form-field full"><div class="quote-box" id="accountConversionQuote"><div class="quote-box-row"><span>${esc(t('conversionRate'))}</span><strong>—</strong></div><div class="quote-box-row"><span>${esc(t('indicativeSpread'))}</span><strong>0.35%</strong></div><div class="quote-box-total"><span>${esc(t('indicativeOutput'))}</span><strong>—</strong></div></div></div><div class="form-field full"><div class="form-banner warn">${esc(t('fxConversionDisclosure'))}<br>${esc(sourceLabel)}<br>${esc(t('notLivePrice'))}</div></div></div>`;
      break;
    }
    case 'interbank-transfer': {
      title = t('interbankTransfer'); subtitle = t('interbankDemoDisclosure'); wide = true;
      const transferAccounts = state.accounts.filter(account => account.status === 'active' && customerById(account.customerId)?.kyc === 'verified' && (!data.customerId || account.customerId === data.customerId));
      const accountOptions = transferAccounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      const destinations = (state.interbankAccounts || []).filter(account => account.status === 'active').map(account => {
        const bank = state.demoBanks?.find(item => item.id === account.bankId);
        return { value: account.id, label: `${bank?.name || account.bankId} · ${account.accountNumber} · ${account.currency}` };
      });
      body = `<div class="form-grid">${formField('sourceAccount', makeSelect('fromAccountId', accountOptions, t('chooseAccount'), accountOptions[0]?.value), '', true)}${formField('destinationAccount', makeSelect('toAccountId', destinations, t('chooseDemoBank')), '', true)}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="100.00">')}${formField('paymentReference', '<input name="reference" maxlength="35" placeholder="DEMO-REF-001">')}${formField('purpose', '<input name="purpose" maxlength="80" placeholder="Synthetic rehearsal purpose">', '', true)}<div class="form-field full"><div class="form-banner warn">${esc(t('interbankDemoDisclosure'))} Beneficiary bank/account must use the same currency as the source. Requires synthetic verified KYC and local checker approval.</div></div></div>`;
      break;
    }
    case 'support-ticket': {
      title = t('newSupportTicket'); subtitle = t('supportDemoDisclosure'); wide = true;
      const customers = state.customers.slice().sort((a, b) => a.name.localeCompare(b.name, locale())).map(customer => ({ value: customer.id, label: `${customer.name} · ${customer.id}` }));
      body = `<div class="form-grid">${formField('chooseCustomer', makeSelect('customerId', customers, t('chooseCustomer'), data.customerId || portalCustomerId), '', true)}${formField('supportCategory', '<select name="category"><option>Digital access</option><option>Account opening</option><option>Cards</option><option>Payments</option><option>FX reference</option><option>Credit rehearsal</option><option>General</option></select>')}${formField('subject', '<input name="subject" required minlength="3" maxlength="80" placeholder="Demo support question">', '', true)}${formField('message', '<textarea name="message" required minlength="5" maxlength="400" placeholder="Describe the fictional workflow you need help with."></textarea>', t('noSensitiveData'), true)}<div class="form-field full"><label class="form-check"><input type="checkbox" name="syntheticConfirmed" required><span>${esc(t('syntheticConfirm'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('supportDemoDisclosure'))}</div></div></div>`;
      break;
    }
    case 'kyc-request': {
      const customer = customerById(data.customerId || portalCustomerId);
      if (!customer) return;
      title = t('startDemoKyc'); subtitle = t('kycFlowDisclosure'); wide = true;
      const sourceOptions = [['salary', 'kycSourceSalary'], ['business_revenue', 'kycSourceBusiness'], ['savings', 'kycSourceSavings'], ['pension', 'kycSourcePension'], ['investment', 'kycSourceInvestment'], ['other_synthetic', 'kycSourceOther']].map(([value, label]) => `<option value="${value}">${esc(t(label))}</option>`).join('');
      const purposeOptions = [['daily_personal', 'kycPurposeDaily'], ['salary_receipts', 'kycPurposeSalary'], ['business_operations', 'kycPurposeBusiness'], ['savings', 'kycPurposeSavings'], ['cross_border_practice', 'kycPurposeCrossBorder'], ['other_synthetic', 'kycPurposeOther']].map(([value, label]) => `<option value="${value}">${esc(t(label))}</option>`).join('');
      const docItems = [['synthetic_identity_sample', 'syntheticIdentitySample'], ['synthetic_address_sample', 'syntheticAddressSample'], ...(customer.kind === 'business' ? [['synthetic_register_sample', 'syntheticRegisterSample'], ['synthetic_ownership_chart', 'syntheticOwnershipChart']] : [])].map(([value, label]) => `<label class="form-check checklist-item"><input type="checkbox" name="mockDocuments" value="${value}"><span>${esc(t(label))}</span></label>`).join('');
      body = `<div class="notice info"><b>i</b><span>${esc(t('kycFlowDisclosure'))} · ${esc(customer.name)} · ${esc(customer.kind === 'business' ? t('business') : t('personal'))}</span></div><div class="form-grid"><input type="hidden" name="customerId" value="${esc(customer.id)}">${formField('sourceFunds', `<select name="sourceOfFunds" required>${sourceOptions}</select>`)}${formField('kycPurpose', `<select name="purpose" required>${purposeOptions}</select>`)}${formField('expectedMonthlyBand', '<select name="expectedMonthlyBand"><option value="under_2k">Under EUR 2,000 · demo</option><option value="2k_10k">EUR 2,000–10,000 · demo</option><option value="10k_50k">EUR 10,000–50,000 · demo</option><option value="over_50k">Over EUR 50,000 · demo</option><option value="unknown_synthetic">Not specified · demo</option></select>')}${formField('riskScenario', `<select name="riskScenario"><option value="standard_demo">${esc(t('standardDemo'))}</option><option value="enhanced_review_demo">${esc(t('enhancedReviewDemo'))}</option></select>`)}<div class="form-field full"><label>${esc(t('mockDocuments'))}</label><div class="checklist-grid">${docItems}</div></div>${customer.kind === 'business' ? `<div class="form-field full"><label class="form-check checklist-item"><input type="checkbox" name="ownershipSectionReviewed" required><span>${esc(t('ownershipReview'))}</span></label></div>` : ''}<div class="form-field full"><label class="form-check"><input type="checkbox" name="syntheticConfirmed" required><span>${esc(t('syntheticConfirm'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('clientOnboardingNotice'))} ${esc(t('noSensitiveData'))}</div></div></div>`;
      break;
    }
    case 'payment': {
      title = t('newPayment'); subtitle = t('approvalNotice'); wide = true;
      const options = accounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('sourceAccount', makeSelect('accountId', options, t('chooseAccount'), options[0]?.value), '', true)}${formField('beneficiaryName', '<input name="beneficiary" required maxlength="80" placeholder="Example beneficiary (demo)">')}${formField('country', demoCountrySelect('country', 'HR'))}${formField('demoIbanOrDomesticId', '<input name="iban" readonly aria-readonly="true">', 'Fictional country-aware IBAN-shaped or domestic identifier; never valid for routing.')}${formField('bic', '<input name="bic" readonly aria-readonly="true">', 'Fictional DEMO BIC only.')}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="120.00">')}${formField('paymentRail', '<select name="rail"><option value="sepa">SEPA Credit Transfer (simulation)</option><option value="instant">SEPA Instant (simulation)</option></select>')}${formField('paymentReference', '<input name="reference" maxlength="35" placeholder="DEMO-REF-001">')}${formField('purpose', '<input name="notes" maxlength="70" placeholder="Invoice / purpose">', '', true)}<input type="hidden" name="accountSequence" value="${state.meta.nextPayment || 1}"><div class="form-field full"><div class="form-banner warn">${esc(t('transactionThresholdNotice'))} Local checker queue only: this never sends a payment or validates a beneficiary.</div></div></div>`;
      break;
    }
    case 'incoming-payment': {
      title = t('receivePayment'); subtitle = t('incomingPaymentDisclosure'); wide = true;
      const options = accounts.filter(account => customerById(account.customerId)?.kyc === 'verified').map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('destinationAccount', makeSelect('accountId', options, t('chooseAccount'), options[0]?.value), '', true)}${formField('sender', '<input name="sender" required maxlength="80" placeholder="Fictional payer Ltd">')}${formField('country', demoCountrySelect('country', 'HR'))}${formField('demoIbanOrDomesticId', '<input name="senderIban" readonly aria-readonly="true">', 'Fictional country-aware IBAN-shaped or domestic identifier; never valid for routing.')}${formField('senderBic', '<input name="senderBic" readonly aria-readonly="true">', 'Fictional DEMO BIC only.')}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="85.00">')}${formField('paymentReference', '<input name="reference" maxlength="35" placeholder="DEMO-RECEIPT-001">')}${formField('paymentRail', '<select name="rail"><option value="sepa">SEPA Credit Transfer (simulation)</option><option value="instant">SEPA Instant (simulation)</option></select>')}${formField('purpose', '<input name="notes" maxlength="70" placeholder="Fictional invoice reference">', '', true)}<input type="hidden" name="accountSequence" value="${state.meta.nextPayment || 1}"><div class="form-field full"><div class="form-banner warn">A local incoming-credit rehearsal is queued for checker review. It is not money received over SEPA or another network.</div></div></div>`;
      break;
    }
    case 'cash': {
      title = t('cashOperation'); subtitle = t('branchCashNote');
      const accountOptions = accounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      const branches = state.branches.map(branch => ({ value: branch.id, label: branch.name }));
      body = `<div class="form-grid">${formField('operation', '<select name="operation"><option value="deposit">Cash deposit</option><option value="withdrawal">Cash withdrawal</option></select>')}${formField('branchSelect', makeSelect('branchId', branches, t('branchSelect')))}${formField('chooseAccount', makeSelect('accountId', accountOptions, t('chooseAccount')), '', true)}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="150.00">')}<div class="form-field full"><div class="form-banner warn">Teller, dual-cash count, customer ID checks, counterfeit detection and physical cash are not present in this simulation.</div></div></div>`;
      break;
    }
    case 'card': {
      title = t('newCard'); subtitle = t('clientOnboardingNotice');
      const choices = accounts.filter(account => customerById(account.customerId)?.kyc === 'verified').map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('chooseAccount', makeSelect('accountId', choices, t('chooseAccount')), '', true)}${formField('productCard', `<select name="product"><option value="standard">${esc(t('standardDebit'))}</option><option value="premium">${esc(t('premiumDebit'))}</option><option value="prepaid">${esc(t('prepaidVirtual'))}</option></select>`, '', true)}<div class="form-field full"><div class="form-banner warn">${esc(t('cardWorkflowBoundary'))}</div></div></div>`;
      break;
    }
    case 'card-controls': {
      const card = state.cards.find(item => item.id === data.cardId);
      if (!card || !['active', 'locked'].includes(card.status) || (data.customerId && card.customerId !== data.customerId)) return;
      title = t('cardControls'); subtitle = `${card.product} · ${t('cardTokenSuffix')} ${card.last4} · ${t('localSimulation')}`;
      const controls = card.controls || {};
      body = `<input type="hidden" name="cardId" value="${esc(card.id)}"><div class="form-grid">${formField('cardDailyLimit', `<input name="dailyLimit" type="number" min="1" step="0.01" value="${(card.dailyLimitCents / 100).toFixed(2)}" required>`)}${formField('cardMonthlyLimit', `<input name="monthlyLimit" type="number" min="1" step="0.01" value="${(card.monthlyLimitCents / 100).toFixed(2)}" required>`)}<div class="form-field full"><label class="form-check"><input type="checkbox" name="onlineEnabled" ${controls.onlineEnabled === false ? '' : 'checked'}><span>${esc(t('onlinePayments'))}</span></label></div><div class="form-field full"><label class="form-check"><input type="checkbox" name="internationalEnabled" ${controls.internationalEnabled ? 'checked' : ''}><span>${esc(t('internationalPayments'))}</span></label></div><div class="form-field full"><label class="form-check"><input type="checkbox" name="recurringEnabled" ${controls.recurringEnabled === false ? '' : 'checked'}><span>${esc(t('recurringPayments'))}</span></label></div><div class="form-field full"><div class="form-banner">${esc(t('cardWorkflowBoundary'))}</div></div></div>`;
      wide = true;
      break;
    }
    case 'card-load': {
      const card = state.cards.find(item => item.id === data.cardId);
      if (!card || card.fundingType !== 'prepaid' || card.status !== 'active' || (data.customerId && card.customerId !== data.customerId)) return;
      title = t('cardLoad'); subtitle = `${card.product} · ${t('prepaidBalance')}: ${currency(card.prepaidBalanceCents || 0)} · ${t('localSimulation')}`;
      body = `<input type="hidden" name="cardId" value="${esc(card.id)}"><div class="form-grid">${formField('amountEur', '<input name="amount" type="number" min="1" max="1000" step="0.01" required placeholder="50.00">', t('prepaidLoadHelp'), true)}<div class="form-field full"><div class="form-banner warn">${esc(t('cardWorkflowBoundary'))}</div></div></div>`;
      wide = true;
      break;
    }
    case 'card-purchase': {
      const scopedCustomerId = data.customerId || (document.body.dataset.surface === 'client' || currentView === 'portal' ? portalCustomerId : '');
      const eligibleCards = state.cards.filter(card => card.status === 'active' && (!scopedCustomerId || card.customerId === scopedCustomerId));
      if (data.cardId && !eligibleCards.some(card => card.id === data.cardId)) return;
      title = t('simulateCardPurchase'); subtitle = t('localSimulation'); wide = true;
      const cardOptions = eligibleCards.map(card => ({ value: card.id, label: `${card.product} · ${card.id} · DEMO ${card.last4}` }));
      const selectedCardId = data.cardId || cardOptions[0]?.value || '';
      body = `<div class="form-grid">${formField('chooseCard', makeSelect('cardId', cardOptions, t('chooseCard'), selectedCardId), '', true)}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="12.50">')}${formField('cardMerchant', `<select name="merchant"><option value="Demo Corner Shop">${esc(t('demoMerchantShop'))}</option><option value="Demo Transit">${esc(t('demoMerchantTransit'))}</option><option value="Demo Digital Service">${esc(t('demoMerchantOnline'))}</option></select>`)}${formField('cardChannel', `<select name="channel"><option value="in_person">${esc(t('inPerson'))}</option><option value="online">${esc(t('online'))}</option><option value="recurring">${esc(t('recurringPayments'))}</option></select>`)}<div class="form-field full"><label class="form-check"><input type="checkbox" name="international"><span>${esc(t('internationalPurchase'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('cardWorkflowBoundary'))}</div></div></div>`;
      break;
    }
    case 'deposit': {
      title = t('newDeposit'); subtitle = t('savingsSub');
      const choices = accounts.filter(account => customerById(account.customerId)?.kyc === 'verified').map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('chooseAccount', makeSelect('accountId', choices, t('chooseAccount')), '', true)}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="1000.00">')}${formField('termMonths', '<select name="termMonths"><option value="3">3 months · 1.45%</option><option value="6">6 months · 1.75%</option><option value="12">12 months · 2.05%</option><option value="18">18 months · 2.15%</option><option value="24">24 months · 2.25%</option></select>')}${formField('rate', '<input value="Indicative fixed rate · no contract" disabled>')}<div class="form-field full"><div class="form-banner warn">Rates are fictional and not an offer. Deposit-guarantee membership or protection is not represented.</div></div></div>`;
      break;
    }
    case 'loan': {
      title = t('newLoan'); subtitle = t('loansSub');
      const choices = accounts.filter(account => account.currency === 'EUR' && account.status === 'active' && customerById(account.customerId)?.kyc === 'verified' && customerById(account.customerId)?.risk !== 'high').map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('chooseAccount', makeSelect('accountId', choices, t('chooseAccount')), '', true)}${formField('loanProduct', `<select name="product"><option value="Personal loan">${esc(t('personalLoan'))}</option><option value="Home improvement loan">${esc(t('homeImprovement'))}</option><option value="SME working capital">${esc(t('smeLoan'))}</option><option value="Overdraft facility">${esc(t('overdraftFacility'))}</option></select>`)}${formField('amountEur', '<input name="amount" type="number" min="1000" max="50000" step="100" required placeholder="10000.00">', t('loanAmountHelp'))}${formField('termMonths', '<select name="termMonths"><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option></select>')}${formField('loanPurpose', '<input name="purpose" maxlength="100" placeholder="Synthetic demo purpose">', '', true)}<div class="form-field full"><div class="form-banner warn">${esc(t('loanDisclosure'))}</div></div></div>`;
      break;
    }
    case 'loan-repayment': {
      const loan = state.loans.find(item => item.id === data.loanId);
      if (!loan || !['performing', 'arrears'].includes(loan.status)) return;
      title = t('repayLoan'); subtitle = `${loan.id} · ${currency(loan.outstandingCents)} ${t('outstanding').toLocaleLowerCase(locale())}`;
      const account = accountById(loan.accountId);
      const interest = Math.round(loan.outstandingCents * loan.annualRateBps / 10000 / 12);
      const principalPart = Math.min(loan.outstandingCents, Math.max(100, Math.round(loan.outstandingCents / loan.termMonths)));
      const suggested = ((principalPart + interest) / 100).toFixed(2);
      body = `<div class="form-grid">${formField('chooseAccount', `<select name="accountId" required><option value="${esc(loan.accountId)}">${esc(account ? accountLabel(account) : loan.accountId)}</option></select>`, '', true)}<div class="form-field"><label>${esc(t('amountEur'))}</label><input name="amount" type="number" min="0.01" step="0.01" required value="${suggested}"><small>${esc(t('repaymentHelp'))}</small></div><div class="form-field full"><div class="form-banner warn">${esc(t('loanDisclosure'))}</div></div><input type="hidden" name="loanId" value="${esc(loan.id)}"></div>`;
      break;
    }
    case 'atm': {
      title = t('simulateWithdrawal'); subtitle = t('atmSub');
      const online = state.atms.filter(atm => atm.status === 'online').map(atm => ({ value: atm.id, label: `${atm.id} · ${atm.name} · ${currency(atm.cashCents)}` }));
      const choices = accounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('machine', makeSelect('atmId', online, t('machine'), data.atmId || ''))}${formField('chooseAccount', makeSelect('accountId', choices, t('chooseAccount')))}${formField('amountEur', '<input name="amount" type="number" min="10" step="10" required placeholder="40.00">', 'Simulated demo limit applies.', true)}<div class="form-field full"><div class="form-banner warn">No physical cash is dispensed. Do not connect this mock-up to a real ATM.</div></div></div>`;
      break;
    }
    case 'swift': {
      title = t('newSwift'); subtitle = t('swiftDisclaimer'); wide = true;
      const choices = accounts.map(account => ({ value: account.id, label: accountLabel(account) }));
      body = `<div class="form-grid">${formField('sourceAccount', makeSelect('accountId', choices, t('chooseAccount')), '', true)}${formField('beneficiaryName', '<input name="beneficiary" required maxlength="70" placeholder="Example beneficiary (demo)">')}${formField('country', demoCountrySelect('country', 'GB'))}${formField('bank', '<input name="bank" maxlength="70" value="Fictional correspondent (demo)">')}${formField('bic', '<input name="bic" readonly aria-readonly="true">', 'Generated DEMO BIC must match the selected beneficiary country.')}${formField('demoIbanOrDomesticId', '<input name="iban" readonly aria-readonly="true">', 'Fictional country-aware IBAN-shaped or domestic identifier; never valid for routing.')}${formField('amountEur', '<input name="amount" type="number" min="0.01" step="0.01" required placeholder="500.00">')}${formField('purpose', '<input name="purpose" maxlength="35" placeholder="DEMO PURPOSE">', '', true)}<input type="hidden" name="accountSequence" value="${state.meta.nextSwift || 1}"><div class="form-field full"><div class="form-banner warn">MT103-format draft only. Screening, correspondent validation, sanctions, nostro reconciliation, SWIFT connectivity and transmission are not available.</div></div></div>`;
      break;
    }
    case 'crypto-transfer': {
      title = t('cryptoSend'); subtitle = t('digitalAssetNotice'); wide = true;
      const cryptoOwnerScope = data.customerId || (document.body.dataset.surface === 'client' || currentView === 'portal' ? portalCustomerId : '');
      const owners = state.customers.filter(customer => customer.kyc === 'verified' && (!cryptoOwnerScope || customer.id === cryptoOwnerScope) && state.wallets.some(wallet => wallet.customerId === customer.id && wallet.units > 0));
      const customerChoices = owners.map(customer => ({ value: customer.id, label: `${customer.name} · ${customer.id}` }));
      const walletOwnerId = data.customerId || owners[0]?.id;
      const assetChoices = digitalAssets().map(code => ({ value: code, label: `${code} · ${CURRENCIES[code].name}` }));
      body = `<div class="form-grid">${formField('chooseCustomer', makeSelect('customerId', customerChoices, t('chooseCustomer'), walletOwnerId), '', true)}${formField('asset', makeSelect('asset', assetChoices, t('chooseAsset')), '')}${formField('amount', '<input name="units" type="number" min="0.00000001" step="0.00000001" required placeholder="0.01000000">')}${formField('walletAddress', '<input name="destination" required maxlength="86" value="DEMO-WALLET-RECIPIENT-01">', 'DEMO-WALLET address only. Real chain addresses are rejected.', true)}<div class="form-field full"><div class="form-banner warn">Held for a simulated checker approval. No wallet provider, key, custody service or blockchain is connected.</div></div></div>`;
      break;
    }
    case 'crypto-receipt': {
      title = t('cryptoReceive'); subtitle = t('digitalAssetNotice'); wide = true;
      const cryptoOwnerScope = data.customerId || (document.body.dataset.surface === 'client' || currentView === 'portal' ? portalCustomerId : '');
      const owners = state.customers.filter(customer => customer.kyc === 'verified' && (!cryptoOwnerScope || customer.id === cryptoOwnerScope));
      const customerChoices = owners.map(customer => ({ value: customer.id, label: `${customer.name} · ${customer.id}` }));
      const assetChoices = digitalAssets().map(code => ({ value: code, label: `${code} · ${CURRENCIES[code].name}` }));
      body = `<div class="form-grid">${formField('chooseCustomer', makeSelect('customerId', customerChoices, t('chooseCustomer'), data.customerId || owners[0]?.id), '', true)}${formField('asset', makeSelect('asset', assetChoices, t('chooseAsset')), '')}${formField('amount', '<input name="units" type="number" min="0.00000001" step="0.00000001" required placeholder="0.01000000">')}${formField('walletAddress', '<input name="sender" required maxlength="86" value="DEMO-WALLET-SENDER-01">', 'DEMO-WALLET source only. No real address is accepted.', true)}<div class="form-field full"><div class="form-banner warn">Fictional incoming-wallet rehearsal; checker review required. No token is received from a chain.</div></div></div>`;
      break;
    }
    case 'complaint': {
      title = t('newComplaint'); subtitle = t('complaintDemoDisclosure'); wide = true;
      const fixedCustomerId = data.customerId || (document.body.dataset.surface === 'client' || currentView === 'portal' ? portalCustomerId : '');
      const customers = state.customers.filter(customer => !fixedCustomerId || customer.id === fixedCustomerId).map(customer => ({ value: customer.id, label: `${customer.name} · ${customer.id} · ${labelStatus(customer.kyc)}` }));
      body = `<div class="form-grid">${formField('chooseCustomer', makeSelect('customerId', customers, t('chooseCustomer'), fixedCustomerId), '', true)}${formField('complaintCategory', '<select name="category"><option>Payments</option><option>Account servicing</option><option>Cards</option><option>Accessibility</option><option>Business banking</option><option>Savings information</option><option>Other</option></select>')}${formField('subject', '<input name="subject" required minlength="3" maxlength="90" placeholder="Fictional complaint topic">', '', true)}${formField('priority', '<select name="priority"><option value="standard">Standard practice scenario</option><option value="high">High-priority practice scenario</option></select>')}${formField('message', '<textarea name="message" required minlength="10" maxlength="600" placeholder="Describe the fictional scenario. Do not include real account, identity or payment details."></textarea>', t('noSensitiveData'), true)}<div class="form-field full"><label class="form-check"><input type="checkbox" name="syntheticConfirmed" required><span>${esc(t('syntheticConfirm'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('complaintDemoDisclosure'))}</div></div></div>`;
      break;
    }
    case 'onboarding': {
      const customer = customerById(data.customerId || portalCustomerId);
      if (!customer) return;
      title = t('startDemoOnboarding'); subtitle = t('onboardingFlowIntro'); wide = true;
      const marketOptions = (state.plannedMarkets || []).map(market => ({ value: market.countryCode, label: `${market.countryCode} · ${market.country}` }));
      const defaultMarket = marketOptions.some(option => option.value === customer.country) ? customer.country : 'HR';
      const typeOptions = [{ value: customer.kind, label: t(customer.kind) }];
      const productOptions = [
        ['personal_account', 'onboardingProductPersonal'], ['multi_currency', 'onboardingProductMultiCurrency'],
        ['virtual_debit', 'onboardingProductVirtualDebit'], ['prepaid_virtual', 'onboardingProductPrepaid'],
        ['business_account', 'onboardingProductBusiness']
      ].filter(([value]) => customer.kind === 'business' || value !== 'business_account');
      const requiredProduct = customer.kind === 'business' ? 'business_account' : 'personal_account';
      const productFields = productOptions.map(([value, key]) => `<label class="form-check"><input type="checkbox" name="products" value="${value}" ${value === requiredProduct ? 'required' : ''}><span>${esc(t(key))}</span></label>`).join('');
      body = `<input type="hidden" name="customerId" value="${esc(customer.id)}"><div class="onboarding-progress" aria-label="${esc(t('onboardingStages'))}"><span class="active" data-onboarding-progress="1" aria-current="step"><b>01</b>${esc(t('onboardingStageProfile'))}</span><span data-onboarding-progress="2"><b>02</b>${esc(t('onboardingStageChecks'))}</span><span data-onboarding-progress="3"><b>03</b>${esc(t('onboardingStageReview'))}</span></div><div class="form-grid onboarding-step" data-onboarding-step="1">${formField('customerType', makeSelect('customerKind', typeOptions, '', customer.kind))}${formField('country', makeSelect('countryCode', marketOptions, '', defaultMarket), t('onboardingMarketNote'))}<div class="form-field full"><label>${esc(t('requestedProducts'))}</label><div class="onboarding-products">${productFields}</div></div></div><div class="form-grid onboarding-step" data-onboarding-step="2" hidden>${formField('identityScenario', `<select name="identityScenario"><option value="test_pass_demo">${esc(t('verificationPassDemo'))}</option><option value="manual_review_demo">${esc(t('verificationManualDemo'))}</option><option value="unavailable_demo">${esc(t('verificationUnavailableDemo'))}</option></select>`, t('onboardingNoDocumentUpload'))}${formField('screeningScenario', `<select name="screeningScenario"><option value="clear_demo">${esc(t('screeningClearDemo'))}</option><option value="possible_match_demo">${esc(t('screeningPossibleMatchDemo'))}</option><option value="escalation_demo">${esc(t('screeningEscalationDemo'))}</option></select>`, t('onboardingNoListCheck'))}<div class="form-field full"><div class="form-banner info">${esc(t('onboardingScenarioExplain'))}</div></div></div><div class="form-grid onboarding-step" data-onboarding-step="3" hidden><div class="form-field full"><div class="notice info"><b>i</b><span>${esc(t('onboardingReviewSummary'))}</span></div></div><div class="form-field full"><label class="form-check"><input type="checkbox" name="syntheticConfirmed" required><span>${esc(t('syntheticConfirm'))}</span></label></div><div class="form-field full"><label class="form-check"><input type="checkbox" name="noRealDataConfirmed" required><span>${esc(t('onboardingNoRealDataConfirm'))}</span></label></div><div class="form-field full"><div class="form-banner warn">${esc(t('onboardingBoundary'))}</div></div></div>`;
      break;
    }
    case 'onboarding-review': {
      const application = (state.onboardingApplications || []).find(item => item.id === data.applicationId);
      if (!application) return;
      const customer = customerById(application.customerId);
      const products = application.products.map(product => t(({ personal_account: 'onboardingProductPersonal', multi_currency: 'onboardingProductMultiCurrency', virtual_debit: 'onboardingProductVirtualDebit', prepaid_virtual: 'onboardingProductPrepaid', business_account: 'onboardingProductBusiness' })[product] || product)).join(' · ');
      const history = (application.history || []).map(item => `<div class="timeline-item"><i class="timeline-dot ${item.status === 'reviewed_demo' ? '' : 'warn'}"></i><div class="timeline-text"><strong>${esc(labelStatus(item.status))} · ${esc(item.actor)}</strong><small>${esc(item.note)}</small></div><span class="timeline-date">${esc(fmtDate(item.at, true))}</span></div>`).join('');
      title = `${t('applicationCode')} · ${application.id}`; subtitle = t('onboardingBoundary');
      body = `<div class="grid two-col"><div class="detail-cell"><small>${esc(t('customer'))}</small><strong>${esc(customer?.id || application.customerId)} · ${esc(t(application.customerKind))}</strong></div><div class="detail-cell"><small>${esc(t('country'))}</small><strong>${esc(application.countryCode)} · ${esc(t('status'))}: ${esc(labelStatus(application.status))}</strong></div><div class="detail-cell"><small>${esc(t('requestedProducts'))}</small><strong>${esc(products)}</strong></div><div class="detail-cell"><small>${esc(t('reviewPath'))}</small><strong>${esc(t(application.reviewPath === 'enhanced_review_demo' ? 'onboardingEnhancedPath' : 'onboardingStandardPath'))}</strong></div><div class="detail-cell"><small>${esc(t('identityScenario'))}</small><strong>${esc(t(application.identityScenario))}</strong></div><div class="detail-cell"><small>${esc(t('screeningScenario'))}</small><strong>${esc(t(application.screeningScenario))}</strong></div></div><div class="notice warn" style="margin-top:12px"><b>!</b><span>${esc(t('onboardingBoundary'))}</span></div><div class="timeline" style="margin-top:14px">${history || emptyState(t('noRecords'))}</div><div class="modal-actions"><button type="button" class="btn primary" data-action="modal-close">${esc(t('close'))}</button></div>`;
      modalRoot.innerHTML = `<div class="modal-scrim" data-action="modal-scrim"><section class="modal-panel wide" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" class="modal-close" data-action="modal-close" aria-label="${esc(t('close'))}">${icon('close')}</button></header><div class="modal-body">${body}</div><small class="modal-demo-footer">${DEMO_BRAND}</small></section></div>`;
      return;
    }
    case 'confirm': {
      title = data.title || t('operationTitle'); subtitle = data.subtitle || t('localSimulation');
      body = `<div class="notice ${data.tone === 'danger' ? 'danger' : 'info'}"><b>${data.tone === 'danger' ? '!' : 'i'}</b><span>${esc(data.message || '')}</span></div><div class="modal-actions"><button type="button" class="btn" data-action="modal-close">${esc(t('cancel'))}</button><button type="button" class="btn ${data.tone === 'danger' ? 'danger' : 'primary'}" data-action="confirm-pending">${esc(data.confirmLabel || t('approve'))}</button></div>`;
      modalRoot.innerHTML = `<div class="modal-scrim" data-action="modal-scrim"><section class="modal-panel" role="dialog" aria-modal="true"><header class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="modal-close" data-action="modal-close">${icon('close')}</button></header><div class="modal-body">${body}</div><small class="modal-demo-footer">${DEMO_BRAND}</small></section></div>`;
      pendingConfirmation = data.onConfirm;
      return;
    }
    default: return;
  }
  const submitLabel = type === 'card-controls' ? 'save' : type === 'card-load' ? 'cardLoad' : type === 'card-purchase' ? 'simulateCardPurchase' : type === 'onboarding' ? 'submitDemoApplication' : 'create';
  modalRoot.innerHTML = modalShell(title, subtitle, type, body, wide, submitLabel);
  if (type === 'account-conversion') updateAccountConversionQuote();
  if (['payment', 'incoming-payment', 'swift'].includes(type)) updateDemoRoutingDisplay($('form', modalRoot));
  const first = $('input:not([type="hidden"]):not([type="checkbox"]),select', modalRoot);
  if (first && type !== 'confirm') setTimeout(() => first.focus(), 30);
}

function openDrawer(title, subtitle, body) {
  modalRoot.innerHTML = `<div class="drawer-scrim" data-action="drawer-scrim"><aside class="drawer" role="dialog" aria-modal="true"><header class="drawer-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="modal-close" data-action="modal-close" aria-label="${esc(t('close'))}">${icon('close')}</button></header><div class="drawer-body">${body}</div><small class="modal-demo-footer">${DEMO_BRAND}</small></aside></div>`;
}
function openCustomer(customerId) {
  const customer = customerById(customerId);
  if (!customer) return;
  const accounts = customerAccounts(customerId);
  const recent = state.transactions.filter(tx => tx.customerId === customerId).slice(0, 8);
  const customerLoans = (state.loans || []).filter(loan => loan.customerId === customerId);
  const amlCases = state.cases.filter(item => item.customerId === customerId && item.status !== 'closed');
  const kycAction = customer.kyc === 'verified' || !canReviewCompliance() ? '' : `<button class="btn small soft-teal" data-action="kyc-verify" data-id="${esc(customer.id)}">${esc(t('markVerified'))}</button>`;
  const body = `<div class="customer-summary"><span class="customer-avatar ${customer.kind === 'business' ? 'business' : ''}">${esc(initials(customer.name))}</span><div class="customer-summary-copy"><strong>${esc(customer.name)}</strong><small>${esc(customer.id)} · ${esc(customer.kind === 'business' ? t('business') : t('personal'))} · ${esc(customer.city)}, ${esc(customer.country)}</small></div>${kycAction}</div><div class="detail-grid"><div class="detail-cell"><small>${esc(t('kyc'))}</small><strong>${badge(customer.kyc)}</strong></div><div class="detail-cell"><small>${esc(t('riskProfile'))}</small><strong>${badge(customer.risk)}</strong></div><div class="detail-cell"><small>${esc(t('segment'))}</small><strong>${esc(customer.segment)}</strong></div><div class="detail-cell"><small>${esc(t('sourceFunds'))}</small><strong>${esc(customer.sourceOfFunds)}</strong></div><div class="detail-cell"><small>${esc(t('expectedActivity'))}</small><strong>${esc(currency(customer.expectedMonthlyCents))}</strong></div><div class="detail-cell"><small>${esc(t('branch'))}</small><strong>${esc(state.branches.find(item => item.id === customer.branchId)?.name || '—')}</strong></div><div class="detail-cell"><small>${esc(t('owner'))}</small><strong>${esc(customer.kind === 'business' ? customer.beneficialOwner || t('noData') : t('noData'))}</strong></div><div class="detail-cell"><small>${esc(t('date'))}</small><strong>${esc(fmtDate(customer.joinedAt))}</strong></div><div class="detail-cell"><small>${esc(t('openCases'))}</small><strong>${amlCases.length}</strong></div></div><div class="light-divider"></div><div class="panel-header"><div><h3 class="section-label">${esc(t('linkedAccounts'))}</h3></div><button class="btn small" data-action="new-account-for" data-id="${esc(customer.id)}">+ ${esc(t('newAccount'))}</button></div>${accounts.length ? accounts.map(account => `<div class="bank-account-row"><div class="bank-account-left"><i class="bank-account-icon">${icon('account')}</i><div><strong>${esc(account.id)} · ${esc(account.label)}</strong><small class="mono">${esc(account.iban)} · ${esc(account.currency)}</small></div></div><div class="bank-account-amount">${esc(currency(account.balanceCents, account.currency))}<small class="sub-cell">${badge(account.status)}</small></div></div>`).join('') : emptyState(t('noAccounts'))}<div class="light-divider"></div><h3 class="section-label">${esc(t('loans'))} · ${esc(t('demoOnly'))}</h3>${customerLoans.length ? customerLoans.map(loan => `<div class="bank-account-row"><div class="bank-account-left"><i class="bank-account-icon">${icon('loan')}</i><div><strong>${esc(loan.id)} · ${esc(loan.product)}</strong><small>${esc(currency(loan.outstandingCents))} ${esc(t('outstanding').toLocaleLowerCase(locale()))} · ${(loan.annualRateBps / 100).toFixed(2)}%</small></div></div><div class="bank-account-amount">${badge(loan.status)}</div></div>`).join('') : emptyState(t('noRecords'))}<div class="light-divider"></div><h3 class="section-label">${esc(t('transactionHistory'))}</h3>${recent.length ? `<div class="activity-list">${recent.map(tx => `<div class="activity-row"><span class="activity-icon ${tx.direction === 'out' ? 'out' : ''}">${icon(tx.direction === 'in' ? 'arrow' : 'payments')}</span><div class="activity-copy"><strong>${esc(txLabel(tx))}</strong><small>${esc(tx.counterparty)} · ${esc(fmtDate(tx.date, true))}</small></div><div class="activity-amount ${tx.direction === 'in' ? 'in' : ''}">${esc(amountWithDirection(tx))}<small>${esc(labelStatus(tx.status))}</small></div></div>`).join('')}</div>` : emptyState(t('noTransactions'))}<div class="notice info" style="margin-top:13px"><b>i</b><span>${esc(t('clientOnboardingNotice'))}</span></div>`;
  openDrawer(t('customerRecord'), `${customer.id} · ${customer.email}`, body);
}
function openKycDetails(customerId) {
  const customer = customerById(customerId);
  if (!customer) return;
  const request = customer.kycRequest;
  const selectedKeys = {
    synthetic_identity_sample: 'syntheticIdentitySample', synthetic_address_sample: 'syntheticAddressSample',
    synthetic_register_sample: 'syntheticRegisterSample', synthetic_ownership_chart: 'syntheticOwnershipChart'
  };
  const documents = request?.mockDocuments?.length ? request.mockDocuments.map(key => `<div class="setting-row"><span class="setting-row-copy"><strong>${esc(t(selectedKeys[key] || 'mockDocuments'))}</strong><small>${esc(t('syntheticData'))} · no uploaded file</small></span>${badge('simulated')}</div>`).join('') : `<div class="notice info"><b>i</b><span>${esc(t('noKycRequest'))}</span></div>`;
  const actions = canReviewCompliance() ? `<div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn primary" data-action="kyc-verify" data-id="${esc(customer.id)}">${esc(t('markVerified'))}</button><button class="btn" data-action="kyc-edd" data-id="${esc(customer.id)}">${esc(t('enhancedReviewDemo'))}</button></div>` : `<div class="notice info"><b>i</b><span>${esc(t('roleReadOnly'))}</span></div>`;
  const body = `<div class="notice warn"><b>!</b><span>${esc(t('kycFlowDisclosure'))}</span></div><div class="detail-grid"><div class="detail-cell"><small>${esc(t('client'))}</small><strong>${esc(customer.name)} · ${esc(customer.id)}</strong></div><div class="detail-cell"><small>${esc(t('kyc'))}</small><strong>${badge(customer.kyc)}</strong></div><div class="detail-cell"><small>${esc(t('riskProfile'))}</small><strong>${badge(customer.risk)}</strong></div><div class="detail-cell"><small>${esc(t('sourceFunds'))}</small><strong>${esc(request?.sourceOfFunds || customer.sourceOfFunds || '—')}</strong></div><div class="detail-cell"><small>${esc(t('kycPurpose'))}</small><strong>${esc(request?.purpose || '—')}</strong></div><div class="detail-cell"><small>${esc(t('expectedMonthlyBand'))}</small><strong>${esc(request?.expectedMonthlyBand || '—')}</strong></div><div class="detail-cell"><small>${esc(t('riskScenario'))}</small><strong>${esc(t(request?.syntheticRiskScenario === 'enhanced_review_demo' ? 'enhancedReviewDemo' : 'standardDemo'))}</strong></div><div class="detail-cell"><small>${esc(t('date'))}</small><strong>${esc(request?.submittedAt ? fmtDate(request.submittedAt, true) : '—')}</strong></div><div class="detail-cell"><small>${esc(t('ownershipReview'))}</small><strong>${request?.ownershipSectionReviewed ? esc(t('simulated')) : '—'}</strong></div></div><div class="light-divider"></div><h3 class="section-label">${esc(t('kycDocuments'))}</h3>${documents}${actions}<div class="notice danger" style="margin-top:12px"><b>!</b><span>Changing a demo KYC label does not identify a real person, validate an owner or screen a sanctions/PEP list.</span></div>`;
  openDrawer(t('kycReview'), `${customer.id} · ${customer.kind === 'business' ? t('business') : t('personal')} · ${t('localSimulation')}`, body);
}

function openComplaint(complaintId) {
  const complaint = (state.complaints || []).find(item => item.id === complaintId);
  if (!complaint) return;
  const customer = customerById(complaint.customerId);
  const customerOnly = document.body.dataset.surface === 'client';
  if (customerOnly && complaint.customerId !== portalCustomerId) { toast(t('roleReadOnly'), 'warning'); return; }
  const history = (complaint.history || []).map(entry => `<div class="timeline-item"><i class="timeline-dot"></i><div class="timeline-text"><strong>${esc(t(entry.status) || labelStatus(entry.status))}</strong><small>${esc(fmtDate(entry.at, true))} · ${esc(entry.note || '')}</small></div></div>`).join('');
  const reviewer = !customerOnly && currentView === 'complaints' && canReviewCompliance();
  const response = complaint.customerVisibleResponse ? `<div class="notice info"><b>i</b><span><strong>${esc(t('complaintResponse'))}:</strong> ${esc(complaint.customerVisibleResponse)}</span></div>` : '';
  const controls = reviewer ? `<div class="form-field" style="margin-top:14px"><label for="complaintReviewNote">${esc(t('complaintInternalNote'))}</label><textarea id="complaintReviewNote" maxlength="500" placeholder="${esc(t('noSensitiveData'))}"></textarea></div><div class="complaint-status-actions">${[['investigating','investigating'],['response_ready','responseReady'],['resolved','resolved'],['escalated','escalated'],['reopened','reopened']].map(([status,key]) => `<button class="btn small" data-action="complaint-status" data-id="${esc(complaint.id)}" data-status="${status}">${esc(t(key))}</button>`).join('')}</div>` : '';
  const body = `<div class="notice warn"><b>!</b><span>${esc(t('complaintDemoDisclosure'))}</span></div><div class="detail-grid"><div class="detail-cell"><small>${esc(t('reference'))}</small><strong>${esc(complaint.id)}</strong></div><div class="detail-cell"><small>${esc(t('client'))}</small><strong>${esc(customer?.name || complaint.customerId)}</strong></div><div class="detail-cell"><small>${esc(t('complaintCategory'))}</small><strong>${esc(complaint.category)}</strong></div><div class="detail-cell"><small>${esc(t('status'))}</small><strong>${badge(complaint.status)}</strong></div><div class="detail-cell"><small>${esc(t('priority'))}</small><strong>${esc(t(complaint.priority === 'high_demo' ? 'high' : 'standardDemo'))}</strong></div><div class="detail-cell"><small>${esc(t('complaintTarget'))}</small><strong>${esc(fmtDate(complaint.practiceTargetAt))} · illustrative</strong></div></div><div class="light-divider"></div><h3 class="section-label">${esc(complaint.subject)}</h3><p class="page-subtitle">${esc(complaint.message)}</p><div class="notice info" style="margin-top:12px"><b>i</b><span>${esc(complaint.acknowledgement || t('complaintLocalOnly'))}</span></div>${response}<div class="light-divider"></div><h3 class="section-label">${esc(t('complaintHistory'))}</h3><div class="timeline">${history}</div>${controls}`;
  openDrawer(`${complaint.id} · ${t('complaints')}`, `${customer?.name || complaint.customerId} · ${t('localSimulation')}`, body);
}

function openCase(caseId) {
  const item = state.cases.find(entry => entry.id === caseId);
  if (!item) return;
  const customer = customerById(item.customerId);
  const tx = state.transactions.find(entry => entry.id === item.transactionId);
  const caseActions = canReviewCompliance() ? `<div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" data-action="case-status" data-id="${esc(item.id)}" data-status="investigating">${esc(t('markInvestigating'))}</button><button class="btn" data-action="case-status" data-id="${esc(item.id)}" data-status="escalated">${esc(t('escalate'))}</button><button class="btn primary" data-action="case-status" data-id="${esc(item.id)}" data-status="closed">${esc(t('resolve'))}</button></div>` : `<div class="notice info"><b>i</b><span>${esc(t('roleReadOnly'))}</span></div>`;
  const body = `<div class="notice ${item.severity === 'high' ? 'danger' : 'info'}"><b>!</b><span>${esc(item.note)}</span></div><div class="detail-grid"><div class="detail-cell"><small>${esc(t('priority'))}</small><strong>${badge(item.severity)}</strong></div><div class="detail-cell"><small>${esc(t('score'))}</small><strong>${item.score} / 100</strong></div><div class="detail-cell"><small>${esc(t('status'))}</small><strong>${badge(item.status)}</strong></div><div class="detail-cell"><small>${esc(t('assigned'))}</small><strong>${esc(item.assignedTo || '—')}</strong></div><div class="detail-cell"><small>${esc(t('client'))}</small><strong>${esc(customer?.name || item.customerId)}</strong></div><div class="detail-cell"><small>${esc(t('transaction'))}</small><strong>${esc(tx ? `${tx.id} · ${currency(tx.amountCents)}` : '—')}</strong></div></div><div class="light-divider"></div><h3 class="section-label">${esc(item.title)}</h3><p class="page-subtitle">Rule: ${esc(item.ruleCode)} · opened ${esc(fmtDate(item.createdAt, true))}</p><div class="form-field" style="margin-top:13px"><label>${esc(t('note'))}</label><textarea id="caseReviewNote" placeholder="Record a synthetic review note"></textarea></div>${caseActions}<div class="notice danger" style="margin-top:13px"><b>!</b><span>Demo alert only. No real transaction is blocked, reported to the Croatian FIU, or screened against a live list.</span></div>`;
  openDrawer(item.id, `${item.title} · ${customer?.name || item.customerId}`, body);
}
function openSwiftDetails(id) {
  const item = state.swiftMessages.find(message => message.id === id);
  if (!item) return;
  const body = `<div class="notice danger"><b>!</b><span>${esc(t('swiftDisclaimer'))}</span></div><div class="detail-grid"><div class="detail-cell"><small>${esc(t('type'))}</small><strong>${esc(item.type)}</strong></div><div class="detail-cell"><small>${esc(t('status'))}</small><strong>${badge(item.status)}</strong></div><div class="detail-cell"><small>${esc(t('beneficiary'))}</small><strong>${esc(item.beneficiary)}</strong></div><div class="detail-cell"><small>${esc(t('bic'))}</small><strong class="mono">${esc(item.bic || '—')}</strong></div><div class="detail-cell"><small>${esc(t('amount'))}</small><strong>${esc(currency(item.amountCents, item.currency))}</strong></div><div class="detail-cell"><small>${esc(t('reference'))}</small><strong>${esc(item.reference)}</strong></div></div><h3 class="section-label" style="margin-top:16px">MT103 local preview · not sent</h3><pre class="swift-code">${esc(item.mt103 || `:20:${item.id}\n:23B:CRED\n:32A:DEMO\n:59:${item.beneficiary}\n:57A:${item.bic || 'TESTBICXXX'}`)}</pre>`;
  openDrawer(item.id, t('swiftDisclaimer'), body);
}
function openJournalDetails(id) {
  const journal = state.ledgerJournals.find(item => item.id === id);
  if (!journal) return;
  const lines = journal.lines.map(line => `<tr><td class="mono">${esc(line.accountCode)}</td><td>${esc(state.glAccounts.find(account => account.code === line.accountCode)?.name || '')}</td><td>${esc(line.debitCents ? currency(line.debitCents) : '—')}</td><td>${esc(line.creditCents ? currency(line.creditCents) : '—')}</td></tr>`);
  openDrawer(journal.id, journal.description, `<div class="detail-grid"><div class="detail-cell"><small>${esc(t('date'))}</small><strong>${esc(fmtDate(journal.at, true))}</strong></div><div class="detail-cell"><small>${esc(t('reference'))}</small><strong>${esc(journal.ref || '—')}</strong></div><div class="detail-cell"><small>${esc(t('debit'))} / ${esc(t('credit'))}</small><strong>${esc(currency(journal.debitCents))} = ${esc(currency(journal.creditCents))}</strong></div></div><div class="light-divider"></div>${tableShell([t('code'), t('account'), t('debit'), t('credit')], lines)}<div class="security-strip"><strong>${esc(t('cleared'))}</strong><span>Double-entry check: ${journal.debitCents === journal.creditCents ? 'PASS' : 'FAIL'}</span></div>`);
}
function openNotifications() {
  const openCases = state.cases.filter(item => item.status !== 'closed').length;
  const approvals = state.payments.filter(item => item.status === 'awaiting_approval').length + state.swiftMessages.filter(item => item.status === 'awaiting_approval').length + (state.walletTransfers || []).filter(item => item.status === 'awaiting_approval').length;
  const body = `<div class="timeline"><div class="timeline-item"><i class="timeline-dot warn"></i><div class="timeline-text"><strong>${openCases} synthetic AML cases need review</strong><small>Illustrative scenario alerts · no real screening</small></div><button class="panel-link" data-view="aml">Open →</button></div><div class="timeline-item"><i class="timeline-dot"></i><div class="timeline-text"><strong>${approvals} instructions in checker queue</strong><small>Payment / SWIFT drafts · offline only</small></div><button class="panel-link" data-view="payments">Review →</button></div><div class="timeline-item"><i class="timeline-dot"></i><div class="timeline-text"><strong>Local demo environment running</strong><small>All data stored in this browser profile</small></div><span class="badge success">OK</span></div></div>`;
  openDrawer(t('notifications') === 'notifications' ? 'Notifications' : t('notifications'), t('localSimulation'), body);
}
function toggleRole() {
  const index = STAFF_LEVELS.findIndex(role => role.id === state.settings.role);
  const role = STAFF_LEVELS[(index + 1 + STAFF_LEVELS.length) % STAFF_LEVELS.length];
  state.settings.role = role.id;
  state.settings.operator = role.operator;
  addAudit(state, 'Demo staff level switched', `Level ${role.level} · ${t(role.label)}; local-only simulation`);
  persist();
  toast(`${t('roleLevel')} ${role.level}: ${t(role.label)}`, 'success');
}
function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJson() {
  const snapshot = { ...state, exportedAt: new Date().toISOString(), demoOnly: true, documentBrand: DEMO_BRAND, disclaimer: 'Fictional local training data. Not a live bank, payment, identity, SWIFT, card, crypto or compliance system.' };
  downloadBlob('adria-bank-demo-scenario.json', JSON.stringify(snapshot, null, 2), 'application/json');
  toast(t('exportReady'));
}
function exportInteropLabJson() {
  const lab = ensureInteropLabState(state);
  const snapshot = {
    documentType: 'synthetic_interoperability_lab_export', documentBrand: DEMO_BRAND, generatedAt: new Date().toISOString(), demoOnly: true,
    disclaimer: t('interopBoundary'), systems: INTEROP_SYSTEMS, activeSystemId: lab.activeSystemId, bankConnectors: lab.bankConnectors, venues: lab.venues,
    runs: lab.runs, alerts: lab.alerts, disputes: lab.disputes, demoSessions: lab.demoSessions, killSwitch: lab.killSwitch,
    containsCustomerData: false, containsExternalMarketData: false, containsCredentials: false, containsRealIdentifiers: false
  };
  downloadBlob('adria-bank-demo-interoperability-lab.json', JSON.stringify(snapshot, null, 2), 'application/json');
  toast(t('exportReady'));
}
function exportCsv() {
  downloadBlob('adria-bank-demo-transactions.csv', '\ufeff' + exportAsCsv(state), 'text/csv;charset=utf-8');
  toast(t('exportReady'));
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `\"${text.replaceAll('\"', '\"\"')}\"`;
}
function exportStatementCsv(customerId = portalCustomerId) {
  const customer = customerById(customerId);
  if (!customer) return;
  const accounts = customerAccounts(customerId);
  const transactions = state.transactions.filter(tx => tx.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const rows = [
    ['document_type', 'fictional_demo_account_statement'],
    ['document_brand', DEMO_BRAND],
    ['demo_only', 'true'],
    ['customer_id', customer.id],
    ['customer_name', customer.name],
    ['customer_kind', customer.kind],
    ['created_at', new Date().toISOString()],
    [],
    ['account_id', 'account_label', 'country_code', 'demo_iban_or_domestic_id', 'demo_bic', 'currency', 'native_balance', 'routing_ready'],
    ...accounts.map(account => [account.id, account.label, account.countryCode || customer.country, account.iban || account.accountNumber, account.bic || createDemoBic(account.countryCode || customer.country), account.currency, (account.balanceCents / 100).toFixed(2), 'false']),
    [],
    ['transaction_id', 'date', 'account_id', 'type', 'direction', 'amount', 'currency', 'counterparty', 'reference', 'status', 'demo_only', 'document_brand'],
    ...transactions.map(tx => [tx.id, tx.date, tx.accountId, tx.type, tx.direction, (tx.amountCents / 100).toFixed(2), tx.currency, tx.counterparty, tx.reference, tx.status, 'true', DEMO_BRAND])
  ];
  downloadBlob(`adria-bank-demo-statement-${customer.id}.csv`, '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  toast(t('exportReady'));
}
function printCurrentPage() {
  const titleKey = ({ branches: 'branchesCash', atms: 'atmNetwork', aml: 'amlKyc', complaints: 'complaints', swift: 'swiftLab', portal: 'customerPortal', onboarding: 'onlineOnboarding', institutions: 'institutions', interop: 'interoperability', checker: 'localChecks', support: 'callCentre' })[currentView] || currentView;
  const clone = main.cloneNode(true);
  clone.querySelectorAll('.heading-actions, .panel-actions, .toolbar, .table-pager, button, input, select, textarea, form, .assistant-form, .toast').forEach(node => node.remove());
  openPrintDocument(t(titleKey), clone.innerHTML);
}
function handleSearchPopover(query) {
  if (!currentSearchPopover) {
    currentSearchPopover = document.createElement('div');
    currentSearchPopover.className = 'command-popover';
    currentSearchPopover.id = 'commandPopover';
    document.body.append(currentSearchPopover);
  }
  const value = query.trim().toLocaleLowerCase(locale());
  if (!value) { currentSearchPopover.innerHTML = `<div class="command-title">${esc(t('search'))} · ${esc(t('customers'))}, ${esc(t('accounts'))}, ${esc(t('transactionHistory'))}</div><div class="command-result"><span class="nav-icon">${icon('spark')}</span><span><strong>${esc(t('safeLearning'))}</strong><small>${esc(t('syntheticData'))}</small></span></div>`; return; }
  const results = [];
  state.customers.filter(customer => `${customer.id} ${customer.name} ${customer.city}`.toLocaleLowerCase(locale()).includes(value)).slice(0, 5).forEach(customer => results.push({ kind: 'customer', icon: 'users', title: customer.name, sub: `${customer.id} · ${customer.city}`, id: customer.id }));
  state.accounts.filter(account => `${account.id} ${account.iban}`.toLocaleLowerCase(locale()).includes(value)).slice(0, 4).forEach(account => results.push({ kind: 'account', icon: 'account', title: account.id, sub: `${customerById(account.customerId)?.name || ''} · ${currency(account.balanceCents)}`, id: account.customerId }));
  state.transactions.filter(tx => `${tx.id} ${tx.reference} ${tx.counterparty} ${txLabel(tx)}`.toLocaleLowerCase(locale()).includes(value)).slice(0, 4).forEach(tx => results.push({ kind: 'transaction', icon: 'payments', title: txLabel(tx), sub: `${tx.id} · ${currency(tx.amountCents)} · ${fmtDate(tx.date)}`, id: tx.customerId }));
  currentSearchPopover.innerHTML = `<div class="command-title">${results.length} ${esc(t('results'))} · ${esc(t('demoOnly'))}</div>${results.length ? results.map(result => `<button class="command-result" data-action="search-result" data-kind="${result.kind}" data-id="${esc(result.id)}"><span class="nav-icon">${icon(result.icon)}</span><span><strong>${esc(result.title)}</strong><small>${esc(result.sub)}</small></span></button>`).join('') : `<div class="empty-state">${esc(t('noRecords'))}</div>`}`;
}
function closeSearchPopover() { currentSearchPopover?.remove(); currentSearchPopover = null; }

function changeOnboardingStep(offset) {
  const form = modalRoot.querySelector('form[data-form="onboarding"]');
  if (!form) return false;
  const pages = [...form.querySelectorAll('[data-onboarding-step]')];
  const currentStep = Number(form.dataset.activeStep) || 1;
  const nextStep = Math.max(1, Math.min(pages.length, currentStep + offset));
  if (nextStep > currentStep) {
    const currentPage = pages.find(page => Number(page.dataset.onboardingStep) === currentStep);
    const invalid = [...(currentPage?.querySelectorAll('input, select, textarea') || [])].find(field => field.required && !field.checkValidity());
    if (invalid) { invalid.reportValidity?.(); invalid.focus(); return false; }
  }
  form.dataset.activeStep = String(nextStep);
  pages.forEach(page => {
    const active = Number(page.dataset.onboardingStep) === nextStep;
    page.hidden = !active;
    page.setAttribute('aria-hidden', String(!active));
  });
  form.querySelectorAll('[data-onboarding-progress]').forEach(step => {
    const number = Number(step.dataset.onboardingProgress);
    step.classList.toggle('active', number === nextStep);
    step.classList.toggle('complete', number < nextStep);
    if (number === nextStep) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
  const back = form.querySelector('[data-action="onboarding-back"]');
  const next = form.querySelector('[data-action="onboarding-next"]');
  const submit = form.querySelector('[data-action="onboarding-submit"]');
  if (back) back.hidden = nextStep === 1;
  if (next) next.hidden = nextStep === pages.length;
  if (submit) submit.hidden = nextStep !== pages.length;
  form.querySelector(`[data-onboarding-step="${nextStep}"] input:not([type="hidden"]):not([type="checkbox"]), [data-onboarding-step="${nextStep}"] select`)?.focus();
  return true;
}

function submitForm(form, event) {
  event.preventDefault();
  if (form.dataset.form === 'onboarding' && (Number(form.dataset.activeStep) || 1) < 3) { changeOnboardingStep(1); return; }
  const formType = form.dataset.form;
  if (formType === 'onboarding' && !form.checkValidity()) {
    const invalid = [...form.querySelectorAll('input, select, textarea')].find(field => field.required && !field.checkValidity());
    invalid?.reportValidity?.(); invalid?.focus();
    return;
  }
  const readOnlySafeForms = ['assistant-staff', 'assistant-customer', 'reference-check'];
  if (document.body.dataset.surface !== 'client' && currentView !== 'portal' && !canWrite() && !readOnlySafeForms.includes(formType)) { toast(t('roleReadOnly'), 'warning'); return; }
  const formData = new FormData(form);
  const get = key => formData.get(key);
  try {
    switch (form.dataset.form) {
      case 'onboarding': {
        const application = submitDemoOnboardingApplication(state, {
          customerId: get('customerId'), customerKind: get('customerKind'), countryCode: get('countryCode'),
          products: formData.getAll('products'), identityScenario: get('identityScenario'), screeningScenario: get('screeningScenario'),
          syntheticConfirmed: formData.get('syntheticConfirmed') === 'on', noRealDataConfirmed: formData.get('noRealDataConfirmed') === 'on'
        });
        closeModal(); persist(); toast(`${t('onboardingSubmitted')} · ${application.id}`); break;
      }
      case 'customer':
        createCustomer(state, { name: get('name'), kind: get('kind'), city: get('city'), country: get('country'), branchId: get('branchId'), email: get('email'), syntheticConfirmed: formData.get('syntheticConfirmed') === 'on' });
        closeModal(); persist(); toast(t('customerCreated')); break;
      case 'account':
        openAccount(state, get('customerId'), get('currency'));
        closeModal(); persist(); toast(t('accountOpened')); break;
      case 'transfer':
        createInternalTransfer(state, { fromAccountId: get('fromAccountId'), toAccountId: get('toAccountId'), amountCents: moneyToCents(get('amount')), reference: get('reference') });
        closeModal(); persist(); toast(t('transferSaved')); break;
      case 'account-conversion': {
        const details = conversionReferenceDetails(getAccount(state, get('fromAccountId'))?.currency, getAccount(state, get('toAccountId'))?.currency);
        convertBetweenAccounts(state, { fromAccountId: get('fromAccountId'), toAccountId: get('toAccountId'), amountCents: moneyToCents(get('amount')), referenceDate: details.referenceDate, source: details.source });
        closeModal(); persist(); toast(t('fxConversionComplete')); break;
      }
      case 'interbank-transfer': {
        const transfer = createInterbankTransfer(state, { fromAccountId: get('fromAccountId'), toAccountId: get('toAccountId'), amountCents: moneyToCents(get('amount')), reference: get('reference'), purpose: get('purpose') });
        closeModal(); persist(); toast(`${t('interbankQueued')} · ${transfer.id}`, 'warning'); break;
      }
      case 'support-ticket': {
        const ticket = createSupportTicket(state, { customerId: get('customerId'), category: get('category'), subject: get('subject'), message: get('message'), syntheticConfirmed: formData.get('syntheticConfirmed') === 'on' });
        closeModal(); persist(); toast(`${t('ticketCreated')} · ${ticket.id}`); break;
      }
      case 'assistant-staff':
      case 'assistant-customer': {
        const audience = form.dataset.form.endsWith('staff') ? 'staff' : 'customer';
        const customer = audience === 'customer' ? customerById(portalCustomerId) : null;
        const question = String(get('question') || '').trim();
        if (!question) break;
        const messages = assistantChat(audience, customer?.id || '');
        messages.push({ role: 'user', text: question });
        const context = { rateDate: fxReferenceData.ecb.rateDate, accountSummary: customer ? customerAccounts(customer.id).filter(account => account.status === 'active').map(account => `${account.currency} ${currency(account.balanceCents, account.currency)}`).join(' · ') : '' };
        messages.push({ role: 'assistant', text: localAssistantReply({ question, audience, context, language: state.settings.language }) });
        if (messages.length > 12) messages.splice(0, messages.length - 12);
        renderView();
        break;
      }
      case 'reference-check': {
        referenceCheckResult = verifyDemoReference(state, { type: get('type'), value: get('value') });
        renderView();
        break;
      }
      case 'payment':
        createExternalPayment(state, { accountId: get('accountId'), beneficiary: get('beneficiary'), country: get('country'), bic: get('bic'), iban: get('iban'), amountCents: moneyToCents(get('amount')), rail: get('rail'), reference: get('reference'), notes: get('notes') });
        closeModal(); persist(); toast(t('paymentQueued'), 'warning'); break;
      case 'incoming-payment':
        createIncomingPayment(state, { accountId: get('accountId'), sender: get('sender'), country: get('country'), amountCents: moneyToCents(get('amount')), rail: get('rail'), reference: get('reference'), notes: get('notes') });
        closeModal(); persist(); toast(t('paymentQueued'), 'warning'); break;
      case 'crypto-transfer': {
        const transfer = createCryptoTransfer(state, { customerId: get('customerId'), asset: get('asset'), units: get('units'), destination: get('destination') });
        closeModal(); persist(); toast(`${t('cryptoQueued')} · ${transfer.id}`, 'warning'); break;
      }
      case 'crypto-receipt': {
        const transfer = createCryptoReceipt(state, { customerId: get('customerId'), asset: get('asset'), units: get('units'), sender: get('sender') });
        closeModal(); persist(); toast(`${t('cryptoQueued')} · ${transfer.id}`, 'warning'); break;
      }
      case 'complaint': {
        const complaint = createComplaint(state, { customerId: get('customerId'), category: get('category'), subject: get('subject'), message: get('message'), priority: get('priority'), syntheticConfirmed: formData.get('syntheticConfirmed') === 'on' });
        closeModal(); persist(); toast(`${t('complaintCreated')} · ${complaint.id}`); break;
      }
      case 'kyc-request': {
        submitDemoKycRequest(state, get('customerId'), formData.get('syntheticConfirmed') === 'on', { sourceOfFunds: get('sourceOfFunds'), purpose: get('purpose'), expectedMonthlyBand: get('expectedMonthlyBand'), mockDocuments: formData.getAll('mockDocuments'), ownershipSectionReviewed: formData.get('ownershipSectionReviewed') === 'on', syntheticRiskScenario: get('riskScenario') });
        closeModal(); persist(); toast(t('kycRequestSaved'), 'warning'); break;
      }
      case 'cash':
        recordCashOperation(state, { operation: get('operation'), branchId: get('branchId'), accountId: get('accountId'), amountCents: moneyToCents(get('amount')) });
        closeModal(); persist(); toast(t('cashComplete')); break;
      case 'card':
        issueCard(state, { accountId: get('accountId'), product: get('product') });
        closeModal(); persist(); toast(t('cardCreated')); break;
      case 'card-controls':
        setCardControls(state, get('cardId'), {
          dailyLimitCents: moneyToCents(get('dailyLimit')), monthlyLimitCents: moneyToCents(get('monthlyLimit')),
          onlineEnabled: formData.get('onlineEnabled') === 'on',
          internationalEnabled: formData.get('internationalEnabled') === 'on',
          recurringEnabled: formData.get('recurringEnabled') === 'on'
        });
        closeModal(); persist(); toast(t('cardControlsSaved')); break;
      case 'card-load':
        loadPrepaidCard(state, get('cardId'), moneyToCents(get('amount')));
        closeModal(); persist(); toast(t('cardLoaded')); break;
      case 'card-purchase':
        simulateCardPurchase(state, {
          cardId: get('cardId'), amountCents: moneyToCents(get('amount')), merchant: get('merchant'),
          channel: get('channel'), international: formData.get('international') === 'on'
        });
        closeModal(); persist(); toast(t('cardPurchaseComplete')); break;
      case 'deposit':
        openSavingsDeposit(state, { accountId: get('accountId'), amountCents: moneyToCents(get('amount')), termMonths: Number(get('termMonths')) });
        closeModal(); persist(); toast(t('depositOpened')); break;
      case 'loan':
        createLoanApplication(state, { accountId: get('accountId'), amountCents: moneyToCents(get('amount')), termMonths: Number(get('termMonths')), product: get('product'), purpose: get('purpose') });
        closeModal(); persist(); toast(t('loanApplied'), 'warning'); break;
      case 'loan-repayment':
        makeLoanRepayment(state, { loanId: get('loanId'), accountId: get('accountId'), amountCents: moneyToCents(get('amount')) });
        closeModal(); persist(); toast(t('loanRepaid')); break;
      case 'atm':
        simulateAtmWithdrawal(state, { atmId: get('atmId'), accountId: get('accountId'), amountCents: moneyToCents(get('amount')) });
        closeModal(); persist(); toast(t('atmComplete')); break;
      case 'swift':
        createSwiftMessage(state, { accountId: get('accountId'), beneficiary: get('beneficiary'), country: get('country'), bank: get('bank'), bic: get('bic'), iban: get('iban'), amountCents: moneyToCents(get('amount')), purpose: get('purpose') });
        closeModal(); persist(); toast(t('swiftPrepared'), 'warning'); break;
      case 'exchange': {
        if (get('acknowledge') !== 'on') throw new Error(t('quoteDisclosure'));
        const trade = executeExchangeTrade(state, { accountId: get('accountId'), side: exchangeSide, asset: get('asset'), amount: Number(get('amount')) });
        persist(); toast(`${t('tradeComplete')} · ${trade.id}`); break;
      }
    }
  } catch (error) {
    toast(error.message || t('invalid'), 'error');
  }
}

function handleAction(actionElement, sourceEvent) {
  const action = actionElement.dataset.action;
  const id = actionElement.dataset.id;
  const displayedProfileId = document.getElementById('portalCustomerSelect')?.value;
  if (displayedProfileId && state.customers.some(customer => customer.id === displayedProfileId)) portalCustomerId = displayedProfileId;
  const writeActions = ['new-customer', 'new-account', 'new-account-for', 'transfer', 'new-payment', 'incoming-payment', 'cancel-payment', 'crypto-send', 'crypto-receive', 'cancel-crypto', 'new-complaint', 'cash-operation', 'issue-card', 'new-deposit', 'new-loan', 'repay-loan', 'atm-withdrawal', 'new-swift', 'mature-savings', 'card-status', 'card-controls', 'card-load', 'card-purchase', 'card-cancel', 'case-status', 'kyc-verify', 'kyc-edd', 'reconcile-atms', 'new-interbank', 'new-support-ticket', 'support-status', 'account-conversion', 'toggle-background-simulation', 'onboarding-status', 'interop-connector-toggle', 'interop-connector-refresh', 'interop-feature-run', 'interop-system-select', 'interop-reset'];
  const approvalActions = ['approve-loan', 'disburse-loan', 'approve-payment', 'approve-swift', 'approve-interbank', 'approve-crypto'];
  const complianceActions = ['case-status', 'kyc-verify', 'kyc-edd', 'complaint-status', 'onboarding-status'];
  if (document.body.dataset.surface !== 'client' && currentView !== 'portal' && writeActions.includes(action) && !canWrite()) { toast(t('roleReadOnly'), 'warning'); return; }
  if (approvalActions.includes(action) && !canApprove()) { toast(t('roleCheckerOnly'), 'warning'); return; }
  if (complianceActions.includes(action) && !canReviewCompliance()) { toast(t('roleComplianceOnly'), 'warning'); return; }
  if (action === 'reset-demo' && !canAdminister()) { toast(t('roleAdminOnly'), 'warning'); return; }
  try {
    switch (action) {
      case 'toggle-sidebar': $('#appShell').classList.toggle('sidebar-open'); break;
      case 'modal-close': closeModal(); break;
      case 'modal-scrim': if (sourceEvent.target === actionElement) closeModal(); break;
      case 'drawer-scrim': if (sourceEvent.target === actionElement) closeModal(); break;
      case 'portal-open-account': openModal('account', { customerId: portalCustomerId }); break;
      case 'portal-onboarding': openModal('onboarding', { customerId: portalCustomerId }); break;
      case 'onboarding-detail': openModal('onboarding-review', { applicationId: id }); break;
      case 'onboarding-next': changeOnboardingStep(1); break;
      case 'onboarding-back': changeOnboardingStep(-1); break;
      case 'onboarding-status': updateDemoOnboardingApplication(state, id, actionElement.dataset.status); persist(); toast(t('statusChanged')); break;
      case 'portal-kyc': openModal('kyc-request', { customerId: portalCustomerId }); break;
      case 'portal-transfer': openModal('transfer', { customerId: portalCustomerId }); break;
      case 'portal-convert': openModal('account-conversion', { customerId: portalCustomerId }); break;
      case 'portal-interbank': openModal('interbank-transfer', { customerId: portalCustomerId }); break;
      case 'portal-support': openModal('support-ticket', { customerId: portalCustomerId }); break;
      case 'portal-payment': openModal('payment', { customerId: portalCustomerId }); break;
      case 'portal-incoming': openModal('incoming-payment', { customerId: portalCustomerId }); break;
      case 'portal-crypto-send': openModal('crypto-transfer', { customerId: portalCustomerId }); break;
      case 'portal-crypto-receive': openModal('crypto-receipt', { customerId: portalCustomerId }); break;
      case 'portal-complaint': openModal('complaint', { customerId: portalCustomerId }); break;
      case 'new-complaint': openModal('complaint'); break;
      case 'new-payment': openModal('payment'); break;
      case 'incoming-payment': openModal('incoming-payment'); break;
      case 'portal-loan': openModal('loan', { customerId: portalCustomerId }); break;
      case 'portal-deposit': openModal('deposit', { customerId: portalCustomerId }); break;
      case 'portal-card': openModal('card', { customerId: portalCustomerId }); break;
      case 'card-controls': openModal('card-controls', { cardId: id, ...(document.body.dataset.surface === 'client' || currentView === 'portal' ? { customerId: portalCustomerId } : {}) }); break;
      case 'card-load': openModal('card-load', { cardId: id, ...(document.body.dataset.surface === 'client' || currentView === 'portal' ? { customerId: portalCustomerId } : {}) }); break;
      case 'card-purchase': openModal('card-purchase', { cardId: id || '', ...(document.body.dataset.surface === 'client' || currentView === 'portal' ? { customerId: portalCustomerId } : {}) }); break;
      case 'card-cancel': {
        const card = state.cards.find(item => item.id === id);
        if (!card || ((document.body.dataset.surface === 'client' || currentView === 'portal') && card.customerId !== portalCustomerId)) throw new Error(t('roleReadOnly'));
        openModal('confirm', { title: t('closeCard'), subtitle: t('localSimulation'), message: `${t('cardCancellationNote')} ${card.fundingType === 'prepaid' ? t('prepaidCancellationRefund') : ''}`, tone: 'danger', confirmLabel: t('closeCard'), onConfirm: () => { try { setCardStatus(state, id, 'cancelled'); closeModal(); persist(); toast(t('cardCancelled')); } catch (error) { closeModal(); toast(error.message, 'error'); } } });
        break;
      }
      case 'portal-exchange': exchangeCustomerId = portalCustomerId; exchangeTab = 'fx'; navigate('exchange'); break;
      case 'new-customer': openModal('customer'); break;
      case 'new-account': openModal('account'); break;
      case 'new-account-for': closeModal(); openModal('account', { customerId: id }); break;
      case 'account-conversion': openModal('account-conversion', (document.body.dataset.surface === 'client' || currentView === 'portal') ? { customerId: portalCustomerId } : exchangeCustomerId ? { customerId: exchangeCustomerId } : {}); break;
      case 'new-interbank': openModal('interbank-transfer'); break;
      case 'new-support-ticket': openModal('support-ticket'); break;
      case 'crypto-send': openModal('crypto-transfer'); break;
      case 'crypto-receive': openModal('crypto-receipt'); break;
      case 'local-checker': navigate('checker'); break;
      case 'refresh-fx': void refreshFxReferences(true); break;
      case 'fetch-market-reference': void refreshOptionalMarketFeed(); break;
      case 'clear-check-result': referenceCheckResult = null; renderView(); break;
      case 'assistant-prompt': {
        const audience = actionElement.dataset.audience === 'staff' ? 'staff' : 'customer';
        const customer = audience === 'customer' ? customerById(portalCustomerId) : null;
        const question = actionElement.dataset.question || '';
        const messages = assistantChat(audience, customer?.id || '');
        messages.push({ role: 'user', text: question });
        const context = { rateDate: fxReferenceData.ecb.rateDate, accountSummary: customer ? customerAccounts(customer.id).filter(account => account.status === 'active').map(account => `${account.currency} ${currency(account.balanceCents, account.currency)}`).join(' · ') : '' };
        messages.push({ role: 'assistant', text: localAssistantReply({ question, audience, context, language: state.settings.language }) });
        if (messages.length > 12) messages.splice(0, messages.length - 12);
        renderView();
        break;
      }
      case 'support-status': {
        const note = document.getElementById(`support-note-${id}`)?.value || '';
        updateSupportTicket(state, id, actionElement.dataset.status, note);
        persist(); toast(t('ticketUpdated')); break;
      }
      case 'transfer': openModal('transfer'); break;
      case 'cash-operation': openModal('cash'); break;
      case 'issue-card': openModal('card'); break;
      case 'new-deposit': openModal('deposit'); break;
      case 'new-loan': openModal('loan'); break;
      case 'repay-loan': openModal('loan-repayment', { loanId: id }); break;
      case 'approve-loan':
        openModal('confirm', { title: t('approveLoan'), subtitle: t('checkerRole'), message: t('approveLoanConfirm'), confirmLabel: t('approveLoan'), onConfirm: () => { try { approveLoanApplication(state, id); closeModal(); persist(); toast(t('loanApproved')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'disburse-loan':
        openModal('confirm', { title: t('disburseLoan'), subtitle: t('localSimulation'), message: t('disburseLoanConfirm'), confirmLabel: t('disburseLoan'), onConfirm: () => { try { disburseLoan(state, id); closeModal(); persist(); toast(t('loanDisbursed')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'atm-withdrawal': openModal('atm', { atmId: id }); break;
      case 'new-swift': openModal('swift'); break;
      case 'interop-tab': interopTab = actionElement.dataset.tab === 'ideas' ? 'ideas' : 'workbench'; renderView(); break;
      case 'interop-category': interopCategory = ['all', 'banking', 'payments', 'controls', 'crypto', 'operations'].includes(actionElement.dataset.category) ? actionElement.dataset.category : 'all'; renderView(); break;
      case 'interop-context-open': interopTab = 'workbench'; navigate('interop'); break;
      case 'interop-system-select': {
        const system = selectInteropSystem(state, id);
        interopCategory = 'all';
        persist();
        toast(`${t('interopSystemChanged')}: ${system.name}`, 'success');
        break;
      }
      case 'interop-connector-toggle': {
        const connector = toggleInteropConnector(state, id);
        persist();
        toast(`${connector.name} · ${t(connector.status === 'connected_demo' ? 'interopActive' : 'interopPaused')}`, 'success');
        break;
      }
      case 'interop-connector-refresh': {
        const connector = refreshInteropConnector(state, id);
        persist();
        toast(`${connector.name} · ${t('interopSnapshot')}`, 'success');
        break;
      }
      case 'interop-feature-run': {
        const run = runInteropFeature(state, id);
        persist();
        if (['audit-export', 'audit-evidence-pack', 'portability-kit'].includes(id)) exportInteropLabJson();
        toast(`${t('interopRunSuccess')}: ${state.settings.language === 'hr' ? run.summaryHr : run.summaryEn}`, 'success');
        break;
      }
      case 'interop-export': exportInteropLabJson(); break;
      case 'interop-reset':
        openModal('confirm', { title: t('interopReset'), subtitle: t('localOnly'), message: t('interopResetConfirm'), tone: 'warning', confirmLabel: t('interopReset'), onConfirm: () => { resetInteropLab(state); interopTab = 'workbench'; closeModal(); persist(); toast(t('interopReset'), 'success'); } });
        break;
      case 'reset-demo': openModal('confirm', { title: t('resetDemo'), message: t('resetConfirm'), tone: 'danger', confirmLabel: t('resetDemo'), onConfirm: () => { localStorage.removeItem(STORE_KEY); state = createDemoState(); ensureInteropLabState(state); portalCustomerId = state.accounts.find(account => account.status === 'active' && state.customers.find(customer => customer.id === account.customerId)?.kyc === 'verified')?.customerId || state.customers[0]?.id; exchangeCustomerId = null; currentView = 'overview'; closeModal(); persist(); toast(t('statusChanged')); } }); break;
      case 'confirm-pending': if (pendingConfirmation) pendingConfirmation(); break;
      case 'download-csv': exportCsv(); break;
      case 'export-json': exportJson(); break;
      case 'operator-menu': toggleRole(); break;
      case 'toggle-background-simulation': {
        state.settings.backgroundSimulationEnabled = state.settings.backgroundSimulationEnabled === false;
        persist();
        void syncBackgroundRuntime();
        toast(t(state.settings.backgroundSimulationEnabled ? 'backgroundStarted' : 'backgroundPausedToast'), state.settings.backgroundSimulationEnabled ? 'success' : 'warning');
        break;
      }
      case 'notifications': openNotifications(); break;
      case 'customer-open': openCustomer(id); break;
      case 'print-current': printCurrentPage(); break;
      case 'print-statement': printStatement(id || portalCustomerId, actionElement.dataset.accountId || ''); break;
      case 'export-statement': exportStatementCsv(id || portalCustomerId); break;
      case 'print-transaction': printTransaction(id); break;
      case 'print-payment': printPayment(id); break;
      case 'print-swift': printSwift(id); break;
      case 'case-open': openCase(id); break;
      case 'kyc-review': openKycDetails(id); break;
      case 'complaint-open': openComplaint(id); break;
      case 'swift-open': openSwiftDetails(id); break;
      case 'journal-open': openJournalDetails(id); break;
      case 'payment-tab': paymentTab = actionElement.dataset.tab; renderView(); break;
      case 'aml-tab': amlTab = actionElement.dataset.tab; renderView(); break;
      case 'exchange-tab': exchangeTab = actionElement.dataset.tab; renderView(); break;
      case 'exchange-side': exchangeSide = actionElement.dataset.side; renderView(); break;
      case 'approve-interbank':
        openModal('confirm', { title: t('simulateSettlement'), subtitle: t('checkerRole'), message: t('interbankSettlementConfirm'), confirmLabel: t('simulateSettlement'), onConfirm: () => { try { approveInterbankTransfer(state, id); closeModal(); persist(); toast(t('interbankSettled')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'approve-payment':
        openModal('confirm', { title: t('approve'), subtitle: t('checkerRole'), message: `${t('approvalNotice')} Payment ${id} will only change the fictional local ledger. No money is transmitted or received.`, confirmLabel: t('approve'), onConfirm: () => { try { approvePayment(state, id); closeModal(); persist(); toast(t('approvedNotice')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'cancel-payment': {
        const payment = state.payments.find(item => item.id === id);
        if (!payment || payment.direction !== 'out' || payment.status !== 'awaiting_approval') throw new Error(t('stopBeforeApproval'));
        if ((document.body.dataset.surface === 'client' || currentView === 'portal') && payment.customerId !== portalCustomerId) throw new Error(t('roleReadOnly'));
        openModal('confirm', { title: t('stopPayment'), subtitle: t('localSimulation'), message: `${t('stopBeforeApproval')} ${payment.id} is still in the local maker/checker queue.`, tone: 'danger', confirmLabel: t('stopPayment'), onConfirm: () => { try { cancelPayment(state, id); closeModal(); persist(); toast(t('statusChanged'), 'warning'); } catch (error) { closeModal(); toast(error.message, 'error'); } } });
        break;
      }
      case 'approve-crypto': {
        openModal('confirm', { title: t('approveCrypto'), subtitle: t('checkerRole'), message: `${t('digitalAssetNotice')} No wallet provider or blockchain is contacted.`, confirmLabel: t('approveCrypto'), onConfirm: () => { try { approveCryptoTransfer(state, id); closeModal(); persist(); toast(t('cryptoApproved')); } catch (error) { closeModal(); toast(error.message, 'error'); } } });
        break;
      }
      case 'cancel-crypto': {
        const transfer = (state.walletTransfers || []).find(item => item.id === id);
        if (!transfer || transfer.status !== 'awaiting_approval') throw new Error(t('cancelCrypto'));
        if ((document.body.dataset.surface === 'client' || currentView === 'portal') && transfer.customerId !== portalCustomerId) throw new Error(t('roleReadOnly'));
        openModal('confirm', { title: t('cancelCrypto'), subtitle: t('localSimulation'), message: `${t('digitalAssetNotice')} This only releases a local reservation or removes a pending receipt.`, tone: 'danger', confirmLabel: t('cancelCrypto'), onConfirm: () => { try { cancelCryptoTransfer(state, id); closeModal(); persist(); toast(t('cryptoCancelled'), 'warning'); } catch (error) { closeModal(); toast(error.message, 'error'); } } });
        break;
      }
      case 'approve-swift':
        openModal('confirm', { title: t('approve'), subtitle: t('checkerRole'), message: `${t('swiftDisclaimer')}. Approve the local rehearsal only?`, confirmLabel: t('approve'), onConfirm: () => { try { approveSwiftMessage(state, id); closeModal(); persist(); toast(t('approvedNotice')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'mature-savings':
        openModal('confirm', { title: t('mature'), message: 'This will move the principal and indicative interest to the linked synthetic current account. No real interest is earned.', confirmLabel: t('mature'), onConfirm: () => { try { matureSavingsDeposit(state, id); closeModal(); persist(); toast(t('statusChanged')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'card-status': {
        const card = state.cards.find(item => item.id === id);
        if (!card || ((document.body.dataset.surface === 'client' || currentView === 'portal') && card.customerId !== portalCustomerId)) throw new Error(t('roleReadOnly'));
        setCardStatus(state, id, actionElement.dataset.status); persist(); toast(t('statusChanged')); break;
      }
      case 'kyc-edd':
        openModal('confirm', { title: t('enhancedReviewDemo'), subtitle: t('localSimulation'), message: t('kycFlowDisclosure'), confirmLabel: t('enhancedReviewDemo'), onConfirm: () => { try { updateCustomerKyc(state, id, 'edd'); closeModal(); persist(); toast(t('statusChanged')); } catch (error) { closeModal(); toast(error.message, 'error'); } } }); break;
      case 'kyc-verify':
        openModal('confirm', { title: t('markVerified'), message: 'This only changes a fictional status field. It does not verify identity, beneficial ownership, PEP or sanctions.', confirmLabel: t('markVerified'), onConfirm: () => { updateCustomerKyc(state, id, 'verified'); closeModal(); persist(); toast(t('statusChanged')); } }); break;
      case 'case-status': {
        const note = $('#caseReviewNote')?.value || '';
        updateCaseStatus(state, id, actionElement.dataset.status, note); closeModal(); persist(); toast(t('caseUpdated')); break;
      }
      case 'complaint-status': {
        const note = $('#complaintReviewNote')?.value || '';
        updateComplaint(state, id, actionElement.dataset.status, note); closeModal(); persist(); toast(t('complaintUpdated')); break;
      }
      case 'reconcile-atms':
        addAudit(state, 'ATM balances reconciled (demo)', 'Synthetic ATM totals checked against simulated general ledger.');
        persist(); toast(t('statusChanged')); break;
      case 'page': {
        const name = actionElement.dataset.list;
        const target = filterState[name];
        if (!target) break;
        target.page = Math.max(1, target.page + (actionElement.dataset.dir === 'next' ? 1 : -1));
        renderView(); break;
      }
      case 'search-result':
        closeSearchPopover(); $('#globalSearch').value = '';
        if (actionElement.dataset.kind === 'customer' || actionElement.dataset.kind === 'transaction' || actionElement.dataset.kind === 'account') openCustomer(actionElement.dataset.id);
        break;
      case 'view-compliance': navigate('settings'); break;
      case 'modal-close': closeModal(); break;
    }
  } catch (error) { toast(error.message || t('invalid'), 'error'); }
}

// Main event delegation keeps the bundled UI offline and avoids remote scripts.
document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { event.preventDefault(); navigate(viewButton.dataset.view); return; }
  const actionElement = event.target.closest('[data-action]');
  if (actionElement) { handleAction(actionElement, event); return; }
  if (currentSearchPopover && !event.target.closest('#commandPopover') && !event.target.closest('#globalSearch')) closeSearchPopover();
});
document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]');
  if (form) submitForm(form, event);
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'globalSearch') { handleSearchPopover(input.value); return; }
  if (input.closest('#modalRoot form[data-form="account-conversion"]')) { updateAccountConversionQuote(); return; }
  if (input.id === 'exchangeAmount' || input.id === 'exchangeAsset') { updateExchangeQuote(); return; }
  if (input.matches('[data-filter-list][data-filter-field]')) {
    const listName = input.dataset.filterList;
    const field = input.dataset.filterField;
    if (filterState[listName]) {
      filterState[listName][field] = input.value;
      filterState[listName].page = 1;
      const position = input.selectionStart;
      const selector = `[data-filter-list="${listName}"][data-filter-field="${field}"]`;
      renderView();
      const next = $(selector);
      if (next) { next.focus(); try { next.setSelectionRange(position, position); } catch { /* select elements do not support selection */ } }
    }
  }
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'type' && input.closest('form[data-form="reference-check"]')) {
    const valueField = input.form?.elements?.value;
    if (valueField) valueField.inputMode = input.value === 'pan' ? 'numeric' : 'text';
    return;
  }
  if (input.matches('[data-demo-country]')) { updateDemoRoutingDisplay(input.closest('form')); return; }
  if (input.closest('#modalRoot form[data-form="account-conversion"]')) { updateAccountConversionQuote(); return; }
  if (input.id === 'backgroundInterval') {
    const interval = Number(input.value);
    if ([1, 5, 15, 60].includes(interval)) { state.settings.backgroundIntervalMinutes = interval; persist(false); void syncBackgroundRuntime(); renderView(); }
    return;
  }
  if (input.id === 'backgroundKeepInTray') {
    state.settings.keepRunningInTray = input.checked;
    if (!input.checked) state.settings.startWithWindows = false;
    persist(false); void syncBackgroundRuntime(); renderView(); return;
  }
  if (input.id === 'backgroundStartWithWindows') {
    state.settings.startWithWindows = input.checked && state.settings.keepRunningInTray && backgroundDesktopSupported;
    persist(false); void syncBackgroundRuntime(); renderView(); return;
  }
  if (input.id === 'portalCustomerSelect') { portalCustomerId = input.value; renderView(); return; }
  if (input.id === 'languageSelect' || input.id === 'settingsLanguage') {
    state.settings.language = input.value;
    persist(); return;
  }
  if (input.matches('[data-filter-list][data-filter-field]')) {
    const listName = input.dataset.filterList;
    const field = input.dataset.filterField;
    if (filterState[listName]) { filterState[listName][field] = input.value; filterState[listName].page = 1; renderView(); }
  }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && $('#globalSearch')) { event.preventDefault(); $('#globalSearch').focus(); $('#globalSearch').select(); }
  if (event.key === 'Escape') { closeSearchPopover(); if (modalRoot.childElementCount) closeModal(); }
});
window.addEventListener('hashchange', () => {
  const view = location.hash.slice(1);
  if (view && view !== currentView) navigate(view, false);
});

function updateAccountConversionQuote() {
  const box = $('#accountConversionQuote');
  if (!box) return;
  const form = box.closest('form[data-form="account-conversion"]');
  const from = state.accounts.find(account => account.id === form?.elements.fromAccountId?.value);
  const to = state.accounts.find(account => account.id === form?.elements.toAccountId?.value);
  const amount = Number(form?.elements.amount?.value || 0);
  if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
    box.innerHTML = `<div class="quote-box-row"><span>${esc(t('conversionRate'))}</span><strong>—</strong></div><div class="quote-box-row"><span>${esc(t('indicativeSpread'))}</span><strong>0.35%</strong></div><div class="quote-box-total"><span>${esc(t('indicativeOutput'))}</span><strong>—</strong></div>`;
    return;
  }
  if (from.currency === to.currency) {
    box.innerHTML = `<div class="quote-box-row"><span>${esc(t('conversionRate'))}</span><strong>${esc(t('conversionNeedDistinct'))}</strong></div><div class="quote-box-row"><span>${esc(t('indicativeSpread'))}</span><strong>0.35%</strong></div><div class="quote-box-total"><span>${esc(t('indicativeOutput'))}</span><strong>—</strong></div>`;
    return;
  }
  const sourceMeta = CURRENCIES[from.currency];
  const targetMeta = CURRENCIES[to.currency];
  if (!sourceMeta || !targetMeta || sourceMeta.crypto || targetMeta.crypto || !Number.isFinite(sourceMeta.eurRate) || sourceMeta.eurRate <= 0 || !Number.isFinite(targetMeta.eurRate) || targetMeta.eurRate <= 0) {
    box.innerHTML = `<div class="form-banner warn">${esc(t('noReferenceRate'))}</div>`;
    return;
  }
  try {
    const amountCents = moneyToCents(amount);
    const sourceEurCents = Math.round(amountCents * sourceMeta.eurRate);
    const quantumCents = 10 ** (2 - targetMeta.decimals);
    const targetCents = Math.floor((sourceEurCents * (1 - FX_SPREAD) / targetMeta.eurRate) / quantumCents) * quantumCents;
    const rate = sourceMeta.eurRate / targetMeta.eurRate;
    const rateText = `1 ${from.currency} ≈ ${new Intl.NumberFormat(locale(), { maximumFractionDigits: targetMeta.decimals ? 4 : 2 }).format(rate)} ${to.currency}`;
    box.innerHTML = `<div class="quote-box-row"><span>${esc(t('conversionRate'))}</span><strong>${esc(rateText)}</strong></div><div class="quote-box-row"><span>${esc(t('indicativeSpread'))}</span><strong>${(FX_SPREAD * 100).toFixed(2)}%</strong></div><div class="quote-box-total"><span>${esc(t('indicativeOutput'))}</span><strong>${esc(currency(targetCents, to.currency))}</strong></div>`;
  } catch { /* incomplete form input is normal */ }
}

function updateExchangeQuote() {
  const quoteBox = $('#exchangeQuote');
  if (!quoteBox) return;
  const asset = $('#exchangeAsset')?.value || (exchangeTab === 'fx' ? fiatAssets()[0] : digitalAssets()[0]);
  const raw = Number($('#exchangeAmount')?.value || 0);
  if (!raw || raw <= 0) {
    quoteBox.innerHTML = `<div class="quote-box-row"><span>${esc(t('indicativeRate'))}</span><strong>${esc(t('notLivePrice'))}</strong></div><div class="quote-box-row"><span>${esc(t('fee'))}</span><strong>—</strong></div><div class="quote-box-total"><span>${esc(t('expectedOutput'))}</span><strong>—</strong></div>`;
    return;
  }
  try {
    const quote = quoteExchange(asset, exchangeSide, raw);
    const assetRate = CURRENCIES[asset].eurRate;
    const quoteText = CURRENCIES[asset].crypto ? `1 ${asset} = ${currencyMajor(assetRate)} ` : `1 EUR = ${new Intl.NumberFormat(locale(), { maximumFractionDigits: asset === 'JPY' ? 2 : 4 }).format(1 / assetRate)} ${asset}`;
    const out = exchangeSide === 'buy' ? `${new Intl.NumberFormat(locale(), { maximumFractionDigits: CURRENCIES[asset].decimals }).format(quote.units)} ${asset}` : currencyMajor(quote.payoutEur);
    quoteBox.innerHTML = `<div class="quote-box-row"><span>${esc(t('indicativeRate'))}</span><strong>${esc(quoteText)}</strong></div><div class="quote-box-row"><span>${esc(t('fee'))} · ${(quote.spread * 100).toFixed(2)}%</span><strong>${esc(currencyMajor(quote.grossEur * quote.spread))}</strong></div><div class="quote-box-total"><span>${esc(t('expectedOutput'))}</span><strong>${esc(out)}</strong></div>`;
  } catch { /* incomplete input is expected while typing */ }
}

function initialize() {
  // If this is served as the separate exchange desk, begin directly on that module.
  const requested = new URLSearchParams(location.search).get('module') || location.hash.slice(1);
  if (requested && visibleNavGroups().some(group => group.items.some(([view]) => view === requested))) currentView = requested;
  updateStaticText();
  renderView();
  if (!localStorage.getItem(STORE_KEY) || languageFromEntry) { try { saveDemoState(state); } catch { /* storage can be disabled; session remains usable */ } }
  void refreshFxReferences(false);
  void syncBackgroundRuntime();
  setInterval(() => { void refreshFxReferences(false); }, 6 * 60 * 60 * 1000);
}
initialize();
