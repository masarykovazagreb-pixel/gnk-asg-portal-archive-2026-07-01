import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const reportPath = process.argv[2] || path.join(repoRoot, "preview-test-report.json");

const read = file => fs.readFile(path.join(repoRoot, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const wordCount = value => String(value || "").trim().split(/\s+/).filter(Boolean).length;

const autoSource = await read("workers/gnk-asg-auto-editor-worker/src/index.js");
const autoWrangler = await read("workers/gnk-asg-auto-editor-worker/wrangler.toml");
const previewWrangler = await read("workers/gnk-asg-auto-editor-worker/wrangler.preview.toml");
const publicCleanWrangler = await read("workers/gnk-asg-auto-editor-public-clean-worker/wrangler.toml");
const objaveHtml = await read("apps/portal/objave/index.html");
const publicationsHtml = await read("apps/portal/publications/index.html");
const sharedJs = await read("apps/portal/assets/js/publications-shared.js");
const manifest = JSON.parse(await read("apps/portal/data/publications.json"));
const fixture = JSON.parse(await read("preview/fixtures/publications-auto.json"));
const previewContract = JSON.parse(await read("contracts/preview-staging-contract.json"));

const checks = [];

const check = (name, condition, detail = null) => {
  checks.push({ name, passed: Boolean(condition), detail });
  assert(condition, name);
};

check("manifest_has_52_items", Array.isArray(manifest.items) && manifest.items.length >= 52, manifest.items?.length);
check("manifest_images_present", manifest.items.every(item => /^https?:\/\//.test(item.imageUrl || "")));
check("manifest_canonicals_present", manifest.items.every(item => /^https?:\/\//.test(item.canonical || "")));
check("objave_shared_renderer", objaveHtml.includes("/assets/js/publications-shared.js"));
check("publications_shared_renderer", publicationsHtml.includes("/assets/js/publications-shared.js"));
check("objave_hr_page_marker", objaveHtml.includes('data-publication-page="hr"'));
check("publications_en_page_marker", publicationsHtml.includes('data-publication-page="en"'));
check("publications_canonical", publicationsHtml.includes('rel="canonical" href="https://gnk-asg.hr/publications/"'));
check("publications_hreflang_hr", publicationsHtml.includes('hreflang="hr"'));
check("publications_hreflang_en", publicationsHtml.includes('hreflang="en"'));
check("shared_renderer_static_fallback", sharedJs.includes("Promise.allSettled") && sharedJs.includes('/data/publications.json'));
check("shared_renderer_auto_feed", sharedJs.includes('/data/publications-auto.json'));
check("auto_editor_minimum_500", autoSource.includes("const MIN_WORDS = 500;"));
check("auto_editor_bilingual_router", autoSource.includes("(auto-editor|objave|publications)"));
check("production_owner_has_routes", autoWrangler.includes("gnk-asg.hr/auto-editor*"));
check("secondary_worker_has_no_routes", !publicCleanWrangler.includes("routes ="));
check("preview_has_no_routes", !previewWrangler.includes("[[routes]]") && !previewWrangler.includes("routes ="));
check("preview_has_no_cron", !previewWrangler.includes("[triggers]") && !previewWrangler.includes("crons"));
check("preview_has_no_production_domains", !previewWrangler.includes("gnk-asg.hr"));
check("preview_has_no_production_binding_ids", !/[a-f0-9]{32}|[a-f0-9-]{36}/i.test(previewWrangler));
check("preview_contract_locked", previewContract.productionLocked === true && previewContract.cloudflareDeployAllowed === false);
check("fixture_has_one_article", fixture.count === 1 && fixture.items.length === 1);
check("fixture_hr_500_words", wordCount(fixture.items[0].bodyHr) >= 500, wordCount(fixture.items[0].bodyHr));
check("fixture_en_500_words", wordCount(fixture.items[0].bodyEn) >= 500, wordCount(fixture.items[0].bodyEn));

const tempModule = path.join(os.tmpdir(), `gnk-auto-editor-${Date.now()}.mjs`);
await fs.writeFile(tempModule, autoSource, "utf8");

try {
  const workerModule = await import(`${pathToFileURL(tempModule).href}?v=${Date.now()}`);
  const worker = workerModule.default;

  const store = new Map([
    ["auto-editor:articles:v1", JSON.stringify(fixture.items)],
    ["auto-editor:used-topics:v1", JSON.stringify([])]
  ]);

  const env = {
    GNK_ASG_KV: {
      get: async key => store.get(key) ?? null,
      put: async (key, value) => store.set(key, String(value))
    }
  };

  const request = url => new Request(url, { method: "GET" });

  const statusResponse = await worker.fetch(request("https://preview.local/api/auto-editor/status"), env, {});
  const status = await statusResponse.json();

  check("status_http_200", statusResponse.status === 200, statusResponse.status);
  check("status_minimum_500", status.minWords === 500, status.minWords);
  check("status_article_count", status.articleCount === 1, status.articleCount);

  const feedResponse = await worker.fetch(request("https://preview.local/data/publications-auto.json"), env, {});
  const feed = await feedResponse.json();

  check("feed_http_200", feedResponse.status === 200, feedResponse.status);
  check("feed_shared_source", feed.sharedSource === "auto-editor:articles:v1", feed.sharedSource);
  check("feed_hr_url", feed.items[0].hrUrl === "/objave/poslovni-pregled-preview-staging-test/", feed.items[0].hrUrl);
  check("feed_en_url", feed.items[0].enUrl === "/publications/poslovni-pregled-preview-staging-test/", feed.items[0].enUrl);
  check("feed_canonical_hr", feed.items[0].canonical === "https://gnk-asg.hr/objave/poslovni-pregled-preview-staging-test/", feed.items[0].canonical);

  const hrResponse = await worker.fetch(request("https://preview.local/objave/poslovni-pregled-preview-staging-test/"), env, {});
  const hrHtml = await hrResponse.text();

  check("hr_article_http_200", hrResponse.status === 200, hrResponse.status);
  check("hr_article_language", hrHtml.includes('<html lang="hr">'));
  check("hr_article_canonical", hrHtml.includes('rel="canonical" href="https://gnk-asg.hr/objave/poslovni-pregled-preview-staging-test/"'));
  check("hr_article_hreflang_en", hrHtml.includes('hreflang="en"'));
  check("hr_article_source", hrHtml.includes("GNK ASG Preview Fixture"));
  check("hr_article_word_count", hrHtml.includes(`${fixture.items[0].wordCountHr} riječi`), fixture.items[0].wordCountHr);
  check("hr_article_image", hrHtml.includes(fixture.items[0].imageUrl));

  const enResponse = await worker.fetch(request("https://preview.local/publications/poslovni-pregled-preview-staging-test/"), env, {});
  const enHtml = await enResponse.text();

  check("en_article_http_200", enResponse.status === 200, enResponse.status);
  check("en_article_language", enHtml.includes('<html lang="en">'));
  check("en_article_canonical_hr", enHtml.includes('rel="canonical" href="https://gnk-asg.hr/objave/poslovni-pregled-preview-staging-test/"'));
  check("en_article_hreflang_hr", enHtml.includes('hreflang="hr"'));
  check("en_article_source", enHtml.includes("GNK ASG Preview Fixture"));
  check("en_article_word_count", enHtml.includes(`${fixture.items[0].wordCountEn} words`), fixture.items[0].wordCountEn);
  check("en_article_image", enHtml.includes(fixture.items[0].imageUrl));

  const missingResponse = await worker.fetch(request("https://preview.local/publications/ne-postoji/"), env, {});
  check("missing_article_404", missingResponse.status === 404, missingResponse.status);
}
finally {
  await fs.rm(tempModule, { force: true });
}

const failed = checks.filter(item => !item.passed);
const report = {
  completedAt: new Date().toISOString(),
  branch: "visual-redesign",
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  checks,
  productionChanged: false,
  cloudflareDeployed: false
};

await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (failed.length) process.exit(1);