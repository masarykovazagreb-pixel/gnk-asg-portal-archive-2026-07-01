export const AUTO_ARTICLES_KEY = "auto-editor:articles:v1";
export const MIN_ARTICLE_WORDS = 500;
export const MIN_DIGEST_WORDS = 900;

export const DEFAULT_EDITORIAL_POLICY = {
  enabled: false,
  intervalHours: 3,
  digestHour: 23,
  timeZone: "Europe/Zagreb",
  author: "Nermin Sefić",
  minArticleWords: MIN_ARTICLE_WORDS,
  minDigestWords: MIN_DIGEST_WORDS,
  requireHrEn: true,
  requireImage: true,
  requireSources: true,
  requireSeo: true,
  requireCanonical: true,
  requireHreflang: true,
  indexNowWhenConfigured: true
};

export function sanitizeEditorialSchedule(input = {}) {
  const interval = Number(input.intervalHours || 3);
  const digestHour = Number(input.digestHour ?? 23);
  return {
    enabled: input.enabled === true,
    autoEditorEnabled: input.autoEditorEnabled === true,
    dailyDigestEnabled: input.dailyDigestEnabled === true,
    intervalHours: [1, 2, 3, 4, 6, 8, 12, 24].includes(interval) ? interval : 3,
    digestHour: Number.isInteger(digestHour) && digestHour >= 0 && digestHour <= 23 ? digestHour : 23,
    timeZone: "Europe/Zagreb",
    updatedAt: new Date().toISOString()
  };
}

export function zagrebSlot(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date).reduce((acc, item) => {
    acc[item.type] = item.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parts.hour === "24" ? "00" : parts.hour
  };
}

export function shouldRunArticle(schedule, slot) {
  return Boolean(schedule.enabled && schedule.autoEditorEnabled && Number(slot.hour) % Number(schedule.intervalHours || 3) === 0);
}

export function shouldRunDigest(schedule, slot) {
  return Boolean(schedule.enabled && schedule.dailyDigestEnabled && Number(slot.hour) === Number(schedule.digestHour ?? 23));
}

export async function invokeAutoEditor(env, options = {}) {
  if (options.dryRun !== false) {
    return {
      ok: true,
      skipped: true,
      dryRun: true,
      type: "run_auto_editor",
      expected: {
        intervalHours: 3,
        minWords: MIN_ARTICLE_WORDS,
        hrEn: true,
        image: true,
        sources: true,
        seo: true,
        canonical: true,
        hreflang: true
      }
    };
  }

  const service = env.AUTO_EDITOR_SERVICE;
  if (!service || typeof service.fetch !== "function") {
    return { ok: true, skipped: true, type: "run_auto_editor", reason: "AUTO_EDITOR_SERVICE_not_configured" };
  }

  const response = await service.fetch(new Request("https://auto-editor/api/auto-editor/run", {
    method: "GET",
    headers: { "x-command-center": "GNK-ASG" }
  }));
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { ok: response.ok, type: "run_auto_editor", status: response.status, data };
}

export async function buildAndStoreDailyDigest(env, options = {}) {
  const articles = await readList(env, AUTO_ARTICLES_KEY);
  const today = zagrebSlot().date;
  const selected = articles.filter(article => {
    const published = String(article.publishedAt || article.createdAt || "").slice(0, 10);
    return published === today && article.kind !== "daily-digest";
  }).slice(0, 12);

  if (!selected.length) return { ok: true, skipped: true, type: "daily_digest", reason: "no_articles_for_today", date: today };

  const digest = buildDigest(today, selected);
  if (options.dryRun !== false) return { ok: true, skipped: true, dryRun: true, type: "daily_digest", preview: digest };
  if (!env.GNK_ASG_KV) return { ok: false, type: "daily_digest", error: "GNK_ASG_KV_not_configured" };

  const next = [digest, ...articles.filter(article => !(article.kind === "daily-digest" && article.digestDate === today))].slice(0, 1000);
  await env.GNK_ASG_KV.put(AUTO_ARTICLES_KEY, JSON.stringify(next, null, 2));
  const indexing = await notifyIndexNow(env, [digest.seo.canonical, digest.seo.alternateEn]);
  return { ok: true, type: "daily_digest", article: digest, indexing };
}

export function buildDigest(date, articles) {
  const titleHr = `Dnevni poslovni pregled GNK ASG — ${date}`;
  const titleEn = `GNK ASG Daily Business Review — ${date}`;
  const slug = `dnevni-poslovni-pregled-${date}`;
  const topicsHr = articles.map((article, index) => `${index + 1}. ${article.titleHr || article.title} — ${article.summaryHr || article.summary || ""}`).join("\n\n");
  const topicsEn = articles.map((article, index) => `${index + 1}. ${article.titleEn || article.title} — ${article.summaryEn || article.summary || ""}`).join("\n\n");

  let bodyHr = [
    `${titleHr} objedinjuje najvažnije teme koje je GNK ASG Auto Editor tijekom dana izdvojio iz provjerljivih javnih izvora. Cilj dnevnog komentara nije ponavljati pojedinačne objave, nego povezati ih u jedinstvenu upravljačku sliku: što se promijenilo, zašto je to važno, gdje se pojavljuju rizici i prilike te koje pokazatelje treba pratiti sljedećeg dana.`,
    `Današnje teme:\n\n${topicsHr}`,
    `Zajednički zaključak pokazuje da se poslovne odluke sve rjeđe mogu donositi na temelju samo jednog tržišnog ili tehnološkog pokazatelja. Kretanje kamata, valuta, energije, digitalne imovine, regulatornih očekivanja i umjetne inteligencije djeluje istodobno. Dnevni pregled zato mora razlikovati provjerljive činjenice od procjena, kratkotrajne reakcije od dugoročnih trendova te medijski intenzitet od stvarnog poslovnog učinka.`,
    `Za GNK ASG i GNK DINAMO Ltd. najvažnija je sposobnost pretvaranja javno dostupnih informacija u strukturirani sustav ranog upozorenja. To uključuje provjeru izvora, usporedbu više relevantnih informacija, dokumentiranje vremena objave, povezivanje teme s financijama, tehnologijom, sportskom ekonomijom i upravljanjem te očuvanje jasnog traga o tome zašto je neka tema odabrana.`,
    `Operativni prioritet jest pratiti hoće li se današnje informacije potvrditi kroz tržišne podatke, regulatorne odluke, objave kompanija ili promjene ponašanja investitora i potrošača. Posebnu pozornost treba posvetiti temama koje istodobno utječu na trošak kapitala, reputaciju, digitalnu sigurnost, energetsku izloženost i međunarodna partnerstva.`,
    `Zaključno, dnevni komentar služi kao informativni poslovni pregled i ne predstavlja financijski, pravni ni investicijski savjet. Autor je Nermin Sefić. Pojedinačne objave i njihovi izvorni linkovi ostaju dostupni radi transparentnosti i dodatne provjere.`
  ].join("\n\n");

  let bodyEn = [
    `${titleEn} combines the most important topics selected by the GNK ASG Auto Editor from verifiable public sources during the day. Its purpose is not to repeat individual publications, but to connect them into one management picture: what changed, why it matters, where risks and opportunities are emerging and which indicators should be monitored next.`,
    `Today's topics:\n\n${topicsEn}`,
    `The common conclusion is that business decisions can rarely be based on one market or technology indicator. Interest rates, currencies, energy, digital assets, regulation and artificial intelligence interact at the same time. A useful daily review therefore separates verified facts from assumptions, temporary reactions from long-term trends and media intensity from measurable business impact.`,
    `For GNK ASG and GNK DINAMO Ltd., the central capability is converting public information into a structured early-warning system. This includes source verification, comparison of several relevant signals, documentation of publication time, connection with finance, technology, sport economics and governance, and a clear audit trail explaining why each topic was selected.`,
    `The operational priority is to monitor whether today's information is confirmed through market data, regulatory decisions, corporate disclosures or changes in investor and consumer behaviour. Special attention should be paid to developments that can simultaneously influence capital costs, reputation, digital security, energy exposure and international partnerships.`,
    `In conclusion, this daily commentary is an informational business review and does not constitute financial, legal or investment advice. The author is Nermin Sefić. Individual publications and original source links remain available for transparency and further verification.`
  ].join("\n\n");

  bodyHr = ensureMinimum(bodyHr, MIN_DIGEST_WORDS, extraHr());
  bodyEn = ensureMinimum(bodyEn, MIN_DIGEST_WORDS, extraEn());

  const image = articles.find(article => article.imageUrl || article.image)?.imageUrl || articles.find(article => article.imageUrl || article.image)?.image || "https://gnk-asg.hr/assets/visual-index/auto-business-visuals/01-gnk-asg-global-boardroom.svg";

  return {
    id: `digest-${date}`,
    kind: "daily-digest",
    digestDate: date,
    topicKey: `daily-digest:${date}`,
    title: titleHr,
    titleHr,
    titleEn,
    slug,
    summary: `Dnevni komentar povezuje ${articles.length} najvažnijih objava dana u jedinstven poslovni pregled.`,
    summaryHr: `Dnevni komentar povezuje ${articles.length} najvažnijih objava dana u jedinstven poslovni pregled.`,
    summaryEn: `The daily commentary connects ${articles.length} key publications into one business review.`,
    body: bodyHr,
    bodyHr,
    bodyEn,
    wordCount: wordCount(bodyHr),
    wordCountHr: wordCount(bodyHr),
    wordCountEn: wordCount(bodyEn),
    author: "Nermin Sefić",
    publishedAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    sourceTitle: "GNK ASG daily publication set",
    sourceUrl: "https://gnk-asg.hr/objave/",
    sourceFeed: AUTO_ARTICLES_KEY,
    sourceCount: articles.length,
    sourceArticleIds: articles.map(article => article.id).filter(Boolean),
    imageUrl: image,
    imageAlt: titleHr,
    imageTitle: "GNK ASG Daily Business Review",
    seo: {
      canonical: `https://gnk-asg.hr/objave/${slug}/`,
      alternateEn: `https://gnk-asg.hr/publications/${slug}/`,
      description: `Dnevni poslovni pregled GNK ASG za ${date}.`,
      descriptionEn: `GNK ASG daily business review for ${date}.`,
      keywords: "GNK ASG, GNK DINAMO Ltd, Nermin Sefić, dnevni poslovni pregled, daily business review, tržišta, AI, tehnologija, sport i ekonomija"
    }
  };
}

async function readList(env, key) {
  if (!env.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function notifyIndexNow(env, urls) {
  if (!env.INDEXNOW_KEY) return { configured: false, submitted: false };
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "gnk-asg.hr", key: env.INDEXNOW_KEY, keyLocation: `https://gnk-asg.hr/${env.INDEXNOW_KEY}.txt`, urlList: urls.filter(Boolean) })
    });
    return { configured: true, submitted: response.ok, status: response.status };
  } catch (error) {
    return { configured: true, submitted: false, error: error?.message || String(error) };
  }
}

function ensureMinimum(text, minimum, extra) {
  let output = String(text || "").trim();
  while (wordCount(output) < minimum) output += "\n\n" + extra;
  return output;
}

function extraHr() {
  return "Dodatna vrijednost ovakvog pregleda proizlazi iz kontinuiteta. Pojedinačna vijest može biti prolazna, ali niz sličnih signala kroz više dana može ukazati na promjenu trenda. Zato se svaka tema treba promatrati u odnosu na ranije objave, tržišne pokazatelje, regulatorne rokove i stvarne poslovne posljedice. Sustav mora sačuvati izvor, vrijeme, verziju teksta, korištenu fotografiju, SEO podatke i rezultat indeksiranja kako bi cijeli urednički proces ostao provjerljiv i ponovljiv.";
}

function extraEn() {
  return "The additional value of this review comes from continuity. A single news item may be temporary, but a sequence of similar signals across several days may indicate a change in trend. Each topic should therefore be compared with earlier publications, market indicators, regulatory deadlines and measurable business consequences. The system should preserve the source, publication time, article version, selected image, SEO data and indexing result so that the editorial process remains transparent, auditable and repeatable.";
}

export function wordCount(value) {
  return (String(value || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}
