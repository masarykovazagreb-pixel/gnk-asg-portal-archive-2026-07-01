import test from 'node:test';
import assert from 'node:assert/strict';
import { supportedLanguages, translate } from '../src/i18n.mjs';
import { localAssistantReply } from '../src/assistant.mjs';

test('all nine supported interface languages have the expanded workflow and interop navigation labels', () => {
  assert.deepEqual(supportedLanguages.map(item => item.code), ['hr', 'en', 'de', 'fr', 'es', 'ar', 'sw', 'ja', 'zh']);
  for (const language of supportedLanguages) {
    for (const key of ['institutions', 'interoperability', 'interopSub', 'interopWorkbench', 'interopIdeas', 'interopBanks', 'interopVenues', 'interopFunctions', 'interopBoundary', 'interopConnectorCount', 'interopReadScopes', 'interopMostRecent', 'interopEnable', 'interopPause', 'interopRefresh', 'interopProtocol', 'interopPermissions', 'interopLatency', 'interopSnapshot', 'interopRun', 'interopResult', 'interopActivity', 'interopNoActivity', 'interopRunSuccess', 'interopReset', 'interopResetConfirm', 'interopActive', 'interopPaused', 'interopReadOnlyValue', 'interopExportHint', 'interopEnabledCount', 'interopKillSwitch', 'interopIdeasIntro', 'interopSystemTitle', 'interopSystemSub', 'interopSystemCurrent', 'interopSystemSwitch', 'interopSystemActive', 'interopSystemCurrency', 'interopSystemTimezone', 'interopSystemBoundary', 'interopSystemChanged', 'interopContextBar', 'interopOpenWorkbench', 'interopToolFilter', 'interopCategoryAll', 'interopCategoryBanking', 'interopCategoryPayments', 'interopCategoryControls', 'interopCategoryCrypto', 'interopCategoryOperations', 'interopAdditionalIdeas', 'interopFictionalSystem', 'interopSystemProfile', 'interopNoOrders', 'interopBankPanelSub', 'interopVenuePanelSub', 'interopRestore', 'interopJsonEvidence', 'localChecks', 'callCentre', 'convertAccounts', 'interbankTransfer', 'backgroundSimulationTitle', 'backgroundActive', 'backgroundSafety', 'conversionRate', 'standardDebit', 'premiumDebit', 'prepaidVirtual', 'cardControls', 'cardLoad', 'simulateCardPurchase', 'cardDailyLimit', 'cardMonthlyLimit', 'prepaidBalance', 'onlinePayments', 'internationalPayments', 'recurringPayments', 'cardWorkflowBoundary', 'prepaidLoadHelp', 'cardControlsSaved', 'cardLoaded', 'cardPurchaseComplete', 'cardCancellationNote', 'prepaidCancellationRefund']) {
      assert.notEqual(translate(language.code, key), key, `${language.code} is missing ${key}`);
    }
  }
});

test('online-onboarding rehearsal and persistent demo footer copy are explicitly translated in all nine languages', () => {
  const keys = [
    'coreOnline', 'onlineOnboarding', 'onlineOnboardingSub', 'startDemoOnboarding', 'demoApplications', 'completedReviews',
    'enhancedReviewDemo', 'noExternalScreening', 'onboardingBoundary', 'onboardingReviewGuide', 'onboardingGuideRead',
    'onboardingGuideOne', 'onboardingGuideReview', 'onboardingGuideTwo', 'onboardingGuideRecord', 'onboardingGuideThree',
    'applicationCode', 'requestedProducts', 'reviewPath', 'noOnboardingApplications', 'onboardingStages',
    'onboardingStageProfile', 'onboardingStageChecks', 'onboardingStageReview', 'onboardingFlowIntro', 'onboardingScenarioExplain', 'onboardingReviewSummary', 'onboardingBack', 'onboardingNext',
    'onboardingMarketNote', 'onboardingNoDocumentUpload', 'onboardingNoListCheck', 'onboardingNoRealDataConfirm',
    'onboardingProductPersonal', 'onboardingProductMultiCurrency', 'onboardingProductVirtualDebit', 'onboardingProductPrepaid',
    'onboardingProductBusiness', 'identityScenario', 'screeningScenario', 'verificationPassDemo', 'verificationManualDemo',
    'verificationUnavailableDemo', 'screeningClearDemo', 'screeningPossibleMatchDemo', 'screeningEscalationDemo',
    'test_pass_demo', 'manual_review_demo', 'unavailable_demo', 'clear_demo', 'possible_match_demo', 'escalation_demo',
    'onboardingStandardPath', 'onboardingEnhancedPath', 'submittedDemo', 'reviewedDemo', 'needsInfoDemo', 'closedDemo',
    'markReviewedDemo', 'requestDemoInfo', 'closeDemoApplication', 'submitDemoApplication', 'onboardingSubmitted',
    'onboardingNextSubmitted', 'onboardingNextNeedsInfo', 'onboardingNextReviewed', 'onboardingNextClosed'
  ];
  for (const language of supportedLanguages) {
    for (const key of keys) assert.notEqual(translate(language.code, key), key, `${language.code} is missing ${key}`);
  }
});

test('local assistant is rule-based and clearly distinguishes daily references from live quotes', () => {
  const reply = localAssistantReply({ question: 'Explain the ECB reference rates', audience: 'customer', context: { rateDate: '2026-10-09' }, language: 'en' });
  assert.match(reply, /daily/i);
  assert.match(reply, /not a real-time or executable/i);
  assert.match(reply, /local sample balances/i);
  assert.match(localAssistantReply({ question: 'How can I lock a card?', audience: 'customer', language: 'en' }), /cannot block or control a real payment card/i);
});
