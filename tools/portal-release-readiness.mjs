#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const portal = path.join(root, "apps/portal");
const out = path.join(root, "reports/release-readiness");
const findings = [];

function read(file) {
  const full = path.join(portal, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "") : null;
}

function add(severity, code, file, message) {
  findings.push({ severity, code, file, message });
}

function checkFile(file) {
  const html = read(file);
  if (html == null) add("error", "MISSING_FILE", file, "Required file is missing.");
  return html;
}

function has(html, pattern) {
  return pattern.test(String(html || ""));
}

function canonical(html) {
  return String(html || "").match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
}

const pairs = [
  ["contact/index.html", "en/contact/index.html", "https://gnk-asg.hr/contact/", "https://gnk-asg.hr/en/contact/"],
  ["vijesti/index.html", "news/index.html", "https://gnk-asg.hr/vijesti/", "https://gnk-asg.hr/news/"],
  ["trzista/index.html", "markets/index.html", "https://gnk-asg.hr/trzista/", "https://gnk-asg.hr/markets/"],
  ["objave/index.html", "publications/index.html", "https://gnk-asg.hr/objave/", "https://gnk-asg.hr/publications/"],
  ["assistant/index.html", "en/assistant/index.html", "https://gnk-asg.hr/assistant/", "https://gnk-asg.hr/en/assistant/"],
  ["legal/index.html", "en/legal/index.html", "https://gnk-asg.hr/legal/", "https://gnk-asg.hr/en/legal/"],
  ["financije/index.html", "financials/index.html", "https://gnk-asg.hr/financije/", "https://gnk-asg.hr/financials/"],
  ["mreza/index.html", "network/index.html", "https://gnk-asg.hr/mreza/", "https://gnk-asg.hr/network/"]
];

for (const [hrFile, enFile, hrCanonical, enCanonical] of pairs) {
  const hr = checkFile(hrFile);
  const en = checkFile(enFile);
  if (!hr || !en) continue;
  if (!has(hr, /<html[^>]+lang=["']hr/i)) add("error", "HR_LANG", hrFile, "Croatian language declaration is missing.");
  if (!has(en, /<html[^>]+lang=["']en/i)) add("error", "EN_LANG", enFile, "English language declaration is missing.");
  if (!has(hr, /name=["']viewport["']/i)) add("error", "VIEWPORT", hrFile, "Mobile viewport is missing.");
  if (!has(en, /name=["']viewport["']/i)) add("error", "VIEWPORT", enFile, "Mobile viewport is missing.");
  if (canonical(hr) !== hrCanonical) add("error", "CANONICAL", hrFile, `Expected ${hrCanonical}.`);
  if (canonical(en) !== enCanonical) add("error", "CANONICAL", enFile, `Expected ${enCanonical}.`);
}

const shellPages = [
  "contact/index.html", "en/contact/index.html", "vijesti/index.html", "news/index.html",
  "trzista/index.html", "markets/index.html", "publications/index.html",
  "assistant/index.html", "en/assistant/index.html", "legal/index.html", "en/legal/index.html",
  "financije/index.html", "financials/index.html", "mreza/index.html", "network/index.html"
];

for (const file of shellPages) {
  const html = checkFile(file);
  if (html && !html.includes("asg-mobile-nav")) add("error", "MOBILE_NAV", file, "Shared mobile navigation is missing.");
}

for (const file of ["contact/index.html", "en/contact/index.html"]) {
  const html = checkFile(file);
  if (!html) continue;
  const rules = [
    [/name=["']mailbox["']/i, "mailbox selector"],
    [/name=["']pdf["']/i, "PDF attachment"],
    [/name=["']consent["']/i, "privacy consent"],
    [/\/api\/contact-submit/i, "contact API"],
    [/data\.set\(["']department["']/i, "department compatibility"],
    [/payload\.caseId/i, "case reference"]
  ];
  for (const [rule, label] of rules) if (!rule.test(html)) add("error", "CONTACT_CONTRACT", file, `Missing ${label}.`);
}

for (const file of ["vijesti/index.html", "news/index.html"]) {
  const html = checkFile(file);
  if (!html) continue;
  if (!html.includes("/data/news.json")) add("error", "NEWS_ENDPOINT", file, "Shared news endpoint is missing.");
  if (!html.includes("SNAPSHOT") || !html.includes("FALLBACK")) add("error", "NEWS_STATUS", file, "Transparent news statuses are incomplete.");
}

for (const file of ["trzista/index.html", "markets/index.html"]) {
  const html = checkFile(file);
  if (!html) continue;
  if (!html.includes("/api/market") && !html.includes("/data/market.json")) add("error", "MARKET_ENDPOINT", file, "Shared market endpoint is missing.");
  for (const status of ["LIVE", "DELAYED", "SNAPSHOT", "FALLBACK"]) {
    if (!html.includes(status)) add("error", "MARKET_STATUS", file, `Missing ${status} handling.`);
  }
}

for (const file of ["ai/index.html", "control/index.html", "mail-studio/index.html", "auto-editor/index.html"]) {
  const html = checkFile(file);
  if (!html) continue;
  if (!/noindex/i.test(html)) add("error", "PROTECTED_INDEXABLE", file, "Protected route is indexable.");
  if (!html.includes("/operator-dashboard/")) add("error", "PROTECTED_REDIRECT", file, "Protected route does not point to the dashboard.");
}

const runtime = fs.readFileSync(path.join(root, "workers/gnk-asg-direct-operator/src/runtime-entry.js"), "utf8");
const wrangler = fs.readFileSync(path.join(root, "workers/gnk-asg-direct-operator/wrangler.toml"), "utf8");
if (!runtime.includes('"/api/market": "/data/market.json"')) add("error", "MARKET_ALIAS", "runtime-entry.js", "Market API alias is missing.");
if (!runtime.includes("handleRefreshRoute(refreshRequestFor(request), env, ctx)")) add("error", "ROUTE_ORDER", "runtime-entry.js", "Refresh routes are not evaluated first.");
if (!wrangler.includes('crons = ["*/15 * * * *"]')) add("error", "CRON", "wrangler.toml", "15-minute cron is missing.");

const homepage = checkFile("index.html");
if (homepage) {
  const links = [...homepage.matchAll(/<a[^>]+href=["']\/mobile-app\/["']/gi)].length;
  if (links > 1) add("warning", "KNOWN_INSTALL_DEBT", "index.html", `${links} legacy /mobile-app/ links remain in the homepage generator.`);
}

const signatureFile = ".github/prep/mail_signature_templates.html";
const signature = checkFile(signatureFile);
if (signature) {
  if (!has(signature, /name=["']viewport["']/i)) add("error", "SIGNATURE_VIEWPORT", signatureFile, "Internal signature preview requires a mobile viewport.");
  if (!has(signature, /name=["']robots["'][^>]+noindex/i)) add("error", "SIGNATURE_NOINDEX", signatureFile, "Internal signature preview must remain noindex.");
  const requiredSignatureText = [
    "GNK ASG Digital Assistant",
    "u ime Nermina Sefića, direktora",
    "on behalf of Nermin Sefic, Director",
    "assistant@gnk-asg.hr",
    "https://gnk-asg.hr",
    "potrebna je izričita potvrda ovlaštene osobe",
    "require explicit confirmation by an authorised person"
  ];
  for (const text of requiredSignatureText) {
    if (!signature.includes(text)) add("error", "SIGNATURE_CONTENT", signatureFile, `Required approved signature text is missing: ${text}`);
  }
  if (/<script\b|portal-shell|global-layer|gnk-global-float|gnk-asg-ai-hidden-duplicate/i.test(signature)) {
    add("error", "SIGNATURE_PREVIEW_ISOLATION", signatureFile, "Signature preparation file contains public portal, navigation or AI runtime layers.");
  }
}

const summary = findings.reduce((result, item) => {
  result[item.severity] = (result[item.severity] || 0) + 1;
  return result;
}, { error: 0, warning: 0 });

const status = summary.error > 0 ? "NOT_READY" : summary.warning > 0 ? "READY_WITH_KNOWN_WARNINGS" : "READY";
const result = { generatedAt: new Date().toISOString(), status, summary, checkedPairs: pairs.length, findings };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "release-readiness.json"), `${JSON.stringify(result, null, 2)}\n`);

const lines = [
  "# GNK ASG Release Readiness", "", `Generated: ${result.generatedAt}`, "",
  `- Status: **${status}**`, `- Errors: ${summary.error}`, `- Warnings: ${summary.warning}`, `- HR/EN pairs: ${pairs.length}`, "", "## Findings", ""
];
if (!findings.length) lines.push("No findings.");
for (const item of findings) lines.push(`- **${item.severity.toUpperCase()} ${item.code}** — ${item.file} — ${item.message}`);
fs.writeFileSync(path.join(out, "release-readiness.md"), `${lines.join("\n")}\n`);
console.log(`GNK ASG release readiness: ${status}; ${summary.error} error(s), ${summary.warning} warning(s).`);
if (summary.error > 0) process.exit(1);
