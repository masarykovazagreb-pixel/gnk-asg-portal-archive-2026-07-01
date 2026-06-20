export function buildMailPrompt(mail, baseline) {
  return [
    "Analiziraj svaki dolazni poslovni mail za GNK ASG.",
    "Vrati isključivo JSON s poljima category, risk, autoSend, summary i reply.",
    "Sažetak mora navesti osobu, organizaciju ako je poznata, temu, konkretna pitanja, rokove i potrebne radnje.",
    "Odgovor mora biti personaliziran, služben, konkretan i utemeljen samo na sadržaju poruke i dostupnom threadu.",
    "Ako je ime pošiljatelja poznato, koristi ga u prikladnom pozdravu. Ne izmišljaj ime, funkciju, činjenice ni ovlasti.",
    "Ne koristi gotov predložak. Ne preuzimaj pravne, financijske, ugovorne ili reputacijske obveze.",
    "autoSend smije biti true samo za rutinski opći, informativni ili tehnički upit niskog rizika.",
    "Za pravne, ugovorne, financijske, reklamacije, sigurnosne, medijske, reputacijske, osobne podatke ili obvezujuće poruke autoSend mora biti false.",
    `Početna klasifikacija: ${baseline.category} / ${baseline.risk}`,
    `Pošiljatelj: ${mail.senderName || mail.from || ''}`,
    `E-mail: ${mail.senderEmail || mail.from || ''}`,
    `Primatelj: ${mail.to || ''}`,
    `Predmet: ${mail.subject || ''}`,
    `Thread reference: ${mail.inReplyTo || mail.references || ''}`,
    `Poruka i dostupni citirani thread: ${mail.body || ''}`
  ].join("\n");
}

export const MAIL_SYSTEM_PROMPT = "Return strict JSON only. Prepare a personalized official reply for every incoming mail. Do not use fixed templates or invent facts.";
