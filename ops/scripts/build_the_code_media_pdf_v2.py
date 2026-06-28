from pathlib import Path
import os
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(os.environ.get('GITHUB_WORKSPACE') or Path(__file__).resolve().parents[2])
OUT=Path('/tmp/the-code.pdf')
ASG=ROOT/'apps'/'portal'/'assets'/'gnk-asg-email-logo-final.png'
F=Path('/usr/share/fonts/truetype/dejavu')
for n,f in {'Sans':'DejaVuSans.ttf','SansB':'DejaVuSans-Bold.ttf','Serif':'DejaVuSerif.ttf','SerifB':'DejaVuSerif-Bold.ttf'}.items():
    pdfmetrics.registerFont(TTFont(n,str(F/f)))
IVORY=HexColor('#F5F0E6'); PAPER=HexColor('#FFFDF8'); INK=HexColor('#17130E'); MUTED=HexColor('#6D675C'); GOLD=HexColor('#B58A32'); GOLD_PALE=HexColor('#F1E4C4'); BURG=HexColor('#8D263B'); BURG_PALE=HexColor('#F3E1E5'); BLACK=HexColor('#090909')

class DinamoMark(Flowable):
    def __init__(self): super().__init__(); self.width=64*mm; self.height=35*mm
    def draw(self):
        c=self.canv; w=self.width; h=self.height; c.saveState(); c.setStrokeColor(GOLD); c.setFillColor(GOLD)
        c.setLineWidth(2.1); c.arc(w*.18,h*.08,w*.82,h*.95,25,305)
        for x,y0,y1 in ((.35,.38,.69),(.47,.31,.78),(.59,.24,.86)):
            c.setLineWidth(4); c.line(w*x,h*y0,w*x,h*y1)
        c.setFont('SerifB',22); c.drawCentredString(w*.5,h*.34,'GNK')
        c.setFont('SansB',6.6); c.drawCentredString(w*.5,h*.15,'DINAMO LTD. GROUP'); c.restoreState()

s=getSampleStyleSheet()
for x in [
 ParagraphStyle(name='K',fontName='SansB',fontSize=7,textColor=GOLD,leading=9,spaceAfter=8),
 ParagraphStyle(name='T',fontName='Serif',fontSize=29,textColor=INK,leading=33,spaceAfter=12),
 ParagraphStyle(name='S',fontName='Sans',fontSize=10,textColor=MUTED,leading=15,spaceAfter=12),
 ParagraphStyle(name='H1x',fontName='Serif',fontSize=22,textColor=INK,leading=26,spaceAfter=11),
 ParagraphStyle(name='H2x',fontName='SerifB',fontSize=13,textColor=INK,leading=17,spaceBefore=8,spaceAfter=6),
 ParagraphStyle(name='B',fontName='Sans',fontSize=8.6,textColor=INK,leading=13,spaceAfter=7),
 ParagraphStyle(name='Lead',fontName='SansB',fontSize=10,textColor=INK,leading=15,spaceAfter=10),
 ParagraphStyle(name='Small',fontName='Sans',fontSize=6.7,textColor=MUTED,leading=9),
 ParagraphStyle(name='Quote',fontName='Serif',fontSize=14,textColor=colors.white,leading=19),
 ParagraphStyle(name='Bullet',fontName='Sans',fontSize=8.1,textColor=INK,leading=12,leftIndent=12,firstLineIndent=-8,spaceAfter=3)
]: s.add(x)
def P(t,st='B'): return Paragraph(t,s[st])
def bullets(items): return [P('• '+i,'Bullet') for i in items]
def bar(t,dark=False,burg=False):
    bg=BLACK if dark else (BURG_PALE if burg else GOLD_PALE); border=BURG if burg else GOLD
    style=ParagraphStyle('bar'+str(id(t)),parent=s['Lead'],textColor=colors.white if dark else INK)
    q=Table([[Paragraph(t,style)]],colWidths=[170*mm]); q.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),.8,border),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)])); return q
def quote(t):
    q=Table([[P(t,'Quote')]],colWidths=[170*mm]); q.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BLACK),('BOX',(0,0),(-1,-1),1,GOLD),('LEFTPADDING',(0,0),(-1,-1),15),('RIGHTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),13),('BOTTOMPADDING',(0,0),(-1,-1),13)])); return q
def page(c,d):
    c.saveState(); c.setFillColor(IVORY); c.rect(0,0,A4[0],A4[1],fill=1,stroke=0); c.setStrokeColor(GOLD); c.line(20*mm,A4[1]-14*mm,40*mm,A4[1]-14*mm); c.setFont('SansB',6.2); c.setFillColor(GOLD); c.drawString(20*mm,A4[1]-10.5*mm,'THE CODE · MEDIJSKI MEMORANDUM'); c.setFont('Sans',6); c.setFillColor(MUTED); c.drawRightString(A4[0]-20*mm,A4[1]-10.5*mm,'GNK DINAMO Ltd. Group · GNK ASG d.o.o.'); c.drawString(20*mm,8*mm,'Medijski materijal · 28. lipnja 2026.'); c.drawRightString(A4[0]-20*mm,8*mm,str(d.page)); c.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=22*mm,bottomMargin=18*mm,title='THE CODE - Medijski memorandum',author='GNK DINAMO Ltd. Group / GNK ASG d.o.o.')
logos=Table([[DinamoMark(),Image(str(ASG),width=31*mm,height=32*mm,mask='auto')]],colWidths=[82*mm,58*mm],hAlign='CENTER'); logos.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story=[Spacer(1,8*mm),logos,Spacer(1,5*mm),P('POVJERLJIVI MEDIJSKI POZIV · NEW YORK','K'),P('THE CODE','T'),P('Objava najveće akvizicije u povijesti. Više svjetskih kompanija. Jedan kontrolirani trenutak objave.','S'),bar('ZA ODABRANE REDAKCIJE: sudjelovanje, hotel, odobreni povratni letovi, lokalni transferi i službeni program u cijelosti su bez naknade.',dark=True),Spacer(1,8*mm),P('6.-8. listopada 2026. · New York<br/>Glavni događaj: 7. listopada u 11:30 ET<br/>Najviše tri člana po redakciji','Lead'),PageBreak()]
story += [P('Najveća akvizicija u povijesti','H1x'),P('GNK DINAMO Ltd. Group provodi međunarodni akvizicijski program koji obuhvaća više svjetskih kompanija. Identiteti kompanija, transakcijska struktura, točne lokacije i redoslijed objava ostaju povjerljivi do službenog trenutka u New Yorku.','Lead'),quote('„Mi ne letimo u svemir. Ne lovimo zvijezde. Mi smo u vašem automobilu. U vašem domu. Na vašoj cesti. Na Zemlji - s vama.”'),Spacer(1,6*mm),quote('„Kod se aktivira. Cijeli svijet postaje naš dom.”'),Spacer(1,7*mm),P('Poslovna skala','H2x'),*bullets(['45 društava i povezanih subjekata na pet kontinenata','4,7046 mlrd. EUR prihoda grupe u 2025.','982,48 mil. EUR neto dobiti','98,02 % udjela kapitala i 0,00 EUR dugoročnog duga','više od 100 pozvanih redakcija i približno 1.000 sudionika']),PageBreak()]
story += [P('Program · 6.-8. listopada 2026.','H1x'),P('6. listopada · Arrival Day & Welcome Gala','H2x'),P('Dolazak u New York, prijava u hotel te večernja gala večera dobrodošlice i povjerljivi uvod u program.'),P('7. listopada · Global Acquisition Reveal & Executive Media Forum','H2x'),P('U 11:30 ET održava se središnja prezentacija. Nakon prezentacije slijedi Executive Working Lunch na istoj lokaciji.'),P('7. listopada · Executive Access Sessions','H2x'),P('Intervjui s managementom kompanija, urednički razgovori, tematski brifinzi, individualni medijski termini i provjera činjenica.'),P('8. listopada · Departure Day & Courtesy Package','H2x'),P('Odjava iz hotela, transferi prema odobrenom itineraru, odlazak i uručenje prigodnih darova i završnog press paketa.'),bar('Gala večera i glavna prezentacija nisu na istoj lokaciji. Radni ručak održava se na lokaciji glavne prezentacije.'),PageBreak()]
story += [P('Hotel, letovi i transferi','H1x'),bar('TROŠAK ZA ODOBRENU REDAKCIJU: 0,00 EUR za hotel, odobrene povratne letove, lokalne transfere i službeni program.',dark=True),Spacer(1,6*mm),P('Opcija A · redakcija dostavlja ponudu','H2x'),P('Redakcija bira željeni let i dostavlja službenu ponudu aviokompanije ili putničke agencije. Nakon pisanog odobrenja organizator plaća ponudu.'),P('Opcija B · organizator rezervira','H2x'),P('Redakcija dostavlja točne podatke željenih letova i putnika. Organizator rezervira i plaća odobrene karte.'),P('Uključeno','H2x'),*bullets(['hotelski smještaj','odobreni povratni letovi','lokalni transferi','gala večera, radni ručak i službeni program','press materijali, fact-checking i završni paket']),PageBreak()]
story += [P('Prijava i akreditacija','H1x'),P('Rok: 20. srpnja 2026. u 23:59 CEST<br/>Kontakt: media@gnk-asg.hr<br/>Šifra poziva obvezna je u predmetu i svakoj poruci.','Lead'),P('Redakcija dostavlja','H2x'),*bullets(['naziv redakcije, državu, web i službenu domenu','ime odgovornog urednika i kontakt osobe','podatke za najviše tri člana tima','željeni dolazak i odlazak','ponudu leta ili podatke željenih letova','posebne potrebe i interes za intervjue']),P('Sigurnost','H2x'),*bullets(['kopije putovnica ne šalju se običnim e-mailom','sigurni kanal dostavlja se nakon uvjetnog odobrenja','automatizacija razvrstava prijave, a konačnu odluku donosi ovlaštena osoba','prijava ne znači automatsku akreditaciju']),PageBreak()]
story += [P('Sekundarna poslovna napomena','H1x'),P('Istodobno s međunarodnim akvizicijskim ciklusom, GNK ASG d.o.o. započinje kontrolirani i postupni prijenos operativnog težišta poslovanja iz Hrvatske u Sloveniju. Ta tema ostaje sekundarna u ovom memorandumu i hrvatskoj će javnosti biti zasebno predstavljena kroz kratku poslovnu vijest i konferenciju za medije.'),bar('Globalna akvizicija i THE CODE ostaju glavna tema. Regionalni prijenos GNK ASG-a zasebna je poslovna objava.',burg=True),Spacer(1,8*mm),P('Poveznice','H2x'),*bullets(['THE CODE: https://gnk-asg.hr/the-code/','Financije: https://gnk-asg.hr/','Vijesti: https://gnk-asg.hr/vijesti/','Prijava: https://gnk-asg.hr/media-application/','Kontakt: https://gnk-asg.hr/contact/']),Spacer(1,8*mm),quote('Najveća akvizicija u povijesti. Više svjetskih kompanija. Jedan trenutak objave.'),Spacer(1,7*mm),P('Nermin Sefic','H2x'),P('GNK DINAMO Ltd. Group / GNK ASG d.o.o.<br/>media@gnk-asg.hr<br/>www.gnk-asg.hr'),P('Program, lokacije i raspored intervjua mogu se prilagoditi operativnim, sigurnosnim i regulatornim zahtjevima.','Small')]
doc.build(story,onFirstPage=page,onLaterPages=page)
if OUT.read_bytes()[:5] != b'%PDF-': raise RuntimeError('Invalid PDF')
print(f'PDF_READY={OUT} bytes={OUT.stat().st_size}')
