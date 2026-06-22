const CONTACT_DEPARTMENTS = Object.freeze({
  info: "info@gnk-asg.hr",
  contact: "contact@gnk-asg.hr",
  it: "it@gnk-asg.hr",
  legal: "legal@gnk-asg.hr",
  privacy: "privacy@gnk-asg.hr",
  media: "media@gnk-asg.hr",
  press: "press@gnk-asg.hr",
  ubo: "ubo@gnk-asg.hr",
  sefic: "sefic@gnk-asg.hr",
  assistant: "assistant@gnk-asg.hr"
});

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "access-control-allow-origin": "https://gnk-asg.hr",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-operator-token,x-admin-token"
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });
}

function nowIso() {
  return new Date().toISOString();
}

function cleanHeader(value, fallback = "") {
  return String(value || fallback).replace(/[\r\n]+/g, " ").trim().slice(0, 240);
}

function cleanText(value, max = 12000) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function tokenFrom(request) {
  const bearer = request.headers.get("authorization") || "";
  return request.headers.get("x-operator-token") || request.headers.get("x-admin-token") || bearer.replace(/^Bearer\s+/i, "") || "";
}

function expectedToken(env) {
  return env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_ADMIN_TOKEN || "";
}

function authorized(request, env) {
  const expected = expectedToken(env);
  const supplied = tokenFrom(request);
  return Boolean(expected && supplied && expected === supplied);
}

function mailboxFor(value) {
  const key = String(value || "info").toLowerCase().trim();
  return { key: CONTACT_DEPARTMENTS[key] ? key : "info", address: CONTACT_DEPARTMENTS[key] || CONTACT_DEPARTMENTS.info };
}

function emailCapability(env) {
  return {
    binding: Boolean(env && env.EMAIL && typeof env.EMAIL.send === "function"),
    messageClass: typeof globalThis.EmailMessage === "function"
  };
}

function rawMessage({ from, to, replyTo, subject, body }) {
  const lines = [
    `From: GNK ASG <${cleanHeader(from)}>`,
    `To: ${cleanHeader(to)}`,
    replyTo ? `Reply-To: ${cleanHeader(replyTo)}` : null,
    `Subject: ${cleanHeader(subject, "GNK ASG poruka")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    cleanText(body, 24000)
  ].filter((line) => line !== null);
  return lines.join("\r\n");
}

async function sendMail(env, payload) {
  const capability = emailCapability(env);
  if (!capability.binding || !capability.messageClass) {
    return { attempted: false, sent: false, error: "email_binding_or_message_class_missing" };
  }

  try {
    const message = new globalThis.EmailMessage(
      cleanHeader(payload.from),
      cleanHeader(payload.to),
      rawMessage(payload)
    );
    await env.EMAIL.send(message);
    return { attempted: true, sent: true, error: null };
  } catch (error) {
    return { attempted: true, sent: false, error: String(error && error.message || error) };
  }
}

async function kvPut(env, key, value) {
  if (!env.GNK_ASG_KV || typeof env.GNK_ASG_KV.put !== "function") return false;
  await env.GNK_ASG_KV.put(key, JSON.stringify(value, null, 2));
  return true;
}

async function appendLog(env, key, item, limit = 100) {
  if (!env.GNK_ASG_KV || typeof env.GNK_ASG_KV.get !== "function" || typeof env.GNK_ASG_KV.put !== "function") return false;
  let list = [];
  try {
    const raw = await env.GNK_ASG_KV.get(key);
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.unshift(item);
  await env.GNK_ASG_KV.put(key, JSON.stringify(list.slice(0, limit), null, 2));
  return true;
}

async function saveD1(env, record) {
  if (!env.GNK_ASG_D1 || typeof env.GNK_ASG_D1.prepare !== "function") return false;
  await env.GNK_ASG_D1.prepare(
    "CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, department TEXT, mailbox TEXT, subject TEXT, message TEXT, attachment_key TEXT, attachment_name TEXT, status TEXT, raw_json TEXT)"
  ).run();
  await env.GNK_ASG_D1.prepare(
    "INSERT OR REPLACE INTO contact_messages (case_id, received_at, name, email, phone, department, mailbox, subject, message, attachment_key, attachment_name, status, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    record.caseId,
    record.receivedAt,
    record.name,
    record.email,
    record.phone,
    record.department,
    record.mailbox,
    record.subject,
    record.message,
    record.attachmentKey,
    record.attachmentName,
    record.status,
    JSON.stringify(record, null, 2)
  ).run();
  return true;
}

async function savePdf(env, file, caseId) {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || Number(file.size || 0) === 0) {
    return { supplied: false, saved: false, key: null, name: null, size: 0, error: null };
  }

  const name = cleanHeader(file.name || "attachment.pdf", "attachment.pdf");
  const size = Number(file.size || 0);
  const type = String(file.type || "").toLowerCase();
  if (!name.toLowerCase().endsWith(".pdf") && type !== "application/pdf") throw new Error("Dopušten je samo PDF dokument.");
  if (size > 10 * 1024 * 1024) throw new Error("PDF dokument je veći od 10 MB.");

  const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
  const key = `contact-pdf/${caseId}/${safeName}`;
  if (!env.GNK_ASG_MEDIA_ASSETS || typeof env.GNK_ASG_MEDIA_ASSETS.put !== "function") {
    return { supplied: true, saved: false, key, name, size, error: "r2_binding_missing" };
  }

  await env.GNK_ASG_MEDIA_ASSETS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: { caseId, originalName: name, uploadedAt: nowIso() }
  });
  return { supplied: true, saved: true, key, name, size, error: null };
}

function caseId() {
  const date = nowIso().slice(0, 10).replace(/-/g, "");
  return `GNK-ASG-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function departmentLabel(mailbox, supplied) {
  return cleanHeader(supplied || `${mailbox.key.toUpperCase()} — ${mailbox.address}`, `${mailbox.key.toUpperCase()} — ${mailbox.address}`);
}

async function contactStatus(env) {
  const capability = emailCapability(env);
  return json({
    ok: true,
    endpoint: "/api/contact-submit",
    status: "READY",
    accepts: "multipart/form-data",
    maxPdfBytes: 10485760,
    mail: {
      binding: capability.binding,
      messageClass: capability.messageClass,
      internalRecipientConfigured: Boolean(env.CONTACT_INTERNAL_TO || env.CONTACT_TO_EMAIL),
      autoReplyEnabled: String(env.CONTACT_AUTOREPLY_DISABLED || "false").toLowerCase() !== "true"
    },
    departments: CONTACT_DEPARTMENTS,
    updatedAt: nowIso()
  });
}

async function submitContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_multipart_form" }, 400);
  }

  const honeypot = cleanText(form.get("website"), 200);
  if (honeypot) return json({ ok: false, error: "spam_rejected" }, 400);

  const selected = mailboxFor(form.get("mailbox"));
  const name = cleanText(form.get("name"), 240);
  const email = cleanHeader(form.get("email"), "");
  const phone = cleanHeader(form.get("phone"), "");
  const subject = cleanHeader(form.get("subject"), "Upit putem GNK ASG portala");
  const message = cleanText(form.get("message"), 12000);
  const consent = String(form.get("consent") || "").toLowerCase();
  const department = departmentLabel(selected, form.get("department"));

  if (!name || !validEmail(email) || !subject || !message || consent !== "yes") {
    return json({ ok: false, error: "missing_or_invalid_required_fields" }, 400);
  }

  const id = caseId();
  let attachment;
  try {
    attachment = await savePdf(env, form.get("pdf"), id);
  } catch (error) {
    return json({ ok: false, error: String(error && error.message || error) }, 400);
  }

  const record = {
    caseId: id,
    receivedAt: nowIso(),
    name,
    email,
    phone,
    department,
    mailbox: selected.address,
    subject,
    message,
    consent: true,
    attachmentKey: attachment.key,
    attachmentName: attachment.name,
    attachmentSize: attachment.size,
    attachmentSaved: attachment.saved,
    status: "received",
    source: "public-contact-form-v1"
  };

  let kvSaved = false;
  let d1Saved = false;
  let storageError = null;
  try {
    kvSaved = await kvPut(env, `contact:${id}`, record);
    await kvPut(env, "contact:last", record);
    await appendLog(env, "contact:index", { caseId:id, receivedAt:record.receivedAt, mailbox:record.mailbox, subject:record.subject, status:record.status }, 500);
  } catch (error) {
    storageError = String(error && error.message || error);
  }
  try {
    d1Saved = await saveD1(env, record);
  } catch (error) {
    storageError = storageError || String(error && error.message || error);
  }

  const internalRecipient = cleanHeader(env.CONTACT_INTERNAL_TO || env.CONTACT_TO_EMAIL || "rht@gmx.com");
  const fromAddress = cleanHeader(env.CONTACT_FROM_EMAIL || selected.address);
  const attachmentText = attachment.supplied
    ? `${attachment.saved ? "spremljen" : "nije spremljen"}: ${attachment.name || "PDF"}${attachment.key ? ` (${attachment.key})` : ""}`
    : "nije priložen";

  const internal = await sendMail(env, {
    from: fromAddress,
    to: internalRecipient,
    replyTo: email,
    subject: `[${id}] ${subject}`,
    body: [
      "Zaprimljen je novi upit putem GNK ASG kontakt forme.",
      "",
      `Evidencijski broj: ${id}`,
      `Vrijeme: ${record.receivedAt}`,
      `Odjel: ${department}`,
      `Mailbox: ${selected.address}`,
      `Ime/naziv: ${name}`,
      `E-mail: ${email}`,
      `Telefon: ${phone || "nije navedeno"}`,
      `PDF: ${attachmentText}`,
      "",
      "Poruka:",
      message
    ].join("\n")
  });

  const autoReplyEnabled = String(env.CONTACT_AUTOREPLY_DISABLED || "false").toLowerCase() !== "true";
  const autoReply = autoReplyEnabled
    ? await sendMail(env, {
        from: fromAddress,
        to: email,
        replyTo: selected.address,
        subject: `Potvrda zaprimanja [${id}]`,
        body: [
          `Poštovani/Poštovana ${name},`,
          "",
          "potvrđujemo da je Vaš upit zaprimljen u sustav GNK ASG.",
          `Evidencijski broj: ${id}`,
          `Odabrani odjel: ${department}`,
          "",
          "Na ovu automatsku potvrdu nije potrebno odgovarati. Odgovor će biti dostavljen nakon pregleda upita.",
          "",
          "GNK ASG d.o.o."
        ].join("\n")
      })
    : { attempted:false, sent:false, error:"auto_reply_disabled" };

  record.status = internal.sent && (!autoReplyEnabled || autoReply.sent) ? "mail_sent" : internal.attempted || autoReply.attempted ? "mail_partial" : "stored_only";
  record.mail = { internal, autoReply, internalRecipient, fromAddress };
  try {
    await kvPut(env, `contact:${id}`, record);
    await kvPut(env, "contact:last", record);
    await appendLog(env, "mail:contact:log", { caseId:id, time:nowIso(), status:record.status, internal, autoReply }, 200);
  } catch {}

  return json({
    ok: true,
    caseId: id,
    referenceNumber: id,
    receivedAt: record.receivedAt,
    mailbox: selected.address,
    department,
    attachment: attachment,
    storage: { kvSaved, d1Saved, error:storageError },
    mail: {
      attempted: internal.attempted || autoReply.attempted,
      internalNotification: internal,
      automaticReply: autoReply,
      status: record.status
    }
  });
}

async function operatorMailStatus(request, env) {
  if (!authorized(request, env)) return json({ ok:false, error:"unauthorized" }, 401);
  const capability = emailCapability(env);
  return json({
    ok: true,
    service: "GNK ASG Mail Diagnostics V1",
    emailBinding: capability.binding,
    emailMessageClass: capability.messageClass,
    internalRecipient: env.CONTACT_INTERNAL_TO || env.CONTACT_TO_EMAIL || "rht@gmx.com",
    testRecipient: env.MAIL_TEST_TO || "rht@gmx.com",
    departments: CONTACT_DEPARTMENTS,
    modes: ["dry-run", "send"],
    updatedAt: nowIso()
  });
}

async function operatorMailTest(request, env) {
  if (!authorized(request, env)) return json({ ok:false, error:"unauthorized" }, 401);
  let body = {};
  try { body = await request.json(); } catch {}

  const mode = String(body.mode || "dry-run").toLowerCase();
  const selected = mailboxFor(body.mailbox);
  const allowedRecipient = cleanHeader(env.MAIL_TEST_TO || "rht@gmx.com");
  const requestedRecipient = cleanHeader(body.recipient || allowedRecipient);
  if (requestedRecipient.toLowerCase() !== allowedRecipient.toLowerCase()) {
    return json({ ok:false, error:"recipient_not_allowlisted", allowedRecipient }, 403);
  }

  const payload = {
    from: cleanHeader(env.CONTACT_FROM_EMAIL || selected.address),
    to: allowedRecipient,
    replyTo: selected.address,
    subject: `[TEST] GNK ASG mail provjera ${nowIso()}`,
    body: [
      "GNK ASG kontrolirani test mail sustava.",
      `Vrijeme: ${nowIso()}`,
      `Mailbox: ${selected.address}`,
      `Način: ${mode}`,
      "Ova poruka ne predstavlja javnu objavu niti poslovnu odluku."
    ].join("\n")
  };

  if (mode !== "send") {
    const result = { ok:true, mode:"dry-run", wouldSend:true, from:payload.from, to:payload.to, subject:payload.subject, emailCapability:emailCapability(env) };
    await kvPut(env, "mail:test:last", { ...result, time:nowIso() }).catch(() => false);
    return json(result);
  }

  const delivery = await sendMail(env, payload);
  const result = { ok:delivery.sent, mode:"send", from:payload.from, to:payload.to, subject:payload.subject, delivery, time:nowIso() };
  await kvPut(env, "mail:test:last", result).catch(() => false);
  await appendLog(env, "mail:test:log", result, 100).catch(() => false);
  return json(result, delivery.sent ? 200 : 502);
}

async function handleMailContactRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS" && (path === "/api/contact-submit" || path.startsWith("/operator/mail"))) {
    return new Response(null, { status:204, headers:JSON_HEADERS });
  }
  if (path === "/api/contact-submit" && request.method === "GET") return contactStatus(env);
  if (path === "/api/contact-submit" && request.method === "POST") return submitContact(request, env);
  if (path === "/operator/mail/status" && request.method === "GET") return operatorMailStatus(request, env);
  if (path === "/operator/mail/test" && request.method === "POST") return operatorMailTest(request, env);
  return null;
}

export { CONTACT_DEPARTMENTS, handleMailContactRoute };
