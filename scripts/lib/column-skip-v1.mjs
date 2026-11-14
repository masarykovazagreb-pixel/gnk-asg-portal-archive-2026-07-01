import {isProtectedEditorialRoute} from './editorial-route-protection-v1.mjs';

// Narrowly recognised column templates only. All other routes and markup are unchanged.
export function addColumnSkip(html, route) {
 if (!/^(?:gnk-aktual\/kolumne|en\/gnk-aktual\/columns)\/(?:[a-z0-9-]+\/)?index\.html$/.test(route)) return {html,status:'unsupported'};
 if (isProtectedEditorialRoute(route) || /504-milijuna/i.test(route)) return {html,status:'protected'};
 if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(html)) return {html,status:'unsupported'};
 if (/<a\b[^>]*(?:class=["'][^"']*\bskip\b|href=["']#columnContent["'])/i.test(html)) return {html,status:'already'};
 const language=route.startsWith('en/')?'en':'hr';
 if (!html.includes(`<html lang="${language}"`) || !/<link\b[^>]*href="\/assets\/am-design-v1\.css(?:\?[^"\s]*)?"[^>]*data-am-design="v1"[^>]*>/i.test(html) || /\bid=["']columnContent["']/i.test(html)) return {html,status:'unsupported'};
 const bodies=[...html.matchAll(/<body\b[^>]*>/gi)], mains=[...html.matchAll(/<main\b[^>]*>/gi)];
 if(bodies.length!==1 || bodies[0][0]!=='<body>' || mains.length!==1 || bodies[0].index>=mains[0].index || !/^<main class="(?:wrap|editorial-wrap article)">$/.test(mains[0][0])) return {html,status:'unsupported'};
 const label=language==='en'?'Skip to content':'Preskoči na sadržaj';
 return {status:'patched',html:html.replace('<body>',`<body><a class="skip" href="#columnContent">${label}</a>`).replace(mains[0][0],mains[0][0].replace('<main ','<main id="columnContent" tabindex="-1" '))};
}
