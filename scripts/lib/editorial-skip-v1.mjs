import {isProtectedEditorialRoute} from './editorial-route-protection-v1.mjs';

// Limited to known editorial templates. Never changes article copy or metadata.
export function addEditorialSkip(html, route) {
  const cleanRoute=String(route);
  if (cleanRoute.includes('\\') || !/^(?:objave|komentari|analize|en\/(?:publications|commentary|analyses))\//.test(cleanRoute) || cleanRoute.split('/').includes('..')) return {html,status:'unsupported'};
  if (isProtectedEditorialRoute(cleanRoute) || /504-milijuna/i.test(cleanRoute)) return {html, status:'protected'};
  if (!/<link\b[^>]*href="\/assets\/am-design-v1\.css(?:\?[^"\s]*)?"[^>]*data-am-design="v1"[^>]*>/i.test(html) || /<meta\b[^>]*http-equiv=["']?refresh/i.test(html)) return {html, status:'unsupported'};
  if (/<a\b[^>]*(?:class=["'][^"']*\bskip\b|href=["']#(?:sadrzaj|editorialContent)["'])/i.test(html)) return {html, status:'already'};
  if (/\bid=["']editorialContent["']/i.test(html)) return {html, status:'unsupported'};
  const bodies=[...html.matchAll(/<body\b[^>]*>/gi)];
  const mains=[...html.matchAll(/<main\b[^>]*>/gi)];
  if(bodies.length!==1 || mains.length!==1 || bodies[0].index>=mains[0].index || !/^<main class="editorial-wrap(?: article)?">$/.test(mains[0][0])) return {html,status:'unsupported'};
  const en=/^\s*<html\b[^>]*\blang="en(?:-[^"]*)?"/i.test(html.replace(/^\s*<!doctype[^>]*>/i,''));
  const label=en?'Skip to content':'Preskoči na sadržaj';
  const body=bodies[0][0];
  const out=html.replace(body,`${body}<a class="skip" href="#editorialContent">${label}</a>`)
    .replace(mains[0][0],mains[0][0].replace('<main ', '<main id="editorialContent" tabindex="-1" '));
  return {html:out,status:'patched'};
}
