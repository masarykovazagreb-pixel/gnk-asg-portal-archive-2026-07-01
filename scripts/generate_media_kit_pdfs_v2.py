#!/usr/bin/env python3
from pathlib import Path
import shutil
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps'/'portal'/'downloads'; OUT.mkdir(parents=True,exist_ok=True)
W,H=landscape(A4)
NAVY=HexColor('#020812'); NAVY2=HexColor('#061425'); PANEL=HexColor('#0A213B')
GOLD=HexColor('#D7AA3C'); GOLD2=HexColor('#FFE08A'); TEXT=HexColor('#F7F9FC')
MUTED=HexColor('#A9B7C9'); LIGHT=HexColor('#F4F6F9'); DARK=HexColor('#102034'); GREEN=HexColor('#31D47C')
F=Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('DV',str(F/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DVB',str(F/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('DVS',str(F/'DejaVuSerif-Bold.ttf')))
BODY=ParagraphStyle('body',fontName='DV',fontSize=8.8,leading=12.7,textColor=TEXT)
MUT=ParagraphStyle('mut',fontName='DV',fontSize=8.2,leading=11.8,textColor=MUTED)
LGT=ParagraphStyle('lgt',fontName='DV',fontSize=8.4,leading=12,textColor=DARK)


def bg(c,dark=True):
    c.setFillColor(NAVY if dark else LIGHT); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(Color(.17,.56,.90,alpha=.10)); c.circle(W*.86,H*.88,170,fill=1,stroke=0)
    c.setFillColor(Color(.84,.67,.24,alpha=.07)); c.circle(W*.08,H*.05,145,fill=1,stroke=0)
    c.setStrokeColor(GOLD); c.setLineWidth(.65); c.line(34,28,W-34,28)


def mark(c,x,y,r=34,parent=False):
    c.setStrokeColor(GOLD2); c.setLineWidth(2.2); c.circle(x,y,r,fill=0,stroke=1)
    c.setFillColor(GOLD)
    for dx,h in [(-15,17),(0,27),(15,38)]: c.roundRect(x+dx-4,y-r+9,8,h,1.5,fill=1,stroke=0)
    c.setStrokeColor(GOLD2); c.setLineWidth(1.25)
    if parent:
        c.arc(x-r*.66,y-r*.55,x+r*.62,y+r*.62,25,285)
        c.line(x-r*.55,y-r*.30,x+r*.55,y+r*.08); c.line(x+r*.40,y+r*.08,x+r*.55,y+r*.08); c.line(x+r*.55,y+r*.08,x+r*.50,y-r*.06)
    else:
        c.arc(x-r*.72,y-r*.72,x+r*.72,y+r*.72,38,285)
        for a,b,d,e in [(-.62,.18,.55,.48),(-.62,-.08,.58,.12),(-.45,-.35,.48,-.10)]: c.line(x+r*a,y+r*b,x+r*d,y+r*e)


def panel(c,x,y,w,h,dark=True,fill=None,r=14):
    c.setFillColor(fill or (PANEL if dark else white)); c.setStrokeColor(Color(.84,.67,.24,alpha=.48)); c.setLineWidth(.7); c.roundRect(x,y,w,h,r,fill=1,stroke=1)


def para(c,text,x,y,w,h,style):
    p=Paragraph(text,style); p.wrapOn(c,w,h); p.drawOn(c,x,y+h-p.height)


def head(c,eyebrow,title,subtitle,dark=True):
    c.setFont('DVB',8.2); c.setFillColor(GOLD if dark else HexColor('#966A1D')); c.drawString(42,H-44,eyebrow.upper())
    c.setFont('DVS',26); c.setFillColor(TEXT if dark else DARK); c.drawString(42,H-78,title)
    para(c,subtitle,42,H-124,W-84,38,MUT if dark else LGT)


def foot(c,page,lang,dark=True):
    c.setFont('DV',7); c.setFillColor(MUTED if dark else HexColor('#5B6A7B'))
    label='GNK ASG d.o.o. & GNK DINAMO Ltd. - Media Kit 2026' if lang=='EN' else 'GNK ASG d.o.o. i GNK DINAMO Ltd. - Media Kit 2026'
    c.drawString(38,14,label); c.drawRightString(W-38,14,str(page))


def kpi(c,x,y,w,label,value,dark=True):
    panel(c,x,y,w,67,dark,HexColor('#07192C') if dark else white,11)
    c.setFont('DV',7.1); c.setFillColor(MUTED if dark else HexColor('#607087')); c.drawString(x+10,y+45,label.upper())
    c.setFont('DVB',14); c.setFillColor(GOLD2 if dark else HexColor('#8E641B')); c.drawString(x+10,y+16,value)


def cover(c,lang):
    bg(c,True)
    for r in (105,145,185): c.setStrokeColor(Color(.84,.67,.24,alpha=.25)); c.circle(W*.5,H*.55,r,fill=0,stroke=1)
    mark(c,210,H-238,82,False); mark(c,W-210,H-238,82,True)
    c.setFont('DVB',10); c.setFillColor(GOLD); c.drawCentredString(W/2,H-55,'GNK ASG d.o.o.  •  GNK DINAMO Ltd.')
    c.setFont('DVS',42); c.setFillColor(TEXT); c.drawCentredString(W/2,H-108,'MEDIA KIT')
    c.setFont('DVB',15); c.setFillColor(GOLD2); c.drawCentredString(W/2,H-139,'2026')
    panel(c,W/2-230,66,460,88,True,Color(.02,.08,.15,alpha=.90),18)
    a='Službeni korporativni, financijski i vizualni paket za medije i poslovne partnere.' if lang=='HR' else 'Official corporate, financial and visual package for media and business partners.'
    b='Sažetak javnih činjenica. Izvorni dokumenti uvijek imaju prednost.' if lang=='HR' else 'Summary of public facts. Original source documents always prevail.'
    c.setFont('DV',9.5); c.setFillColor(TEXT); c.drawCentredString(W/2,120,a); c.setFillColor(MUTED); c.drawCentredString(W/2,96,b)
    c.setFont('DVB',8); c.setFillColor(GOLD); c.drawCentredString(W/2,48,'gnk-asg.hr  •  gnkdinamo.eu')
    foot(c,1,lang,True); c.showPage()


def entities(c,lang):
    bg(c,True)
    sub='GNK ASG d.o.o. djeluje kao hrvatsko operativno i razvojno društvo unutar međunarodnog okvira GNK DINAMO Ltd.' if lang=='HR' else 'GNK ASG d.o.o. operates as the Croatian operating and development company within the international framework of GNK DINAMO Ltd.'
    head(c,'Korporativni pregled' if lang=='HR' else 'Corporate overview','Dva ključna identiteta' if lang=='HR' else 'Two core identities',sub,True)
    rows=[('GNK ASG d.o.o.',False,[('Sjedište' if lang=='HR' else 'Registered office','Zagrebačka cesta 130, Zagreb'),('OIB','75227917632'),('MBS' if lang=='HR' else 'Registration no.','081512375'),('Direktor / UBO' if lang=='HR' else 'Director / UBO','Nermin Sefić'),('Status','Operativno društvo - Hrvatska' if lang=='HR' else 'Operating company - Croatia')]),('GNK DINAMO Ltd.',True,[('Sjedište' if lang=='HR' else 'Registered office','Boulder, Colorado, USA'),('Entity ID','20238180649'),('Ovlašteni predstavnik' if lang=='HR' else 'Authorised representative','Nermin Sefić'),('Status','Parent company - USA'),('Grupni okvir' if lang=='HR' else 'Group framework','33 povezana društva' if lang=='HR' else '33 connected companies')])]
    for i,(name,parent,data) in enumerate(rows):
        x=42+i*388; panel(c,x,118,370,315,True); mark(c,x+74,350,52,parent)
        c.setFont('DVB',18); c.setFillColor(GOLD2); c.drawString(x+140,382,name)
        c.setFont('DV',8); c.setFillColor(MUTED); c.drawString(x+140,359,'GNK ASG CORPORATE GROUP')
        yy=310
        for lab,val in data:
            c.setFont('DVB',7.4); c.setFillColor(GOLD); c.drawString(x+24,yy,lab.upper())
            c.setFont('DV',9); c.setFillColor(TEXT); c.drawString(x+142,yy,val); yy-=39
    foot(c,2,lang,True); c.showPage()


def asg(c,lang):
    bg(c,False)
    sub='Izvješće neovisnog revizora i financijski izvještaji na dan 31. prosinca 2025.' if lang=='HR' else 'Independent Auditor Report and Financial Statements as at 31 December 2025.'
    head(c,'GNK ASG d.o.o.','Revidirani financijski profil FY 2025' if lang=='HR' else 'Audited financial profile FY 2025',sub,False)
    labels=['Ukupni prihodi','Ukupna aktiva','Kapital i rezerve','Kratkoročne obveze','Dobit godine','Dugoročne obveze'] if lang=='HR' else ['Total revenue','Total assets','Equity & reserves','Current liabilities','Profit for year','Long-term liabilities']
    vals=['EUR 504.00m','EUR 46.40m','EUR 46.21m','EUR 184.50k','EUR 16,076.47','EUR 0.00']
    for i,(a,b) in enumerate(zip(labels,vals)): kpi(c,42+(i%3)*250,315-(i//3)*82,230,a,b,False)
    panel(c,42,112,730,110,False,white,14)
    note='<b>Mišljenje neovisnog revizora:</b> financijski izvještaji istinito i fer prezentiraju, u svim značajnim odrednicama, financijski položaj, uspješnost i novčane tokove društva.' if lang=='HR' else '<b>Independent auditor opinion:</b> the financial statements present fairly, in all material respects, the financial position, performance and cash flows of the company.'
    para(c,note,60,138,694,62,LGT)
    c.setFont('DV',7.2); c.setFillColor(HexColor('#5B6A7B')); c.drawString(60,126,'Izvor: EKVILIBRIJ d.o.o., Zagreb, 19. svibnja 2026.' if lang=='HR' else 'Source: EKVILIBRIJ d.o.o., Zagreb, 19 May 2026.')
    foot(c,3,lang,False); c.showPage()


def dinamo(c,lang):
    bg(c,True)
    sub='Upravljački potvrđeni i interno pregledani konsolidirani prikaz grupe - nije neovisno revidiran.' if lang=='HR' else 'Management-certified and internally reviewed consolidated group report - not independently audited.'
    head(c,'GNK DINAMO Ltd.','Konsolidirani profil FY 2025' if lang=='HR' else 'Consolidated profile FY 2025',sub,True)
    labels=['Prihodi grupe','Neto dobit','Ukupna aktiva','Kapital i rezerve','Ukupne obveze','Udio kapitala'] if lang=='HR' else ['Group revenue','Net income','Total assets','Equity & reserves','Total liabilities','Equity ratio']
    vals=['EUR 4.7046bn','EUR 982.48m','EUR 3.4830bn','EUR 3.4140bn','EUR 69.04m','98.02%']
    for i,(a,b) in enumerate(zip(labels,vals)): kpi(c,42+(i%3)*250,315-(i//3)*82,230,a,b,True)
    panel(c,42,112,730,110,True,HexColor('#07192C'),14)
    c.setFont('DVB',11.5); c.setFillColor(GOLD2); c.drawString(60,190,'CERTIFICATE OF FACT OF GOOD STANDING')
    cert='Colorado Secretary of State potvrđuje da je GNK DINAMO Ltd., Entity ID 20238180649, Limited Liability Company osnovana 8. studenoga 2023., u dobrom statusu. Certifikat je izdan 16. lipnja 2026.' if lang=='HR' else 'The Colorado Secretary of State confirms that GNK DINAMO Ltd., Entity ID 20238180649, is a Limited Liability Company formed on 8 November 2023 and in good standing. The certificate was issued on 16 June 2026.'
    para(c,cert,60,135,690,44,MUT)
    foot(c,4,lang,True); c.showPage()


def group(c,lang):
    bg(c,False)
    sub='Konsolidirani prikaz obuhvaća 33 povezana društva. Broj zaposlenih za grupu ne objavljuje se bez zasebne dokumentacijske osnove.' if lang=='HR' else 'The consolidated overview covers 33 connected companies. No group employee count is published without separate documentary support.'
    head(c,'Grupna struktura' if lang=='HR' else 'Group structure','Međunarodni poslovni okvir' if lang=='HR' else 'International business framework',sub,False)
    data=[('SOFTVER I IP' if lang=='HR' else 'SOFTWARE & IP','Payment processing, lokalizirana tržišna izdanja i digitalna prava.' if lang=='HR' else 'Payment processing, localized market editions and digital rights.'),('TRŽIŠTA I PODACI' if lang=='HR' else 'MARKETS & DATA','Tržišni monitori, poslovne vijesti i strukturirani javni podaci.' if lang=='HR' else 'Market monitors, business news and structured public data.'),('SPORT I UPRAVLJANJE' if lang=='HR' else 'SPORT & GOVERNANCE','Sportski projekti, grupno upravljanje i međunarodno širenje.' if lang=='HR' else 'Sports projects, group governance and international expansion.'),('AI I AUTOMATIZACIJA' if lang=='HR' else 'AI & AUTOMATION','AI pomoćnik, automatizacija objava i operator sloj.' if lang=='HR' else 'AI assistance, publication automation and operator layer.')]
    for i,(a,b) in enumerate(data):
        x=42+(i%2)*380; y=292-(i//2)*150; panel(c,x,y,350,128,False,white,13)
        c.setFont('DVB',11); c.setFillColor(HexColor('#8B641D')); c.drawString(x+18,y+91,a); para(c,b,x+18,y+25,310,52,LGT)
    c.setFont('DVS',34); c.setFillColor(HexColor('#8B641D')); c.drawCentredString(W/2,92,'33')
    c.setFont('DVB',9); c.setFillColor(DARK); c.drawCentredString(W/2,70,'POVEZANA DRUŠTVA' if lang=='HR' else 'CONNECTED COMPANIES')
    foot(c,5,lang,False); c.showPage()


def brand(c,lang):
    bg(c,True)
    sub='Zlatni premium identitet, tamnoplava podloga i jasna odvojenost identiteta GNK ASG d.o.o. i GNK DINAMO Ltd.' if lang=='HR' else 'Premium gold identity, deep navy background and clear separation of the GNK ASG d.o.o. and GNK DINAMO Ltd. identities.'
    head(c,'Vizualni identitet' if lang=='HR' else 'Visual identity','Pravila uporabe logotipa' if lang=='HR' else 'Logo usage rules',sub,True)
    panel(c,42,216,350,210,True,HexColor('#F4F6F9')); mark(c,217,330,75,False); c.setFont('DVS',23); c.setFillColor(HexColor('#8B641D')); c.drawCentredString(217,238,'GNK ASG')
    panel(c,410,216,388,210,True,HexColor('#010101')); mark(c,604,330,75,True); c.setFont('DVS',20); c.setFillColor(GOLD2); c.drawCentredString(604,238,'GNK DINAMO Ltd.')
    rules=['Ne rastezati, rotirati ili mijenjati proporcije logotipa.','Ne mijenjati zlatnu paletu bez pisanog odobrenja.','Na tamnoj podlozi koristiti premium varijantu; na svijetloj svijetlu varijantu.','Uvijek navesti puni naziv odgovarajućeg društva.'] if lang=='HR' else ['Do not stretch, rotate or alter logo proportions.','Do not change the gold palette without written approval.','Use the premium version on dark backgrounds and the light version on light backgrounds.','Always state the full legal name of the relevant company.']
    yy=174
    for rule in rules:
        c.setFillColor(GREEN); c.circle(52,yy+3,3,fill=1,stroke=0); c.setFont('DV',9); c.setFillColor(TEXT); c.drawString(64,yy,rule); yy-=28
    foot(c,6,lang,True); c.showPage()


def contact(c,lang):
    bg(c,False)
    sub='Kontaktni kanali, provjera činjenica i izvorna dokumentacija.' if lang=='HR' else 'Communication channels, fact checking and source documentation.'
    head(c,'Kontakt i izvori' if lang=='HR' else 'Contact and sources','GNK ASG Communications Desk',sub,False)
    contacts=[('OPĆI KONTAKT' if lang=='HR' else 'GENERAL','contact@gnk-asg.hr'),('INFORMACIJE' if lang=='HR' else 'INFORMATION','info@gnk-asg.hr'),('MEDIJI','media@gnk-asg.hr'),('PRESS','press@gnk-asg.hr'),('PRAVNI ODJEL' if lang=='HR' else 'LEGAL','legal@gnk-asg.hr'),('PRIVATNOST' if lang=='HR' else 'PRIVACY','privacy@gnk-asg.hr')]
    for i,(a,b) in enumerate(contacts):
        x=42+(i%2)*380; y=330-(i//2)*92; panel(c,x,y,350,72,False,white,12)
        c.setFont('DVB',8); c.setFillColor(HexColor('#8B641D')); c.drawString(x+16,y+45,a); c.setFont('DVB',10.5); c.setFillColor(DARK); c.drawString(x+16,y+20,b)
    panel(c,42,75,730,70,False,HexColor('#EEF2F7'),12)
    src='Izvorni dokumenti: Colorado Certificate of Good Standing; GNK DINAMO Ltd. Consolidated Financial Report FY2025 (upravljački potvrđen, interno pregledan, nerevidiran); GNK ASG d.o.o. Izvješće neovisnog revizora i financijski izvještaji FY2025.' if lang=='HR' else 'Source documents: Colorado Certificate of Good Standing; GNK DINAMO Ltd. Consolidated Financial Report FY2025 (management-certified, internally reviewed, unaudited); GNK ASG d.o.o. Independent Auditor Report and Financial Statements FY2025.'
    para(c,src,58,88,700,42,LGT); foot(c,7,lang,False); c.showPage()


def build(lang):
    canonical=OUT/('GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_HR_2026.pdf' if lang=='HR' else 'GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_EN_2026.pdf')
    c=canvas.Canvas(str(canonical),pagesize=landscape(A4),pageCompression=1)
    c.setTitle('GNK ASG d.o.o. / GNK DINAMO Ltd. Media Kit 2026'); c.setAuthor('GNK ASG Communications Desk')
    for fn in (cover,entities,asg,dinamo,group,brand,contact): fn(c,lang)
    c.save()
    legacy=OUT/('GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_2_HR.pdf' if lang=='HR' else 'GNK_ASG_GNK_DINAMO_LTD_MEDIA_KIT_EN.pdf')
    shutil.copy2(canonical,legacy)
    return canonical

if __name__=='__main__':
    for language in ('HR','EN'):
        p=build(language); print(p,p.stat().st_size)
