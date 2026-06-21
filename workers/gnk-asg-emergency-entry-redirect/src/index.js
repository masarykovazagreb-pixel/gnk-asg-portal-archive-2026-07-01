const APP_HTML = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07122a">
<meta name="robots" content="noindex,follow">
<title>GNK ASG mobilni portal</title>
<meta name="description" content="Privremeni stabilni mobilni ulaz u GNK ASG portal.">
<style>
:root{color-scheme:dark;--bg:#050b18;--panel:#0b1730;--line:rgba(211,174,92,.34);--gold:#d3ae5c;--gold2:#f1d48a;--text:#f7f8fb;--muted:#aeb9ce}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0,#14264b 0,#07122a 38%,var(--bg) 100%);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(820px,calc(100% - 24px));margin:0 auto;padding:28px 0 80px}.hero,.grid a,.status{border:1px solid var(--line);background:rgba(11,23,48,.92);border-radius:24px;box-shadow:0 18px 54px rgba(0,0,0,.32)}.hero{padding:28px;text-align:center}.mark{display:grid;place-items:center;width:82px;height:82px;margin:0 auto;border:2px solid var(--gold);border-radius:50%;color:var(--gold2);font-weight:900;letter-spacing:.08em;box-shadow:0 0 34px rgba(211,174,92,.2)}h1{margin:18px 0 8px;font-size:clamp(30px,8vw,52px)}p{color:var(--muted);line-height:1.65}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.grid a{display:block;padding:19px;color:var(--text);text-decoration:none}.grid strong{display:block;color:var(--gold2);margin-bottom:7px;font-size:18px}.grid span{display:block;color:var(--muted);font-size:13px;line-height:1.5}.status{margin-top:14px;padding:16px;color:var(--muted)}.status b{color:var(--gold2)}.home{display:inline-block;margin-top:18px;padding:13px 20px;border-radius:999px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#07101f;text-decoration:none;font-weight:900}@media(max-width:580px){.grid{grid-template-columns:1fr}.hero{padding:22px}}
</style>
</head>
<body>
<main>
<section class="hero">
<div class="mark" aria-label="GNK ASG">GNK<br>ASG</div>
<h1>GNK ASG mobilni portal</h1>
<p>Stabilni mobilni ulaz za brzi pristup javnim funkcijama portala. Ova privremena ulazna stranica osigurava dostupnost dok se priprema završna verzija novog portala.</p>
<a class="home" href="https://gnk-asg.hr/">Otvori početnu stranicu</a>
</section>
<nav class="grid" aria-label="GNK ASG mobilna navigacija">
<a href="/objave/"><strong>Objave i analize</strong><span>Vlastiti tekstovi, izvori i poslovne analize.</span></a>
<a href="/trzista/"><strong>Tržišta</strong><span>Tržišni pokazatelji i digitalna imovina.</span></a>
<a href="/vijesti/"><strong>Poslovne vijesti</strong><span>Aktualne poslovne i tehnološke teme.</span></a>
<a href="/assistant/"><strong>AI pomoć</strong><span>Javni GNK ASG asistent.</span></a>
<a href="/contact/"><strong>Kontakt</strong><span>Kontakt forma i odjeli.</span></a>
<a href="/operator-mobile/" rel="nofollow"><strong>Mobilni Admin</strong><span>Zaštićeni administratorski pristup.</span></a>
</nav>
<section class="status"><b>Status:</b> mobilni ulaz je aktivan.</section>
</main>
</body>
</html>`;

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const isAppEntry = incoming.hostname === 'gnk-asg.hr' &&
      (incoming.pathname === '/app' || incoming.pathname.startsWith('/app/'));

    if (isAppEntry) {
      const headers = {
        ...securityHeaders('standalone-mobile-entry'),
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0'
      };
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }
      return new Response(APP_HTML, { status: 200, headers });
    }

    return new Response('Not Found', {
      status: 404,
      headers: securityHeaders('route-miss')
    });
  }
};

function securityHeaders(mode) {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'x-gnk-asg-emergency-entry-fix': mode
  };
}
