#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const portal = path.join(root, "apps", "portal");

function read(relative) {
  return fs.readFileSync(path.join(portal, relative), "utf8").replace(/^\uFEFF/, "");
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function localTargetExists(target) {
  const clean = target.split(/[?#]/)[0];
  if (!clean.startsWith("/")) return true;
  const relative = clean.replace(/^\/+/, "");
  if (!relative) return fs.existsSync(path.join(portal, "index.html"));
  const direct = path.join(portal, relative);
  const index = path.join(portal, relative, "index.html");
  return fs.existsSync(direct) || fs.existsSync(index);
}

const html = read("index.html");
const css = read("assets/homepage-polish.css");
const js = read("assets/homepage-polish.js");

assert.match(html, /<html[^>]+lang="hr"/i, "Homepage must declare Croatian language.");
assert.match(html, /<meta[^>]+name="viewport"/i, "Homepage mobile viewport is required.");
assert.match(html, /<link[^>]+rel="canonical"[^>]+https:\/\/gnk-asg\.hr\//i, "Homepage canonical is required.");
assert.match(html, /hreflang="en"[^>]+https:\/\/gnk-asg\.hr\/en\//i, "English hreflang is required.");

assert.equal(count(html, /id="navLinks"/g), 1, "Exactly one desktop navigation must exist.");
assert.equal(count(html, /id="mobileNav"/g), 1, "Exactly one mobile navigation must exist.");
assert.equal(count(html, /id="gnkHomeHero"/g), 1, "Exactly one homepage hero must exist.");
assert.equal(count(html, /id="gnkHomeOverview"/g), 1, "Exactly one operational overview must exist.");
assert.equal(count(html, /id="gnkHomeConsoleStatus"/g), 1, "Exactly one global status badge must exist.");
assert.equal(count(html, /class="gnk-home-network"/g), 1, "Exactly one network visual must exist.");

for (const legacy of [
  "gnk-asg-menu-restore-final",
  "gnk-asg-final-menu-wrap",
  "gnk-asg-ai-help-float",
  "GNK_ASG_DESKTOP_MENU_RESTORE_FINAL",
  "GNK_ASG_GLOBAL_FLOAT_HOME_AI",
  "/mobile-app/",
  "assets/app.js",
  "asg-btc-ref",
  "asg-gold-ref"
]) {
  assert.equal(html.includes(legacy), false, `Legacy homepage marker must be removed: ${legacy}`);
}

assert.match(html, /href="\/instalacija\/"/i, "PWA installation route is required.");
assert.match(html, /href="\/operator-dashboard\/"/i, "Operator Center route is required.");
assert.match(html, /href="\/assistant\/"/i, "AI assistant route is required.");
assert.match(html, /href="\/objave\/"/i, "Publications route is required.");
assert.match(html, /href="\/vijesti\/"/i, "News route is required.");
assert.match(html, /href="\/trzista\/"/i, "Markets route is required.");
assert.match(html, /href="\/contact\/"/i, "Contact route is required.");

for (const id of [
  "financials",
  "o-nama",
  "grupa",
  "moduli",
  "trzisni-pregled",
  "dokumenti",
  "zavrsni-modul"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Homepage section is missing: ${id}`);
}

assert.match(html, /\/assets\/homepage-polish\.css\?v=/, "Homepage stylesheet must be loaded directly.");
assert.match(html, /\/assets\/homepage-polish\.js\?v=/, "Homepage script must be loaded directly.");
assert.match(css, /body\.gnk-home-polish/, "Homepage scoped body contrast rules are required.");
assert.match(css, /\.gnk-home-hero/, "Premium hero styling is required.");
assert.match(css, /\.gnk-home-overview-card/, "Operational overview card styling is required.");
assert.match(css, /color:#07162d|color:var\(--gnk-ink\)/, "Dark text contrast rule is required.");
assert.match(css, /@media\(max-width:680px\)/, "Mobile layout rules are required.");

assert.match(js, /for\(var i=0;i<80;i\+\+\)/, "Network visual must create 80 nodes.");
assert.match(js, /\/api\/backend-status/, "Backend status endpoint is required.");
assert.match(js, /\/api\/market/, "Market endpoint is required.");
assert.match(js, /\/data\/news\.json/, "News endpoint is required.");
assert.match(js, /\/api\/contact-submit/, "Contact endpoint is required.");
assert.match(js, /setInterval\(refreshAll,5\*60\*1000\)/, "Five-minute homepage status refresh is required.");
assert.match(js, /mobileNav/, "Mobile navigation binding is required.");
assert.match(js, /UNAVAILABLE/, "Unavailable state must be handled.");
assert.match(js, /FALLBACK/, "Fallback state must be handled.");
assert.match(js, /SNAPSHOT/, "Snapshot state must be handled.");
assert.match(js, /DELAYED/, "Delayed state must be handled.");

const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const localPages = hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/#"));
const missing = [...new Set(localPages.filter((href) => !localTargetExists(href)))];
assert.deepEqual(missing, [], `Homepage contains missing local targets: ${missing.join(", ")}`);

const assetRefs = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
const missingAssets = [...new Set(assetRefs.filter((ref) => !localTargetExists(ref)))];
assert.deepEqual(missingAssets, [], `Homepage contains missing assets: ${missingAssets.join(", ")}`);

console.log("GNK ASG final homepage validation: OK");
