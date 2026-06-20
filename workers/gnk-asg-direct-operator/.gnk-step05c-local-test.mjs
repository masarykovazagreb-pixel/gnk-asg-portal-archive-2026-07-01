import fs from "node:fs";
import worker from "./src/index.js";

const resultsPath = "G:\\GNK\\GNK_ASG_STEP05C_ROBUST_LOCAL_TEST_BEFORE_DEPLOY\\20260616_071430\\node-local-results.json";
const summaryPath = "G:\\GNK\\GNK_ASG_STEP05C_ROBUST_LOCAL_TEST_BEFORE_DEPLOY\\20260616_071430\\node-local-summary.json";

const ctx = {
  waitUntil() {},
  passThroughOnException() {}
};

const paths = [
  "/objave",
  "/articles",
  "/content-studio",
  "/mediji-o-nama",
  "/media-about-us",
  "/data/articles-v3.json"
];

const results = [];

for (const path of paths) {
  const url = "https://operator.gnk-asg.hr" + path + "?local-test=step05c";
  try {
    const response = await worker.fetch(new Request(url, { method: "GET" }), {}, ctx);
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isHtml = contentType.toLowerCase().includes("text/html");
    const isJson = contentType.toLowerCase().includes("application/json");

    results.push({
      path,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      contentType,
      safeMergeHeader: response.headers.get("x-gnk-asg-safe-merge") || "",
      isHtml,
      isJson,
      hasGnkAsg: /GNK ASG/.test(text),
      hasGnkDinamoLtd: /GNK DINAMO Ltd/.test(text),
      hasNerminSefic: /Nermin Sefic|Nermin Sefi/.test(text),
      hasCanonical: /rel=.canonical.|rel="canonical"|rel='canonical'/.test(text),
      hasOgImage: /property=.og:image.|property="og:image"|property='og:image'|name=.twitter:image.|name="twitter:image"|name='twitter:image'/.test(text),
      hasSchema: /application\/ld\+json/.test(text),
      hasMojibake: /Ä|Å|Ã/.test(text),
      length: text.length,
      sample: text.slice(0, 220)
    });
  } catch (error) {
    results.push({
      path,
      ok: false,
      status: "ERROR",
      contentType: "",
      safeMergeHeader: "",
      isHtml: false,
      isJson: false,
      hasGnkAsg: false,
      hasGnkDinamoLtd: false,
      hasNerminSefic: false,
      hasCanonical: false,
      hasOgImage: false,
      hasSchema: false,
      hasMojibake: false,
      length: 0,
      error: error && error.message ? error.message : String(error)
    });
  }
}

const summary = {
  routeCount: results.length,
  failCount: results.filter(r => !r.ok).length,
  htmlCount: results.filter(r => r.isHtml).length,
  jsonCount: results.filter(r => r.isJson).length,
  seoMissingCount: results.filter(r => r.ok && r.isHtml && (!r.hasCanonical || !r.hasOgImage || !r.hasSchema)).length,
  mojibakeCount: results.filter(r => r.hasMojibake).length,
  safeMergeMissingCount: results.filter(r => r.ok && r.isHtml && !r.safeMergeHeader).length,
  missingGnkAsgCount: results.filter(r => r.ok && !r.hasGnkAsg).length,
  failedPaths: results.filter(r => !r.ok).map(r => r.path),
  seoMissingPaths: results.filter(r => r.ok && r.isHtml && (!r.hasCanonical || !r.hasOgImage || !r.hasSchema)).map(r => r.path),
  mojibakePaths: results.filter(r => r.hasMojibake).map(r => r.path)
};

fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify(summary, null, 2));
