import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
test("actual SQLite migrations, publication idempotency and monotonic WORLD snapshots",()=>{
 const db=new DatabaseSync(":memory:");
 try{
  for(let i=0;i<2;i++)for(const file of ["0001_articles.sql","0002_world.sql"])db.exec(readFileSync(new URL("../migrations/"+file,import.meta.url),"utf8"));
  const put=db.prepare("INSERT INTO fast_news_articles (slug,title,description,payload,digest,published_at) VALUES (?,?,?,?,?,?) ON CONFLICT(slug) DO NOTHING");
  const item=["fixture","Synthetic test","Description",JSON.stringify({country:"hrvatska",language:"hr",section:"Sport"}),"digest","2026-11-27T19:00:00.000Z"];
  assert.equal(put.run(...item).changes,1);
  assert.equal(put.run(...item).changes,0);
  assert.equal(put.run(...item.map((v,i)=>i===4?"different":v)).changes,0);
  assert.equal(db.prepare("SELECT * FROM fast_news_articles WHERE slug = ?").get("fixture").digest,"digest");
  const list=db.prepare("SELECT slug,title,published_at,payload FROM fast_news_articles WHERE json_extract(payload,'$.country')=? AND json_extract(payload,'$.language')=? AND json_extract(payload,'$.section')=? ORDER BY published_at DESC,slug ASC LIMIT 100");
  assert.equal(list.all("hrvatska","hr","Sport").length,1);
  assert.equal(list.all("hrvatska","en","Sport").length,0);
  const snap=db.prepare("INSERT INTO fast_news_world_cache (country,updated_at,payload) VALUES (?,?,?) ON CONFLICT(country) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload WHERE excluded.updated_at>fast_news_world_cache.updated_at");
  assert.equal(snap.run("hrvatska","2026-11-27T19:00:00Z","[]").changes,1);
  assert.equal(snap.run("hrvatska","2026-11-27T18:00:00Z","[1]").changes,0);
  assert.equal(snap.run("hrvatska","2026-11-27T20:00:00Z","[2]").changes,1);
  assert.equal(db.prepare("SELECT payload FROM fast_news_world_cache WHERE country=?").get("hrvatska").payload,"[2]");
  assert.equal(db.prepare("SELECT count(*) AS n FROM fast_news_articles WHERE published_at >= ?").get("2026-11-26").n,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM fast_news_articles WHERE published_at >= ?").get("2026-11-28").n,0);
 }finally{db.close()}
});
