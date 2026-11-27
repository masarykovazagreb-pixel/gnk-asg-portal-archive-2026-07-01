// Compare the actual public HTML against the exact approved article.
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function verifyArticleHTML(html,article,expected,publishedAt){
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 let schema;try{schema=JSON.parse(match?.[1]||"")}catch{throw Error("Missing valid NewsArticle")}
 if(schema["@type"]!=="NewsArticle"||schema.url!==expected||schema.headline!==article.title.trim()||schema.inLanguage!==(article.language||"hr")||schema.datePublished!==publishedAt||!html.includes('rel="canonical" href="'+esc(expected)+'"'))throw Error("Public metadata mismatch");
 const paragraphs=article.body.trim().split(/\n\s*\n/).map(p=>"<p>"+esc(p)+"</p>").join("");
 if(!paragraphs||!html.includes(paragraphs))throw Error("Public article body mismatch");
 for(const raw of article.sources){const url=new URL(raw).href;if(!html.includes('href="'+esc(url)+'"'))throw Error("Public source missing")}
 return schema;
}
export function verifyImageHTML(html,expected,articleURL){
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 let schema;try{schema=JSON.parse(match?.[1]||"")}catch{throw Error("Missing valid ImageObject")}
 if(schema["@type"]!=="ImageObject"||schema.url!==expected||!html.includes('rel="canonical" href="'+esc(expected)+'"')||!html.includes('href="'+esc(articleURL)+'"'))throw Error("Public image page mismatch");
 return schema;
}
