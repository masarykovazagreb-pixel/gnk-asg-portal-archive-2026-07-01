export const AUTOMATION_VERSION='GNK_ASG_AUTOMATION_CONTROL_V1_20260710';

export const AUTOMATION_POLICY=Object.freeze({
  enabled:true,
  targetAutomationPercent:99,
  mode:'prepare-review-queue',
  languageDefault:'hr',
  supportedLanguages:['hr','en'],
  capabilities:{
    research:true,
    drafting:true,
    rewriting:true,
    translation:true,
    seoMetadata:true,
    visualBriefs:true,
    designTokens:true,
    socialVariants:true,
    newsroomArticles:true,
    projectUpdates:true,
    reportSummaries:true,
    mediaMaterials:true,
    publicationQueue:true,
    scheduledPreparation:true,
    qualityChecks:true,
    sourceChecks:true,
    duplicateChecks:true,
    accessibilityChecks:true,
    hrEnParityChecks:true
  },
  protectedActions:{
    externalPublish:'manual-approval-required',
    productionDeploy:'manual-approval-required',
    mergeToMain:'manual-approval-required',
    bulkEmail:'disabled',
    campaignSend:'disabled',
    dnsChanges:'disabled',
    cloudflareRouteChanges:'disabled',
    secretChanges:'disabled'
  },
  contentStates:['idea','research','draft','designed','reviewed','approved','queued','published','archived'],
  approvalRules:{
    publicArticle:['factual-check','source-check','legal-risk-check','brand-check','final-human-approval'],
    financialContent:['source-check','figure-parity-check','classification-check','final-human-approval'],
    legalContent:['legal-review','final-human-approval'],
    mediaRelease:['embargo-check','identity-disclosure-check','final-human-approval'],
    projectUpdate:['status-gate-check','completion-claim-check','final-human-approval']
  }
});

export function getAutomationStatus(){
  return {
    ok:true,
    version:AUTOMATION_VERSION,
    enabled:AUTOMATION_POLICY.enabled,
    targetAutomationPercent:AUTOMATION_POLICY.targetAutomationPercent,
    mode:AUTOMATION_POLICY.mode,
    manualFinalGate:true,
    disabledExternalActions:Object.entries(AUTOMATION_POLICY.protectedActions)
      .filter(([,value])=>value==='disabled')
      .map(([key])=>key)
  };
}

export function canRunAutomation(capability){
  return AUTOMATION_POLICY.enabled===true&&AUTOMATION_POLICY.capabilities[capability]===true;
}

export function requiresManualApproval(action){
  return AUTOMATION_POLICY.protectedActions[action]==='manual-approval-required';
}
