#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleMailContactRoute } from "../workers/gnk-asg-direct-operator/src/gnk-asg-mail-contact-v1.js";

class MockEmailMessage {
  constructor(from, to, raw) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}

globalThis.EmailMessage = MockEmailMessage;

class MockKV {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
}

class MockStatement {
  constructor(database, sql) { this.database = database; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() { this.database.runs.push({ sql:this.sql, args:this.args }); return { success:true }; }
}

class MockD1 {
  constructor() { this.runs = []; }
  prepare(sql) { return new MockStatement(this, sql); }
}

class MockR2 {
  constructor() { this.objects = new Map(); }
  async put(key, value, options) { this.objects.set(key, { value, options }); }
}

const sent = [];
const env = {
  OPERATOR_TOKEN: "test-operator-token-gnk-asg",
  CONTACT_INTERNAL_TO: "rht@gmx.com",
  MAIL_TEST_TO: "rht@gmx.com",
  GNK_ASG_KV: new MockKV(),
  GNK_ASG_D1: new MockD1(),
  GNK_ASG_MEDIA_ASSETS: new MockR2(),
  EMAIL: { async send(message) { sent.push(message); } }
};

const statusResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/api/contact-submit"), env, {});
assert.equal(statusResponse.status, 200);
const status = await statusResponse.json();
assert.equal(status.ok, true);
assert.equal(status.mail.binding, true);
assert.equal(status.mail.messageClass, true);
assert.equal(status.departments.it, "it@gnk-asg.hr");

const form = new FormData();
form.set("mailbox", "it");
form.set("department", "IT — it@gnk-asg.hr");
form.set("name", "GNK ASG Test");
form.set("email", "test@example.com");
form.set("phone", "+385 91 000 0000");
form.set("subject", "Funkcionalni test mail sustava");
form.set("message", "Ovo je automatizirani test kontaktnog i mail toka.");
form.set("consent", "yes");
form.set("website", "");
form.set("pdf", new Blob(["%PDF-1.4\nGNK ASG test"], { type:"application/pdf" }), "gnk-asg-test.pdf");

const contactResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/api/contact-submit", {
  method:"POST",
  body:form
}), env, {});
assert.equal(contactResponse.status, 200);
const contact = await contactResponse.json();
assert.equal(contact.ok, true);
assert.match(contact.caseId, /^GNK-ASG-\d{8}-[A-F0-9]{8}$/);
assert.equal(contact.mail.internalNotification.sent, true);
assert.equal(contact.mail.automaticReply.sent, true);
assert.equal(contact.mail.status, "mail_sent");
assert.equal(contact.storage.kvSaved, true);
assert.equal(contact.storage.d1Saved, true);
assert.equal(contact.attachment.saved, true);
assert.equal(sent.length, 2);
assert.equal(sent[0].from, "it@gnk-asg.hr");
assert.equal(sent[0].to, "rht@gmx.com");
assert.equal(sent[1].to, "test@example.com");
assert.match(sent[0].raw, /Evidencijski broj:/);
assert.match(sent[1].raw, /Potvrda zaprimanja/);

const authHeaders = { "content-type":"application/json", "x-operator-token":"test-operator-token-gnk-asg" };
const dryRunResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/operator/mail/test", {
  method:"POST",
  headers:authHeaders,
  body:JSON.stringify({ mode:"dry-run", mailbox:"assistant" })
}), env, {});
assert.equal(dryRunResponse.status, 200);
const dryRun = await dryRunResponse.json();
assert.equal(dryRun.ok, true);
assert.equal(dryRun.mode, "dry-run");
assert.equal(dryRun.to, "rht@gmx.com");
assert.equal(sent.length, 2);

const deniedResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/operator/mail/test", {
  method:"POST",
  headers:authHeaders,
  body:JSON.stringify({ mode:"send", mailbox:"assistant", recipient:"third-party@example.com" })
}), env, {});
assert.equal(deniedResponse.status, 403);
assert.equal(sent.length, 2);

const sendResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/operator/mail/test", {
  method:"POST",
  headers:authHeaders,
  body:JSON.stringify({ mode:"send", mailbox:"assistant", recipient:"rht@gmx.com" })
}), env, {});
assert.equal(sendResponse.status, 200);
const delivery = await sendResponse.json();
assert.equal(delivery.ok, true);
assert.equal(delivery.delivery.sent, true);
assert.equal(sent.length, 3);
assert.equal(sent[2].from, "assistant@gnk-asg.hr");
assert.equal(sent[2].to, "rht@gmx.com");

const unauthorizedResponse = await handleMailContactRoute(new Request("https://gnk-asg.hr/operator/mail/status"), env, {});
assert.equal(unauthorizedResponse.status, 401);

console.log("GNK ASG mail/contact validation: OK");
