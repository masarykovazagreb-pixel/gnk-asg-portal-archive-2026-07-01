// Visible network tags, not an authorship claim and not meta keywords.
// Keep existing approved footer tags intact and insert only where both are absent.
export const worldHashtagBlock = '<p class="gnk-hashtags" data-world-network-tags="v1" style="max-width:1050px;margin:8px auto 24px;padding:0 20px;font:14px/1.6 Arial,sans-serif;color:#cbd5e1"><a href="/en/nermin-sefic/">#NerminSefić</a> <a href="/en/nermin-sefic/">#NerminSefic</a> <a href="/en/gnk-aktual/">#AktualMedia</a> <a href="/en/">#GNKASG</a> #MrezaIzdanja</p>';
export function ensureWorldHashtags(html) {
  const a=html.includes('#NerminSefić'), b=html.includes('#NerminSefic');
  if(a && b) return html;
  if(a || b) throw new Error('Partial author hashtag set requires manual review');
  const anchor='</main><footer class="am-footer">';
  if(html.split(anchor).length!==2) throw new Error('Expected a single world directory footer');
  return html.replace(anchor, `</main>\n${worldHashtagBlock}\n<footer class="am-footer">`);
}
