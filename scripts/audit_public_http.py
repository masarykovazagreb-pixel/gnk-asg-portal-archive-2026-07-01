#!/usr/bin/env python3
import json, re, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE='https://gnk-asg.hr'
MAX_URLS=2500
UA='GNK-ASG-Public-Audit/1.0'
CRITICAL=['/','/en/','/vijesti/','/news/','/objave/','/publications/','/visual-index/','/visual-index/?lang=en','/trzista/','/markets/','/contact/','/legal/','/assistant/','/en/assistant/','/app/']

def fetch(url):
    try:
        request=urllib.request.Request(url,headers={'User-Agent':UA,'Cache-Control':'no-cache'})
        with urllib.request.urlopen(request,timeout=20) as response:
            body=response.read(5_000_000).decode('utf-8','replace')
            return {'status':response.status,'type':response.headers.get('content-type',''),'url':response.geturl(),'body':body}
    except Exception as error:
        return {'status':getattr(error,'code',0) or 0,'type':'','url':url,'body':'','error':str(error)}

def discover():
    queue=[f'{BASE}/sitemap.xml',f'{BASE}/sitemap_index.xml']
    visited=set(); pages={f'{BASE}{path}' for path in CRITICAL}
    while queue and len(visited)<100 and len(pages)<MAX_URLS:
        url=queue.pop(0)
        if url in visited: continue
        visited.add(url); result=fetch(url)
        if result['status']!=200: continue
        for item in re.findall(r'<loc>([^<]+)</loc>',result['body'],re.I):
            item=item.replace('&amp;','&').strip()
            try:
                parsed=urllib.parse.urlsplit(item)
                if parsed.netloc not in {'gnk-asg.hr','www.gnk-asg.hr'}: continue
            except Exception: continue
            if re.search(r'\.xml(?:\?|$)',item,re.I): queue.append(item)
            else: pages.add(item.replace('https://www.gnk-asg.hr','https://gnk-asg.hr'))
    return sorted(pages)[:MAX_URLS]

def audit(url):
    result=fetch(url); failures=[]; title=''
    if not 200<=result['status']<400: failures.append(f"http={result['status']}")
    if 'text/html' in result['type']:
        match=re.search(r'<title[^>]*>([\s\S]*?)</title>',result['body'],re.I)
        title=re.sub(r'<[^>]+>',' ',match.group(1)).strip() if match else ''
        if not title: failures.append('title_missing')
        if len(result['body'])<500: failures.append(f"html_too_short={len(result['body'])}")
    return {'url':url,'status':result['status'],'type':result['type'],'title':title,'bytes':len(result['body']),'failures':failures,'error':result.get('error')}

urls=discover(); rows=[]
with ThreadPoolExecutor(max_workers=20) as pool:
    futures={pool.submit(audit,url):url for url in urls}
    for future in as_completed(futures): rows.append(future.result())
rows.sort(key=lambda row:row['url'])
report={'base':BASE,'discovered':len(urls),'ok':all(not row['failures'] for row in rows),'failed':sum(bool(row['failures']) for row in rows),'rows':rows}
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/public-http-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'ok':report['ok'],'discovered':report['discovered'],'failed':report['failed'],'failures':[row for row in rows if row['failures']][:100]},ensure_ascii=False,indent=2))
raise SystemExit(0 if report['ok'] else 1)
