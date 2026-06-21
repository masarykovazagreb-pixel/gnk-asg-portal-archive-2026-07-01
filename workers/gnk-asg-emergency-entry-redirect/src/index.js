const APEX_ORIGIN = 'https://gnk-asg.hr';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (incoming.hostname === 'www.gnk-asg.hr') {
      const target = new URL(incoming.pathname + incoming.search, APEX_ORIGIN);
      return redirect(target.toString(), 308, 'www-to-apex');
    }

    if (incoming.hostname === 'gnk-asg.hr' && (incoming.pathname === '/app' || incoming.pathname.startsWith('/app/'))) {
      const target = new URL('/', APEX_ORIGIN);
      return redirect(target.toString(), 307, 'pwa-start-to-home');
    }

    return new Response('Not Found', {
      status: 404,
      headers: securityHeaders('route-miss')
    });
  }
};

function redirect(location, status, mode) {
  return new Response(null, {
    status,
    headers: {
      ...securityHeaders(mode),
      location,
      'cache-control': 'no-store'
    }
  });
}

function securityHeaders(mode) {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN',
    'x-gnk-asg-emergency-entry-fix': mode
  };
}
