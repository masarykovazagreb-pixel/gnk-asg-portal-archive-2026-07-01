const intents = [
  ['rates', /\b(rate|rates|ecb|exchange|convert|conversion|currency|fx|forex)\b/i],
  ['identity', /\b(kyc|onboard|onboarding|verify|verification|identity|passport|document|aml|sanction|pep|compliance)\b/i],
  ['card', /\b(card|lock|unlock|freeze|block)\b/i],
  ['credit', /\b(loan|credit|overdraft|borrow|apr|interest)\b/i],
  ['swift', /\b(swift|wire|bic|international payment|mt103)\b/i],
  ['payment', /\b(payment|transfer|send|pay|sepa)\b/i],
  ['savings', /\b(savings|deposit|save|maturity)\b/i],
  ['balance', /\b(balance|account|accounts|available|funds)\b/i]
];

const replies = {
  en: {
    rates: context => `The demo uses the ECB's daily EUR reference table (rate date ${context.rateDate || '9 Oct 2026'}). It is informational, normally published on working days, and is not a real-time or executable transaction quote. Demo conversions use an illustrative spread and change only local sample balances.`,
    identity: audience => audience === 'staff'
      ? 'Use the synthetic KYC review queue to rehearse statuses and notes. No identity documents, biometrics, PEP or sanctions lists, registries, or external screening are connected; a status change is not verification.'
      : 'You can submit a synthetic onboarding/KYC rehearsal from this portal. Do not enter real identity details or upload documents: no identity verification, registry lookup, PEP or sanctions screening takes place.',
    card: audience => audience === 'staff'
      ? 'Open Cards to issue a masked demo token or change its local active/locked state. No PAN, CVV, PIN, issuer processor, card network, authorisation, or real card is created.'
      : 'Use the Cards panel to lock or unlock a demo token. The change is local to this sample profile; it cannot block or control a real payment card.',
    credit: audience => audience === 'staff'
      ? 'The Loans workspace supports synthetic personal, SME, home-improvement, and overdraft applications with a local maker/checker rehearsal. It is not underwriting, an offer, a credit decision, or a funded facility.'
      : 'You can rehearse a loan or overdraft application from this portal. The result is a local demo queue only—not a credit decision, offer, contract, or access to funds.',
    swift: () => 'The SWIFT lab creates a message-shaped local draft and a clearly fictitious test BIC. Adria Bank has no allocated BIC here, no SWIFT registration, correspondent connection, or payment settlement.',
    payment: audience => audience === 'staff'
      ? 'SEPA and SWIFT-labelled workflows are local approval rehearsals only. No payment network is connected and no funds move.'
      : 'You can prepare a synthetic payment or transfer, but nothing is sent to a payment network and no money leaves or enters a real account.',
    savings: audience => audience === 'staff'
      ? 'Savings placements and maturity are synthetic ledger exercises. Rates are illustrative; no deposit contract, guarantee, or real interest is created.'
      : 'You can review demo savings products in the portal. Terms and rates are illustrative only, with no contract, deposit protection, or real interest.',
    balance: context => `Selected fictional profile: ${context.accountSummary || 'no active demo accounts'}. These are local sample balances, not bank funds.`,
    general: audience => audience === 'staff'
      ? 'I can explain the local demo workflows for onboarding, AML/KYC status rehearsal, cards, payments, SWIFT drafts, FX references, savings, credit, and treasury. I do not access a model service or external customer data.'
      : 'I can help with the demo account, card controls, onboarding, payments, savings, credit, and ECB reference rates. This helper runs locally from preset guidance and does not send your question to an AI service.'
  },
  hr: {
    rates: context => `Demo prikazuje dnevne referentne tečajeve ECB-a (datum tečaja ${context.rateDate || '9. listopada 2026.'}). To su informativni podaci, objavljuju se radnim danima i nisu tečaj u stvarnom vremenu ni izvršiva cijena transakcije. Demo konverzija koristi ilustrativnu maržu i mijenja samo lokalna probna stanja.`,
    identity: audience => audience === 'staff'
      ? 'Red za sintetički KYC služi za vježbu statusa i bilješki. Nema dokumenata, biometrije, PEP/sankcijskih lista, registara ni vanjske provjere; promjena statusa nije provjera identiteta.'
      : 'U portalu možete pokrenuti sintetičku vježbu onboardinga/KYC-a. Nemojte unositi stvarne osobne podatke ni učitavati dokumente: ne provode se provjera identiteta, pregled registara, PEP ni sankcijski screening.',
    card: audience => audience === 'staff'
      ? 'U Karticama izdajte maskirani demo token ili lokalno promijenite status. Ne nastaju PAN, CVV, PIN, procesor, kartična mreža, autorizacija ni stvarna kartica.'
      : 'U odjeljku Kartice možete zaključati ili otključati demo token. Promjena vrijedi samo za lokalni probni profil i ne upravlja stvarnom karticom.',
    credit: audience => audience === 'staff'
      ? 'Modul Krediti nudi sintetičke zahtjeve za osobni, poslovni, stambeni kredit ili prekoračenje, uz lokalnu maker/checker vježbu. To nije procjena kreditne sposobnosti, ponuda, odluka ni isplata.'
      : 'U portalu možete isprobati sintetički zahtjev za kredit ili prekoračenje. To nije odluka, ponuda, ugovor ni pristup sredstvima.',
    swift: () => 'SWIFT modul izrađuje samo lokalni nacrt poruke s očito izmišljenim testnim BIC-om. Adria Bank nema dodijeljeni BIC, SWIFT registraciju, korespondentsku vezu ni namiru.',
    payment: audience => audience === 'staff'
      ? 'SEPA i SWIFT radni tokovi služe samo za lokalnu vježbu odobravanja. Platna mreža nije povezana i sredstva se ne prenose.'
      : 'Možete pripremiti sintetičko plaćanje ili prijenos, ali ništa se ne šalje platnoj mreži i stvarni novac se ne prenosi.',
    savings: audience => audience === 'staff'
      ? 'Štednja i dospijeće sintetičke su računovodstvene vježbe. Stope su ilustrativne; ne nastaju ugovor, osiguranje depozita ni stvarna kamata.'
      : 'U portalu možete pregledati demo štedne proizvode. Uvjeti i stope su ilustrativni; ne nastaju ugovor, zaštita depozita ni stvarna kamata.',
    balance: context => `Odabrani izmišljeni profil: ${context.accountSummary || 'nema aktivnih demo računa'}. To su lokalna probna stanja, a ne bankovna sredstva.`,
    general: audience => audience === 'staff'
      ? 'Mogu objasniti lokalne demo tokove za onboarding, AML/KYC, kartice, plaćanja, SWIFT nacrte, FX reference, štednju, kredite i riznicu. Ne koristim vanjski model ni podatke klijenata.'
      : 'Mogu pomoći oko demo računa, kartica, onboardinga, plaćanja, štednje, kredita i ECB referentnih tečajeva. Pomoćnik radi lokalno prema unaprijed zadanim pravilima i ne šalje pitanje AI servisu.'
  }
};

export function localAssistantReply({ question, audience = 'customer', context = {}, language = 'en' }) {
  const intent = intents.find(([, pattern]) => pattern.test(String(question || '')))?.[0] || 'general';
  const dictionary = replies[language] || replies.en;
  const template = dictionary[intent] || replies.en[intent];
  return template(audience, context);
}
