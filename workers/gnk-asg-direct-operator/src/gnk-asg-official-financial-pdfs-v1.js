const OFFICIAL_FINANCIAL_PDFS = {
  "/download/gnk-asg-doo-independent-auditor-report-2025.pdf": {
    key: "financial/gnk-asg-doo-independent-auditor-report-financial-statements-2025.pdf",
    filename: "gnk-asg-doo-independent-auditor-report-2025.pdf",
    title: "Izvješće neovisnog revizora i financijski izvještaji GNK ASG d.o.o. 2025."
  },
  "/download/gnk-asg-2025-financial-statements-audit.pdf": {
    key: "financial/gnk-asg-doo-independent-auditor-report-financial-statements-2025.pdf",
    filename: "gnk-asg-2025-financial-statements-audit.pdf",
    title: "GNK ASG d.o.o. 2025 financijski izvještaji i revizija"
  },
  "/download/gnk-asg-doo-audit-report-status.pdf": {
    key: "financial/gnk-asg-doo-independent-auditor-report-financial-statements-2025.pdf",
    filename: "gnk-asg-doo-independent-auditor-report-2025.pdf",
    title: "Izvješće neovisnog revizora GNK ASG d.o.o. 2025."
  },
  "/download/gnk-dinamo-ltd-group-financial-report.pdf": {
    key: "financial/gnk-dinamo-ltd-group-financial-report.pdf",
    filename: "gnk-dinamo-ltd-group-financial-report.pdf",
    title: "GNK DINAMO Ltd. grupno financijsko izvješće"
  },
  "/download/gnk-dinamo-ltd-group-financial-certificate.pdf": {
    key: "financial/gnk-dinamo-ltd-group-financial-report.pdf",
    filename: "gnk-dinamo-ltd-group-financial-report.pdf",
    title: "GNK DINAMO Ltd. grupno financijsko izvješće"
  },
  "/download/gnk-asg-group-financial-certificate.pdf": {
    key: "financial/gnk-dinamo-ltd-group-financial-report.pdf",
    filename: "gnk-asg-group-financial-report.pdf",
    title: "GNK ASG / GNK DINAMO Ltd. grupno financijsko izvješće"
  },
  "/download/gnk-dinamo-ltd-good-standing.pdf": {
    key: "financial/gnk-dinamo-ltd-good-standing.pdf",
    filename: "gnk-dinamo-ltd-good-standing.pdf",
    title: "GNK DINAMO Ltd. Colorado Good Standing"
  }
};

function officialFinancialPdfBlock(){
  return "<section id='official-financial-pdfs' data-gnk-asg='official-financial-pdfs-v2' style='margin:24px auto;padding:22px;border:1px solid rgba(212,175,55,.35);border-radius:22px;background:rgba(9,22,38,.88);color:#f7f0dc;max-width:1180px'><div style='letter-spacing:.22em;text-transform:uppercase;color:#d4af37;font-weight:900;font-size:13px'>Službeni financijski dokumenti</div><h2 style='color:#f5dc88;margin:10px 0 12px;font-family:Georgia,serif;font-size:clamp(30px,6vw,54px)'>PDF preuzimanja</h2><p style='color:#d7e0ec;font-size:18px;line-height:1.5'>Ispod financijskih pokazatelja dostupni su stvarni PDF dokumenti: revizorsko izvješće GNK ASG d.o.o., grupno financijsko izvješće GNK DINAMO Ltd. i Colorado Good Standing.</p><div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px'><a style='display:block;text-decoration:none;color:#07162b;background:#d4af37;border-radius:999px;padding:14px 16px;font-weight:900;text-align:center' href='/download/gnk-asg-doo-independent-auditor-report-2025.pdf'>Revizorsko izvješće GNK ASG d.o.o. ↓</a><a style='display:block;text-decoration:none;color:#07162b;background:#d4af37;border-radius:999px;padding:14px 16px;font-weight:900;text-align:center' href='/download/gnk-dinamo-ltd-group-financial-report.pdf'>Financijsko izvješće grupe ↓</a><a style='display:block;text-decoration:none;color:#f5dc88;border:1px solid rgba(212,175,55,.45);border-radius:999px;padding:14px 16px;font-weight:900;text-align:center' href='/download/gnk-dinamo-ltd-good-standing.pdf'>Colorado Good Standing ↓</a></div></section>";
}

export async function gnkOfficialFinancialPdfsHandle(request, env){
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/contact-submit") {
    return null; // GNK_ASG_CONTACT_SUBMIT_PASS_THROUGH_V1
  }
  const doc = OFFICIAL_FINANCIAL_PDFS[url.pathname];
  if(!doc) return null;
  const bucket = env.GNK_ASG_MEDIA_ASSETS;
  if(!bucket) return new Response("R2 binding GNK_ASG_MEDIA_ASSETS nije dostupan.",{status:500});
  const obj = await bucket.get(doc.key);
  if(!obj) return new Response("PDF nije pronađen u R2: " + doc.key,{status:404});
  const headers = new Headers();
  headers.set("content-type","application/pdf");
  headers.set("content-disposition","inline; filename=" + doc.filename);
  headers.set("cache-control","public, max-age=3600");
  headers.set("x-gnk-asg-official-financial-pdfs","v2");
  headers.set("x-gnk-asg-document-title",doc.title);
  return new Response(obj.body,{headers});
}

export async function gnkOfficialFinancialPdfsApply(response, request){
  const url = new URL(request.url);
  const type = response.headers.get("content-type") || "";

  if(url.pathname === "/sitemap.xml" && type.toLowerCase().includes("xml")){
    let xml = await response.text();
    const urls = [
      "https://gnk-asg.hr/download/gnk-asg-doo-independent-auditor-report-2025.pdf",
      "https://gnk-asg.hr/download/gnk-asg-2025-financial-statements-audit.pdf",
      "https://gnk-asg.hr/download/gnk-dinamo-ltd-group-financial-report.pdf",
      "https://gnk-asg.hr/download/gnk-dinamo-ltd-group-financial-certificate.pdf",
      "https://gnk-asg.hr/download/gnk-asg-group-financial-certificate.pdf",
      "https://gnk-asg.hr/download/gnk-dinamo-ltd-good-standing.pdf"
    ];
    let add = "";
    for(const loc of urls){
      if(!xml.includes(loc)){
        add += "<url><loc>"+loc+"</loc><changefreq>monthly</changefreq><priority>0.70</priority></url>";
      }
    }
    if(add){
      xml = xml.split("</urlset>").join(add + "</urlset>");
    }
    const headers = new Headers(response.headers);
    headers.set("content-type","application/xml; charset=utf-8");
    headers.set("x-gnk-asg-official-financial-pdfs-sitemap","v2");
    return new Response(xml,{status:response.status,statusText:response.statusText,headers});
  }

  if(type.toLowerCase().includes("text/html") && (url.pathname === "/" || url.pathname === "/group-financials")){
    let html = await response.text();
    if(!html.includes("official-financial-pdfs-v2")){
      if(html.toLowerCase().includes("</main>")){
        html = html.split("</main>").join(officialFinancialPdfBlock() + "</main>");
      }else if(html.toLowerCase().includes("</body>")){
        html = html.split("</body>").join(officialFinancialPdfBlock() + "</body>");
      }else{
        html += officialFinancialPdfBlock();
      }
    }
    const headers = new Headers(response.headers);
    headers.set("content-type","text/html; charset=utf-8");
    headers.set("x-gnk-asg-official-financial-pdfs","v2");
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }

  return response;
}
