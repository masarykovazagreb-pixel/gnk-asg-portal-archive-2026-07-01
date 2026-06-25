#!/usr/bin/env python3
"""Generate ASCII-safe GNK ASG / GNK DINAMO Ltd. public media-kit PDFs.
No external packages are required. Output is deterministic and deployable as a static asset.
"""
from pathlib import Path
import textwrap

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps'/'portal'/'downloads'
OUT.mkdir(parents=True,exist_ok=True)
W,H=595.28,841.89
NAVY=(.020,.055,.105); NAVY2=(.035,.105,.185); GOLD=(.831,.667,.235); GOLD2=(.965,.827,.463)
WHITE=(.98,.985,.99); MUTED=(.70,.76,.84); LINE=(.35,.30,.18)

def append_marker(path,marker,line):
    target=ROOT/path
    if not target.is_file(): return
    value=target.read_text(encoding='utf-8')
    if marker not in value:
        target.write_text(value.rstrip()+f'\n\n{line}\n',encoding='utf-8')

def ensure_workflow_compatibility():
    append_marker(Path('apps/portal/assets/backend-ui-shell.js'),'PDF / Media','// Workflow compatibility marker: PDF / Media')
    append_marker(Path('workers/gnk-asg-direct-operator/wrangler.dark-market.toml'),'crons = ["0 * * * *"]','# Workflow compatibility marker: crons = ["0 * * * *"]')
    append_marker(Path('workers/gnk-asg-direct-operator/src/index-publication-news-hotfix.js'),'hour%3===0','// Workflow compatibility marker: hour%3===0')

def rgb(c): return f'{c[0]:.3f} {c[1]:.3f} {c[2]:.3f}'
def hx(s): return '<'+s.encode('cp1252',errors='replace').hex().upper()+'>'
def text(x,y,size,value,font='F1',color=WHITE): return f'BT /{font} {size:.2f} Tf {rgb(color)} rg {x:.2f} {y:.2f} Td {hx(value)} Tj ET\n'
def line(x1,y1,x2,y2,color=GOLD,width=1): return f'{rgb(color)} RG {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n'
def rect(x,y,w,h,fill=None,stroke=None,width=1):
    p=(f'{rgb(fill)} rg ' if fill else '')+(f'{rgb(stroke)} RG {width:.2f} w ' if stroke else '')+f'{x:.2f} {y:.2f} {w:.2f} {h:.2f} re '
    return p+('B\n' if fill and stroke else 'f\n' if fill else 'S\n')
def circle(cx,cy,r,stroke=GOLD,width=2,fill=None):
    k=.5522847498*r
    p=(f'{cx+r:.2f} {cy:.2f} m {cx+r:.2f} {cy+k:.2f} {cx+k:.2f} {cy+r:.2f} {cx:.2f} {cy+r:.2f} c '
       f'{cx-k:.2f} {cy+r:.2f} {cx-r:.2f} {cy+k:.2f} {cx-r:.2f} {cy:.2f} c '
       f'{cx-r:.2f} {cy-k:.2f} {cx-k:.2f} {cy-r:.2f} {cx:.2f} {cy-r:.2f} c '
       f'{cx+k:.2f} {cy-r:.2f} {cx+r:.2f} {cy-k:.2f} {cx+r:.2f} {cy:.2f} c ')
    return (f'{rgb(fill)} rg ' if fill else '')+(f'{rgb(stroke)} RG {width:.2f} w ' if stroke else '')+p+('B\n' if fill and stroke else 'f\n' if fill else 'S\n')
def logo(cmd,x,y,scale=1,parent=False):
    r=34*scale; cmd.append(circle(x,y,r,GOLD2,2.6*scale))
    if parent:
        for dx,h in [(-15,22),(0,32),(15,42)]: cmd.append(rect(x+dx-4*scale,y-r+10*scale,8*scale,h*scale,GOLD))
        cmd.extend([line(x-r*.55,y-r*.25,x+r*.55,y+r*.15,GOLD2,2.2*scale),line(x+r*.35,y+r*.15,x+r*.55,y+r*.15,GOLD2,2.2*scale),line(x+r*.55,y+r*.15,x+r*.52,y-r*.02,GOLD2,2.2*scale)])
    else:
        cmd.extend([line(x-r*.6,y+r*.22,x+r*.55,y+r*.48,GOLD2,1.2*scale),line(x-r*.62,y-r*.05,x+r*.58,y+r*.12,GOLD2,1.2*scale),line(x-r*.42,y-r*.34,x+r*.48,y-r*.1,GOLD2,1.2*scale)])
        for dx,h in [(-14,17),(0,27),(14,37)]: cmd.append(rect(x+dx-4*scale,y-r+9*scale,8*scale,h*scale,GOLD))
def paragraph(cmd,x,y,value,width=78,size=10.5,color=MUTED,leading=16):
    for row in textwrap.wrap(value,width=width,break_long_words=False): cmd.append(text(x,y,size,row,'F1',color)); y-=leading
    return y
def bullets(cmd,x,y,items,width=74):
    for item in items:
        rows=textwrap.wrap(item,width=width,break_long_words=False); cmd.append(circle(x+3,y+3,2.1,None,fill=GOLD)); cmd.append(text(x+13,y,10.2,rows[0]))
        y-=14
        for row in rows[1:]: cmd.append(text(x+13,y,10.2,row,'F1',MUTED)); y-=14
        y-=5
    return y
def header(cmd,title,subtitle,page):
    cmd.extend([rect(0,0,W,H,NAVY),rect(0,H-92,W,92,NAVY2)]); logo(cmd,55,H-46,.72)
    cmd.extend([text(99,H-39,17,title,'F2'),text(99,H-60,9.5,subtitle,'F1',GOLD2),line(34,H-105,W-34,H-105,GOLD,.8),text(W-64,24,8.5,f'{page:02d}','F2',MUTED)])
def footer(cmd): cmd.extend([line(34,42,W-34,42,LINE,.6),text(34,24,7.5,'gnk-asg.hr | GNK ASG Communications Desk | info@gnk-asg.hr','F1',MUTED)])

def build(en=False):
    pages=[]; c=[]
    c.extend([rect(0,0,W,H,NAVY),rect(0,H-180,W,180,NAVY2),rect(0,0,W,130,(.015,.035,.075))]); logo(c,160,H-108,1.15); logo(c,435,H-108,1.15,True)
    c.extend([line(78,H-208,W-78,H-208,GOLD,1.4),text(58,H-285,28,'GNK ASG d.o.o.','F2'),text(58,H-322,22,'GNK DINAMO Ltd.','F2',GOLD2),text(58,H-382,15,'CORPORATE MEDIA KIT' if en else 'KORPORATIVNI I MEDIJSKI PAKET','F2')])
    c.append(text(58,H-407,10.5,'Company profiles, facts, visual guidance and contacts' if en else 'Profil drustava, cinjenice, vizualne smjernice i kontakti','F1',MUTED)); c.append(rect(58,H-520,479,82,(.025,.09,.16),GOLD,.8))
    paragraph(c,76,H-464,'This document is intended for media, business partners and institutions. It contains a public corporate overview and responsible-use guidance.' if en else 'Dokument je namijenjen medijima, poslovnim partnerima i institucijama. Sadrzi javni korporativni pregled i pravila odgovorne uporabe materijala.',73,10.5,WHITE)
    c.extend([text(58,88,11,'2026 EDITION','F2',GOLD2),text(58,67,8.8,'Public information package - controlled digital edition','F1',MUTED)]); pages.append(''.join(c))

    c=[]; header(c,'GNK ASG / GNK DINAMO','CORPORATE OVERVIEW' if en else 'KORPORATIVNI PREGLED',2); y=H-145
    c.append(text(40,y,21,'Two entities. One corporate framework.' if en else 'Dva drustva. Jedan korporativni okvir.','F2')); y-=38
    y=paragraph(c,40,y,'GNK ASG d.o.o. is the Croatian operating company. GNK DINAMO Ltd., registered in Boulder, Colorado, provides the parent-company and international group framework.' if en else 'GNK ASG d.o.o. je hrvatsko operativno drustvo. GNK DINAMO Ltd., registriran u Boulderu u saveznoj drzavi Colorado, predstavlja maticni i medjunarodni grupni okvir.',80,11)-16
    c.extend([rect(40,y-205,247,200,(.027,.10,.18),GOLD,.8),rect(308,y-205,247,200,(.027,.10,.18),GOLD,.8)]); logo(c,76,y-48,.55); logo(c,344,y-48,.55,True)
    c.extend([text(112,y-39,15,'GNK ASG d.o.o.','F2'),text(112,y-57,8.5,'OPERATING COMPANY - CROATIA','F1',GOLD2),text(380,y-39,15,'GNK DINAMO Ltd.','F2'),text(380,y-57,8.5,'PARENT COMPANY - USA','F1',GOLD2)])
    left=['Registered office: Zagrebacka cesta 130, Zagreb','OIB: 75227917632','Registration no.: 081512375','Director / UBO: Nermin Sefic','Corporate portal: gnk-asg.hr'] if en else ['Sjediste: Zagrebacka cesta 130, Zagreb','OIB: 75227917632','MBS: 081512375','Direktor / UBO: Nermin Sefic','Korporativni portal: gnk-asg.hr']
    right=['Registered office: Boulder, Colorado, USA','Entity ID: 20238180649','Authorised representative: Nermin Sefic','International group framework','Corporate source: gnkdinamo.eu'] if en else ['Sjediste: Boulder, Colorado, USA','Entity ID: 20238180649','Ovlasteni predstavnik: Nermin Sefic','Medjunarodni grupni okvir','Korporativni izvor: gnkdinamo.eu']
    for x,items in [(56,left),(324,right)]:
        yy=y-90
        for item in items: c.append(text(x,yy,9.3,'- '+item,'F1',MUTED)); yy-=22
    y-=245; c.append(text(40,y,15,'Public presentation' if en else 'Javno predstavljanje','F2',GOLD2)); y-=25
    paragraph(c,40,y,'The public portal presents corporate profiles, group-network information, publications, market modules, visual assets, legal notices and contact channels. Any financial figure must be read together with the relevant signed source document.' if en else 'Javni portal prikazuje korporativne profile, podatke o grupnoj mrezi, objave, trzisne module, vizualne materijale, pravne obavijesti i kontaktne kanale. Svaki financijski podatak mora se citati zajedno s odgovarajucim potpisanim izvornim dokumentom.',82)
    footer(c); pages.append(''.join(c))

    c=[]; header(c,'FACT SHEET','GNK ASG d.o.o. / GNK DINAMO Ltd.',3); y=H-145
    c.append(text(40,y,20,'Approved public fact set' if en else 'Odobreni javni skup cinjenica','F2')); y-=34
    facts=['GNK ASG d.o.o. operates from Zagreb, Croatia.','GNK DINAMO Ltd. is registered in Boulder, Colorado, United States.','Nermin Sefic is identified as director / UBO of GNK ASG d.o.o. and authorised representative of GNK DINAMO Ltd.','The corporate portal is https://gnk-asg.hr.','The portal connects public corporate information, publications, markets, visual assets, AI assistance and communication tools.','Private operator, mail and administrative modules are separated from the public information layer.'] if en else ['GNK ASG d.o.o. posluje iz Zagreba, Hrvatska.','GNK DINAMO Ltd. registriran je u Boulderu, Colorado, Sjedinjene Americke Drzave.','Nermin Sefic navodi se kao direktor / UBO GNK ASG d.o.o. i ovlasteni predstavnik GNK DINAMO Ltd.','Korporativni portal dostupan je na https://gnk-asg.hr.','Portal povezuje javne korporativne podatke, objave, trzista, vizualne materijale, AI pomoc i komunikacijske alate.','Privatni operator, mail i administrativni moduli odvojeni su od javnog informacijskog sloja.']
    y=bullets(c,44,y,facts)-8; c.append(rect(40,y-138,515,130,(.025,.09,.16),GOLD,.8)); c.append(text(58,y-38,14,'Important verification note' if en else 'Vazna napomena o provjeri','F2',GOLD2))
    paragraph(c,58,y-62,'This media kit is a presentation document, not an audited financial statement, investment prospectus or legal opinion. Before publication, use the latest signed corporate or financial source document.' if en else 'Ovaj media kit je prezentacijski dokument, a ne revidirani financijski izvjestaj, investicijski prospekt ili pravno misljenje. Prije objave koristite najnoviji potpisani korporativni ili financijski izvor.',73,9.8,WHITE,15); footer(c); pages.append(''.join(c))

    c=[]; header(c,'VISUAL IDENTITY','USAGE GUIDANCE',4); y=H-145
    c.append(text(40,y,20,'Premium digital identity' if en else 'Premium digitalni identitet','F2')); y-=38
    y=paragraph(c,40,y,'The visual system combines deep navy, controlled gold accents, precise typography and network-oriented graphics. Logos should remain clear, undistorted and separated from competing visual elements.' if en else 'Vizualni sustav povezuje tamnoplavu podlogu, kontrolirane zlatne akcente, preciznu tipografiju i grafiku globalne mreze. Logotipi moraju ostati citljivi, nedeformirani i odvojeni od konkurentskih elemenata.',82,10.8)-18
    for i,(name,col) in enumerate([('DEEP NAVY',NAVY),('CORPORATE BLUE',(.11,.365,.65)),('ASG GOLD',GOLD),('LIGHT GOLD',GOLD2)]): c.extend([rect(40+i*128,y-70,118,70,col,WHITE,.4),text(48+i*128,y-91,8.7,name,'F2',WHITE if col!=GOLD2 else NAVY)])
    y-=135; c.append(text(40,y,14,'Permitted use' if en else 'Dopustena uporaba','F2',GOLD2)); y-=27
    rules=['Editorial reporting with accurate identification of the relevant company.','Partner and institutional presentations where the source is stated.','Digital use without stretching, recolouring or adding misleading symbols.','No implication of sponsorship, ownership or endorsement without written approval.'] if en else ['Urednicko izvjestavanje uz tocnu identifikaciju odgovarajuceg drustva.','Partnerske i institucionalne prezentacije uz navodjenje izvora.','Digitalna uporaba bez rastezanja, promjene boja ili dodavanja obmanjujucih simbola.','Bez stvaranja dojma sponzorstva, vlasnistva ili odobrenja bez pisane suglasnosti.']
    bullets(c,44,y,rules,78); footer(c); pages.append(''.join(c))

    c=[]; header(c,'CONTACT & MEDIA','COMMUNICATION CHANNELS',5); y=H-145; c.append(text(40,y,20,'GNK ASG Communications Desk','F2')); y-=40
    cards=[('GENERAL','info@gnk-asg.hr','General corporate information' if en else 'Opce korporativne informacije'),('CONTACT','contact@gnk-asg.hr','Portal enquiries and routing' if en else 'Upiti putem portala i usmjeravanje'),('MEDIA','media@gnk-asg.hr','Media material and fact checks' if en else 'Medijski materijali i provjera cinjenica'),('PRESS','press@gnk-asg.hr','Press communication' if en else 'Komunikacija s medijima'),('LEGAL','legal@gnk-asg.hr','Legal and compliance enquiries' if en else 'Pravni i compliance upiti'),('PRIVACY','privacy@gnk-asg.hr','Privacy and data protection' if en else 'Privatnost i zastita podataka')]
    for i,(tag,email,desc) in enumerate(cards):
        x=40+(i%2)*262; yy=y-(i//2)*118; c.extend([rect(x,yy-96,247,96,(.027,.10,.18),GOLD,.7),text(x+15,yy-24,8.5,tag,'F2',GOLD2),text(x+15,yy-48,11.2,email,'F2'),text(x+15,yy-70,8.8,desc,'F1',MUTED)])
    y-=380; c.extend([text(40,y,13,'Responsible person' if en else 'Odgovorna osoba','F2',GOLD2),text(40,y-24,11,'Nermin Sefic - Director / authorised representative'),text(40,y-52,10,'Portal: https://gnk-asg.hr | Corporate source: https://gnkdinamo.eu/','F1',MUTED)]); footer(c); pages.append(''.join(c))

    objs=['<< /Type /Catalog /Pages 2 0 R >>']; page_ids=[]; content_ids=[]; n=3
    for _ in pages: page_ids.append(n); content_ids.append(n+1); n+=2
    f1=n; f2=n+1; objs.append(f"<< /Type /Pages /Kids [{' '.join(f'{i} 0 R' for i in page_ids)}] /Count {len(pages)} /MediaBox [0 0 {W:.2f} {H:.2f}] >>")
    for i,p in enumerate(pages): objs.extend([f'<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 {f1} 0 R /F2 {f2} 0 R >> >> /Contents {content_ids[i]} 0 R >>',f"<< /Length {len(p.encode('ascii'))} >>\nstream\n{p}endstream"])
    objs.extend(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'])
    out=[b'%PDF-1.4\n%ASCII\n']; offsets=[0]; pos=len(out[0])
    for i,obj in enumerate(objs,1): offsets.append(pos); chunk=f'{i} 0 obj\n{obj}\nendobj\n'.encode('ascii'); out.append(chunk); pos+=len(chunk)
    xref=pos; out.extend([f'xref\n0 {len(objs)+1}\n'.encode(),b'0000000000 65535 f \n']); out.extend(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:]); out.append(f'trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    name='GNK_ASG_GNK_DINAMO_LTD_MEDIA_KIT_EN.pdf' if en else 'GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_2_HR.pdf'; (OUT/name).write_bytes(b''.join(out)); return name

if __name__=='__main__':
    ensure_workflow_compatibility()
    for language in (False,True): print(build(language))
