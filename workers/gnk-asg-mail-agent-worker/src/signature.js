const COMPANY = {
  name: 'GNK ASG d.o.o.',
  address: 'Zagrebačka cesta 130, 10090 Zagreb, Hrvatska',
  web: 'https://gnk-asg.hr',
  phone: '+385 91 535 8365',
  oib: '75227917632',
  mbs: '081512375'
};

const PROFILES = {
  office: {
    name: 'GNK ASG Korporativni ured',
    title: 'Korporativna komunikacija i administracija',
    email: 'contact@gnk-asg.hr'
  },
  info: {
    name: 'GNK ASG Info odjel',
    title: 'Informacije i opći upiti',
    email: 'info@gnk-asg.hr'
  },
  contact: {
    name: 'GNK ASG Kontakt odjel',
    title: 'Kontakt i korisnička komunikacija',
    email: 'contact@gnk-asg.hr'
  },
  legal: {
    name: 'GNK ASG Legal & Compliance',
    title: 'Pravni i regulatorni poslovi',
    email: 'legal@gnk-asg.hr'
  },
  privacy: {
    name: 'GNK ASG Privacy Desk',
    title: 'Privatnost i zaštita podataka',
    email: 'privacy@gnk-asg.hr'
  },
  media: {
    name: 'GNK ASG Media Desk',
    title: 'Mediji, objave i javne informacije',
    email: 'media@gnk-asg.hr'
  },
  press: {
    name: 'GNK ASG Press Desk',
    title: 'Press i odnosi s medijima',
    email: 'press@gnk-asg.hr'
  },
  ubo: {
    name: 'GNK ASG UBO Desk',
    title: 'Korporativni podatci i vlasnička struktura',
    email: 'ubo@gnk-asg.hr'
  },
  sefic: {
    name: 'Ured Nermina Sefića',
    title: 'Direktor · GNK ASG d.o.o.',
    email: 'sefic@gnk-asg.hr'
  },
  it: {
    name: 'IT – Osobni digitalni asistent',
    title: 'Digitalna i tehnička podrška',
    email: 'it@gnk-asg.hr'
  },
  assistant: {
    name: 'IT – Osobni digitalni asistent',
    title: 'AI komunikacijska podrška',
    email: 'assistant@gnk-asg.hr'
  }
};

export function signatureDataFor(profile = 'it', language = 'hr', caseId = '', options = {}) {
  const selected = PROFILES[profile] || PROFILES.it;
  const senderEmail = validCompanyEmail(options.from) || selected.email;

  const closing = language === 'en' ? 'Kind regards,' : 'Srdačan pozdrav,';
  const disclosure = language === 'en'
    ? 'This reply may have been prepared with the assistance of an automated system and, where applicable, artificial intelligence. Sensitive matters are referred to an authorised person.'
    : 'Ovaj odgovor može biti pripremljen uz pomoć automatiziranog sustava i, kada je primjenjivo, umjetne inteligencije. Osjetljive teme upućuju se ovlaštenoj osobi.';
  const disclaimer = language === 'en'
    ? 'This message does not constitute acceptance of a contractual obligation or legal, financial, tax or investment advice.'
    : 'Ova poruka ne predstavlja prihvat ugovorne obveze niti pravni, financijski, porezni ili investicijski savjet.';

  return {
    closing,
    profile: selected,
    company: COMPANY,
    senderEmail,
    caseId: String(caseId || '').trim(),
    disclosure: options.automated === true ? disclosure : '',
    disclaimer
  };
}

export function signatureFor(profile = 'it', language = 'hr', caseId = '', options = {}) {
  const data = signatureDataFor(profile, language, caseId, options);
  const lines = [
    data.closing,
    '',
    data.profile.name,
    data.profile.title,
    '',
    data.company.name,
    data.company.address,
    `OIB: ${data.company.oib} · MBS: ${data.company.mbs}`,
    `E-mail: ${data.senderEmail}`,
    `Web: ${data.company.web} · Telefon: ${data.company.phone}`
  ];

  if (data.caseId) lines.push(`Evidencijski broj: ${data.caseId}`);
  if (data.disclosure) lines.push('', data.disclosure);
  lines.push(data.disclaimer);

  return lines.join('\r\n');
}

function validCompanyEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[a-z0-9._%+-]+@gnk-asg\.hr$/i.test(email) ? email : '';
}
