import {
  DEFAULT_EDITORIAL_POLICY,
  sanitizeEditorialSchedule,
  zagrebSlot,
  shouldRunArticle,
  shouldRunDigest,
  invokeAutoEditor,
  buildAndStoreDailyDigest
} from "./editorial.js";

const QUEUE_KEY = "command-center:queue:v1";
const LOG_KEY = "command-center:logs:v1";
const POLICY_KEY = "command-center:policy:v1";
const SCHEDULE_KEY = "command-center:schedule:v1";
const ARTICLE_RUN_PREFIX = "command-center:article-run:";
const DIGEST_RUN_PREFIX = "command-center:digest-run:";
const MAX_QUEUE = 300;
const MAX_LOGS = 1000;

const DEFAULT_POLICY = {
  productionLocked: true,
  autoExecuteLowRisk: true,
  requireApprovalForMediumRisk: true,
  requireApprovalForHighRisk: true,
  allowPublicPublish: false,
  allowMailSend: false,
  allowDeploy: false,
  allowRouteChanges: false,
  allowSecretChanges: false,
  editorial: DEFAULT_EDITORIAL_POLICY
};

const DEFAULT_SCHEDULE = sanitizeEditorialSchedule({
  enabled: false,
  autoEditorEnabled: false,
  dailyDigestEnabled: false,
  intervalHours: 3,
  digestHour: 23
});

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request);

    try {
      if (path === "/api/command-center/health") {
        return response({
          ok: true,
          service: "GNK ASG Command Center",
          version: "2026-06-20-v1",
          productionLocked: true,
          bindings: bindingStatus(env),
          time: new Date().toISOString()
        }, 200, request);
      }

      if (!isAuthorized(request, env)) return response({ ok: false, error: "unauthorized" }, 401, request);

      if (request.method === "GET" && path === "/api/command-center/status") return response(await status(env), 200, request);
      if (request.method === "GET" && path === "/api/command-center/policy") return response({ ok: true, policy: await getPolicy(env) }, 200, request);

      if (request.method === "POST" && path === "/api/command-center/policy") {
        const body = await jsonBody(request);
        const policy = sanitizePolicy(body.policy || body);
        await putJson(env, POLICY_KEY, policy);
        await addLog(env, "policy_updated", { policy });
        return response({ ok: true, policy }, 200, request);
      }

      if (request.method === "GET" && path === "/api/command-center/schedule") return response({ ok: true, schedule: await getSchedule(env) }, 200, request);

      if (request.method === "POST" && path === "/api/command-center/schedule") {
        const body = await jsonBody(request);
        const schedule = sanitizeEditorialSchedule(body.schedule || body);
        await putJson(env, SCHEDULE_KEY, schedule);
        await addLog(env, "schedule_updated", { schedule });
        return response({ ok: true, schedule }, 200, request);
      }

      if (request.method === "POST" && path === "/api/command-center/plan") {
        const body = await jsonBody(request);
        const command = String(body.command || body.text || "").trim();
        if (!command) return response({ ok: false, error: "missing_command" }, 400, request);
        const plan = await createPlan(env, command, body.context || {});
        await addLog(env, "plan_created", { command, plan });
        return response({ ok: true, plan }, 200, request);
      }

      if (request.method === "POST" && path === "/api/command-center/enqueue") {
        const body = await jsonBody(request);
        const command = String(body.command || body.text || "").trim();
        const plan = body.plan || await createPlan(env, command, body.context || {});
        const item = await enqueue(env, command, plan, body.requestedBy || "admin");
        return response({ ok: true, item }, 201, request);
      }

      if (request.method === "GET" && path === "/api/command-center/queue") {
        const items = await getList(env, QUEUE_KEY);
        return response({ ok: true, count: items.length, items }, 200, request);
      }

      if (request.method === "POST" && path === "/api/command-center/approve") {
        const body = await jsonBody(request);
        const item = await updateQueue(env, body.id, current => ({
          ...current,
          status: body.approved === false ? "rejected" : "approved",
          approvedBy: String(body.approvedBy || "operator"),
          approvalNote: String(body.note || ""),
          approvedAt: new Date().toISOString()
        }));
        if (!item) return response({ ok: false, error: "queue_item_not_found" }, 404, request);
        await addLog(env, "approval_changed", { id: item.id, status: item.status });
        return response({ ok: true, item }, 200, request);
      }

      if (request.method === "POST" && path === "/api/command-center/execute") {
        const body = await jsonBody(request);
        const result = await executeQueued(env, body.id, { dryRun: body.dryRun !== false, force: body.force === true });
        return response(result, result.ok ? 200 : 400, request);
      }

      if (request.method === "GET" && path === "/api/command-center/logs") {
        const items = await getList(env, LOG_KEY);
        return response({ ok: true, count: items.length, items }, 200, request);
      }

      if (request.method === "POST" && path === "/api/command-center/run-editor") {
        const body = await jsonBody(request);
        const result = await invokeAutoEditor(env, { dryRun: body.dryRun !== false, trigger: "manual-command-center" });
        await addLog(env, "manual_editor_run", { result });
        return response(result, result.ok ? 200 : 400, request);
      }

      if (request.method === "POST" && path === "/api/command-center/run-digest") {
        const body = await jsonBody(request);
        const result = await buildAndStoreDailyDigest(env, { dryRun: body.dryRun !== false });
        await addLog(env, "manual_digest_run", { result });
        return response(result, result.ok ? 200 : 400, request);
      }

      return response({ ok: false, error: "not_found", path }, 404, request);
    } catch (error) {
      await safeLog(env, "unhandled_error", { message: error?.message || String(error) });
      return response({ ok: false, error: error?.message || String(error) }, 500, request);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSchedule(event, env));
  }
};

function bindingStatus(env) {
  return {
    kv: Boolean(env.GNK_ASG_KV),
    ai: Boolean(env.AI),
    autoEditorService: Boolean(env.AUTO_EDITOR_SERVICE),
    publishService: Boolean(env.PUBLISH_SERVICE),
    directOperatorService: Boolean(env.DIRECT_OPERATOR_SERVICE),
    indexNowConfigured: Boolean(env.INDEXNOW_KEY)
  };
}

function tokenFrom(request) {
  const bearer = request.headers.get("authorization") || "";
  return request.headers.get("x-operator-token") || request.headers.get("x-admin-token") || bearer.replace(/^Bearer\s+/i, "") || "";
}

function expectedToken(env) {
  return env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || "";
}

function isAuthorized(request, env) {
  const expected = expectedToken(env);
  const received = tokenFrom(request);
  return Boolean(expected && received && expected === received);
}

function allowedOrigin(request) {
  const origin = request.headers.get("origin") || "";
  return ["https://gnk-asg.hr", "https://www.gnk-asg.hr", "http://127.0.0.1:4173", "http://localhost:4173"].includes(origin) ? origin : "https://gnk-asg.hr";
}

function withCors(input, request) {
  const headers = new Headers(input.headers);
  headers.set("access-control-allow-origin", allowedOrigin(request));
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization,x-operator-token,x-admin-token");
  headers.set("vary", "Origin");
  return new Response(input.body, { status: input.status, headers });
}

function response(data, status, request) {
  return withCors(new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  }), request);
}

async function jsonBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function getJson(env, key, fallback) {
  if (!env.GNK_ASG_KV) return fallback;
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function putJson(env, key, value) {
  if (!env.GNK_ASG_KV) throw new Error("GNK_ASG_KV binding nije konfiguriran.");
  await env.GNK_ASG_KV.put(key, JSON.stringify(value, null, 2));
  return value;
}

async function getList(env, key) {
  const value = await getJson(env, key, []);
  return Array.isArray(value) ? value : [];
}

async function putList(env, key, value, max) {
  return putJson(env, key, value.slice(0, max));
}

async function getPolicy(env) {
  return sanitizePolicy(await getJson(env, POLICY_KEY, DEFAULT_POLICY));
}

function sanitizePolicy(input = {}) {
  return {
    ...DEFAULT_POLICY,
    ...input,
    productionLocked: true,
    allowDeploy: false,
    allowRouteChanges: false,
    allowSecretChanges: false,
    editorial: { ...DEFAULT_EDITORIAL_POLICY, ...(input.editorial || {}) }
  };
}

async function getSchedule(env) {
  return sanitizeEditorialSchedule(await getJson(env, SCHEDULE_KEY, DEFAULT_SCHEDULE));
}

async function status(env) {
  const queue = await getList(env, QUEUE_KEY);
  const logs = await getList(env, LOG_KEY);
  return {
    ok: true,
    service: "GNK ASG Command Center",
    productionLocked: true,
    queueCount: queue.length,
    pendingApproval: queue.filter(item => item.status === "pending_approval").length,
    approved: queue.filter(item => item.status === "approved").length,
    completed: queue.filter(item => item.status === "completed").length,
    failed: queue.filter(item => item.status === "failed").length,
    logCount: logs.length,
    schedule: await getSchedule(env),
    policy: await getPolicy(env),
    bindings: bindingStatus(env),
    generatedAt: new Date().toISOString()
  };
}

async function createPlan(env, command, context) {
  const fallback = rulePlan(command, context);
  if (!env.AI || typeof env.AI.run !== "function") return fallback;
  try {
    const result = await env.AI.run(env.COMMAND_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: [
          "Pretvori naredbu za GNK ASG portal u JSON plan.",
          "Dopuštene akcije: run_auto_editor, create_daily_digest, refresh_news, refresh_market, refresh_sitemap, test_urls, create_backup, draft_publication, publish_publication, send_mail.",
          "Ne uključuj deploy, promjenu ruta, domene, secretsa, brisanje ili financijske radnje.",
          "Vrati: summary, actions, risk, requiresApproval, expectedOutputs.",
          command
        ].join("\n") }
      ],
      temperature: 0.1,
      max_tokens: 800
    });
    const parsed = parseObject(result?.response || result?.result || "");
    return parsed ? normalizePlan(command, parsed, context) : fallback;
  } catch {
    return fallback;
  }
}

function parseObject(value) {
  const text = String(value || "").trim();
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function rulePlan(command, context) {
  const text = command.toLowerCase();
  const actions = [];
  if (/(svaka\s*3|svaka tri|auto editor|najvažnij|najvaznij|objav)/i.test(text)) actions.push({ type: "run_auto_editor", intervalHours: 3, minWords: 500, hrEn: true, imageRequired: true, sourcesRequired: true, seoRequired: true });
  if (/(dnevni|daily).*(sažetak|sazetak|pregled|komentar|digest)/i.test(text)) actions.push({ type: "create_daily_digest", hour: 23, minWords: 900, hrEn: true });
  if (/vijest|news/i.test(text) && !actions.some(action => action.type === "run_auto_editor")) actions.push({ type: "refresh_news" });
  if (/trži|trzi|market|bitcoin|zlato|brent|eur/i.test(text)) actions.push({ type: "refresh_market" });
  if (/seo|sitemap|index/i.test(text)) actions.push({ type: "refresh_sitemap", indexNow: true });
  if (/test|provjer/i.test(text)) actions.push({ type: "test_urls" });
  if (/backup|beckup|snapshot/i.test(text)) actions.push({ type: "create_backup" });
  if (/mail|email|poruk/i.test(text)) actions.push({ type: "send_mail", mode: "draft_only" });
  if (!actions.length) actions.push({ type: "draft_publication", note: "Potrebna je dodatna klasifikacija." });

  return normalizePlan(command, {
    summary: "Strukturirani plan izrađen iz administratorske naredbe.",
    actions,
    expectedOutputs: ["audit log", "status izvršenja", "rollback ili snapshot referenca"]
  }, context);
}

function normalizePlan(command, raw, context) {
  const actions = Array.isArray(raw.actions) ? raw.actions.map(action => typeof action === "string" ? { type: action } : action) : [];
  const risk = riskLevel(command, actions, raw.risk);
  return {
    id: createId("plan"),
    command,
    summary: String(raw.summary || "GNK ASG administratorski plan"),
    actions,
    risk,
    requiresApproval: risk !== "low" || raw.requiresApproval === true,
    productionLocked: true,
    expectedOutputs: Array.isArray(raw.expectedOutputs) ? raw.expectedOutputs : [],
    context: context || {},
    createdAt: new Date().toISOString()
  };
}

function riskLevel(command, actions, suggested) {
  const text = (command + " " + JSON.stringify(actions)).toLowerCase();
  if (/(delete|bris|secret|token|domain|domena|route|ruta|deploy|production|produkc|payment|plać|plac|legal|ugovor|send_mail|publish_publication)/i.test(text)) return "high";
  if (/(objav|publish|mail|public|external|vanjsk)/i.test(text)) return "medium";
  return ["low", "medium", "high"].includes(suggested) ? suggested : "low";
}

async function enqueue(env, command, plan, requestedBy) {
  const queue = await getList(env, QUEUE_KEY);
  const item = {
    id: createId("command"), command, plan,
    status: plan.requiresApproval ? "pending_approval" : "queued",
    risk: plan.risk, requiresApproval: plan.requiresApproval, requestedBy,
    productionLocked: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  await putList(env, QUEUE_KEY, [item, ...queue], MAX_QUEUE);
  await addLog(env, "command_enqueued", { id: item.id, risk: item.risk, status: item.status });
  return item;
}

async function updateQueue(env, id, updater) {
  const queue = await getList(env, QUEUE_KEY);
  let changed = null;
  const next = queue.map(item => {
    if (item.id !== id) return item;
    changed = { ...updater(item), updatedAt: new Date().toISOString() };
    return changed;
  });
  if (!changed) return null;
  await putList(env, QUEUE_KEY, next, MAX_QUEUE);
  return changed;
}

async function executeQueued(env, id, options) {
  const queue = await getList(env, QUEUE_KEY);
  const item = queue.find(entry => entry.id === id);
  if (!item) return { ok: false, error: "queue_item_not_found" };
  if (item.requiresApproval && item.status !== "approved" && !options.force) return { ok: false, error: "approval_required", item };
  if (item.risk === "high" && !options.force) return { ok: false, error: "high_risk_requires_force", item };

  const policy = await getPolicy(env);
  await updateQueue(env, id, current => ({ ...current, status: "executing", executionStartedAt: new Date().toISOString() }));
  const results = [];
  for (const action of item.plan.actions || []) results.push(await executeAction(env, action, { ...options, policy }));
  const ok = results.every(result => result.ok || result.skipped);
  const final = await updateQueue(env, id, current => ({ ...current, status: ok ? "completed" : "failed", results, executionFinishedAt: new Date().toISOString() }));
  await addLog(env, ok ? "command_completed" : "command_failed", { id, results });
  return { ok, item: final, results };
}

async function executeAction(env, action, context) {
  const type = String(action.type || "");
  if (type === "run_auto_editor") return invokeAutoEditor(env, context);
  if (type === "create_daily_digest") return buildAndStoreDailyDigest(env, context);
  if (type === "refresh_news") return callService(env.DIRECT_OPERATOR_SERVICE, "/operator/refresh-news", context);
  if (type === "refresh_market") return callService(env.DIRECT_OPERATOR_SERVICE, "/operator/refresh-market", context);
  if (type === "test_urls") return callService(env.DIRECT_OPERATOR_SERVICE, "/operator/test-urls", context);
  if (type === "refresh_sitemap") return { ok: true, skipped: context.dryRun, type, reason: context.dryRun ? "dry_run" : "IndexNow is handled after digest/publication." };
  if (type === "create_backup") return { ok: true, skipped: true, type, reason: "GitHub snapshot on every push is active." };
  if (type === "draft_publication") return { ok: true, skipped: true, type, reason: "Draft requires article payload." };
  if (type === "publish_publication") return { ok: true, skipped: true, type, reason: "Public publishing is locked until explicit production approval." };
  if (type === "send_mail") return { ok: true, skipped: true, type, reason: "Mail sending remains draft-only until explicit approval." };
  return { ok: false, type, error: "unsupported_action" };
}

async function callService(service, path, context) {
  if (!service || typeof service.fetch !== "function") return { ok: true, skipped: true, path, reason: "service_binding_not_configured" };
  if (context.dryRun) return { ok: true, skipped: true, path, reason: "dry_run" };
  const reply = await service.fetch(new Request("https://internal" + path, { method: "GET", headers: { "x-command-center": "GNK-ASG" } }));
  const raw = await reply.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { ok: reply.ok, status: reply.status, path, data };
}

async function runSchedule(event, env) {
  const schedule = await getSchedule(env);
  if (!schedule.enabled) return;
  const slot = zagrebSlot();
  const results = [];

  if (shouldRunArticle(schedule, slot)) {
    const key = `${ARTICLE_RUN_PREFIX}${slot.date}:${slot.hour}`;
    if (!await getJson(env, key, null)) {
      const result = await invokeAutoEditor(env, { dryRun: false, trigger: `cron-${slot.date}-${slot.hour}` });
      results.push(result);
      if (result.ok && !result.skipped) await putJson(env, key, { at: new Date().toISOString() });
    }
  }

  if (shouldRunDigest(schedule, slot)) {
    const key = `${DIGEST_RUN_PREFIX}${slot.date}`;
    if (!await getJson(env, key, null)) {
      const result = await buildAndStoreDailyDigest(env, { dryRun: false });
      results.push(result);
      if (result.ok && !result.skipped) await putJson(env, key, { at: new Date().toISOString() });
    }
  }

  await safeLog(env, "scheduled_run", { cron: event?.cron || "", slot, results });
}

async function addLog(env, type, data) {
  const logs = await getList(env, LOG_KEY);
  const item = { id: createId("log"), type, data, createdAt: new Date().toISOString() };
  await putList(env, LOG_KEY, [item, ...logs], MAX_LOGS);
  return item;
}

async function safeLog(env, type, data) {
  try { return await addLog(env, type, data); } catch { return null; }
}

function createId(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
}
