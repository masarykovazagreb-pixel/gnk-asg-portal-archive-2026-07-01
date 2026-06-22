import secure from "./index-secure.js";
import {
  handleNewsAutomationRoute,
  runNewsAutomation,
  runAutoEditor
} from "./gnk-asg-news-automation-v2.js";
import { handleNewsDetailRoute } from "./gnk-asg-news-detail-v1.js";

const GNK_ASG_NEWS_AUTOMATION_ENTRY_V2 = true;
const GNK_ASG_FORCE_NEWS_ASSETS_V2 = true;
const GNK_ASG_NEWS_DETAIL_ROUTE_V1 = true;
const GNK_ASG_AUTO_EDITOR_DIRECT_BRIDGE_V1 = true;

const FORCED_NEWS_ASSET_PATHS = new Set([
  "/vijesti",
  "/vijesti/",
  "/vijesti/index.html",
  "/news",
  "/news/",
  "/news/index.html",
  "/assets/business-news.js",
  "/assets/business-news.css"
]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate"
    }
  });
}

function requestToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);

  return String(
    (bearer && bearer[1]) ||
    request.headers.get("x-news-publish-token") ||
    request.headers.get("x-operator-token") ||
    request.headers.get("x-admin-token") ||
    request.headers.get("x-gnk-asg-token") ||
    ""
  ).trim();
}

function safeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");

  if (!a || !b || a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return difference === 0;
}

function autoEditorAuthorized(request, env) {
  const candidate = requestToken(request);
  const allowed = [
    env.NEWS_PUBLISH_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_OPERATOR_TOKEN,
    env.ADMIN_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN
  ].map(value => String(value || "").trim()).filter(Boolean);

  return allowed.some(value => safeEqual(candidate, value));
}

async function handleDirectAutoEditor(request, env) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (
    path !== "/operator/auto-editor/run" &&
    path !== "/operator/auto-editor"
  ) {
    return null;
  }

  if (request.method !== "POST") {
    return jsonResponse({
      ok: false,
      error: "method_not_allowed",
      endpoint: "/operator/auto-editor/run",
      method: "POST"
    }, 405);
  }

  if (!autoEditorAuthorized(request, env)) {
    return jsonResponse({
      ok: false,
      error: "authorization_required"
    }, 401);
  }

  const result = await runAutoEditor(env);
  return jsonResponse(result, result.ok ? 200 : 500);
}

function resolveForcedAssetPath(pathname) {
  if (
    pathname === "/vijesti" ||
    pathname === "/vijesti/" ||
    pathname === "/vijesti/index.html"
  ) {
    return "/vijesti/index.html";
  }

  if (
    pathname === "/news" ||
    pathname === "/news/" ||
    pathname === "/news/index.html"
  ) {
    return "/news/index.html";
  }

  return pathname;
}

async function serveForcedNewsAsset(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") return null;

  const currentUrl = new URL(request.url);
  const assetPath = resolveForcedAssetPath(currentUrl.pathname);
  const assetUrl = new URL(assetPath, currentUrl.origin);
  assetUrl.search = currentUrl.search;

  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: request.method,
    headers: request.headers
  }));

  if (assetResponse.status === 404) return null;

  const headers = new Headers(assetResponse.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-gnk-asg-page-source", "news-automation-assets-v2");

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const directAutoEditor = await handleDirectAutoEditor(request, env);
    if (directAutoEditor) return directAutoEditor;

    const path = new URL(request.url).pathname;

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      FORCED_NEWS_ASSET_PATHS.has(path)
    ) {
      const assetResponse = await serveForcedNewsAsset(request, env);
      if (assetResponse) return assetResponse;
    }

    const detailResponse = await handleNewsDetailRoute(request, env);
    if (detailResponse) return detailResponse;

    const automated = await handleNewsAutomationRoute(request, env, ctx);
    if (automated) return automated;
    return secure.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const task = runNewsAutomation(event, env, ctx);

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(task);
      return;
    }

    return task;
  },

  async email(message, env, ctx) {
    if (typeof secure.email === "function") {
      return secure.email(message, env, ctx);
    }
  }
};
