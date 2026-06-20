import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('reports/live-backend-audit');
await mkdir(outputDir, { recursive: true });

const checks = [
  { name:'Homepage', url:'https://gnk-asg.hr/', expected:[200], kind:'html' },
  { name:'Contact submit status', url:'https://gnk-asg.hr/api/contact-submit', expected:[200], kind:'json' },
  { name:'Contact mailboxes', url:'https://gnk-asg.hr/api/contact-mailboxes', expected:[200], kind:'json' },
  { name:'AI assist GET', url:'https://gnk-asg.hr/api/ai-assist', expected:[200,400,405], kind:'json-or-method' },
  { name:'Auto Editor public', url:'https://gnk-asg.hr/auto-editor', expected:[200], kind:'html-or-json' },
  { name:'Auto Editor API', url:'https://gnk-asg.hr/api/auto-editor', expected:[200,400,405], kind:'json-or-method' },
  { name:'Auto Editor feed', url:'https://gnk-asg.hr/data/auto-editor.json', expected:[200], kind:'json' },
  { name:'Auto publications feed', url:'https://gnk-asg.hr/data/publications-auto.json', expected:[200], kind:'json' },
  { name:'News feed', url:'https://gnk-asg.hr/data/news.json', expected:[200], kind:'json' },
  { name:'Market feed', url:'https://gnk-asg.hr/data/market.json', expected:[200], kind:'json' },
  { name:'Digital assets feed', url:'https://gnk-asg.hr/data/digital-assets.json', expected:[200], kind:'json' },
  { name:'BTC chart feed', url:'https://gnk-asg.hr/data/btc_chart.json', expected:[200], kind:'json' },
  { name:'Update status feed', url:'https://gnk-asg.hr/data/update_status.json', expected:[200], kind:'json' },
  { name:'Backend status', url:'https://gnk-asg.hr/backend-status', expected:[200], kind:'json' },
  { name:'Publish public list', url:'https://publish.gnk-asg.hr/api/publications', expected:[200], kind:'json' },
  { name:'Publish protected status', url:'https://publish.gnk-asg.hr/api/publications/status', expected:[401,403], kind:'protected' },
  { name:'Operator dashboard protected', url:'https://gnk-asg.hr/operator/dashboard-status', expected:[401,403], kind:'protected' },
  { name:'Operator inbox protected', url:'https://gnk-asg.hr/operator/contact-inbox', expected:[401,403], kind:'protected' }
];

function compact(value, limit = 420) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function inspect(check) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(check.url, {
      method:'GET',
      redirect:'follow',
      cache:'no-store',
      signal:controller.signal,
      headers:{
        'user-agent':'GNK-ASG-Live-Backend-Audit/1.0',
        'accept':'application/json,text/html;q=0.9,*/*;q=0.8',
        'cache-control':'no-cache'
      }
    });
    const text = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    const statusOk = check.expected.includes(response.status);
    const contentType = response.headers.get('content-type') || '';
    const looksJson = Boolean(parsed) || contentType.includes('json');
    const looksHtml = contentType.includes('html') || /<!doctype html|<html/i.test(text);
    const contentOk = check.kind === 'json' ? looksJson :
      check.kind === 'html' ? looksHtml :
      check.kind === 'protected' ? statusOk : true;
    return {
      ...check,
      ok:statusOk && contentOk,
      status:response.status,
      finalUrl:response.url,
      contentType,
      cfCacheStatus:response.headers.get('cf-cache-status') || '',
      server:response.headers.get('server') || '',
      durationMs:Date.now() - startedAt,
      bodyBytes:Buffer.byteLength(text),
      jsonKeys:parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).slice(0,30) : [],
      snippet:compact(text)
    };
  } catch (error) {
    return {
      ...check,
      ok:false,
      status:0,
      durationMs:Date.now() - startedAt,
      error:error?.name === 'AbortError' ? 'timeout' : String(error?.message || error)
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const check of checks) {
  const result = await inspect(check);
  results.push(result);
  console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.status || '-'} ${check.name} ${check.url}`);
}

const report = {
  generatedAt:new Date().toISOString(),
  readOnly:true,
  productionWrites:false,
  total:results.length,
  ok:results.filter(item => item.ok).length,
  failed:results.filter(item => !item.ok).length,
  results
};

const rows = results.map(item => `| ${item.ok ? 'OK' : 'FAIL'} | ${item.status || '-'} | ${item.name} | ${item.contentType || item.error || ''} | ${item.durationMs} ms |`).join('\n');
const details = results.filter(item => !item.ok).map(item => `## ${item.name}\n\n- URL: ${item.url}\n- Status: ${item.status || '-'}\n- Expected: ${item.expected.join(', ')}\n- Error/content: ${item.error || item.snippet || '(empty)'}\n`).join('\n');
const markdown = `# GNK ASG live backend smoke audit\n\nGenerated: ${report.generatedAt}\n\nRead-only: YES  \nProduction writes: NO\n\n- Total: ${report.total}\n- OK: ${report.ok}\n- Failed: ${report.failed}\n\n| Result | HTTP | Check | Content type / error | Time |\n|---|---:|---|---|---:|\n${rows}\n\n${details}`;

await writeFile(path.join(outputDir, 'live-backend-audit.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(outputDir, 'live-backend-audit.md'), markdown);

if (report.failed > 0) process.exitCode = 1;
