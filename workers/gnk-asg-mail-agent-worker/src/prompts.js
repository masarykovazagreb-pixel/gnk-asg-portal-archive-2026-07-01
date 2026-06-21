export function buildMailPrompt(mail, baseline) {
  const thread = mail.threadContext || {};
  const threadMessages = Array.isArray(thread.messages) ? thread.messages : [];

  return [
    'Analiziraj svaki dolazni poslovni mail za GNK ASG.',
    'Vrati isključivo JSON s poljima category, risk, autoSend, summary, reply, person, organization, topic, tone, language, questions, mailbox i approvalReason.',
    'questions mora biti polje konkretnih pitanja iz cijelog threada na koja odgovor treba odgovoriti.',
    'summary mora navesti osobu, organizaciju ako je poznata, temu, rokove, rizike i potrebne radnje.',
    'reply mora biti personaliziran, služben, konkretan i utemeljen samo na sadržaju poruke i cijelog dostupnog threada.',
    'Odgovori na sva neriješena konkretna pitanja. Ne ponavljaj odgovore koji su već jasno dani ranije u threadu.',
    'Ako je ime pošiljatelja poznato, koristi ga u prikladnom pozdravu. Ne izmišljaj ime, funkciju, činjenice ni ovlasti.',
    'Ne koristi gotov predložak. Ne preuzimaj pravne, financijske, ugovorne ili reputacijske obveze.',
    'mailbox mora biti jedan od: info, contact, media, assistant, it, legal, finance, office.',
    'autoSend smije biti true samo za rutinski opći, informativni ili tehnički upit niskog rizika koji je politikom dopušten.',
    'Za pravne, ugovorne, financijske, reklamacije, sigurnosne, medijske, reputacijske, osobne podatke ili obvezujuće poruke autoSend mora biti false i approvalReason mora objasniti razlog.',
    `Početna klasifikacija: ${baseline.category} / ${baseline.risk}`,
    `Pošiljatelj: ${mail.senderName || mail.from || ''}`,
    `E-mail: ${mail.senderEmail || mail.from || ''}`,
    `Primatelj: ${mail.to || ''}`,
    `Predmet: ${mail.subject || ''}`,
    `Thread ID: ${thread.threadId || ''}`,
    `Sudionici: ${(thread.participants || []).join(', ')}`,
    `Broj dostupnih poruka: ${thread.messageCount || threadMessages.length || 1}`,
    `Kronološki thread: ${JSON.stringify(threadMessages)}`,
    `Najnovija poruka: ${mail.body || ''}`
  ].join('\n');
}

export const MAIL_SYSTEM_PROMPT = 'Return strict JSON only. Analyse the complete email thread and prepare a personalized official reply. Never use fixed templates, invent facts, or authorize sensitive commitments.';
