export const VERSION = 'GNK_ASG_ARTICLE_VISUAL_V2_20260626';

const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const escapeXml = value => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function read(env, key, fallback = []) {
  const store = kv(env);
  if (!store) return fallback;
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function write(env, key, value) {
  const store = kv(env);
  if (!store) return false;
  await store.put(key, JSON.stringify(value, null, 2));
  return true;
}

function titleLines(value) {
  const words = clean(value).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 34 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === 3) break;
  }
  if (line && lines.length < 4) lines.push(line);
  return lines;
}

function createSvg(article) {
  const title = article.titleHr || article.title || article.titleEn;
  const rows = titleLines(title).map((line, index) =>
    `<text x="110" y="${320 + index * 82}" font-size="60" font-weight="800" fill="#f8fafc" font-family="Arial">${escapeXml(line)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <rect width="1600" height="900" fill="#020812"/>
  <circle cx="1370" cy="160" r="380" fill="none" stroke="#d7aa3c" stroke-width="5" opacity=".45"/>
  <path d="M980 220 Q1300 20 1600 290 M1000 390 Q1330 180 1600 480" fill="none" stroke="#2e9cff" stroke-width="4" opacity=".45"/>
  <rect x="80" y="80" width="1440" height="740" rx="36" fill="none" stroke="#d7aa3c" opacity=".5"/>
  <text x="110" y="155" font-size="28" font-weight="900" fill="#ffe092" font-family="Arial">GNK ASG INTELLIGENCE DESK</text>
  <text x="110" y="225" font-size="24" font-weight="700" fill="#8fc8ff" font-family="Arial">${escapeXml(article.category || 'BUSINESS').toUpperCase()}</text>
  ${rows}
  <text x="110" y="775" font-size="24" fill="#dce7f3" font-family="Arial">GNK ASG d.o.o. · GNK DINAMO Ltd.</text>
  </svg>`;
}

function replaceArticle(list, article) {
  return [article, ...(Array.isArray(list) ? list : []).filter(item => item?.id !== article.id && item?.slug !== article.slug)].slice(0, 500);
}

export async function generateArticleVisual(env, base) {
  if (!base?.id) return { ok:false, error:'article_missing' };
  const key = `generated-articles/${base.id}.svg`;
  const bytes = new TextEncoder().encode(createSvg(base));
  const image = `/r2/${key}`;
  if (env.GNK_ASG_MEDIA_ASSETS?.put) {
    await env.GNK_ASG_MEDIA_ASSETS.put(key, bytes, {
      httpMetadata:{ contentType:'image/svg+xml' },
      customMetadata:{ articleId:base.id, generatedBy:VERSION }
    });
  }
  const article = {
    ...base,
    image,
    imageFallback:base.image || '',
    imageAlt:`${clean(base.titleHr || base.title)} — GNK ASG Intelligence Desk`,
    imageCredit:'GNK ASG generated editorial visual',
    imageGenerated:{ version:VERSION, key, generatedAt:new Date().toISOString(), width:1600, height:900 }
  };
  await write(env, 'publish:approved', replaceArticle(await read(env, 'publish:approved'), article));
  await write(env, 'data:articles:items', replaceArticle(await read(env, 'data:articles:items'), article));
  await write(env, `article:${article.id}`, article);
  const gallery = await read(env, 'visual-gallery:generated');
  const item = { id:`generated-${article.id}`, src:image, title:article.titleHr || article.title, alt:article.imageAlt, asset_type:'generated-image', active:true, status:'active', article_id:article.id };
  await write(env, 'visual-gallery:generated', [item, ...gallery.filter(entry => entry?.article_id !== article.id)].slice(0, 500));
  return { ok:true, version:VERSION, article, galleryItem:item };
}

export async function removeArticleFromNews(env, article) {
  const current = await read(env, 'data:news:items');
  const next = current.filter(item => item?.articleId !== article.id && item?.slug !== article.slug && item?.url !== article.canonical && item?.source !== 'GNK ASG Intelligence Desk');
  await write(env, 'data:news:items', next);
  return { removed:current.length - next.length };
}
