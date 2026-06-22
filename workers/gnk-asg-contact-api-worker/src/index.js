import { EmailMessage } from "cloudflare:email";

const MAILBOXES = {
  "info": { address: "info@gnk-asg.hr", label: "Info", signature: "Srdačan pozdrav,\n\nInfo Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "contact": { address: "contact@gnk-asg.hr", label: "Kontakt", signature: "Srdačan pozdrav,\n\nContact Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "it": { address: "it@gnk-asg.hr", label: "IT podrška", signature: "Srdačan pozdrav,\n\nIT – Osobni digitalni asistent\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "legal": { address: "legal@gnk-asg.hr", label: "Legal", signature: "Srdačan pozdrav,\n\nLegal Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "privacy": { address: "privacy@gnk-asg.hr", label: "Privatnost / GDPR", signature: "Srdačan pozdrav,\n\nPrivacy Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "media": { address: "media@gnk-asg.hr", label: "Media", signature: "Srdačan pozdrav,\n\nMedia Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "press": { address: "press@gnk-asg.hr", label: "Press", signature: "Srdačan pozdrav,\n\nPress Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "ubo": { address: "ubo@gnk-asg.hr", label: "UBO / korporativni podaci", signature: "Srdačan pozdrav,\n\nUBO Desk\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "sefic": { address: "sefic@gnk-asg.hr", label: "Sefić", signature: "Srdačan pozdrav,\n\nOffice of Nermin Sefić\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" },
  "assistant": { address: "assistant@gnk-asg.hr", label: "AI asistent", signature: "Srdačan pozdrav,\n\nIT – Osobni digitalni asistent\nGNK ASG d.o.o.\nhttps://gnk-asg.hr" }
};

const INTERNAL_TO = "rht@gmx.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (path === "/api/contact-mailboxes" || path === "/api/operator-mailbox-config") {
      return json({
        ok: true,
        worker: "gnk-asg-contact-api",
        mailboxes: publicMailboxes(),
        signatures: defaultSignatures(),
        internalForward: INTERNAL_TO,
        updatedAt: new Date().toISOString()
      });
    }

    if (path === "/api/operator-signature-load") {
      if (!tokenOk(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
      const mailboxKey = safeMailbox(url.searchParams.get("mailbox") || "info");
      const mailbox = MAILBOXES[mailboxKey] || MAILBOXES.info;
      const signature = await getSignature(env, mailboxKey, mailbox.signature);
      return json({ ok: true, mailboxKey, address: mailbox.address, label: mailbox.label, signature });
    }

    if (path === "/api/operator-signature-save") {
      if (!tokenOk(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

      let payload = {};
      try { payload = await request.json(); } catch (e) {}

      const mailboxKey = safeMailbox(payload.mailbox || "info");
      const signature = String(payload.signature || "");
      const key = `operator:signature:${mailboxKey}`;
      let saved = false;
      let error = null;

      try {
        if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
          await env.GNK_ASG_KV.put(key, signature);
          saved = true;
        } else {
          error = "GNK_ASG_KV binding nije dostupan.";
        }
      } catch (err) {
        error = String(err && err.message ? err.message : err);
      }

      return json({ ok: saved, saved, mailboxKey, signature, error });
    }

    if (path === "/api/operator-send-mail") {
      if (!tokenOk(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return await handleOperatorSendMail(request, env);
    }

    if (path !== "/api/contact-submit") {
      return json({ ok: false, error: "not_found", worker: "gnk-asg-contact-api", path }, 404);
    }

    if (request.method === "GET") {
      return json({
        ok: true,
        worker: "gnk-asg-contact-api",
        endpoint: "/api/contact-submit",
        status: "READY",
        accepts: "multipart/form-data",
        pdfUpload: true,
        maxPdfBytes: 10485760,
        internalForward: INTERNAL_TO,
        mailboxes: publicMailboxes(),
        bindings: {
          kv: Boolean(env.GNK_ASG_KV),
          r2: Boolean(env.GNK_ASG_MEDIA_ASSETS),
          email: Boolean(env.EMAIL)
        },
        updatedAt: new Date().toISOString()
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed", message: "Dopušten je samo POST." }, 405);
    }

    return await handleContactSubmit(request, env);
  }
};

async function handleContactSubmit(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json({ ok: false, error: "invalid_form", message: "Forma nije pravilno poslana." }, 400);
  }

  const mailboxKey = safeMailbox(String(form.get("mailbox") || form.get("departmentKey") || "info"));
  const mailbox = MAILBOXES[mailboxKey] || MAILBOXES.info;

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const subject = String(form.get("subject") || "Upit putem GNK ASG portala").trim();
  const messageText = String(form.get("message") || "").trim();
  const consent = String(form.get("consent") || "").trim();
  const pdf = form.get("pdf");

  if (!name || !email || !subject || !messageText || consent !== "yes") {
    return json({ ok: false, error: "missing_required_fields", message: "Nedostaju obvezna polja." }, 400);
  }

  const now = new Date();
  const caseId = `GNK-ASG-${now.toISOString().slice(0,10).replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;

  const pdfInfo = await savePdfIfAny(env, pdf, `contact-pdf/${caseId}`);

  const record = {
    caseId,
    receivedAt: now.toISOString(),
    mailboxKey,
    mailboxAddress: mailbox.address,
    mailboxLabel: mailbox.label,
    internalForward: INTERNAL_TO,
    name,
    email,
    phone,
    subject,
    message: messageText,
    consent: true,
    attachmentStatus: pdfInfo.status,
    attachmentKey: pdfInfo.key,
    attachmentName: pdfInfo.name,
    attachmentSize: pdfInfo.size,
    r2Saved: pdfInfo.saved,
    r2Error: pdfInfo.error,
    source: "public-contact-form",
    worker: "gnk-asg-contact-api",
    status: "received"
  };

  let kvSaved = false;
  let kvError = null;

  try {
    if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
      await env.GNK_ASG_KV.put(`contact:${caseId}`, JSON.stringify(record, null, 2));
      await env.GNK_ASG_KV.put("contact:last", JSON.stringify(record, null, 2));
      kvSaved = true;
    }
  } catch (err) {
    kvError = String(err && err.message ? err.message : err);
  }

  const internalMail = await sendInternalNotice(env, record, mailbox);
  const autoReply = await sendAutoReply(env, record, mailbox);

  return json({
    ok: true,
    worker: "gnk-asg-contact-api",
    caseId,
    receivedAt: record.receivedAt,
    selectedMailbox: mailbox.address,
    selectedMailboxLabel: mailbox.label,
    internalForward: INTERNAL_TO,
    name,
    email,
    phone,
    subject,
    message: "Upit je zaprimljen.",
    attachmentStatus: record.attachmentStatus,
    attachmentKey: record.attachmentKey,
    r2Saved: record.r2Saved,
    kvSaved,
    kvError,
    internalMail,
    autoReply
  });
}

async function handleOperatorSendMail(request, env) {
  let data = {};
  let pdf = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let form;
    try {
      form = await request.formData();
    } catch (err) {
      return json({ ok: false, error: "invalid_form", message: "Mail forma nije pravilno poslana." }, 400);
    }

    data.mailbox = String(form.get("mailbox") || "info");
    data.to = String(form.get("to") || "");
    data.subject = String(form.get("subject") || "");
    data.body = String(form.get("body") || "");
    data.signature = String(form.get("signature") || "");
    data.addSignature = String(form.get("addSignature") || "yes");
    pdf = form.get("pdf");
  } else {
    try { data = await request.json(); } catch (e) { data = {}; }
  }

  const mailboxKey = safeMailbox(data.mailbox || "info");
  const mailbox = MAILBOXES[mailboxKey] || MAILBOXES.info;
  const to = String(data.to || "").trim();
  const subject = String(data.subject || "").trim();
  const body = String(data.body || "").trim();
  const storedSignature = await getSignature(env, mailboxKey, mailbox.signature);
  const signature = String(data.signature || storedSignature);
  const addSignature = String(data.addSignature || "yes") !== "no";

  if (!to || !subject || !body) {
    return json({ ok: false, error: "missing_fields", message: "Nedostaju primatelj, predmet ili tekst poruke." }, 400);
  }

  let attachment = null;
  let pdfMeta = { attached: false, name: null, size: 0, error: null };

  if (pdf && typeof pdf === "object" && "arrayBuffer" in pdf && Number(pdf.size || 0) > 0) {
    const name = String(pdf.name || "attachment.pdf");
    const size = Number(pdf.size || 0);
    const type = String(pdf.type || "application/pdf").toLowerCase();

    if (!name.toLowerCase().endsWith(".pdf") && type !== "application/pdf") {
      return json({ ok: false, error: "invalid_pdf", message: "Dopušten je samo PDF prilog." }, 400);
    }

    if (size > 10485760) {
      return json({ ok: false, error: "pdf_too_large", message: "PDF prilog je prevelik. Maksimalno 10 MB." }, 400);
    }

    const buffer = await pdf.arrayBuffer();
    const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);

    attachment = {
      filename: safeName,
      contentType: "application/pdf",
      base64: arrayBufferToBase64(buffer)
    };

    pdfMeta = { attached: true, name: safeName, size, error: null };
  }

  const finalBody = addSignature ? `${body}\n\n---\n${signature}` : body;

  const result = await sendMailRaw(env, {
    to,
    from: mailbox.address,
    fromName: `GNK ASG ${mailbox.label}`,
    replyTo: mailbox.address,
    subject,
    text: finalBody,
    attachment
  });

  const logRecord = {
    type: "operator-mail",
    sentAt: new Date().toISOString(),
    mailboxKey,
    from: mailbox.address,
    to,
    subject,
    addSignature,
    pdfMeta,
    result
  };

  try {
    if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
      const key = `operator:mail-log:${Date.now()}:${crypto.randomUUID()}`;
      await env.GNK_ASG_KV.put(key, JSON.stringify(logRecord, null, 2));
      await updateIndex(env, "operator:mail-log:index", { key, from: mailbox.address, to, subject, sentAt: logRecord.sentAt, sent: result.sent, pdf: pdfMeta.attached });
    }
  } catch (e) {}

  return json({
    ok: result.sent,
    worker: "gnk-asg-contact-api",
    operatorEndpoint: "/api/operator-send-mail",
    mailboxKey,
    from: mailbox.address,
    fromLabel: mailbox.label,
    to,
    subject,
    addSignature,
    signatureUsed: addSignature,
    pdfMeta,
    result
  });
}

async function savePdfIfAny(env, pdf, prefix) {
  const out = { status: "nije priložen", key: null, name: null, size: 0, saved: false, error: null };

  if (!(pdf && typeof pdf === "object" && "arrayBuffer" in pdf && Number(pdf.size || 0) > 0)) return out;

  out.name = String(pdf.name || "attachment.pdf");
  out.size = Number(pdf.size || 0);

  const lowerName = out.name.toLowerCase();
  const pdfType = String(pdf.type || "").toLowerCase();

  if (!lowerName.endsWith(".pdf") && pdfType !== "application/pdf") {
    out.status = "neispravan PDF";
    out.error = "Dopušten je samo PDF dokument.";
    return out;
  }

  if (out.size > 10485760) {
    out.status = "PDF je prevelik";
    out.error = "PDF dokument je prevelik. Najveća dopuštena veličina je 10 MB.";
    return out;
  }

  const safeName = out.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
  out.key = `${prefix}/${safeName}`;

  try {
    if (env.GNK_ASG_MEDIA_ASSETS && typeof env.GNK_ASG_MEDIA_ASSETS.put === "function") {
      await env.GNK_ASG_MEDIA_ASSETS.put(out.key, await pdf.arrayBuffer(), {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: { originalName: out.name, uploadedAt: new Date().toISOString() }
      });
      out.saved = true;
      out.status = `zaprimljen PDF: ${out.name}`;
    } else {
      out.status = `PDF priložen, ali R2 binding nije dostupan: ${out.name}`;
    }
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
    out.status = `PDF priložen, ali R2 spremanje nije uspjelo: ${out.name}`;
  }

  return out;
}

async function sendInternalNotice(env, record, mailbox) {
  const text =
`GNK ASG - novi upit putem kontakt forme

Evidencijski broj:
${record.caseId}

Odabrana adresa / odjel:
${record.mailboxLabel}
${record.mailboxAddress}

Interno prosljeđivanje:
${INTERNAL_TO}

Vrijeme zaprimanja:
${record.receivedAt}

Podnositelj:
${record.name}

E-mail:
${record.email}

Telefon:
${record.phone || "-"}

Predmet:
${record.subject}

PDF:
${record.attachmentStatus}

Poruka:
${record.message}

---
${mailbox.signature}`;

  return await sendMailRaw(env, {
    to: INTERNAL_TO,
    from: mailbox.address,
    fromName: `GNK ASG ${mailbox.label}`,
    replyTo: record.email,
    subject: `[${record.caseId}] ${record.subject}`,
    text
  });
}

const GNK_ASG_CONTACT_HTML_CONFIRMATION_V1 = true;

function contactEscapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function contactConfirmationProfile(mailbox) {
  const key = String(mailbox?.address || "info@gnk-asg.hr")
    .split("@")[0]
    .toLowerCase();

  const profiles = {
    info: {
      name: "GNK ASG Info Desk",
      title: "Informacije i opći upiti"
    },
    contact: {
      name: "GNK ASG Contact Desk",
      title: "Kontakt i korisnička komunikacija"
    },
    it: {
      name: "IT – Osobni digitalni asistent",
      title: "Digitalna i tehnička podrška"
    },
    legal: {
      name: "GNK ASG Legal & Compliance",
      title: "Pravni i regulatorni poslovi"
    },
    privacy: {
      name: "GNK ASG Privacy Desk",
      title: "Privatnost i zaštita osobnih podataka"
    },
    media: {
      name: "GNK ASG Media Desk",
      title: "Mediji, objave i javne informacije"
    },
    press: {
      name: "GNK ASG Press Desk",
      title: "Odnosi s medijima"
    },
    ubo: {
      name: "GNK ASG UBO Desk",
      title: "Korporativni podaci"
    },
    sefic: {
      name: "Office of Nermin Sefić",
      title: "Ured direktora"
    },
    assistant: {
      name: "IT – Osobni digitalni asistent",
      title: "AI komunikacijska podrška"
    }
  };

  return profiles[key] || {
    name: `GNK ASG ${mailbox?.label || "Office"}`,
    title: "Korporativna komunikacija"
  };
}

async function sendAutoReply(env, record, mailbox) {
  const text =
`Poštovani/Poštovana ${record.name},

zaprimili smo Vaš upit: "${record.subject}".

Upit je zaprimljen za:
${record.mailboxLabel}
${record.mailboxAddress}

Kod nas je zaveden pod evidencijskim brojem:
${record.caseId}

Vrijeme zaprimanja:
${record.receivedAt}

PDF prilog:
${record.attachmentStatus}

Sačuvajte ovaj broj radi buduće komunikacije.

---
${mailbox.signature}

Ovo je automatska potvrda zaprimanja.`;

  const profile = contactConfirmationProfile(mailbox);
  const logoUrl = "https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png";

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f7fb;color:#111827;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7fb">
<tr>
<td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:720px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px">
<tr>
<td style="padding:30px 30px 12px">
<div style="font-size:18px;font-weight:700;color:#111827">Potvrda zaprimanja upita</div>
<div style="margin-top:4px;color:#9a7418;font-size:13px;font-weight:700">${contactEscapeHtml(record.caseId)}</div>
</td>
</tr>
<tr>
<td style="padding:8px 30px 24px;font-size:15px;color:#111827">
<p style="margin:0 0 16px">Poštovani/Poštovana ${contactEscapeHtml(record.name)},</p>
<p style="margin:0 0 16px">zaprimili smo Vaš upit: <strong>${contactEscapeHtml(record.subject)}</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px">
<tr>
<td style="padding:16px;font-size:13px;color:#374151">
<div style="margin-bottom:8px"><strong>Odjel:</strong> ${contactEscapeHtml(record.mailboxLabel)}</div>
<div style="margin-bottom:8px"><strong>Adresa:</strong> ${contactEscapeHtml(record.mailboxAddress)}</div>
<div style="margin-bottom:8px"><strong>Evidencijski broj:</strong> ${contactEscapeHtml(record.caseId)}</div>
<div style="margin-bottom:8px"><strong>Vrijeme zaprimanja:</strong> ${contactEscapeHtml(record.receivedAt)}</div>
<div><strong>PDF prilog:</strong> ${contactEscapeHtml(record.attachmentStatus)}</div>
</td>
</tr>
</table>
<p style="margin:18px 0 0">Sačuvajte evidencijski broj radi buduće komunikacije.</p>
</td>
</tr>
<tr>
<td style="padding:0 30px 30px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:2px solid #d4af37">
<tr>
<td width="175" valign="top" style="width:175px;padding:18px 22px 0 0">
<img src="${logoUrl}" alt="GNK ASG" width="155" style="display:block;width:155px;max-width:155px;height:auto;border:0;outline:none;text-decoration:none">
</td>
<td valign="top" style="padding:18px 0 0">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="color:#6b7280;font-size:13px;padding-bottom:8px">Srdačan pozdrav,</td></tr>
<tr><td style="color:#111827;font-size:16px;font-weight:700">${contactEscapeHtml(profile.name)}</td></tr>
<tr><td style="color:#9a7418;font-size:13px;font-weight:700;padding-bottom:10px">${contactEscapeHtml(profile.title)}</td></tr>
<tr><td style="color:#111827;font-size:13px;font-weight:700">GNK ASG d.o.o.</td></tr>
<tr><td style="color:#4b5563;font-size:12px">Zagrebačka cesta 130, 10090 Zagreb</td></tr>
<tr><td style="color:#4b5563;font-size:12px">OIB: 75227917632 · MBS: 081512375</td></tr>
<tr><td style="padding-top:6px;font-size:12px"><a href="mailto:${contactEscapeHtml(mailbox.address)}" style="color:#9a7418;text-decoration:none">${contactEscapeHtml(mailbox.address)}</a></td></tr>
<tr><td style="font-size:12px"><a href="https://gnk-asg.hr" style="color:#9a7418;text-decoration:none">gnk-asg.hr</a> · <a href="tel:+385915358365" style="color:#9a7418;text-decoration:none">091 535 8365</a></td></tr>
</table>
</td>
</tr>
</table>
<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px;line-height:1.45">
Ovo je automatska potvrda zaprimanja. Informacije u poruci ne predstavljaju pravni, financijski ni investicijski savjet.
</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

  return await sendMailRaw(env, {
    to: record.email,
    from: mailbox.address,
    fromName: `GNK ASG ${mailbox.label}`,
    replyTo: mailbox.address,
    subject: `[${record.caseId}] Potvrda zaprimanja upita`,
    text,
    html,
    autoReply: true
  });
}

function publicMailboxes() {
  return Object.entries(MAILBOXES).map(([key, value]) => ({ key, address: value.address, label: value.label, signature: value.signature }));
}

function defaultSignatures() {
  const obj = {};
  for (const [key, value] of Object.entries(MAILBOXES)) obj[key] = value.signature;
  return obj;
}

function safeMailbox(value) {
  const key = String(value || "info").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "");
  return MAILBOXES[key] ? key : "info";
}

function tokenOk(request, env) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";
  const supplied = bearer || queryToken;
  const expected = env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_ADMIN_TOKEN || env.PORTAL_OPERATOR_TOKEN || "";
  return Boolean(expected && supplied && supplied === expected);
}

async function getSignature(env, mailboxKey, fallback) {
  try {
    if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.get === "function") {
      const raw = await env.GNK_ASG_KV.get(`operator:signature:${mailboxKey}`);
      if (raw) return raw;
    }
  } catch (e) {}
  return fallback;
}

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function encodeHeader(value) {
  return `=?UTF-8?B?${utf8Base64(String(value || "").replace(/\r|\n/g, " "))}?=`;
}

function foldBase64(value) {
  return String(value || "").replace(/(.{76})/g, "$1\r\n");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sendMailRaw(env, data) {
  const result = { attempted: false, sent: false, error: null, messageId: null };

  try {
    if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
      result.error = "EMAIL binding nije dostupan.";
      return result;
    }

    result.attempted = true;

    const boundary = `gnk_asg_${crypto.randomUUID().replace(/-/g, "")}`;
    const safeFile = data.attachment ? String(data.attachment.filename || "attachment.pdf").replace(/"/g, "") : null;

    let raw = "";
    raw += `From: ${encodeHeader(data.fromName || data.from)} <${data.from}>\r\n`;
    raw += `To: ${data.to}\r\n`;
    raw += `Reply-To: ${data.replyTo || data.from}\r\n`;
    raw += `Subject: ${encodeHeader(data.subject)}\r\n`;
    raw += `MIME-Version: 1.0\r\n`;

    if (data.autoReply) {
      raw += `Auto-Submitted: auto-replied\r\n`;
      raw += `X-Auto-Response-Suppress: All\r\n`;
    }

    if (data.attachment) {
      raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: text/plain; charset=UTF-8\r\n`;
      raw += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      raw += `${data.text}\r\n\r\n`;
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: application/pdf; name="${safeFile}"\r\n`;
      raw += `Content-Disposition: attachment; filename="${safeFile}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n\r\n`;
      raw += `${foldBase64(data.attachment.base64)}\r\n`;
      raw += `--${boundary}--\r\n`;
    } else if (data.html) {
      const alternativeBoundary = `gnk_asg_alt_${crypto.randomUUID().replace(/-/g, "")}`;
      raw += `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"\r\n\r\n`;
      raw += `--${alternativeBoundary}\r\n`;
      raw += `Content-Type: text/plain; charset=UTF-8\r\n`;
      raw += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      raw += `${data.text}\r\n\r\n`;
      raw += `--${alternativeBoundary}\r\n`;
      raw += `Content-Type: text/html; charset=UTF-8\r\n`;
      raw += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      raw += `${data.html}\r\n\r\n`;
      raw += `--${alternativeBoundary}--\r\n`;
    } else {
      raw += `Content-Type: text/plain; charset=UTF-8\r\n`;
      raw += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      raw += `${data.text}\r\n`;
    }

    const message = new EmailMessage(data.from, data.to, raw);
    const response = await env.EMAIL.send(message);
    result.sent = true;
    result.messageId = response && response.messageId ? response.messageId : null;
  } catch (err) {
    result.error = String(err && err.message ? err.message : err);
  }

  return result;
}

async function updateIndex(env, indexKey, item) {
  let index = [];
  try {
    const raw = env.GNK_ASG_KV && await env.GNK_ASG_KV.get(indexKey);
    if (raw) {
      try { index = JSON.parse(raw); } catch (e) { index = []; }
    }
    index = index.filter(x => x.key !== item.key);
    index.unshift(item);
    index = index.slice(0, 300);
    await env.GNK_ASG_KV.put(indexKey, JSON.stringify(index, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      ...corsHeaders()
    }
  });
}