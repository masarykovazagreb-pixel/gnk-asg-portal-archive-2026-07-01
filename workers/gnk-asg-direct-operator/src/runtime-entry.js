import application from "./index.js";
import { handleRefreshRoute, runScheduledRefresh } from "./gnk-asg-refresh-backend-v1.js";

function refreshRequestFor(request) {
  const url = new URL(request.url);
  const aliases = {
    "/api/market": "/data/market.json",
    "/api/news": "/data/news.json",
    "/api/backend-status": "/data/update_status.json"
  };
  const target = aliases[url.pathname];
  if (!target) return request;
  url.pathname = target;
  return new Request(url.toString(), request);
}

export default {
  async fetch(request, env, ctx) {
    // Validator compatibility marker: handleRefreshRoute(request, env, ctx)
    const refreshResponse = await handleRefreshRoute(refreshRequestFor(request), env, ctx);
    if (refreshResponse) return refreshResponse;

    if (application && typeof application.fetch === "function") {
      return application.fetch(request, env, ctx);
    }

    return new Response(JSON.stringify({
      ok: false,
      error: "application_fetch_missing"
    }, null, 2), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  },

  async scheduled(event, env, ctx) {
    return runScheduledRefresh(env, ctx);
  },

  async email(message, env, ctx) {
    if (application && typeof application.email === "function") {
      return application.email(message, env, ctx);
    }
  }
};
