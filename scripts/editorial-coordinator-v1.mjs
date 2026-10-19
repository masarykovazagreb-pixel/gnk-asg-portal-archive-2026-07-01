import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const SITE='https://gnk-asg.hr';
const generic=/social-card|logo|portrait|placeholder|business-\d+/i;
export function coordinate(root=process.cwd()) {
  const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
  const exists=rel=>fs.existsSync(path.join(root,rel));
  const portal='apps/portal';
  const registry=read(`${portal}/data/editorial-registry.json`);
  const gallery=read(`${portal}/data/visual_gallery.json`);
  const manifest=read(`${portal}/data/editorial-plan/manifest.json`);
  const holds=read(`${portal}/data/editorial-plan/publication-holds.json`);
  for(const [name,value] of Object.entries({registry:registry.items,gallery:gallery.items,manifest:manifest.packages,holds:holds.holds})) {
    if(!Array.isArray(value))throw Error(`Invalid coordinator input: ${name}`);
  }
  const held=new Set(holds.holds.filter(x=>x.active===true).map(x=>x.packageId));
  const local=src=>{
    try {
      const url=new URL(src,SITE);
      if(url.origin!==SITE||!url.pathname.startsWith('/assets/'))return null;
      const decoded=decodeURIComponent(url.pathname);
      if(decoded.split('/').includes('..')||decoded.includes('\\'))return null;
      return decoded;
    }catch{return null;}
  };
  const byImage=new Map();
  for(const image of gallery.items) {
    const src=local(image.src);
    if(src)byImage.set(src,image);
  }
  const tasks=[];
  const articles=registry.items.map(item=>{
    const blockers=[];
    const route=item.path;
    const validRoute=typeof route==='string'&&/^\/(?:[a-z0-9-]+\/)+$/.test(route);
    const html=validRoute&&exists(`${portal}${route}index.html`)?fs.readFileSync(path.join(root,portal+route,'index.html'),'utf8'):'';
    if(!html)blockers.push('missing-canonical-html');
    if(!item.seoTitle||!item.description||!item.seoComplete)blockers.push('seo-review');
    const image=local(item.image);
    if(!image||!exists(portal+image))blockers.push('local-image-required');
    if(!item.imageAlt?.trim())blockers.push('image-alt-required');
    if(image&&generic.test(image))blockers.push('topic-image-required');
    const entry=image&&byImage.get(image);
    const imagePage=entry&&/^[a-z0-9-]+$/.test(entry.id)?`/galerija/${entry.id}/`:image?.startsWith('/assets/editorial/generated/')?`/galerija/editorial-${createHash('sha256').update(image).digest('hex').slice(0,16)}/`:null;
    if(!imagePage||!exists(`${portal}${imagePage}index.html`))blockers.push('gallery-detail-required');
    if(!/<meta\b[^>]*name=["']twitter:card["']/i.test(html))blockers.push('twitter-card-required');
    if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(html))blockers.push('structured-data-required');
    for(const issue of blockers)tasks.push({id:`${route}:${issue}`,route,issue,owner:issue.includes('image')||issue.includes('gallery')?'gallery-editor':'editorial-seo',nextAction:issue==='local-image-required'?'Verify source image rights; if unavailable commission an original topic image. Never copy an unlicensed source image.':issue==='gallery-detail-required'?'Verify image provenance and add to visual_gallery.json through the existing gallery writer.':'Repair and review the indicated field through the existing canonical writer.'});
    return {route,title:item.title,language:item.language||null,type:item.type,image,imagePage,blockers,sourceState:'registered-html',productionState:'not-verified'};
  });
  const packages=manifest.packages.filter(p=>!p.publishedAt&&p.status!=='published').map(p=>({id:p.id,publishAt:p.publishAt,stage:held.has(p.id)?'held':p.deployApproved===true?'approved-awaiting-canonical-validation':'editorial-review',files:p.files||[],nextAction:held.has(p.id)?'Resolve the recorded hold; do not infer approval.':p.deployApproved===true?'Run existing source, AI-governance, image and release validators before canonical materialization.':'Prepare source-backed text/commentary and document the real editorial decision.'}));
  return {version:'GNK_ASG_EDITORIAL_COORDINATOR_V1',mode:'read-only-handoff-controller',
    scope:['articles','commentary','AKTUAL daily','AKTUAL weekly','columns','all registry languages'],
    pipeline:['source-research','writing-or-commentary','editorial-review','topic-image-and-gallery','seo-and-social','canonical-publication','exact-sha-deploy','live-url-verification','authorized-blog-distribution'],
    writers:{publication:'.github/workflows/content-queue-publish.yml',scheduled:'.github/workflows/editorial-scheduled-publish.yml',gallery:'scripts/build_gallery_standalone_pages.py',deploy:'.github/workflows/deploy-admin-auth-v6.yml'},
    imagePolicy:{sourceImage:'reuse only with recorded permission or licence',missingImage:'commission an original topic-specific image, record provenance and inspect visual quality',detailPage:'canonical HTML, alt, description, ImageObject, OG/Twitter and sitemap',quality:'dimensions and metadata are not proof of visual quality; human visual review required',identity:'Nermin Sefić / Nermin Sefic through truthful editor/author roles and approved hashtags; never invented image authorship'},
    totals:{articles:articles.length,uniqueArticleImages:new Set(articles.map(x=>x.image).filter(Boolean)).size,galleryImages:gallery.items.length,articlesNeedingWork:articles.filter(x=>x.blockers.length).length,tasks:tasks.length,pendingPackages:packages.length},
    packages,articles,tasks,
    controls:{publicFilesWritten:0,dispatches:0,externalPosts:0,releaseFencePreserved:true,productionVerified:false,forbidden:['new parallel publisher','fabricated human review','automatic licence assumptions','secrets or database changes']}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=coordinate();
  const target='artifacts/workforce-supervisor/editorial-coordinator.json';
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({coordinator:report.version,...report.totals,report:target,productionVerified:false},null,2));
}
