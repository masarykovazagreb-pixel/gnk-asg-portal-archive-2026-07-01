import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENCIES, PLANNED_MARKETS, DEMO_BRAND, createDemoState, createInternalTransfer, createExternalPayment, createIncomingPayment, cancelPayment, approvePayment, createDemoIban, createDemoBic, ibanMod97, validateIban, validateCardNumber, IBAN_TOTAL_LENGTHS,
  recordCashOperation, issueCard, setCardStatus, setCardControls, loadPrepaidCard, simulateCardPurchase, openSavingsDeposit, matureSavingsDeposit,
  createLoanApplication, approveLoanApplication, disburseLoan, makeLoanRepayment,
  executeExchangeTrade, simulateAtmWithdrawal, createSwiftMessage, approveSwiftMessage,
  updateCaseStatus, updateCustomerKyc, submitDemoKycRequest, createComplaint, updateComplaint, createCryptoTransfer, createCryptoReceipt, approveCryptoTransfer, cancelCryptoTransfer, exportAsCsv, isBalanced, totalCustomerDepositsCents,
  convertBetweenAccounts, createInterbankTransfer, approveInterbankTransfer, verifyDemoReference,
  createSupportTicket, updateSupportTicket, openAccount, loadDemoState, SCHEMA_VERSION, runBackgroundSimulationTick, submitDemoOnboardingApplication, updateDemoOnboardingApplication
} from '../src/core.mjs';

function activeEur(state, customerPredicate = () => true) {
  return state.accounts.find(account => account.currency === 'EUR' && account.status === 'active' && customerPredicate(state.customers.find(customer => customer.id === account.customerId)));
}
function byId(state, account) { return state.accounts.find(item => item.id === account.id); }

test('seed scenario contains at least 1,000 fictional customers and coherent synthetic history', () => {
  const state = createDemoState();
  assert.ok(state.customers.length >= 1000);
  assert.ok(state.accounts.length >= 120);
  assert.ok(state.transactions.length >= 1500);
  assert.equal(new Set(state.customers.map(customer => customer.id)).size, state.customers.length);
  assert.ok(state.customers.every(customer => customer.demoOnly && customer.email.endsWith('@adria.invalid')));
  assert.ok(state.transactions.every(transaction => transaction.demoOnly && transaction.amountCents > 0));
  assert.ok(state.transactions.some(transaction => transaction.type === 'atm'));
  assert.ok(state.transactions.some(transaction => transaction.type === 'cash_in'));
  assert.ok(state.transactions.some(transaction => transaction.type === 'sepa_out'));
  assert.equal(state.cases.length, 21);
  assert.ok(state.loans.length >= 40);
  assert.ok(state.loans.some(loan => loan.status === 'arrears'));
  assert.ok(state.loans.some(loan => loan.status === 'awaiting_approval'));
  assert.ok(state.loans.every(loan => loan.demoOnly && loan.principalCents > 0));
  const seededLoanBook = state.loans.filter(loan => ['performing', 'arrears'].includes(loan.status)).reduce((sum, loan) => sum + loan.outstandingCents, 0);
  assert.equal(state.glAccounts.find(account => account.code === '1100').balanceCents, seededLoanBook);
  assert.ok(totalCustomerDepositsCents(state) > 0);
});

test('legacy local snapshots reset to the expanded v5 schema with required demo directories', () => {
  const state = loadDemoState({ getItem: () => JSON.stringify({ schemaVersion: 4, customers: Array.from({ length: 1000 }, () => ({})) }) });
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.customers.length, 1000);
  assert.ok(Array.isArray(state.demoBanks));
  assert.ok(Array.isArray(state.supportTickets));
  assert.ok(Array.isArray(state.onboardingApplications));
  assert.equal(state.meta.nextOnboarding, 1);
  assert.equal(state.meta.companyLocation.city, 'Boulder');
  assert.ok(state.meta.companyLocation.demoOnly);
});

test('legacy Wilmington demo location is refreshed to the public listing without discarding synthetic local records', () => {
  const legacy = createDemoState();
  legacy.meta.headquarters = { city: 'Wilmington', region: 'Delaware', countryCode: 'US', demoOnly: true };
  delete legacy.meta.companyLocation;
  const customerCount = legacy.customers.length;
  const restored = loadDemoState({ getItem: () => JSON.stringify(legacy) });
  assert.equal(restored.customers.length, customerCount);
  assert.equal(restored.meta.companyLocation.city, 'Boulder');
  assert.equal(restored.meta.companyLocation.registryVerified, false);
  assert.equal('headquarters' in restored.meta, false);
});

test('background simulation can be paused locally and legacy preferences receive safe defaults', () => {
  const legacy = createDemoState();
  delete legacy.settings.backgroundSimulationEnabled;
  delete legacy.settings.backgroundIntervalMinutes;
  delete legacy.settings.keepRunningInTray;
  delete legacy.settings.startWithWindows;
  delete legacy.backgroundRuns;
  delete legacy.meta.backgroundSequence;
  delete legacy.meta.nextAudit;
  delete legacy.meta.nextJournal;
  const restored = loadDemoState({ getItem: () => JSON.stringify(legacy) });
  assert.equal(restored.settings.backgroundSimulationEnabled, true);
  assert.equal(restored.settings.backgroundIntervalMinutes, 5);
  assert.equal(restored.settings.keepRunningInTray, false);
  assert.equal(restored.settings.startWithWindows, false);
  assert.ok(Array.isArray(restored.backgroundRuns));
  assert.equal(restored.meta.backgroundSequence, 0);
});

test('background simulation produces a balanced, bounded local customer transfer and records a health tick', () => {
  const state = createDemoState();
  const beforeTransactions = state.transactions.length;
  const beforeDeposits = totalCustomerDepositsCents(state);
  const result = runBackgroundSimulationTick(state, { now: '2026-10-10T12:00:00.000Z' });
  assert.equal(result.updated, true);
  assert.equal(result.status, 'completed');
  assert.equal(result.demoOnly, true);
  assert.equal(result.ledgerBalanced, true);
  assert.equal(state.transactions.length, beforeTransactions + 2);
  assert.equal(totalCustomerDepositsCents(state), beforeDeposits);
  assert.ok(isBalanced(state));
  assert.equal(state.backgroundRuns[0].at, '2026-10-10T12:00:00.000Z');
  assert.equal(state.backgroundRuns[0].type, 'synthetic_internal_transfer');
  assert.equal(state.backgroundRuns[0].amountCents, result.amountCents);
  const previous = state.accounts.find(account => account.id === result.fromAccountId);
  const destination = state.accounts.find(account => account.id === result.toAccountId);
  assert.notEqual(previous.customerId, destination.customerId);
  state.settings.backgroundSimulationEnabled = false;
  const paused = runBackgroundSimulationTick(state);
  assert.equal(paused.updated, false);
  assert.equal(paused.status, 'paused');
  assert.equal(state.backgroundRuns.length, 1);
});

test('ten international locations remain planning-only concepts and are not open branches', () => {
  const state = createDemoState();
  assert.equal(PLANNED_MARKETS.length, 10);
  assert.equal(state.plannedMarkets.length, 10);
  assert.deepEqual(state.plannedMarkets.map(market => market.city), ['Zagreb', 'Frankfurt', 'Paris', 'Madrid', 'Zurich', 'London', 'Nairobi', 'Dubai', 'Tokyo', 'Singapore']);
  assert.ok(state.plannedMarkets.every(market => market.demoOnly && market.status === 'planning_only' && market.premisesOpened === false && market.authorisationGranted === false));
  assert.notEqual(state.branches.length, state.plannedMarkets.length);
});

test('GNKC is a synthetic demo asset with functional buy/sell accounting and no live-market representation', () => {
  const state = createDemoState();
  assert.equal(CURRENCIES.GNKC.demoToken, true);
  assert.equal(CURRENCIES.GNKC.crypto, true);
  assert.ok(CURRENCIES.GNKC.eurRate > 0);
  const initialWallet = state.wallets.find(wallet => wallet.asset === 'GNKC');
  assert.ok(initialWallet && initialWallet.units > 0);
  const originalWalletUnits = initialWallet.units;
  const account = activeEur(state, customer => customer?.id === initialWallet.customerId);
  const startBalance = account.balanceCents;
  const buy = executeExchangeTrade(state, { accountId: account.id, side: 'buy', asset: 'GNKC', amount: 30 });
  assert.equal(buy.asset, 'GNKC');
  assert.equal(buy.status, 'settled_simulation');
  assert.equal(account.balanceCents, startBalance - 3000);
  const wallet = state.wallets.find(item => item.customerId === account.customerId && item.asset === 'GNKC');
  assert.ok(wallet.units > originalWalletUnits);
  const unitsBeforeSell = wallet.units;
  const sell = executeExchangeTrade(state, { accountId: account.id, side: 'sell', asset: 'GNKC', amount: 20 });
  assert.equal(sell.asset, 'GNKC');
  assert.equal(sell.side, 'sell');
  assert.equal(account.balanceCents, startBalance - 3000 + sell.eurCents);
  assert.ok(wallet.units < unitsBeforeSell);
  assert.equal(state.glAccounts.find(gl => gl.code === '2300').balanceCents, state.wallets.reduce((sum, item) => sum + item.bookCents, 0));
  assert.ok(isBalanced(state));
});

test('every synthetic customer transaction balance is non-negative', () => {
  const state = createDemoState();
  assert.ok(state.transactions.filter(transaction => transaction.balanceAfterCents !== null).every(transaction => transaction.balanceAfterCents >= 0));
  assert.ok(state.accounts.every(account => account.balanceCents >= 0));
});

test('internal transfer debits and credits matching customer accounts and books a balanced journal', () => {
  const state = createDemoState();
  const from = activeEur(state);
  const to = state.accounts.find(account => account.currency === 'EUR' && account.status === 'active' && account.customerId !== from.customerId);
  const oldFrom = byId(state, from).balanceCents;
  const oldTo = byId(state, to).balanceCents;
  createInternalTransfer(state, { fromAccountId: from.id, toAccountId: to.id, amountCents: 2500 });
  assert.equal(byId(state, from).balanceCents, oldFrom - 2500);
  assert.equal(byId(state, to).balanceCents, oldTo + 2500);
  assert.equal(state.ledgerJournals.at(-1).debitCents, 2500);
  assert.equal(state.ledgerJournals.at(-1).creditCents, 2500);
  assert.ok(isBalanced(state));
});

test('insufficient internal transfer leaves all balances and journals untouched', () => {
  const state = createDemoState();
  const from = activeEur(state);
  const to = state.accounts.find(account => account.currency === 'EUR' && account.status === 'active' && account.id !== from.id);
  const beforeFrom = from.balanceCents;
  const beforeTo = to.balanceCents;
  assert.throws(() => createInternalTransfer(state, { fromAccountId: from.id, toAccountId: to.id, amountCents: beforeFrom + 1 }), /Insufficient/);
  assert.equal(from.balanceCents, beforeFrom);
  assert.equal(to.balanceCents, beforeTo);
  assert.equal(state.ledgerJournals.length, 0);
});

test('country-aware routing labels are always deliberately invalid and clearly marked DEMO', () => {
  const hr = createDemoIban('HR', 3);
  const gb = createDemoIban('GB', 41);
  assert.match(hr, /^HR00\d{17}$/);
  assert.match(gb, /^GB00\d{18}$/);
  assert.notEqual(ibanMod97(hr), 1);
  assert.notEqual(ibanMod97(gb), 1);
  assert.equal(createDemoBic('HR'), 'DEMOHR2XXXX');
  assert.equal(createDemoBic('GB'), 'DEMOGB2XXXX');
  assert.equal(createDemoIban('US', 1), null);
  assert.equal(DEMO_BRAND, 'DEMO DESKTOP ADRIA BANK');
});

test('IBAN format checking validates country length, BBAN shape and MOD-97 without making an account lookup', () => {
  const validHr = validateIban('HR12 1001 0051 8630 0016 0');
  const validGb = validateIban('GB82 WEST 1234 5698 7654 32');
  assert.equal(validHr.valid, true);
  assert.equal(validHr.status, 'format_checksum_only');
  assert.equal(validHr.length, IBAN_TOTAL_LENGTHS.HR);
  assert.equal(validGb.valid, true);
  assert.equal(validGb.country, 'GB');
  assert.equal(IBAN_TOTAL_LENGTHS.GB, 22);
  assert.equal(IBAN_TOTAL_LENGTHS.AE, 23);
  assert.match(createDemoIban('AE', 12), /^AE00\d{19}$/);
  assert.equal(validateIban('GB82 WEST 1234 5698 7654 33').status, 'checksum_invalid');
  assert.equal(validateIban('HR12 1001 0051 8630 0016').status, 'length_invalid');
  assert.equal(validateIban('HR12 ABCD 0051 8630 0016 0').status, 'format_invalid');
  assert.equal(validateIban('US12 1234 5678').status, 'country_unsupported');
  const state = createDemoState();
  const storedDemoIban = state.accounts.find(account => account.iban)?.iban;
  assert.equal(validateIban(storedDemoIban).valid, false, 'seeded demo identifiers remain deliberately invalid and non-routable');
});

test('card-number checking validates only length and Luhn and returns a masked value', () => {
  const valid = validateCardNumber('9999 9999 9999 9995');
  assert.equal(valid.valid, true);
  assert.equal(valid.status, 'luhn_format_only');
  assert.equal(valid.length, 16);
  assert.match(valid.masked, /9995$/);
  assert.ok(!valid.masked.includes('9999999999999995'), 'the full number is not retained in the result');
  assert.equal(validateCardNumber('9999 9999 9999 9994').status, 'checksum_invalid');
  assert.equal(validateCardNumber('4111-1111-111').status, 'length_invalid');
  assert.equal(validateCardNumber('4111 1111 1111 11x1').status, 'format_invalid');
  const state = createDemoState();
  const result = verifyDemoReference(state, { type: 'pan', value: '9999999999999995' });
  assert.equal(result.status, 'luhn_format_only');
  assert.ok(!JSON.stringify(result).includes('9999999999999995'));
  assert.match(result.note, /not saved or transmitted/);
});

test('virtual debit and prepaid card operations enforce local controls, limits, refunds and balanced ledgers', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified');
  const startingAccountBalance = account.balanceCents;
  const startingDeposits = totalCustomerDepositsCents(state);
  const startingGlDemand = state.glAccounts.find(item => item.code === '2000').balanceCents;
  const prepaid = issueCard(state, { accountId: account.id, product: 'prepaid' });
  assert.equal(prepaid.product, 'Adria Prepaid Virtual');
  assert.equal(prepaid.fundingType, 'prepaid');
  assert.equal(prepaid.formFactor, 'virtual');
  assert.equal(prepaid.prepaidBalanceCents, 0);
  assert.equal('pan' in prepaid, false);
  assert.equal('cvv' in prepaid, false);
  assert.equal(state.glAccounts.find(item => item.code === '2030').balanceCents, 0);

  const loaded = loadPrepaidCard(state, prepaid.id, 50000);
  assert.equal(loaded.card.prepaidBalanceCents, 50000);
  assert.equal(account.balanceCents, startingAccountBalance - 50000);
  assert.equal(state.glAccounts.find(item => item.code === '2000').balanceCents, startingGlDemand - 50000);
  assert.equal(state.glAccounts.find(item => item.code === '2030').balanceCents, 50000);
  assert.equal(totalCustomerDepositsCents(state), startingDeposits);
  assert.equal(loaded.transaction.type, 'card_load');

  const purchase = simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 1250, merchant: 'Demo Corner Shop', channel: 'in_person' });
  assert.equal(purchase.transaction.type, 'card_purchase');
  assert.equal(prepaid.prepaidBalanceCents, 48750);
  assert.equal(state.glAccounts.find(item => item.code === '2030').balanceCents, 48750);
  assert.equal(state.ledgerJournals.at(0).debitCents, 1250);
  assert.equal(state.ledgerJournals.at(0).creditCents, 1250);
  const balanceBeforeRejectedPurchase = prepaid.prepaidBalanceCents;
  assert.throws(() => simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 100, merchant: 'Demo Corner Shop', channel: 'in_person', international: true }), /International/);
  assert.equal(prepaid.prepaidBalanceCents, balanceBeforeRejectedPurchase);

  setCardControls(state, prepaid.id, { dailyLimitCents: 10000, monthlyLimitCents: 20000, onlineEnabled: false, internationalEnabled: true, recurringEnabled: false });
  assert.throws(() => simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 100, merchant: 'Demo Corner Shop', channel: 'online' }), /disabled/);
  assert.equal(prepaid.controls.internationalEnabled, true);
  assert.equal(prepaid.controls.recurringEnabled, false);
  const internationalPurchase = simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 8000, merchant: 'Demo Transit', channel: 'in_person', international: true });
  assert.equal(internationalPurchase.transaction.status, 'posted');
  const afterOnePurchase = prepaid.prepaidBalanceCents;
  assert.throws(() => simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 2500, merchant: 'Demo Transit', channel: 'in_person', international: true }), /daily limit/);
  assert.throws(() => simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 100, merchant: 'Demo Digital Service', channel: 'recurring' }), /Recurring/);
  assert.equal(prepaid.prepaidBalanceCents, afterOnePurchase);

  setCardStatus(state, prepaid.id, 'locked');
  assert.throws(() => simulateCardPurchase(state, { cardId: prepaid.id, amountCents: 100, merchant: 'Demo Transit' }), /active demo card/);
  setCardStatus(state, prepaid.id, 'active');
  const beforeCancel = prepaid.prepaidBalanceCents;
  const linkedBeforeRefund = account.balanceCents;
  setCardStatus(state, prepaid.id, 'cancelled');
  assert.equal(prepaid.prepaidBalanceCents, 0);
  assert.equal(account.balanceCents, linkedBeforeRefund + beforeCancel);
  assert.equal(state.glAccounts.find(item => item.code === '2030').balanceCents, 0);
  assert.equal(state.transactions[0].type, 'card_refund');
  assert.throws(() => setCardStatus(state, prepaid.id, 'active'), /cannot be reopened/);
  assert.ok(isBalanced(state));

  const debit = issueCard(state, { accountId: account.id, product: 'standard' });
  const beforeDebitPurchase = account.balanceCents;
  simulateCardPurchase(state, { cardId: debit.id, amountCents: 750, merchant: 'Demo Corner Shop', channel: 'online' });
  assert.equal(account.balanceCents, beforeDebitPurchase - 750);
  assert.ok(state.glAccounts.find(item => item.code === '2020').balanceCents > 42750000);
  assert.ok(isBalanced(state));
});

test('schema 6 card snapshots migrate to token-only card fields without dropping local records', () => {
  const legacy = createDemoState();
  const customerCount = legacy.customers.length;
  const card = legacy.cards[0];
  card.product = card.product.includes('Premium') ? 'Adria Premium Debit' : 'Adria Visa Debit';
  for (const key of ['fundingType', 'formFactor', 'monthlyLimitCents', 'spentTodayCents', 'spentMonthCents', 'spendingDay', 'spendingMonth', 'prepaidBalanceCents', 'controls']) delete card[key];
  legacy.schemaVersion = 6;
  legacy.glAccounts = legacy.glAccounts.filter(item => item.code !== '2030');
  const restored = loadDemoState({ getItem: () => JSON.stringify(legacy) });
  assert.equal(restored.schemaVersion, SCHEMA_VERSION);
  assert.equal(restored.customers.length, customerCount);
  assert.equal(restored.cards[0].formFactor, 'virtual');
  assert.equal(restored.cards[0].fundingType, 'debit');
  assert.ok(restored.cards[0].product.includes('Virtual'));
  assert.ok(restored.cards[0].controls);
  assert.equal(restored.glAccounts.find(item => item.code === '2030').balanceCents, 0);
});

test('external payment requires a second local approval before posting', () => {
  const state = createDemoState();
  const account = activeEur(state);
  const balance = account.balanceCents;
  const payment = createExternalPayment(state, { accountId: account.id, beneficiary: 'Demo Payee', amountCents: 1300, rail: 'sepa', reference: 'DEMO-PMT-1' });
  assert.equal(payment.status, 'awaiting_approval');
  assert.equal(account.balanceCents, balance);
  approvePayment(state, payment.id);
  assert.equal(payment.status, 'approved_simulation');
  assert.equal(account.balanceCents, balance - 1300);
  assert.ok(isBalanced(state));
});

test('queued external payments can be cancelled before approval but not after approval', () => {
  const state = createDemoState();
  const account = activeEur(state);
  const balance = account.balanceCents;
  const payment = createExternalPayment(state, { accountId: account.id, beneficiary: 'Fictional UK Payee', country: 'GB', amountCents: 4200 });
  assert.equal(payment.beneficiaryCountry, 'GB');
  assert.equal(payment.beneficiaryBic, 'DEMOGB2XXXX');
  assert.ok(payment.beneficiaryIban.startsWith('GB00'));
  assert.notEqual(ibanMod97(payment.beneficiaryIban), 1);
  cancelPayment(state, payment.id, 'Cancelled in training');
  assert.equal(payment.status, 'cancelled');
  assert.equal(account.balanceCents, balance);
  assert.throws(() => cancelPayment(state, payment.id), /queued demo payment/);
  const approved = createExternalPayment(state, { accountId: account.id, beneficiary: 'Fictional HR Payee', country: 'HR', amountCents: 1000 });
  approvePayment(state, approved.id);
  assert.throws(() => cancelPayment(state, approved.id), /queued demo payment/);
  assert.equal(account.balanceCents, balance - 1000);
  assert.ok(isBalanced(state));
});

test('fictional incoming payment is credited only after local checker review', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified');
  const before = account.balanceCents;
  const payment = createIncomingPayment(state, { accountId: account.id, sender: 'Synthetic Payer Ltd', country: 'KE', amountCents: 8250, reference: 'DEMO-IN-1' });
  assert.equal(payment.direction, 'in');
  assert.equal(payment.status, 'awaiting_approval');
  assert.equal(payment.senderBic, 'DEMOKE2XXXX');
  assert.match(payment.senderIban, /^DEMO-KE-/);
  assert.notEqual(payment.senderIban, 'KE00');
  assert.notEqual(ibanMod97(payment.senderIban), 1);
  assert.equal(account.balanceCents, before);
  approvePayment(state, payment.id);
  assert.equal(payment.status, 'settled_simulation');
  assert.equal(account.balanceCents, before + 8250);
  assert.match(payment.notes, /no funds arrived/);
  assert.ok(isBalanced(state));
});

test('teller deposit and withdrawal update cash, customer balance and balanced journals', () => {
  const state = createDemoState();
  const account = activeEur(state);
  const branch = state.branches[0];
  const oldAccount = account.balanceCents;
  const oldCash = branch.cashCents;
  recordCashOperation(state, { accountId: account.id, branchId: branch.id, operation: 'deposit', amountCents: 4000 });
  assert.equal(account.balanceCents, oldAccount + 4000);
  assert.equal(branch.cashCents, oldCash + 4000);
  recordCashOperation(state, { accountId: account.id, branchId: branch.id, operation: 'withdrawal', amountCents: 1500 });
  assert.equal(account.balanceCents, oldAccount + 2500);
  assert.equal(branch.cashCents, oldCash + 2500);
  assert.equal(state.ledgerJournals.length, 2);
  assert.ok(isBalanced(state));
});

test('term savings placement and simulated maturity return principal plus indicative interest', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified');
  const before = account.balanceCents;
  const deposit = openSavingsDeposit(state, { accountId: account.id, amountCents: 10000, termMonths: 12 });
  assert.equal(account.balanceCents, before - 10000);
  const interest = Math.round(10000 * deposit.annualRateBps / 10000);
  matureSavingsDeposit(state, deposit.id);
  assert.equal(account.balanceCents, before + interest);
  assert.equal(deposit.status, 'matured_simulation');
  assert.ok(isBalanced(state));
});

test('credit application, separate checker approval and simulated disbursement post balanced loan journals', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified' && customer?.risk !== 'high');
  const beforeBalance = account.balanceCents;
  const beforeLoanBook = state.glAccounts.find(item => item.code === '1100').balanceCents;
  const loan = createLoanApplication(state, { accountId: account.id, amountCents: 250000, termMonths: 24, product: 'Personal loan', purpose: 'Synthetic test purpose' });
  assert.equal(loan.status, 'awaiting_approval');
  assert.equal(account.balanceCents, beforeBalance);
  assert.equal(state.glAccounts.find(item => item.code === '1100').balanceCents, beforeLoanBook);
  assert.throws(() => disburseLoan(state, loan.id), /approved/);
  approveLoanApplication(state, loan.id);
  assert.equal(loan.status, 'approved_undisbursed');
  assert.equal(account.balanceCents, beforeBalance);
  assert.equal(state.ledgerJournals.length, 0);
  disburseLoan(state, loan.id);
  assert.equal(loan.status, 'performing');
  assert.equal(loan.outstandingCents, 250000);
  assert.equal(account.balanceCents, beforeBalance + 250000);
  assert.equal(state.glAccounts.find(item => item.code === '1100').balanceCents, beforeLoanBook + 250000);
  assert.throws(() => disburseLoan(state, loan.id), /approved/);
  assert.ok(isBalanced(state));
});

test('loan repayment splits indicative interest and principal, protects balances on invalid input', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified' && customer?.risk !== 'high');
  const loan = createLoanApplication(state, { accountId: account.id, amountCents: 250000, termMonths: 24 });
  approveLoanApplication(state, loan.id);
  disburseLoan(state, loan.id);
  const beforeBalance = account.balanceCents;
  const beforeOutstanding = loan.outstandingCents;
  const beforeJournalCount = state.ledgerJournals.length;
  const monthlyInterest = Math.round(beforeOutstanding * loan.annualRateBps / 10000 / 12);
  assert.throws(() => makeLoanRepayment(state, { loanId: loan.id, accountId: account.id, amountCents: beforeOutstanding + monthlyInterest + 1 }), /exceeds/);
  assert.equal(account.balanceCents, beforeBalance);
  assert.equal(loan.outstandingCents, beforeOutstanding);
  assert.equal(state.ledgerJournals.length, beforeJournalCount);
  const paymentCents = 10000;
  const interestCents = Math.min(paymentCents, Math.round(beforeOutstanding * loan.annualRateBps / 10000 / 12));
  const principalCents = paymentCents - interestCents;
  makeLoanRepayment(state, { loanId: loan.id, accountId: account.id, amountCents: paymentCents });
  assert.equal(account.balanceCents, beforeBalance - paymentCents);
  assert.equal(loan.outstandingCents, beforeOutstanding - principalCents);
  assert.equal(state.glAccounts.find(item => item.code === '1100').balanceCents, state.loans.filter(item => ['performing', 'arrears'].includes(item.status)).reduce((sum, item) => sum + item.outstandingCents, 0));
  assert.equal(state.glAccounts.find(item => item.code === '4100').balanceCents, interestCents);
  assert.ok(isBalanced(state));
});

test('loan application enforces verified low-risk customers, supported terms and bounded amounts', () => {
  const state = createDemoState();
  const verified = activeEur(state, customer => customer?.kyc === 'verified' && customer?.risk !== 'high');
  const beforeLoans = state.loans.length;
  assert.throws(() => createLoanApplication(state, { accountId: verified.id, amountCents: 99999, termMonths: 24 }), /between EUR/);
  assert.throws(() => createLoanApplication(state, { accountId: verified.id, amountCents: 200000, termMonths: 18 }), /term/);
  assert.equal(state.loans.length, beforeLoans);
  const pending = state.customers.find(customer => customer.kyc !== 'verified');
  const pendingAccount = state.accounts.find(item => item.customerId === pending.id && item.currency === 'EUR' && item.status === 'active');
  assert.throws(() => createLoanApplication(state, { accountId: pendingAccount.id, amountCents: 200000, termMonths: 24 }), /verified/);
  assert.equal(state.loans.length, beforeLoans);
});

test('offline exchange supports synthetic buy and sell with balanced double-entry postings', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified');
  const balance = account.balanceCents;
  const buy = executeExchangeTrade(state, { accountId: account.id, side: 'buy', asset: 'USD', amount: 25 });
  assert.equal(buy.status, 'settled_simulation');
  assert.ok(buy.units > 0);
  assert.equal(account.balanceCents, balance - 2500);
  const wallet = state.wallets.find(item => item.customerId === account.customerId && item.asset === 'USD');
  assert.ok(wallet.units > 0);
  executeExchangeTrade(state, { accountId: account.id, side: 'sell', asset: 'USD', amount: Math.min(1, wallet.units) });
  assert.ok(isBalanced(state));
  assert.ok(state.ledgerJournals.every(journal => journal.debitCents === journal.creditCents));
});

test('ATM withdrawal is rejected at offline machines and updates the demo position at online machines', () => {
  const state = createDemoState();
  const account = activeEur(state);
  const offline = state.atms.find(atm => atm.status !== 'online');
  assert.throws(() => simulateAtmWithdrawal(state, { atmId: offline.id, accountId: account.id, amountCents: 1000 }), /online/);
  const atm = state.atms.find(item => item.status === 'online');
  const before = account.balanceCents;
  simulateAtmWithdrawal(state, { atmId: atm.id, accountId: account.id, amountCents: 1000 });
  assert.equal(account.balanceCents, before - 1000);
  assert.ok(isBalanced(state));
});

test('SWIFT-shaped instruction validates a test BIC, queues approval and never sends externally', () => {
  const state = createDemoState();
  const account = activeEur(state);
  const before = account.balanceCents;
  assert.throws(() => createSwiftMessage(state, { accountId: account.id, beneficiary: 'Demo Payee', bic: 'bad', amountCents: 1000 }), /BIC/);
  const message = createSwiftMessage(state, { accountId: account.id, beneficiary: 'Demo Payee', country: 'GB', bic: createDemoBic('GB'), amountCents: 1000, purpose: 'Demo invoice' });
  assert.equal(message.status, 'awaiting_approval');
  assert.match(message.mt103, /:57A:DEMOGB2XXXX/);
  assert.equal(message.beneficiaryCountry, 'GB');
  assert.notEqual(ibanMod97(message.beneficiaryIban), 1);
  assert.equal(account.balanceCents, before);
  approveSwiftMessage(state, message.id);
  assert.equal(account.balanceCents, before - 1000);
  assert.equal(message.status, 'approved_simulation');
  assert.match(message.note, /not transmitted/);
  assert.ok(isBalanced(state));
});

test('KYC/case state changes remain explicitly local and export is synthetic', () => {
  const state = createDemoState();
  const customer = state.customers.find(item => item.kyc !== 'verified');
  updateCustomerKyc(state, customer.id, 'verified');
  assert.equal(customer.kyc, 'verified');
  const amlCase = state.cases[0];
  updateCaseStatus(state, amlCase.id, 'investigating', 'Synthetic review note');
  assert.equal(amlCase.status, 'investigating');
  assert.equal(amlCase.reviewNote, 'Synthetic review note');
  const csv = exportAsCsv(state);
  assert.match(csv, /"transaction_id","date","customer_id"/);
  assert.match(csv, /true/);
  assert.match(csv, /DEMO DESKTOP ADRIA BANK/);
  const account = state.accounts.find(item => item.customerId === customer.id);
  const filtered = exportAsCsv(state, { customerId: customer.id, accountId: account.id });
  assert.match(filtered, new RegExp(account.id));
  assert.doesNotMatch(filtered, /C-2026-(?:0001|0002|0003)/);
});

test('KYC rehearsal stores only fixed fictional categories and review checklist states', () => {
  const state = createDemoState();
  const customer = state.customers.find(item => item.kind === 'business' && item.kyc !== 'verified');
  assert.ok(customer);
  const request = submitDemoKycRequest(state, customer.id, true, {
    sourceOfFunds: 'business_revenue', purpose: 'business_operations', expectedMonthlyBand: '10k_50k',
    mockDocuments: ['synthetic_register_sample', 'synthetic_ownership_chart'], ownershipSectionReviewed: true,
    syntheticRiskScenario: 'enhanced_review_demo'
  });
  assert.equal(request.kyc, 'pending');
  assert.equal(request.kycRequest.status, 'pending');
  assert.equal(request.kycRequest.ownershipSectionReviewed, true);
  assert.equal(request.kycRequest.mockDocuments.length, 2);
  assert.equal(request.kycRequest.syntheticRiskScenario, 'enhanced_review_demo');
  assert.equal(Object.hasOwn(request.kycRequest, 'identityNumber'), false);
  updateCustomerKyc(state, customer.id, 'edd');
  assert.equal(request.kycRequest.status, 'edd');
  assert.throws(() => submitDemoKycRequest(state, customer.id, true, { sourceOfFunds: 'real_bank_account_123456789012', purpose: 'daily_personal' }), /fictional KYC/);
});

test('online onboarding rehearsal stores only fixed synthetic selections and never creates accounts or verifies identity', () => {
  const state = createDemoState();
  const customer = state.customers.find(item => item.kind === 'personal');
  const before = { customers: state.customers.length, accounts: state.accounts.length, transactions: state.transactions.length, payments: state.payments.length, cards: state.cards.length };
  const application = submitDemoOnboardingApplication(state, {
    customerId: customer.id, customerKind: customer.kind, countryCode: 'HR', products: ['personal_account', 'multi_currency', 'virtual_debit'],
    identityScenario: 'manual_review_demo', screeningScenario: 'possible_match_demo', syntheticConfirmed: true, noRealDataConfirmed: true
  });
  assert.equal(application.id, 'ONB-00001');
  assert.equal(application.status, 'submitted_demo');
  assert.equal(application.reviewPath, 'enhanced_review_demo');
  assert.equal(application.demoOnly, true);
  assert.equal(application.identityScenario, 'manual_review_demo');
  assert.equal(application.screeningScenario, 'possible_match_demo');
  assert.equal('identityNumber' in application, false);
  assert.equal('document' in application, false);
  assert.equal('email' in application, false);
  assert.deepEqual({ customers: state.customers.length, accounts: state.accounts.length, transactions: state.transactions.length, payments: state.payments.length, cards: state.cards.length }, before);
  assert.match(JSON.stringify(application), /no personal identifiers, identity documents, biometrics or external checks were collected/i);
  assert.throws(() => submitDemoOnboardingApplication(state, { customerId: customer.id, customerKind: customer.kind, countryCode: 'HR', products: ['personal_account'], identityScenario: 'test_pass_demo', screeningScenario: 'clear_demo', syntheticConfirmed: true }), /Confirm/);
  assert.throws(() => submitDemoOnboardingApplication(state, { customerId: customer.id, customerKind: 'business', countryCode: 'HR', products: ['personal_account'], identityScenario: 'test_pass_demo', screeningScenario: 'clear_demo', syntheticConfirmed: true, noRealDataConfirmed: true }), /must match/);
  assert.throws(() => submitDemoOnboardingApplication(state, { customerId: customer.id, customerKind: customer.kind, countryCode: 'US', products: ['personal_account'], identityScenario: 'test_pass_demo', screeningScenario: 'clear_demo', syntheticConfirmed: true, noRealDataConfirmed: true }), /planning-only/);
  assert.throws(() => submitDemoOnboardingApplication(state, { customerId: customer.id, customerKind: customer.kind, countryCode: 'HR', products: ['business_account'], identityScenario: 'test_pass_demo', screeningScenario: 'clear_demo', syntheticConfirmed: true, noRealDataConfirmed: true }), /cannot request/);
  updateDemoOnboardingApplication(state, application.id, 'needs_info_demo');
  assert.equal(application.status, 'needs_info_demo');
  updateDemoOnboardingApplication(state, application.id, 'reviewed_demo');
  assert.equal(application.status, 'reviewed_demo');
  assert.ok(application.history.length >= 3);
  assert.match(application.history.at(-1).note, /no account was opened/);
  assert.throws(() => updateDemoOnboardingApplication(state, application.id, 'closed_demo'), /no longer available/);
  assert.throws(() => updateDemoOnboardingApplication(state, 'ONB-99999', 'reviewed_demo'), /not found/);
});

test('local customer complaints support guarded creation, status history, escalation and response preview', () => {
  const state = createDemoState();
  const customer = state.customers.find(item => item.kyc === 'verified');
  const complaint = createComplaint(state, {
    customerId: customer.id, category: 'Payments', subject: 'Synthetic transfer timing',
    message: 'A fictional demo transfer appears later than the sample schedule.', priority: 'high', syntheticConfirmed: true
  });
  assert.equal(complaint.status, 'received');
  assert.equal(complaint.priority, 'high_demo');
  assert.match(complaint.acknowledgement, /no email/);
  assert.equal(complaint.demoOnly, true);
  updateComplaint(state, complaint.id, 'investigating', 'Reviewing the fictional ledger entries.');
  updateComplaint(state, complaint.id, 'response_ready', 'The local rehearsal is complete; no external payment occurred.');
  assert.equal(complaint.customerVisibleResponse, 'The local rehearsal is complete; no external payment occurred.');
  assert.equal(complaint.history.length, 3);
  assert.throws(() => createComplaint(state, { customerId: customer.id, subject: 'Account problem', message: 'Card number 4111 1111 1111 1111 is here in demo text.', syntheticConfirmed: true }), /Do not enter real account/);
  assert.throws(() => updateComplaint(state, complaint.id, 'resolved', 'Password: sensitive'), /Do not enter real account/);
});

test('local crypto send, receipt, cancellation and checker approval are balanced and never broadcast', () => {
  const state = createDemoState();
  const wallet = state.wallets.find(item => item.asset === 'BTC' && item.units > 0);
  const customer = state.customers.find(item => item.id === wallet.customerId);
  assert.equal(customer.kyc, 'verified');
  const units = 0.001;
  const originalUnits = wallet.units;
  const pending = createCryptoTransfer(state, { customerId: customer.id, asset: 'BTC', units, destination: 'DEMO-WALLET-RECIPIENT-01' });
  assert.equal(pending.status, 'awaiting_approval');
  assert.equal(wallet.units, originalUnits);
  assert.equal(wallet.reservedUnits, units);
  assert.throws(() => createCryptoTransfer(state, { customerId: customer.id, asset: 'BTC', units: 0.001, destination: 'bc1q-real-looking-address' }), /DEMO-WALLET/);
  cancelCryptoTransfer(state, pending.id);
  assert.equal(pending.status, 'cancelled');
  assert.equal(wallet.reservedUnits, 0);
  const send = createCryptoTransfer(state, { customerId: customer.id, asset: 'BTC', units, destination: 'DEMO-WALLET-RECIPIENT-02' });
  approveCryptoTransfer(state, send.id);
  assert.equal(send.status, 'approved_simulation');
  assert.equal(wallet.units, Number((originalUnits - units).toFixed(8)));
  const receipt = createCryptoReceipt(state, { customerId: customer.id, asset: 'BTC', units: 0.0005, sender: 'DEMO-WALLET-SENDER-01' });
  assert.equal(receipt.status, 'awaiting_approval');
  approveCryptoTransfer(state, receipt.id);
  assert.equal(receipt.status, 'settled_simulation');
  assert.equal(wallet.units, Number((originalUnits - units + 0.0005).toFixed(8)));
  assert.match(receipt.network, /no blockchain/);
  assert.ok(isBalanced(state));
});

test('headquarters, branches and ten planned markets carry locally appropriate jurisdiction metadata', () => {
  const state = createDemoState();
  assert.deepEqual({ street: state.meta.companyLocation.street, city: state.meta.companyLocation.city, region: state.meta.companyLocation.region, postalCode: state.meta.companyLocation.postalCode }, { street: '1942 Broadway, Ste 314C', city: 'Boulder', region: 'Colorado', postalCode: '80302' });
  assert.equal(state.meta.companyLocation.status, 'public_listing_only');
  assert.equal(state.meta.companyLocation.registryVerified, false);
  assert.equal(state.meta.companyLocation.incorporationState, null);
  assert.equal(state.customers.length >= 1000, true);
  assert.ok(state.branches.every(branch => branch.countryCode === 'HR' && branch.currency === 'EUR' && branch.language === 'hr' && branch.demoOnly));
  assert.deepEqual(state.plannedMarkets.map(market => market.currency), ['EUR', 'EUR', 'EUR', 'EUR', 'CHF', 'GBP', 'KES', 'AED', 'JPY', 'SGD']);
  assert.deepEqual(state.plannedMarkets.map(market => market.language), ['hr', 'de', 'fr', 'es', 'de', 'en', 'sw', 'ar', 'ja', 'zh']);
  assert.ok(state.plannedMarkets.every(market => market.status === 'planning_only' && !market.authorisationGranted && !market.premisesOpened));
  assert.ok(state.accounts.length >= state.customers.length);
  assert.ok(state.accounts.every(account => account.accountNumber?.startsWith('DEMO-') && account.demoOnly && account.routingReady === false));
  for (const account of state.accounts) {
    assert.equal(account.bic, createDemoBic(account.countryCode));
    if (account.iban) { assert.match(account.iban, new RegExp(`^${account.countryCode}\\d{2}`)); assert.notEqual(ibanMod97(account.iban), 1); }
    else assert.match(account.accountNumber, new RegExp(`^DEMO-${account.countryCode}-`));
  }
});

test('same-customer fiat account conversion uses reference metadata and balances the local ledger', () => {
  const state = createDemoState();
  const from = state.accounts.find(account => account.currency === 'EUR' && account.status === 'active' && state.customers.find(customer => customer.id === account.customerId)?.kyc === 'verified' && state.accounts.some(other => other.customerId === account.customerId && other.currency === 'USD' && other.status === 'active'));
  const to = state.accounts.find(account => account.customerId === from.customerId && account.currency === 'USD');
  const sourceBefore = from.balanceCents;
  const destinationBefore = to.balanceCents;
  const conversion = convertBetweenAccounts(state, { fromAccountId: from.id, toAccountId: to.id, amountCents: 10000, referenceDate: '2026-10-09', source: 'ECB daily reference sample' });
  assert.equal(conversion.status, 'settled_simulation');
  assert.equal(conversion.fromCurrency, 'EUR');
  assert.equal(from.balanceCents, sourceBefore - 10000);
  assert.ok(to.balanceCents > destinationBefore);
  assert.equal(conversion.referenceDate, '2026-10-09');
  assert.equal(conversion.source, 'ECB daily reference sample');
  assert.ok(isBalanced(state));
  const otherCustomer = state.customers.find(customer => customer.id !== from.customerId && customer.kyc === 'verified');
  const otherAccount = openAccount(state, otherCustomer.id, 'USD');
  assert.throws(() => convertBetweenAccounts(state, { fromAccountId: from.id, toAccountId: otherAccount.id, amountCents: 100 }), /same demo customer/);
});

test('customer can open KES and AED sample accounts but crypto is not an account currency', () => {
  const state = createDemoState();
  const customer = state.customers.find(item => item.kyc === 'verified');
  const kes = openAccount(state, customer.id, 'KES');
  const aed = openAccount(state, customer.id, 'AED');
  assert.equal(kes.currency, 'KES');
  assert.equal(aed.currency, 'AED');
  assert.ok(kes.accountNumber.startsWith('DEMO-'));
  assert.throws(() => openAccount(state, customer.id, 'BTC'), /fiat/);
});

test('interbank rehearsal queues without moving funds and settles only fictional local accounts after approval', () => {
  const state = createDemoState();
  const source = activeEur(state, customer => customer?.kyc === 'verified');
  const destination = state.interbankAccounts.find(account => account.bankId === 'DB-HR-01' && account.currency === source.currency);
  const sourceBefore = source.balanceCents;
  const destinationBefore = destination.balanceCents;
  const transfer = createInterbankTransfer(state, { fromAccountId: source.id, toAccountId: destination.id, amountCents: 12500, reference: 'TRAINING-001', purpose: 'Synthetic rehearsal' });
  assert.equal(transfer.status, 'awaiting_approval');
  assert.equal(source.balanceCents, sourceBefore);
  assert.equal(destination.balanceCents, destinationBefore);
  approveInterbankTransfer(state, transfer.id);
  assert.equal(transfer.status, 'settled_simulation');
  assert.equal(source.balanceCents, sourceBefore - 12500);
  assert.equal(destination.balanceCents, destinationBefore + 12500);
  assert.match(transfer.network, /no external network/);
  assert.ok(isBalanced(state));
  assert.throws(() => approveInterbankTransfer(state, transfer.id), /not awaiting approval/);
});

test('bank, account and masked-card checks only report local synthetic matches or identifier shape', () => {
  const state = createDemoState();
  const bank = state.demoBanks[0];
  const bankResult = verifyDemoReference(state, { type: 'bank', value: bank.bic });
  assert.equal(bankResult.status, 'synthetic_directory_match');
  assert.match(bankResult.note, /no real registry/i);
  const account = state.accounts[0];
  assert.equal(verifyDemoReference(state, { type: 'account', value: account.accountNumber }).status, 'synthetic_account_match');
  const card = state.cards[0];
  assert.equal(verifyDemoReference(state, { type: 'card', value: card.last4 }).status, 'synthetic_card_match');
  assert.equal(verifyDemoReference(state, { type: 'bank', value: 'ABCDUS33XXX' }).status, 'format_only');
  assert.equal(verifyDemoReference(state, { type: 'account', value: 'NOT-IN-DEMO' }).status, 'not_found');
});

test('synthetic call-centre ticket workflow validates inputs and updates a local training record', () => {
  const state = createDemoState();
  const customer = state.customers[0];
  const ticket = createSupportTicket(state, { customerId: customer.id, category: 'Digital access', subject: 'Demo login help', message: 'Please explain the fictional login screen.', syntheticConfirmed: true });
  assert.equal(ticket.status, 'open');
  assert.equal(ticket.demoOnly, true);
  assert.throws(() => createSupportTicket(state, { customerId: customer.id, subject: 'Real record', message: 'My account is 1234 5678 9012', syntheticConfirmed: true }), /Do not enter/);
  updateSupportTicket(state, ticket.id, 'in_progress', 'Training note only');
  assert.equal(ticket.status, 'in_progress');
  assert.equal(ticket.lastNote, 'Training note only');
  updateSupportTicket(state, ticket.id, 'resolved', 'Explained demo-only portal');
  assert.equal(ticket.status, 'resolved');
  assert.ok(isBalanced(state));
});

test('overdraft applications enter the same fictional maker-checker credit workflow', () => {
  const state = createDemoState();
  const account = activeEur(state, customer => customer?.kyc === 'verified' && customer.risk !== 'high');
  const application = createLoanApplication(state, { accountId: account.id, amountCents: 200000, termMonths: 12, product: 'Overdraft facility', purpose: 'Synthetic overdraft rehearsal' });
  assert.equal(application.product, 'Overdraft facility');
  assert.equal(application.status, 'awaiting_approval');
  assert.equal(application.annualRateBps, 1250);
  assert.ok(isBalanced(state));
});
