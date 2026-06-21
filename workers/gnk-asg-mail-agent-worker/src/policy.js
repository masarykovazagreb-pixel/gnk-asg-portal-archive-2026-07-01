export const MAIL_AUTOMATION_POLICY = {
  automationTargetPercent: 99,
  contextualRepliesOnly: true,
  fixedTemplatesAllowed: false,
  autoSendLowRiskGeneralReplies: true,
  autoSendRequiresEnvironmentOptIn: true,
  holdSensitiveMessages: true,
  preventReplyLoops: true,
  sensitiveCategories: [
    "legal",
    "contract",
    "financial_commitment",
    "payment_instruction",
    "complaint_or_claim",
    "personal_data_request",
    "security_incident",
    "media_statement",
    "employment",
    "government_or_court"
  ]
};

export function classifyRisk(subject = "", body = "") {
  const text = `${subject} ${body}`.toLowerCase();
  const rules = [
    ["government_or_court", /(sud|court|tužb|tuzb|državno tijelo|drzavno tijelo|rješenje|rjesenje|poziv)/i],
    ["legal", /(pravni|legal|odvjet|zakon|kaznen|parnič|parnic)/i],
    ["contract", /(ugovor|contract|aneks|raskid|obveza)/i],
    ["financial_commitment", /(plać|plac|payment|račun|racun|faktur|dug|kredit|jamstvo)/i],
    ["complaint_or_claim", /(reklamacij|prigovor|zahtjev za naknadu|štet|stet|claim)/i],
    ["personal_data_request", /(osobni podat|gdpr|brisanje podataka|pristup podacima)/i],
    ["security_incident", /(sigurnos|security|incident|hakir|phishing|malware)/i],
    ["media_statement", /(novinar|medij|izjava za javnost|press|intervju)/i],
    ["employment", /(zaposlen|employment|radni odnos|otkaz|plaća|placa)/i]
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return { category, risk: "high", autoSend: false };
  }
  return { category: "general", risk: "low", autoSend: true };
}
