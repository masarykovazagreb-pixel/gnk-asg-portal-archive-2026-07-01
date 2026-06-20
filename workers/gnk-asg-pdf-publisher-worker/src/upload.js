import { slugify,cleanFilename,safeHttps } from './utils.js';
import { writeRecord,storePdf } from './storage.js';

const LABELS={report:'Izvješće',publication:'PDF objava',presentation:'Prezentacija',legal:'Pravni dokument',financial:'Financijski dokument',media:'Media Kit',other:'Dokument'};

export async function uploadPdf(request,env){
  const form=await request.formData();
  const file=form.get('file');
  const title=String(form.get('title')||'').trim();
  const summary=String(form.get('summary')||'').trim();
  const lang=String(form.get('lang')||'hr').toLowerCase();
  const type=String(form.get('type')||'publication').toLowerCase();
  const status=String(form.get('status')||'draft').toLowerCase()==='published'?'published':'draft';
  if(!file||typeof file.stream!=='function')throw new Error('pdf_required');
  if(file.type!=='application/pdf'&&!String(file.name||'').toLowerCase().endsWith('.pdf'))throw new Error('pdf_only');
  if(file.size>20*1024*1024)throw new Error('pdf_too_large_20mb');
  if(title.length<5||summary.length<20)throw new Error('title_or_summary_too_short');
  if(!['hr','en'].includes(lang))throw new Error('invalid_language');
  const slug=slugify(form.get('slug')||title);
  const id=`pdf-${slug}-${crypto.randomUUID().slice(0,8)}`;
  const now=new Date().toISOString();
  const r2Key=`preview/pdf-publications/${now.slice(0,7).replace('-','/')}/${id}.pdf`;
  await storePdf(env,r2Key,file,{filename:cleanFilename(file.name),title,language:lang,type});
  const origin=new URL(request.url).origin;
  const record={id,slug,type,typeLabel:LABELS[type]||LABELS.other,status,lang,title,summary,author:String(form.get('author')||'Nermin Sefić').trim(),category:String(form.get('category')||'Dokumenti').trim(),image:safeHttps(form.get('image'),'https://gnk-asg.hr/assets/gnk-asg-social-card.png'),keywords:String(form.get('keywords')||'').split(',').map(x=>x.trim()).filter(Boolean),sourceUrl:safeHttps(form.get('sourceUrl'),''),filename:cleanFilename(file.name),size:file.size,r2Key,pdfUrl:`${origin}/files/${id}.pdf`,publishedAt:status==='published'?now:null,createdAt:now,updatedAt:now};
  const items=await writeRecord(env,record);
  return {record,total:items.length};
}
