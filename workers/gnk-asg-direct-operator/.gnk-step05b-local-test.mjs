import worker from "./src/index.js";

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
  const url = "https://operator.gnk-asg.hr" + path + "?local-test=step05b";
  try {
    const response = await worker.fetch(new Request(url, { method: "GET" }), {}, ctx);
    const text = await response.text();
    results.push({
      path,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      safeMergeHeader: response.headers.get("x-gnk-asg-safe-merge") || "",
      hasGnkAsg: /GNK ASG/.test(text),
      hasGnkDinamoLtd: /GNK DINAMO Ltd/.test(text),
      hasNerminSefic: /Nermin Sefic|Nermin Sefi/.test(text),
      hasCanonical: /rel=.canonical.|rel="canonical"|rel='canonical'/.test(text),
      hasOgImage: /property=.og:image.|property="og:image"|property='og:image'|name=.twitter:image.|name="twitter:image"|name='twitter:image'/.test(text),
      hasSchema: /application\/ld\+json/.test(text),
      hasMojibake: /Ä|Å|Ã/.test(text),
      length: text.length
    });
  } catch (error) {
    results.push({
      path,
      ok: false,
      status: "ERROR",
      contentType: "",
      safeMergeHeader: "",
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

console.log(JSON.stringify(results, null, 2));
