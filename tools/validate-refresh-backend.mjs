#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { handleRefreshRoute } from "../workers/gnk-asg-direct-operator/src/gnk-asg-refresh-backend-v1.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const wranglerPath = path.join(root, "workers/gnk-asg-direct-operator/wrangler.toml");
const runtimePath = path.join(root, "workers/gnk-asg-direct-operator/src/runtime-entry.js");
const backendPath = path.join(root, "workers/gnk-asg-direct-operator/src/gnk-asg-refresh-backend-v1.js");

class MockKV {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
}

const wrangler = fs.readFileSync(wranglerPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const backend = fs.readFileSync(backendPath, "utf8");

assert.match(wrangler, /main\s*=\s*"src\/runtime-entry\.js"/, "Wrangler must use the runtime refresh entry.");
assert.match(wrangler, /crons\s*=\s*\["\*\/15 \* \* \* \*"\]/, "Market cron must run every 15 minutes.");
assert.match(runtime, /handleRefreshRoute\(request, env, ctx\)/, "Runtime entry must check refresh routes first.");
assert.ok(runtime.indexOf("handleRefreshRoute(request, env, ctx)") < runtime.indexOf("application.fetch(request, env, ctx)"), "Refresh routes must be evaluated before the legacy application.");
assert.match(backend, /const TIMEZONE = "Europe\/Zagreb"/, "Backend must use the Zagreb timezone.");
assert.match(backend, /new Set\(\[9, 16\]\)/, "News schedule must contain 09:00 and 16:00.");
assert.match(backend, /return Boolean\(expected && token && token === expected\)/, "Operator endpoints must reject missing configured tokens.");

const recent = new Date().toISOString();
const env = {
  GNK_ASG_KV: new MockKV({
    "data:news.json": {
      ok: true,
      status: "SNAPSHOT",
      updatedAt: recent,
      items: [{ title: "Test news", url: "https://example.com/news", source: "Test", published_at: recent }]
    },
    "data:market.json": {
      ok: true,
      status: "SNAPSHOT",
      updatedAt: recent,
      cards: [{ label: "Bitcoin", value: 1, suffix: " EUR", note: "SNAPSHOT" }],
      assets: {}
    }
  })
};

const newsResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/news.json"), env, {});
assert.equal(newsResponse.status, 200);
const news = await newsResponse.json();
assert.equal(news.cache, "HIT");
assert.equal(news.status, "SNAPSHOT");
assert.equal(news.items.length, 1);

const marketResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/market.json"), env, {});
assert.equal(marketResponse.status, 200);
const market = await marketResponse.json();
assert.equal(market.cache, "HIT");
assert.equal(market.status, "SNAPSHOT");

const unauthorized = await handleRefreshRoute(new Request("https://gnk-asg.hr/operator/refresh-news"), env, {});
assert.equal(unauthorized.status, 401);

const statusResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/update_status.json"), env, {});
assert.equal(statusResponse.status, 200);
const status = await statusResponse.json();
assert.equal(status.ok, true);
assert.deepEqual(status.modules.news.schedule, ["09:00", "16:00"]);
assert.equal(status.modules.news.timezone, "Europe/Zagreb");

console.log("GNK ASG refresh backend contract: OK");
