const VERSION = 'GNK_ASG_ONEPAGE_WORKER_V1_20260627_R2';
const LEGACY_CONTACT = 'https://gnk-asg.hr/api/contact-submit';
const PDF_PATH = '/documents/GNK_ASG_Financijski_pregled_FY2025.pdf';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}
  });
}

function securityHeaders(headers) {
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('x-gnk-asg-onepage', VERSION);
  return headers;
}

function pdfEscape(value){return String(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function pdfText(x,y,size,text,font='F1',color='0.15 0.13 0.10'){
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET\n`;
}
function buildFinancialPdf(){
  const metrics=[['UKUPNI PRIHODI','504,00 mil. EUR'],['UKUPNA AKTIVA','46,40 mil. EUR'],['KAPITAL I REZERVE','46,21 mil. EUR'],['KRATKOROCNE OBVEZE','184,50 tis. EUR'],['DOBIT GODINE','16.076,47 EUR'],['DUGOROCNE OBVEZE','0,00 EUR']];
  let stream='0.027 0.067 0.114 rg 0 0 595 842 re f\n';
  stream+='0.80 0.64 0.29 RG 1.2 w 42 707 72 72 re S\n';
  stream+=pdfText(65,730,30,'G','F2','0.94 0.83 0.54');
  stream+=pdfText(42,674,8,'KORPORATIVNI I FINANCIJSKI PREGLED','F2','0.80 0.64 0.29');
  stream+=pdfText(42,625,29,'GNK ASG d.o.o.','F2','0.94 0.83 0.54');
  stream+=pdfText(42,587,24,'Poslovna godina 2025.','F2','0.94 0.83 0.54');
  stream+=pdfText(42,548,10,'Sazeti portalni pregled kljucnih pravnih i financijskih pokazatelja drustva.','F1','0.92 0.91 0.88');
  stream+='0.08 0.14 0.21 rg 42 450 511 72 re f 0.80 0.64 0.29 RG 0.6 w 42 450 511 72 re S\n';
  stream+=pdfText(58,494,9,'Sjediste','F2','0.94 0.83 0.54');stream+=pdfText(185,494,9,'Zagrebacka cesta 130, Zagreb','F1','1 1 1');
  stream+=pdfText(58,470,9,'OIB / MBS','F2','0.94 0.83 0.54');stream+=pdfText(185,470,9,'75227917632 / 081512375','F1','1 1 1');
  stream+=pdfText(42,407,18,'Kljucni financijski pokazatelji','F2','0.94 0.83 0.54');
  metrics.forEach((m,i)=>{const col=i%3,row=Math.floor(i/3),x=42+col*171,y=292-row*112;stream+='0.96 0.94 0.90 rg '+x+' '+y+' 157 94 re f 0.80 0.64 0.29 RG 0.6 w '+x+' '+y+' 157 94 re S\n';stream+=pdfText(x+10,y+68,7,m[0],'F2','0.38 0.35 0.31');stream+=pdfText(x+10,y+24,13,m[1],'F2','0.15 0.13 0.10');});
  stream+=pdfText(42,56,7,'Portalni financijski pregled. Prije konacne javne objave potvrditi podatke prema izvornim dokumentima.','F1','0.60 0.58 0.54');
  const objects=[];
  const add=s=>{objects.push(s);return objects.length;};
  const catalog=add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;offsets.slice(1).forEach(o=>{pdf+=String(o).padStart(10,'0')+' 00000 n \n';});
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function proxyContact(request) {
  if (request.method !== 'POST') return json({ok:false,error:'method_not_allowed'}, 405);
  const response = await fetch(LEGACY_CONTACT, {method:'POST',headers:{'content-type':'application/json'},body:await request.text()});
  const headers = securityHeaders(new Headers(response.headers));
  headers.set('access-control-allow-origin', '*');headers.set('cache-control', 'no-store');headers.delete('content-length');headers.delete('content-encoding');
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}

async function serveAsset(request, env, pathname) {
  const url = new URL(request.url);url.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(url, request));
  const headers = securityHeaders(new Headers(response.headers));
  if (pathname.endsWith('.html') || pathname === '/') headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  else if (/\.(?:css|js|json|svg)$/i.test(pathname)) headers.set('cache-control', 'public, max-age=300, must-revalidate');
  headers.delete('content-length');
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);const path = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS' && path === '/api/contact') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'}});
    if (path === '/api/contact') return proxyContact(request);
    if (path === PDF_PATH && (request.method === 'GET' || request.method === 'HEAD')) {
      const headers=securityHeaders(new Headers({'content-type':'application/pdf','content-disposition':'attachment; filename="GNK_ASG_Financijski_pregled_FY2025.pdf"','cache-control':'public, max-age=3600'}));
      return new Response(request.method==='HEAD'?null:buildFinancialPdf(),{status:200,headers});
    }
    if (path === '/health') return json({ok:true,version:VERSION,project:'onepage-v1',financialPdf:PDF_PATH});
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ok:false,error:'method_not_allowed'},405);
    const direct=await serveAsset(request,env,url.pathname);if(direct.status!==404)return direct;return serveAsset(request,env,'/index.html');
  }
};
