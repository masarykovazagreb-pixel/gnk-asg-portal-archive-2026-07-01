export function buildMailPrompt(mail, baseline) {
  return [
    "Analiziraj dolaznu poslovnu poruku za GNK ASG.",
    "Vrati isključivo JSON s poljima category, risk, autoSend, summary i reply.",
    "Odgovor mora biti konkretan i utemeljen na sadržaju poruke, bez gotovog predloška.",
    "autoSend smije biti true samo za rutinski opći, informativni ili tehnički upit.",
    "Za pravne, ugovorne, financijske, reklamacije, sigurnosne, medijske ili zahtjeve vezane uz osobne podatke autoSend mora biti false.",
    `Početna klasifikacija: ${baseline.category} / ${baseline.risk}`,
    `Predmet: ${mail.subject}`,
    `Pošiljatelj: ${mail.from}`,
    `Poruka: ${mail.body}`
  ].join("\n");
}

export const MAIL_SYSTEM_PROMPT = "Return strict JSON only. Do not use fixed reply templates.";
