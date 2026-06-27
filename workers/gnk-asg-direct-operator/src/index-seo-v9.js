export function applyIndexSeo(html,english){
  const title=english?'GNK ASG | Corporate Group, Financials and Global Network':'GNK ASG | Poslovna grupa, financije i globalna mreža';
  const description=english?'Official corporate portal of GNK ASG d.o.o. and GNK DINAMO Ltd. Group: company profile, financial indicators, global markets, news and THE CODE.':'Službeni korporativni portal GNK ASG d.o.o. i GNK DINAMO Ltd. Group: profil kompanija, financijski pokazatelji, globalna tržišta, vijesti i THE CODE.';
  const canonical=english?'https://gnk-asg.hr/en/':'https://gnk-asg.hr/';
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`);
  html=html.replace(/<meta\s+name=["']description["'][^>]*>/i,`<meta name="description" content="${description}">`);
  html=html.replace(/<link\s+rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
  if(html.includes('data-gnk-seo-v9'))return html;
  const meta=`<meta data-gnk-seo-v9 name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="theme-color" content="#17130c"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon-48.svg" type="image/svg+xml"><link rel="manifest" href="/site.webmanifest"><link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/"><link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/"><meta property="og:type" content="website"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://gnk-asg.hr/favicon.svg"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="https://gnk-asg.hr/favicon.svg">`;
  return html.replace('</head>',meta+'</head>');
}
