// Original, locally generated editorial vector illustrations; never mistaken for news photographs.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const themeGlyph={sigurnost:'◈',rat:'✦',potres:'△',politika:'◇',ekonomija:'◆',ai:'⬡',energija:'☼',sport:'◉',drustvo:'◎'};
export function themeArtwork(channel,theme){
 const accent=channel.palette?.accent||'#d4b679',bg=channel.palette?.bg||'#101b2b';
 const title=channel.city||channel.id||'AKTUAL MEDIA';
 const motif=themeGlyph[theme]||'◈';
 const seed=[...String(channel.id+theme)].reduce((s,c)=>s+c.charCodeAt(0),0);
 const bars=Array.from({length:15},(_,i)=>{
  const h=65+((seed+i*83)%185),x=i*86+30;
  return '<rect x="'+x+'" y="'+(640-h)+'" width="55" height="'+h+'" rx="3" fill="#e6c783" opacity="'+(.10+(i%4)*.06)+'"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="'+esc(title+' — '+theme+' — ilustracija AKTUAL MEDIA')+'"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+esc(bg)+'"/><stop offset="1" stop-color="#132e3a"/></linearGradient><radialGradient id="g"><stop stop-color="'+esc(accent)+'" stop-opacity=".55"/><stop offset="1" stop-color="'+esc(accent)+'" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(#bg)"/><circle cx="940" cy="220" r="390" fill="url(#g)"/><g opacity=".22">'+bars+'</g><path d="M20 645H1260" stroke="'+esc(accent)+'" stroke-width="3"/><path d="M60 115H570" stroke="'+esc(accent)+'" stroke-width="3"/><text x="60" y="91" font-family="Arial,sans-serif" font-size="24" letter-spacing="8" fill="#e9dab1">AKTUAL MEDIA / '+esc(String(channel.lang).toUpperCase())+'</text><text x="60" y="570" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="#fff9ec">'+esc(title)+'</text><text x="60" y="632" font-family="Arial,sans-serif" font-size="28" letter-spacing="7" fill="#e7cf94">'+esc(theme.toLocaleUpperCase())+'</text><text x="925" y="448" font-family="Arial,sans-serif" font-size="260" text-anchor="middle" fill="'+esc(accent)+'" opacity=".42">'+motif+'</text><text x="60" y="689" font-family="Arial,sans-serif" font-size="19" fill="#e9dab1">GNK ASG · ORIGINAL EDITORIAL ART · NOT A NEWS PHOTOGRAPH</text></svg>';
}
