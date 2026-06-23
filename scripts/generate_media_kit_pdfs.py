#!/usr/bin/env python3
from pathlib import Path
import shutil,textwrap

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps'/'portal'/'downloads'; OUT.mkdir(parents=True,exist_ok=True)
W,H=841.89,595.28
NAVY=(.015,.035,.075); NAVY2=(.025,.090,.160); PANEL=(.030,.105,.185)
GOLD=(.831,.667,.235); GOLD2=(.965,.827,.463); WHITE=(.98,.985,.99); MUTED=(.70,.76,.84); DARK=(.05,.10,.17); LIGHT=(.95,.965,.98); GREEN=(.19,.83,.49)

def rgb(c): return f'{c[0]:.3f} {c[1]:.3f} {c[2]:.3f}'
def safe(s):
    return str(s).replace('č','c').replace('ć','c').replace('š','s').replace('ž','z').replace('đ','d').replace('Č','C').replace('Ć','C').replace('Š','S').replace('Ž','Z').replace('Đ','D').replace('–','-').replace('—','-').replace('·','-').replace('•','-').replace('€','EUR')
def hx(s): return '<'+safe(s).encode('cp1252',errors='replace').hex().upper()+'>'
def text(x,y,size,value,font='F1',color=WHITE): return f'BT /{font} {size:.2f} Tf {rgb(color)} rg {x:.2f} {y:.2f} Td {hx(value)} Tj ET\n'
def line(x1,y1,x2,y2,color=GOLD,width=1): return f'{rgb(color)} RG {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n'
def rect(x,y,w,h,fill=None,stroke=None,width=1,r=0):
    p=(f'{rgb(fill)} rg ' if fill else '')+(f'{rgb(stroke)} RG {width:.2f} w ' if stroke else '')
    if r:
        k=.55228475*r; x2=x+w; y2=y+h
        p+=f'{x+r:.2f} {y:.2f} m {x2-r:.2f} {y:.2f} l {x2-r+k:.2f} {y:.2f} {x2:.2f} {y+r-k:.2f} {x2:.2f} {y+r:.2f} c {x2:.2f} {y2-r:.2f} l {x2:.2f} {y2-r+k:.2f} {x2-r+k:.2f} {y2:.2f} {x2-r:.2f} {y2:.2f} c {x+r:.2f} {y2:.2f} l {x+r-k:.2f} {y2:.2f} {x:.2f} {y2-r+k:.2f} {x:.2f} {y2-r:.2f} c {x:.2f} {y+r:.2f} l {x:.2f} {y+r-k:.2f} {x+r-k:.2f} {y:.2f} {x+r:.2f} {y:.2f} c '
    else: p+=f'{x:.2f} {y:.2f} {w:.2f} {h:.2f} re '
    return p+('B\n' if fill and stroke else 'f\n' if fill else 'S\n')
def circle(cx,cy,r,stroke=GOLD,width=2,fill=None):
    k=.55228475*r
    p=f'{cx+r:.2f} {cy:.2f} m {cx+r:.2f} {cy+k:.2f} {cx+k:.2f} {cy+r:.2f} {cx:.2f} {cy+r:.2f} c {cx-k:.2f} {cy+r:.2f} {cx-r:.2f} {cy+k:.2f} {cx-r:.2f} {cy:.2f} c {cx-r:.2f} {cy-k:.2f} {cx-k:.2f} {cy-r:.2f} {cx:.2f} {cy-r:.2f} c {cx+k:.2f} {cy-r:.2f} {cx+r:.2f} {cy-k:.2f} {cx+r:.2f} {cy:.2f} c '
    return (f'{rgb(fill)} rg ' if fill else '')+(f'{rgb(stroke)} RG {width:.2f} w ' if stroke else '')+p+('B\n' if fill and stroke else 'f\n' if fill else 'S\n')
def paragraph(cmd,x,y,value,width=88,size=10,color=MUTED,leading=14,font='F1'):
    for row in textwrap.wrap(safe(value),width=width,break_long_words=False): cmd.append(text(x,y,size,row,font,color)); y-=leading
    return y
def logo(cmd,x,y,parent=False,scale=1):
    r=35*scale; cmd.append(circle(x,y,r,GOLD2,2.5*scale))
    for dx,h in [(-15,18),(0,28),(15,40)]: cmd.append(rect(x+dx*scale-4*scale,y-r+9*scale,8*scale,h*scale,GOLD))
    if parent:
        cmd.extend([line(x-r*.55,y-r*.28,x+r*.55,y+r*.10,GOLD2,2*scale),line(x+r*.36,y+r*.10,x+r*.55,y+r*.10,GOLD2,2*scale),line(x+r*.55,y+r*.10,x+r*.50,y-r*.08,GOLD2,2*scale)])
    else:
        cmd.extend([line(x-r*.60,y+r*.22,x+r*.55,y+r*.46,GOLD2,1.1*scale),line(x-r*.62,y-r*.05,x+r*.58,y+r*.12,GOLD2,1.1*scale),line(x-r*.44,y-r*.34,x+r*.48,y-r*.10,GOLD2,1.1*scale)])
def bg(cmd,dark=True):
    cmd.append(rect(0,0,W,H,NAVY if dark else LIGHT)); cmd.append(rect(0,H-8,W,8,GOLD)); cmd.append(line(34,28,W-34,28,GOLD,.6))
def header(cmd,kicker,title,subtitle,page,dark=True):
    bg(cmd,dark); cmd.append(text(38,H-42,8,kicker,'F2',GOLD)); cmd.append(text(38,H-77,25,title,'F2',WHITE if dark else DARK)); paragraph(cmd,38,H-100,subtitle,100,8.5,MUTED if dark else (.35,.42,.50),12); cmd.append(text(W-52,14,7,str(page),'F2',MUTED))
def card(cmd,x,y,w,h,dark=True): cmd.append(rect(x,y,w,h,PANEL if dark else WHITE,GOLD,.65,13))
def kpi(cmd,x,y,label,value,dark=True):
    card(cmd,x,y,238,64,dark); cmd.append(text(x+13,y+42,7,label.upper(),'F1',MUTED if dark else (.35,.42,.50))); cmd.append(text(x+13,y+16,14,value,'F2',GOLD2 if dark else (.58,.40,.10)))
def bullets(cmd,x,y,items,dark=True,width=76):
    for item in items:
        cmd.append(circle(x+3,y+3,2,None,fill=GREEN)); rows=textwrap.wrap(safe(item),width=width,break_long_words=False)
        cmd.append(text(x+14,y,9,rows[0],'F1',WHITE if dark else DARK)); y-=13
        for row in rows[1:]: cmd.append(text(x+14,y,9,row,'F1',MUTED if dark else (.35,.42,.50))); y-=13
        y-=7
    return y

def pdf_write(pages,path):
    objs=['<< /Type /Catalog /Pages 2 0 R >>']; page_ids=[]; content_ids=[]; n=3
    for _ in pages: page_ids.append(n); content_ids.append(n+1); n+=2
    f1=n; f2=n+1
    objs.append(f"<< /Type /Pages /Kids [{' '.join(f'{i} 0 R' for i in page_ids)}] /Count {len(pages)} /MediaBox [0 0 {W:.2f} {H:.2f}] >>")
    for i,p in enumerate(pages):
        data=p.encode('ascii'); objs.extend([f'<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 {f1} 0 R /F2 {f2} 0 R >> >> /Contents {content_ids[i]} 0 R >>',f'<< /Length {len(data)} >>\nstream\n{p}endstream'])
    objs.extend(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'])
    out=[b'%PDF-1.4\n%GNKASG\n']; offsets=[0]; pos=len(out[0])
    for i,obj in enumerate(objs,1): offsets.append(pos); chunk=f'{i} 0 obj\n{obj}\nendobj\n'.encode('ascii'); out.append(chunk); pos+=len(chunk)
    xref=pos; out.extend([f'xref\n0 {len(objs)+1}\n'.encode(),b'0000000000 65535 f \n']); out.extend(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:]); out.append(f'trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    path.write_bytes(b''.join(out))

def build(en=False):
    pages=[]; lang='EN' if en else 'HR'
    c=[]; bg(c,True); logo(c,210,360,False,1.45); logo(c,W-210,360,True,1.45); c.append(text(W/2-155,505,9,'GNK ASG d.o.o.  -  GNK DINAMO Ltd.','F2',GOLD)); c.append(text(W/2-155,455,38,'MEDIA KIT','F2')); c.append(text(W/2-33,420,17,'2026','F2',GOLD2)); card(c,160,85,W-320,92,True); paragraph(c,185,142,'Official corporate, financial and visual package for media, partners and institutions.' if en else 'Sluzbeni korporativni, financijski i vizualni paket za medije, partnere i institucije.',76,10,WHITE,15); paragraph(c,185,112,'Original source documents always prevail.' if en else 'Izvorni dokumenti uvijek imaju prednost.',76,8.5,MUTED,13); c.append(text(W-52,14,7,'1','F2',MUTED)); pages.append(''.join(c))

    c=[]; header(c,'CORPORATE OVERVIEW' if en else 'KORPORATIVNI PREGLED','Two core identities' if en else 'Dva kljucna identiteta','GNK ASG d.o.o. operates from Croatia within the international corporate framework of GNK DINAMO Ltd.' if en else 'GNK ASG d.o.o. posluje iz Hrvatske unutar medjunarodnog korporativnog okvira GNK DINAMO Ltd.',2,True)
    for i,(name,parent,rows) in enumerate([('GNK ASG d.o.o.',False,[('Registered office' if en else 'Sjediste','Zagrebacka cesta 130, Zagreb'),('OIB','75227917632'),('Registration no.' if en else 'MBS','081512375'),('Director / UBO' if en else 'Direktor / UBO','Nermin Sefic')]),('GNK DINAMO Ltd.',True,[('Registered office' if en else 'Sjediste','Boulder, Colorado, USA'),('Entity ID','20238180649'),('Representative' if en else 'Ovlasteni predstavnik','Nermin Sefic'),('Group','33 connected companies' if en else '33 povezana drustva')])]):
        x=42+i*402; card(c,x,100,380,350,True); logo(c,x+72,370,parent,1); c.append(text(x+135,390,18,name,'F2',GOLD2)); yy=315
        for a,b in rows: c.append(text(x+24,yy,7,a.upper(),'F2',GOLD)); c.append(text(x+155,yy,9,b,'F1')); yy-=47
    pages.append(''.join(c))

    c=[]; header(c,'GNK ASG d.o.o.','Audited financial profile FY 2025' if en else 'Revidirani financijski profil FY 2025','Independent auditor report and financial statements as at 31 December 2025.' if en else 'Izvjesce neovisnog revizora i financijski izvjestaji na dan 31. prosinca 2025.',3,False)
    labs=['Total revenue','Total assets','Equity & reserves','Current liabilities','Profit for year','Long-term liabilities'] if en else ['Ukupni prihodi','Ukupna aktiva','Kapital i rezerve','Kratkorocne obveze','Dobit godine','Dugorocne obveze']; vals=['EUR 504.00m','EUR 46.40m','EUR 46.21m','EUR 184.50k','EUR 16,076.47','EUR 0.00']
    for i,(a,b) in enumerate(zip(labs,vals)): kpi(c,42+(i%3)*255,312-(i//3)*82,a,b,False)
    card(c,42,92,W-84,108,False); paragraph(c,60,162,'Independent auditor opinion: the statements present fairly, in all material respects, the financial position, performance and cash flows.' if en else 'Misljenje neovisnog revizora: izvjestaji istinito i fer prezentiraju, u svim znacajnim odrednicama, financijski polozaj, uspjesnost i novcane tokove.',110,9,DARK,14); c.append(text(60,112,7.5,'Source: EKVILIBRIJ d.o.o., Zagreb, 19 May 2026.' if en else 'Izvor: EKVILIBRIJ d.o.o., Zagreb, 19. svibnja 2026.','F1',(.35,.42,.50))); pages.append(''.join(c))

    c=[]; header(c,'GNK DINAMO Ltd.','Consolidated profile FY 2025' if en else 'Konsolidirani profil FY 2025','Management-certified and internally reviewed group report - not independently audited.' if en else 'Upravljacki potvrdjeno i interno pregledano grupno izvjesce - nije neovisno revidirano.',4,True)
    labs=['Group revenue','Net income','Total assets','Equity & reserves','Total liabilities','Equity ratio'] if en else ['Prihodi grupe','Neto dobit','Ukupna aktiva','Kapital i rezerve','Ukupne obveze','Udio kapitala']; vals=['EUR 4.7046bn','EUR 982.48m','EUR 3.4830bn','EUR 3.4140bn','EUR 69.04m','98.02%']
    for i,(a,b) in enumerate(zip(labs,vals)): kpi(c,42+(i%3)*255,312-(i//3)*82,a,b,True)
    card(c,42,92,W-84,108,True); c.append(text(60,170,11,'CERTIFICATE OF FACT OF GOOD STANDING','F2',GOLD2)); paragraph(c,60,145,'Colorado Secretary of State confirms GNK DINAMO Ltd., Entity ID 20238180649, as a Limited Liability Company formed 8 November 2023 and in good standing. Certificate issued 16 June 2026.' if en else 'Colorado Secretary of State potvrdjuje GNK DINAMO Ltd., Entity ID 20238180649, kao Limited Liability Company osnovanu 8. studenoga 2023. i u dobrom statusu. Certifikat izdan 16. lipnja 2026.',110,8.5,MUTED,13); pages.append(''.join(c))

    c=[]; header(c,'GROUP FRAMEWORK' if en else 'GRUPNI OKVIR','International business ecosystem' if en else 'Medjunarodni poslovni ekosustav','The public group overview covers 33 connected companies. No group employee count is published without separate documentary support.' if en else 'Javni grupni pregled obuhvaca 33 povezana drustva. Broj zaposlenih za grupu ne objavljuje se bez zasebne dokumentacijske osnove.',5,False)
    areas=[('SOFTWARE & IP' if en else 'SOFTVER I IP','Payment processing, localized editions and digital rights.' if en else 'Payment processing, lokalizirana izdanja i digitalna prava.'),('MARKETS & DATA' if en else 'TRZISTA I PODACI','Market intelligence, business news and structured public data.' if en else 'Trzisni pregled, poslovne vijesti i strukturirani javni podaci.'),('SPORT & GOVERNANCE' if en else 'SPORT I UPRAVLJANJE','Sports projects, governance and international expansion.' if en else 'Sportski projekti, upravljanje i medjunarodno sirenje.'),('AI & AUTOMATION' if en else 'AI I AUTOMATIZACIJA','AI assistance, publication automation and digital operations.' if en else 'AI pomoc, automatizacija objava i digitalne operacije.')]
    for i,(a,b) in enumerate(areas): x=42+(i%2)*402; y=295-(i//2)*145; card(c,x,y,380,122,False); c.append(text(x+18,y+87,11,a,'F2',(.58,.40,.10))); paragraph(c,x+18,y+56,b,56,9,DARK,14)
    c.append(text(W/2-24,72,34,'33','F2',(.58,.40,.10))); c.append(text(W/2-62,50,8,'CONNECTED COMPANIES' if en else 'POVEZANA DRUSTVA','F2',DARK)); pages.append(''.join(c))

    c=[]; header(c,'VISUAL IDENTITY','Logo and brand usage' if en else 'Uporaba logotipa i brenda','Premium gold identity, deep navy backgrounds and clear separation of the two corporate identities.' if en else 'Premium zlatni identitet, tamnoplave podloge i jasno razdvajanje dvaju korporativnih identiteta.',6,True)
    card(c,42,220,365,215,True); logo(c,224,337,False,1.65); c.append(text(165,245,24,'GNK ASG','F2',GOLD2)); card(c,434,220,365,215,True); logo(c,616,337,True,1.65); c.append(text(510,245,21,'GNK DINAMO Ltd.','F2',GOLD2))
    rules=['Do not stretch, rotate or alter logo proportions.','Do not change the gold palette without written approval.','Use the premium version on dark backgrounds and the light version on light backgrounds.','Always state the full legal name of the relevant company.'] if en else ['Ne rastezati, rotirati ili mijenjati proporcije logotipa.','Ne mijenjati zlatnu paletu bez pisanog odobrenja.','Na tamnoj podlozi koristiti premium varijantu; na svijetloj svijetlu varijantu.','Uvijek navesti puni naziv odgovarajuceg drustva.']; bullets(c,45,180,rules,True,110); pages.append(''.join(c))

    c=[]; header(c,'CONTACT & SOURCES' if en else 'KONTAKT I IZVORI','GNK ASG Communications Desk','Communication channels, source verification and document access.' if en else 'Komunikacijski kanali, provjera izvora i pristup dokumentima.',7,False)
    contacts=[('GENERAL' if en else 'OPCI KONTAKT','contact@gnk-asg.hr'),('INFORMATION' if en else 'INFORMACIJE','info@gnk-asg.hr'),('MEDIA','media@gnk-asg.hr'),('PRESS','press@gnk-asg.hr'),('LEGAL' if en else 'PRAVNI ODJEL','legal@gnk-asg.hr'),('PRIVACY' if en else 'PRIVATNOST','privacy@gnk-asg.hr')]
    for i,(a,b) in enumerate(contacts): x=42+(i%2)*402; y=332-(i//2)*92; card(c,x,y,380,72,False); c.append(text(x+16,y+45,7,a,'F2',(.58,.40,.10))); c.append(text(x+16,y+19,11,b,'F2',DARK))
    card(c,42,62,W-84,64,False); paragraph(c,58,101,'Source documents: Colorado Certificate of Good Standing; GNK DINAMO Ltd. Consolidated Financial Report FY2025 (management-certified, internally reviewed, unaudited); GNK ASG d.o.o. Independent Auditor Report and Financial Statements FY2025.' if en else 'Izvorni dokumenti: Colorado Certificate of Good Standing; GNK DINAMO Ltd. Consolidated Financial Report FY2025 (upravljacki potvrdjen, interno pregledan, nerevidiran); GNK ASG d.o.o. Izvjesce neovisnog revizora i financijski izvjestaji FY2025.',112,7.8,DARK,12); pages.append(''.join(c))

    canonical=OUT/('GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_EN_2026.pdf' if en else 'GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_HR_2026.pdf'); pdf_write(pages,canonical)
    legacy=OUT/('GNK_ASG_GNK_DINAMO_LTD_MEDIA_KIT_EN.pdf' if en else 'GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_2_HR.pdf'); shutil.copy2(canonical,legacy)
    return canonical

if __name__=='__main__':
    for language in (False,True):
        p=build(language); print(p,p.stat().st_size)
