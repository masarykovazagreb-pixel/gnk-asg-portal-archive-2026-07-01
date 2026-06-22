
import secure from "./index-secure.js";
import {
  handleNewsAutomationRoute,
  runNewsAutomation
} from "./gnk-asg-news-automation-v2.js";

const GNK_ASG_NEWS_AUTOMATION_ENTRY_V2 = true;

export default {
  async fetch(request, env, ctx) {
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
