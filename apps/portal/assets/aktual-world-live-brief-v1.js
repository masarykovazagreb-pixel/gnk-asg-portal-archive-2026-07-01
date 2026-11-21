/* AKTUAL WORLD newsroom live shelf — source-linked headlines, not reproduced stories.
 * Read-only client. One shared module for 201 HR + EN country directories.
 * Uses canonical Worker feed (60s HTTP cache), falls back to current local asset;
 * never publishes articles, invents geography, or claims editorial approval.
 */
(function () {
  'use strict';
  var match = location.pathname.match(/^\/(?:en\/)?gnk-aktual\/media\/([^/]+)\/?$/);
  if (!match) return;
  var slug = decodeURIComponent(match[1]);
  var en = location.pathname.indexOf('/en/') === 0;
  var say = function (hr, eng) { return en ? eng : hr; };
  var POLL_MS = 120000, MAX_AGE_MS = 72 * 3600000, MAX_ROWS = 30;
  var seenFirstLoad = false, lastQuery = 0, list, status, refresh, root;
  function safeUrl(value) {
    try {
      var u = new URL(String(value || ''));
      if (u.protocol !== 'https:' || u.username || u.password) return null;
      return u;
    } catch (_) { return null; }
  }
  function normalizeUrl(url) {
    var u = safeUrl(url);
    if (!u) return null;
    u.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(function(k){u.searchParams.delete(k);});
    return u.origin + u.pathname.replace(/\/$/,'') + u.search;
  }
  function asRows(payload) {
    return Array.isArray(payload) ? payload : Array.isArray(payload && payload.items) ? payload.items : [];
  }
  function select(rows) {
    var now = Date.now(), seen = new Set();
    var filtered = asRows(rows).filter(function (x) {
      var title = String((x && x.title) || '').trim();
      var src = String((x && x.source) || '').trim();
      var link = safeUrl(x && (x.sourceUrl || x.url));
      var at = Date.parse(x && (x.published_at || x.publishedAt || ''));
      if (!title || !src || !link || !Number.isFinite(at) || now - at > MAX_AGE_MS || at > now + 3600000) return false;
      var key = normalizeUrl(link.href);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort(function (a,b) {
      return Date.parse(b.published_at||b.publishedAt) - Date.parse(a.published_at||a.publishedAt);
    });
    var local = [], world = [];
    filtered.forEach(function(x) {
      var labels = [x.category,x.group].map(function(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');});
      var own = labels.some(function(x){return x === slug;});
      (own ? local : world).push(x);
    });
    return {rows:local.concat(world).slice(0,MAX_ROWS),localCount:Math.min(local.length,MAX_ROWS)};
  }
  function el(tag,cls,text) {
    var e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text;
    return e;
  }
  function init() {
    if (document.querySelector('[data-aktual-live-brief="v1"]')) return;
    var main=document.querySelector('main#worldContent')||document.querySelector('main.am-container');
    if(!main) return;
    root=el('section','aw-live');
    root.setAttribute('data-aktual-live-brief','v1');
    root.setAttribute('aria-label',say('Najnoviji naslovi','Latest headlines'));
    var kicker=el('p','aw-live-k',say('IZVORI · AKTUAL MEDIA','SOURCES · AKTUAL MEDIA'));
    var h2=el('h2','',say('Najnovije iz izvora','Latest source headlines'));
    var note=el('p','aw-live-note',say('Do 30 aktualnih naslova iz vanjskih medija. Lokalni naslovi imaju prednost; ostatak su svjetske vijesti. Ovo nisu naši objavljeni članci.','Up to 30 recent external-source headlines. Local items appear first; the remainder are global. These are not our published articles.'));
    var controls=el('div','aw-live-controls'); status=el('p','aw-live-status',say('Učitavanje izvora…','Loading sources…'));
    refresh=el('button','aw-live-refresh',say('Osvježi naslove','Refresh headlines')); refresh.type='button';
    controls.appendChild(status);controls.appendChild(refresh);
    list=el('ol','aw-live-grid');
    root.appendChild(kicker);root.appendChild(h2);root.appendChild(note);root.appendChild(controls);root.appendChild(list);
    var style=el('style');
    style.textContent='.aw-live{margin:24px auto;padding:clamp(18px,3vw,30px);background:#081927;color:#eef6ff;border:1px solid #31516b;border-radius:16px}.aw-live-k{font:800 11px/1.4 system-ui;letter-spacing:.13em;color:#eac471}.aw-live h2{font:700 clamp(24px,3vw,35px)/1.2 Georgia,serif;margin:4px 0 10px;color:#fff}.aw-live-note{color:#bcd0e0;max-width:78ch}.aw-live-controls{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin:14px 0}.aw-live-status{font:500 12px/1.4 system-ui;color:#c4d4e1;margin:0}.aw-live-refresh{background:#243e51;border:1px solid #7294ae;border-radius:8px;color:#fff;cursor:pointer;padding:8px 12px;font:700 12px system-ui}.aw-live-refresh:disabled{opacity:.55;cursor:wait}.aw-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:10px;list-style:none;padding:0;margin:0}.aw-live-grid li{margin:0;padding:13px;border:1px solid #24435b;background:#10293c;border-radius:10px;min-width:0}.aw-live-grid a{display:block;color:#f5f8fb;text-decoration:none;font:650 14px/1.45 system-ui;overflow-wrap:anywhere}.aw-live-grid a:hover{text-decoration:underline;color:#ffe39e}.aw-live-meta{display:flex;gap:7px;flex-wrap:wrap;color:#c2d2de;font:500 11px/1.5 system-ui;margin-top:10px}.aw-live-local{color:#f3d48b;font-weight:750}.aw-live-empty{color:#d4e3ef;font:500 14px system-ui}.aw-live button:focus-visible,.aw-live a:focus-visible{outline:2px solid #ffe39e;outline-offset:2px}@media(max-width:600px){.aw-live-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    var existing=main.querySelector('[data-aktual-topic-choices]')||main.querySelector('.am-section')||main.querySelector('.section');
    if(existing&&existing.nextSibling)main.insertBefore(root,existing.nextSibling);else main.appendChild(root);
    refresh.addEventListener('click',function(){load(true);});
    load(false);
    window.setInterval(function(){if(!document.hidden)load(false);},POLL_MS);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-lastQuery>POLL_MS)load(false);});
    window.addEventListener('online',function(){load(false);});
  }
  function draw(result) {
    list.replaceChildren();
    if (!result.rows.length) {
      list.appendChild(el('li','aw-live-empty',say('Nema dovoljno novih, izvorno povezanih naslova. Otvorite 20 tematskih pretraga.','No fresh source-linked headlines. Use the 20 topic searches.')));
      return;
    }
    result.rows.forEach(function (item,index) {
      var li=el('li'),a=el('a');
      var u=safeUrl(item.sourceUrl || item.url);
      if (!u) return;
      a.href=u.href;a.target='_blank';a.rel='noopener noreferrer nofollow';a.textContent=String(item.title).slice(0,240);
      var meta=el('div','aw-live-meta');
      meta.appendChild(el('span','',String(item.source).slice(0,70)));
      var stamp=el('time','',String(item.published_at||item.publishedAt).slice(0,16).replace('T',' ')+' UTC');
      stamp.dateTime=String(item.published_at||item.publishedAt);
      meta.appendChild(stamp);
      meta.appendChild(el('span',index<result.localCount?'aw-live-local':'',index<result.localCount?say('Lokalno','Local'):say('Svijet','World')));
      li.appendChild(a);li.appendChild(meta);list.appendChild(li);
    });
  }
  async function load(force) {
    if (!root || document.hidden || (!force && Date.now()-lastQuery<110000 && seenFirstLoad)) return;
    lastQuery=Date.now();refresh.disabled=true;
    status.textContent=say('Provjera izvora…','Checking sources…');
    try {
      var response=await fetch('/api/public-news-feed',{credentials:'same-origin',cache:'default'});
      if(!response.ok)response=await fetch('/data/news.json',{credentials:'same-origin',cache:'default'});
      if(!response.ok)throw new Error('source unavailable');
      var data=await response.json();
      var result=select(data);
      draw(result);seenFirstLoad=true;
      status.textContent=say('Prikazano '+result.rows.length+' naslova; lokalnih '+result.localCount+'. Zadnja provjera: ','Showing '+result.rows.length+' headlines, '+result.localCount+' local. Checked: ')+new Date().toLocaleTimeString(en?'en-GB':'hr-HR',{hour:'2-digit',minute:'2-digit'});
    } catch (_) {
      status.textContent=say('Izvor trenutačno nije dostupan; prethodni podaci ostaju prikazani.','Source temporarily unavailable; previous results are retained.');
    } finally {refresh.disabled=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
