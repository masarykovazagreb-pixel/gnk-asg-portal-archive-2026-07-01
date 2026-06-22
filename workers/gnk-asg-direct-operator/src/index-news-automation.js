import secure from "./index-secure.js";
import {
  handleNewsAutomationRoute,
  runNewsAutomation
} from "./gnk-asg-news-automation-v2.js";

const GNK_ASG_NEWS_AUTOMATION_ENTRY_V2 = true;
const GNK_ASG_FORCE_NEWS_ASSETS_V2 = true;

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
    const path = new URL(request.url).pathname;

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      FORCED_NEWS_ASSET_PATHS.has(path)
    ) {
      const assetResponse = await serveForcedNewsAsset(request, env);
      if (assetResponse) return assetResponse;
    }

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
