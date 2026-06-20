const COMPANY = {
  name: "GNK ASG d.o.o.",
  address: "Zagrebačka cesta 130, 10090 Zagreb, Hrvatska",
  web: "https://gnk-asg.hr",
  phone: "+385 91 535 8365",
  oib: "75227917632",
  mbs: "081512375"
};

export function signatureFor(profile = "it", language = "hr", caseId = "") {
  const profiles = {
    office: { name: "GNK ASG Office", title: "Korporativni ured" },
    info: { name: "GNK ASG Info Desk", title: "Informacije i opći upiti" },
    contact: { name: "GNK ASG Contact Desk", title: "Kontakt i korisnička komunikacija" },
    media: { name: "GNK ASG Media Desk", title: "Mediji, objave i javne informacije" },
    it: { name: "IT – Osobni digitalni asistent", title: "Digitalna, tehnička i komunikacijska podrška" },
    assistant: { name: "IT – Osobni digitalni asistent", title: "AI komunikacijska podrška" }
  };
  const selected = profiles[profile] || profiles.it;
  const closing = language === "en" ? "Kind regards," : "Srdačan pozdrav,";
  const disclosure = language === "en"
    ? "This contextual reply was prepared with the assistance of artificial intelligence based on the received message. Sensitive matters are referred to an authorised person."
    : "Ovaj odgovor kontekstualno je pripremljen uz pomoć umjetne inteligencije na temelju zaprimljene poruke. Osjetljive teme upućuju se ovlaštenoj osobi.";
  const disclaimer = language === "en"
    ? "This message does not constitute legal, financial, tax or investment advice and does not create contractual obligations."
    : "Ova poruka ne predstavlja pravni, financijski, porezni ni investicijski savjet i ne stvara ugovorne obveze.";

  return [
    closing,
    "",
    selected.name,
    selected.title,
    COMPANY.name,
    COMPANY.address,
    `OIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}`,
    `${COMPANY.web} · ${COMPANY.phone}`,
    caseId ? `Evidencijski broj: ${caseId}` : "",
    "",
    disclosure,
    disclaimer
  ].filter(Boolean).join("\r\n");
}
