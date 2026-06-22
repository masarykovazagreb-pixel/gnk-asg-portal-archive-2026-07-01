#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
import { handleRefreshRoute } from "../workers/gnk-asg-direct-operator/src/gnk-asg-refresh-backend-v1.js";

const runtime = fs.readFileSync("workers/gnk-asg-direct-operator/src/runtime-entry.js", "utf8");
const config = fs.readFileSync("workers/gnk-asg-direct-operator/wrangler.toml", "utf8");
const backend = fs.readFileSync("workers/gnk-asg-direct-operator/src/gnk-asg-refresh-backend-v1.js", "utf8");

assert.ok(runtime.includes("handleRefreshRoute(refreshRequestFor(request), env, ctx)"));
assert.ok(runtime.indexOf("handleRefreshRoute(refreshRequestFor(request), env, ctx)") < runtime.indexOf("application.fetch(request, env, ctx)"));
assert.ok(runtime.includes('"/api/market": "/data/market.json"'));
assert.ok(runtime.includes('"/api/news": "/data/news.json"'));
assert.ok(config.includes('main = "src/runtime-entry.js"'));
assert.ok(config.includes('crons = ["*/15 * * * *"]'));
assert.ok(backend.includes('const TIMEZONE = "Europe/Zagreb"'));
assert.ok(backend.includes('new Set([9, 16])'));

class MemoryStore {
  constructor(values) {
    this.values = new Map(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
  }
  async get(key) { return this.values.get(key) || null; }
  async put(key, value) { this.values.set(key, String(value)); }
}

const now = new Date().toISOString();
const env = {
  GNK_ASG_KV: new MemoryStore({
    "data:news.json": { ok:true, status:"SNAPSHOT", updatedAt:now, items:[{ title:"News", url:"https://example.com", published_at:now }] },
    "data:market.json": { ok:true, status:"SNAPSHOT", updatedAt:now, cards:[], assets:{} }
  })
};

const newsResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/news.json"), env, {});
assert.equal(newsResponse.status, 200);
const news = await newsResponse.json();
assert.equal(news.cache, "HIT");
assert.equal(news.status, "SNAPSHOT");

const marketResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/market.json"), env, {});
assert.equal(marketResponse.status, 200);
const market = await marketResponse.json();
assert.equal(market.cache, "HIT");
assert.equal(market.status, "SNAPSHOT");

const statusResponse = await handleRefreshRoute(new Request("https://gnk-asg.hr/data/update_status.json"), env, {});
assert.equal(statusResponse.status, 200);
const status = await statusResponse.json();
assert.deepEqual(status.modules.news.schedule, ["09:00", "16:00"]);
assert.equal(status.modules.news.timezone, "Europe/Zagreb");

console.log("GNK ASG refresh runtime validation: OK");
