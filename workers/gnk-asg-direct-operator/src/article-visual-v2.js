export const VERSION = 'GNK_ASG_ARTICLE_VISUAL_V3_R2_CANONICAL_20260626';

const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const escapeXml = value => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iso = value => {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

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

function titleLines(value, maxLength, maxLines) {
  const words = clean(value).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const used = lines.join(' ').split(' ').length;
  if (used < words.length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]+$/,'')}…`;
  return lines;
}

function palette(category) {
  const value = clean(category).toLowerCase();
  if (/tech|ai|digital/.test(value)) return {a:'#03101f',b:'#0b4d86',accent:'#6ec7ff',gold:'#f2cf72'};
  if (/market|financ|econom|business/.test(value)) return {a:'#04101d',b:'#143b54',accent:'#68d7c6',gold:'#e5bb55'};
  if (/energy|sustain|green/.test(value)) return {a:'#041610',b:'#176044',accent:'#83e6ad',gold:'#e1c56a'};
  if (/sport|infrastructure/.test(value)) return {a:'#071126',b:'#223f76',accent:'#85a9ff',gold:'#e5bd5c'};
  return {a:'#020812',b:'#143459',accent:'#70bfff',gold:'#e2b84b'};
}

function visualSvg(article, width, height, format) {
  const title = clean(article.titleHr || article.title || article.titleEn || 'GNK ASG Intelligence Desk');
  const category = clean(article.category || 'Business');
  const region = clean(article.region || 'Global');
  const colors = palette(category);
  const portrait = format === 'portrait';
  const social = format === 'social';
  const maxLength = portrait ? 24 : social ? 31 : 36;
  const maxLines = portrait ? 6 : social ? 4 : 4;
  const lines = titleLines(title, maxLength, maxLines);
  const titleSize = portrait ? 92 : social ? 56 : 88;
  const startY = portrait ? 610 : social ? 235 : 430;
  const lineGap = portrait ? 124 : social ? 72 : 112;
  const left = portrait ? 120 : social ? 70 : 150;
  const rows = lines.map((line, index) => `<text x="${left}" y="${startY + index * lineGap}" font-size="${titleSize}" font-weight="800" fill="#f8fafc" font-family="Arial,Helvetica,sans-serif">${escapeXml(line)}</text>`).join('');
  const border = portrait ? 62 : social ? 30 : 70;
  const radius = portrait ? 58 : social ? 28 : 54;
  const labelSize = portrait ? 35 : social ? 20 : 30;
  const footerSize = portrait ? 31 : social ? 18 : 27;
  const orbX = Math.round(width * .84), orbY = Math.round(height * .18), orbR = Math.round(Math.min(width,height) * .28);
  const gridOpacity = social ? '.12' : '.16';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">GNK ASG Intelligence Desk editorial visual for ${escapeXml(category)} and ${escapeXml(region)}.</desc>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors.a}"/><stop offset=".58" stop-color="${colors.b}"/><stop offset="1" stop-color="#020812"/></linearGradient><radialGradient id="orb"><stop stop-color="${colors.accent}" stop-opacity=".38"/><stop offset="1" stop-color="${colors.accent}" stop-opacity="0"/></radialGradient><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#dbeafe" stroke-opacity="${gridOpacity}" stroke-width="1"/></pattern></defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/><rect width="${width}" height="${height}" fill="url(#grid)"/><circle cx="${orbX}" cy="${orbY}" r="${orbR}" fill="url(#orb)"/><circle cx="${orbX}" cy="${orbY}" r="${Math.round(orbR*.64)}" fill="none" stroke="${colors.gold}" stroke-width="${social?3:6}" opacity=".45"/><path d="M${Math.round(width*.55)} ${Math.round(height*.18)} Q${Math.round(width*.76)} ${Math.round(height*.03)} ${width} ${Math.round(height*.22)} M${Math.round(width*.57)} ${Math.round(height*.34)} Q${Math.round(width*.78)} ${Math.round(height*.18)} ${width} ${Math.round(height*.4)}" fill="none" stroke="${colors.accent}" stroke-width="${social?3:6}" opacity=".42"/><rect x="${border}" y="${border}" width="${width-border*2}" height="${height-border*2}" rx="${radius}" fill="#020812" fill-opacity=".26" stroke="${colors.gold}" stroke-opacity=".62" stroke-width="${social?2:4}"/>
<text x="${left}" y="${portrait?175:social?92:145}" font-size="${labelSize}" font-weight="900" letter-spacing="2" fill="${colors.gold}" font-family="Arial,Helvetica,sans-serif">GNK ASG INTELLIGENCE DESK</text>
<text x="${left}" y="${portrait?250:social?132:205}" font-size="${Math.round(labelSize*.82)}" font-weight="700" fill="${colors.accent}" font-family="Arial,Helvetica,sans-serif">${escapeXml(category.toUpperCase())} · ${escapeXml(region.toUpperCase())}</text>
${rows}
<line x1="${left}" x2="${Math.round(width*.58)}" y1="${height-(portrait?230:social?98:160)}" y2="${height-(portrait?230:social?98:160)}" stroke="${colors.gold}" stroke-width="${social?2:4}" opacity=".7"/>
<text x="${left}" y="${height-(portrait?150:social?58:95)}" font-size="${footerSize}" fill="#dce7f3" font-family="Arial,Helvetica,sans-serif">GNK ASG d.o.o. · GNK DINAMO Ltd. · gnk-asg.hr</text>
</svg>`;
}

function replaceArticle(list, article) {
  return [article, ...(Array.isArray(list) ? list : []).filter(item => item?.id !== article.id && item?.slug !== article.slug)].slice(0, 500);
}

async function put(env, key, body, contentType, metadata) {
  if (!env.GNK_ASG_MEDIA_ASSETS?.put) return false;
  await env.GNK_ASG_MEDIA_ASSETS.put(key, body, {
    httpMetadata:{ contentType, cacheControl:'public, max-age=31536000, immutable' },
    customMetadata:metadata
  });
  return true;
}

export async function generateArticleVisual(env, base) {
  if (!base?.id) return { ok:false, error:'article_missing' };
  const published = iso(base.publishedAt || base.createdAt);
  const year = String(published.getUTCFullYear());
  const month = String(published.getUTCMonth() + 1).padStart(2,'0');
  const prefix = `generated-articles/${year}/${month}/${base.id}`;
  const coverKey = `${prefix}/cover-2400x1350.svg`;
  const socialKey = `${prefix}/social-1200x630.svg`;
  const portraitKey = `${prefix}/portrait-1600x2000.svg`;
  const manifestKey = `${prefix}/manifest.json`;
  const cover = visualSvg(base,2400,1350,'cover');
  const social = visualSvg(base,1200,630,'social');
  const portrait = visualSvg(base,1600,2000,'portrait');
  const coverUrl = `/r2/${coverKey}`;
  const socialUrl = `/r2/${socialKey}`;
  const portraitUrl = `/r2/${portraitKey}`;
  const createdAt = new Date().toISOString();
  const metadata = {articleId:String(base.id),slug:String(base.slug||''),generatedBy:VERSION,createdAt};
  await Promise.all([
    put(env,coverKey,new TextEncoder().encode(cover),'image/svg+xml',{...metadata,variant:'cover',width:'2400',height:'1350'}),
    put(env,socialKey,new TextEncoder().encode(social),'image/svg+xml',{...metadata,variant:'social',width:'1200',height:'630'}),
    put(env,portraitKey,new TextEncoder().encode(portrait),'image/svg+xml',{...metadata,variant:'portrait',width:'1600',height:'2000'})
  ]);

  const article = {
    ...base,
    sourceImage:base.sourceImage || base.image || '',
    image:coverUrl,
    imageUrl:coverUrl,
    ogImage:socialUrl,
    twitterImage:socialUrl,
    portraitImage:portraitUrl,
    imageAlt:`${clean(base.titleHr || base.title || base.titleEn)} — GNK ASG Intelligence Desk`,
    imageCredit:'GNK ASG generated editorial visual',
    imageMimeType:'image/svg+xml',
    imageWidth:2400,
    imageHeight:1350,
    visualManifest:`/r2/${manifestKey}`,
    imageGenerated:{
      version:VERSION,
      generatedAt:createdAt,
      canonicalPrefix:prefix,
      cover:{key:coverKey,url:coverUrl,width:2400,height:1350,mimeType:'image/svg+xml'},
      social:{key:socialKey,url:socialUrl,width:1200,height:630,mimeType:'image/svg+xml'},
      portrait:{key:portraitKey,url:portraitUrl,width:1600,height:2000,mimeType:'image/svg+xml'}
    },
    seo:{
      ...(base.seo||{}),
      image:coverUrl,
      ogImage:socialUrl,
      twitterImage:socialUrl,
      imageAlt:`${clean(base.titleHr || base.title || base.titleEn)} — GNK ASG Intelligence Desk`,
      imageWidth:2400,
      imageHeight:1350
    }
  };
  const manifest = {
    version:VERSION,
    articleId:article.id,
    slug:article.slug,
    canonical:article.canonical,
    titleHr:article.titleHr||article.title,
    titleEn:article.titleEn||article.title,
    summaryHr:article.summaryHr||article.summary,
    summaryEn:article.summaryEn||article.summary,
    category:article.category,
    region:article.region,
    author:article.author||'Nermin Sefić',
    createdAt,
    publishedAt:article.publishedAt,
    imageAlt:article.imageAlt,
    imageCredit:article.imageCredit,
    variants:article.imageGenerated,
    seo:article.seo
  };
  await put(env,manifestKey,new TextEncoder().encode(JSON.stringify(manifest,null,2)),'application/json',{...metadata,variant:'manifest'});
  await write(env,'publish:approved',replaceArticle(await read(env,'publish:approved'),article));
  await write(env,'data:articles:items',replaceArticle(await read(env,'data:articles:items'),article));
  await write(env,`article:${article.id}`,article);
  const gallery = await read(env,'visual-gallery:generated');
  const item = {
    id:`generated-${article.id}`,
    src:coverUrl,
    image:coverUrl,
    thumbnail:socialUrl,
    portraitImage:portraitUrl,
    pageUrl:article.hrUrl||`/objave/${article.slug}/`,
    enUrl:article.enUrl||`/publications/${article.slug}/`,
    sourceUrl:article.canonical,
    title:article.titleHr||article.title,
    titleEn:article.titleEn||article.title,
    description:article.summaryHr||article.summary,
    descriptionEn:article.summaryEn||article.summary,
    alt:article.imageAlt,
    imageCredit:article.imageCredit,
    category:article.category||'GNK ASG Intelligence Desk',
    topic:[article.category,article.region,'GNK ASG Intelligence Desk','R2','Publication'].filter(Boolean),
    keywords:Array.isArray(article.seo?.keywords)?article.seo.keywords:[],
    datePublished:article.publishedAt,
    asset_type:'generated-editorial-image',
    kind:'publication',
    publication:true,
    active:true,
    status:'active',
    article_id:article.id,
    width:2400,
    height:1350,
    mimeType:'image/svg+xml',
    variants:article.imageGenerated,
    manifest:article.visualManifest
  };
  await write(env,'visual-gallery:generated',[item,...(Array.isArray(gallery)?gallery:[]).filter(entry=>entry?.article_id!==article.id)].slice(0,1000));
  return {ok:true,version:VERSION,article,galleryItem:item,manifest};
}

export async function removeArticleFromNews(env,article){
  const current=await read(env,'data:news:items');
  const next=(Array.isArray(current)?current:[]).filter(item=>item?.articleId!==article.id&&item?.slug!==article.slug&&item?.url!==article.canonical&&item?.source!=='GNK ASG Intelligence Desk');
  await write(env,'data:news:items',next);
  return{removed:(Array.isArray(current)?current.length:0)-next.length};
}
