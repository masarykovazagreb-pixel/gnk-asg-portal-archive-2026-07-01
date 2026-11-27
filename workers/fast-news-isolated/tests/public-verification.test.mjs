import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyArticleHTML,verifyImageHTML} from "../scripts/public-verification.mjs";
const expected="https://example.org/novosti/fixture/",image="https://example.org/slika/fixture/",date="2026-11-27T19:00:00.000Z";
const article={title:"Fixture article",language:"hr",body:"Prvi & drugi.\n\nDrugi <odlomak>.",sources:["https://example.org/a","https://example.net/b"]};
const schema={"@type":"NewsArticle",url:expected,headline:article.title,inLanguage:"hr",datePublished:date};
const html='<link rel="canonical" href="'+expected+'"><script type="application/ld+json">'+JSON.stringify(schema)+'</script><p>Prvi &amp; drugi.</p><p>Drugi &lt;odlomak&gt;.</p><a href="https://example.org/a">A</a><a href="https://example.net/b">B</a>';
const imageHTML='<link rel="canonical" href="'+image+'"><script type="application/ld+json">'+JSON.stringify({"@type":"ImageObject",url:image})+'</script><a href="'+expected+'">Article</a>';
test("verify real article body, sources and image HTML",()=>{
 assert.equal(verifyArticleHTML(html,article,expected,date).url,expected);
 assert.throws(()=>verifyArticleHTML(html.replace("Drugi &lt;odlomak&gt;.","False"),article,expected,date));
 assert.throws(()=>verifyArticleHTML(html.replace('href="https://example.net/b"','href="#"'),article,expected,date));
 assert.throws(()=>verifyArticleHTML(html,article,expected,"2026-11-27T19:01:00.000Z"));
 assert.throws(()=>verifyArticleHTML(html.replace('rel="canonical"','rel="alternate"'),article,expected,date));
 assert.equal(verifyImageHTML(imageHTML,image,expected).url,image);
 assert.throws(()=>verifyImageHTML(imageHTML.replace('href="'+expected+'"','href="#"'),image,expected));
});
