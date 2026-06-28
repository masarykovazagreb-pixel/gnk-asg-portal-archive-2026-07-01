from pathlib import Path
import os
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, Flowable

ROOT=Path(os.environ.get('GITHUB_WORKSPACE') or Path(__file__).resolve().parents[2])
OUT=Path('/tmp/the-code.pdf')
ASG=ROOT/'apps'/'portal'/'assets'/'gnk-asg-email-logo-final.png'
IVORY=HexColor('#F5F0E6'); PAPER=HexColor('#FFFDF8'); INK=HexColor('#17130E'); MUTED=HexColor('#6D675C'); GOLD=HexColor('#B58A32'); GOLD_PALE=HexColor('#F1E4C4'); BURG=HexColor('#8D263B'); BURG_PALE=HexColor('#F3E1E5'); BLACK=HexColor('#090909')

class DinamoMark(Flowable):
    def __init__(self): Flowable.__init__(self); self.width=64*mm; self.height=35*mm
    def wrap(self,aw,ah): return self.width,self.height
    def draw(self):
        c=self.canv; w=self.width; h=self.height; c.saveState(); c.setStrokeColor(GOLD); c.setFillColor(GOLD)
        c.setLineWidth(2); c.arc(w*.18,h*.08,w*.82,h*.95,25,305)
        for x,y0,y1 in ((.35,.38,.69),(.47,.31,.78),(.59,.24,.86)):
            c.setLineWidth(4); c.line(w*x,h*y0,w*x,h*y1)
        c.setFont('Times-Bold',22); c.drawCentredString(w*.5,h*.34,'GNK')
        c.setFont('Helvetica-Bold',6.5); c.drawCentredString(w*.5,h*.15,'DINAMO LTD. GROUP'); c.restoreState()

s=getSampleStyleSheet()
for st in [
 ParagraphStyle(name='KX',fontName='Helvetica-Bold',fontSize=7,textColor=GOLD,leading=9,spaceAfter=8),
 ParagraphStyle(name='TX',fontName='Times-Roman',fontSize=29,textColor=INK,leading=33,spaceAfter=12),
 ParagraphStyle(name='SX',fontName='Helvetica',fontSize=10,textColor=MUTED,leading=15,spaceAfter=12),
 ParagraphStyle(name='H1X',fontName='Times-Roman',fontSize=22,textColor=INK,leading=26,spaceAfter=11),
 ParagraphStyle(name='H2X',fontName='Times-Bold',fontSize=13,textColor=INK,leading=17,spaceBefore=8,spaceAfter=6),
 ParagraphStyle(name='BX',fontName='Helvetica',fontSize=8.5,textColor=INK,leading=13,spaceAfter=7),
 ParagraphStyle(name='LeadX',fontName='Helvetica-Bold',fontSize=10,textColor=INK,leading=15,spaceAfter=10),
 ParagraphStyle(name='SmallX',fontName='Helvetica',fontSize=6.7,textColor=MUTED,leading=9),
 ParagraphStyle(name='QuoteX',fontName='Times-Roman',fontSize=14,textColor=colors.white,leading=19),
 ParagraphStyle(name='BulletXX',fontName='Helvetica',fontSize=8,textColor=INK,leading=12,leftIndent=12,firstLineIndent=-8,spaceAfter=3)
]: s.add(st)
def P(t,st='BX'): return Paragraph(t,s[st])
def bullets(xs): return [P('&bull; '+x,'BulletXX') for x in xs]
def bar(t,dark=False,burg=False):
    bg=BLACK if dark else (BURG_PALE if burg else GOLD_PALE); border=BURG if burg else GOLD
    style=ParagraphStyle('barx'+str(abs(hash(t))),parent=s['LeadX'],textColor=colors.white if dark else INK)
    q=Table([[Paragraph(t,style)]],colWidths=[170*mm]); q.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),.8,border),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)])); return q
def quote(t):
    q=Table([[P(t,'QuoteX')]],colWidths=[170*mm]); q.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BLACK),('BOX',(0,0),(-1,-1),1,GOLD),('LEFTPADDING',(0,0),(-1,-1),15),('RIGHTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),13),('BOTTOMPADDING',(0,0),(-1,-1),13)])); return q
def page(c,d):
    c.saveState(); c.setFillColor(IVORY); c.rect(0,0,A4[0],A4[1],fill=1,stroke=0); c.setStrokeColor(GOLD); c.line(20*mm,A4[1]-14*mm,40*mm,A4[1]-14*mm); c.setFont('Helvetica-Bold',6.2); c.setFillColor(GOLD); c.drawString(20*mm,A4[1]-10.5*mm,'THE CODE - MEDIJSKI MEMORANDUM'); c.setFont('Helvetica',6); c.setFillColor(MUTED); c.drawRightString(A4[0]-20*mm,A4[1]-10.5*mm,'GNK DINAMO Ltd. Group / GNK ASG d.o.o.'); c.drawString(20*mm,8*mm,'Medijski materijal - 28. lipnja 2026.'); c.drawRightString(A4[0]-20*mm,8*mm,str(d.page)); c.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=22*mm,bottomMargin=18*mm,title='THE CODE - Medijski memorandum',author='GNK DINAMO Ltd. Group / GNK ASG d.o.o.')
logos=Table([[DinamoMark(),Image(str(ASG),width=31*mm,height=32*mm,mask='auto')]],colWidths=[82*mm,58*mm],hAlign='CENTER'); logos.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story=[Spacer(1,8*mm),logos,Spacer(1,5*mm),P('POVJERLJIVI MEDIJSKI POZIV - NEW YORK','KX'),P('THE CODE','TX'),P('Objava najvece akvizicije u povijesti. Vise svjetskih kompanija. Jedan kontrolirani trenutak objave.','SX'),bar('ZA ODABRANE REDAKCIJE: sudjelovanje, hotel, odobreni povratni letovi, lokalni transferi i sluzbeni program u cijelosti su bez naknade.',dark=True),Spacer(1,8*mm),P('6.-8. listopada 2026. - New York<br/>Glavni dogadjaj: 7. listopada u 11:30 ET<br/>Najvise tri clana po redakciji','LeadX'),PageBreak()]
story += [P('Najveca akvizicija u povijesti','H1X'),P('GNK DINAMO Ltd. Group provodi medjunarodni akvizicijski program koji obuhvaca vise svjetskih kompanija. Identiteti kompanija, transakcijska struktura, tocne lokacije i redoslijed objava ostaju povjerljivi do sluzbenog trenutka u New Yorku.','LeadX'),quote('Mi ne letimo u svemir. Ne lovimo zvijezde. Mi smo u vasem automobilu. U vasem domu. Na vasoj cesti. Na Zemlji - s vama.'),Spacer(1,6*mm),quote('Kod se aktivira. Cijeli svijet postaje nas dom.'),Spacer(1,7*mm),P('Poslovna skala','H2X'),*bullets(['45 drustava i povezanih subjekata na pet kontinenata','4,7046 mlrd. EUR prihoda grupe u 2025.','982,48 mil. EUR neto dobiti','98,02 % udjela kapitala i 0,00 EUR dugorocnog duga','vise od 100 pozvanih redakcija i priblizno 1.000 sudionika']),PageBreak()]
story += [P('Program - 6.-8. listopada 2026.','H1X'),P('6. listopada - Arrival Day & Welcome Gala','H2X'),P('Dolazak u New York, prijava u hotel te vecernja gala vecera dobrodoslice i povjerljivi uvod u program.'),P('7. listopada - Global Acquisition Reveal & Executive Media Forum','H2X'),P('U 11:30 ET odrzava se sredisnja prezentacija. Nakon prezentacije slijedi Executive Working Lunch na istoj lokaciji.'),P('7. listopada - Executive Access Sessions','H2X'),P('Intervjui s managementom kompanija, urednicki razgovori, tematski brifinzi, individualni medijski termini i provjera cinjenica.'),P('8. listopada - Departure Day & Courtesy Package','H2X'),P('Odjava iz hotela, transferi prema odobrenom itineraru, odlazak i urucenje prigodnih darova i zavrsnog press paketa.'),bar('Gala vecera i glavna prezentacija nisu na istoj lokaciji. Radni rucak odrzava se na lokaciji glavne prezentacije.'),PageBreak()]
story += [P('Hotel, letovi i transferi','H1X'),bar('TROSAK ZA ODOBRENU REDAKCIJU: 0,00 EUR za hotel, odobrene povratne letove, lokalne transfere i sluzbeni program.',dark=True),Spacer(1,6*mm),P('Opcija A - redakcija dostavlja ponudu','H2X'),P('Redakcija bira zeljeni let i dostavlja sluzbenu ponudu aviokompanije ili putnicke agencije. Nakon pisanog odobrenja organizator placa ponudu.'),P('Opcija B - organizator rezervira','H2X'),P('Redakcija dostavlja tocne podatke zeljenih letova i putnika. Organizator rezervira i placa odobrene karte.'),P('Ukljuceno','H2X'),*bullets(['hotelski smjestaj','odobreni povratni letovi','lokalni transferi','gala vecera, radni rucak i sluzbeni program','press materijali, fact-checking i zavrsni paket']),PageBreak()]
story += [P('Prijava i akreditacija','H1X'),P('Rok: 20. srpnja 2026. u 23:59 CEST<br/>Kontakt: media@gnk-asg.hr<br/>Sifra poziva obvezna je u predmetu i svakoj poruci.','LeadX'),P('Redakcija dostavlja','H2X'),*bullets(['naziv redakcije, drzavu, web i sluzbenu domenu','ime odgovornog urednika i kontakt osobe','podatke za najvise tri clana tima','zeljeni dolazak i odlazak','ponudu leta ili podatke zeljenih letova','posebne potrebe i interes za intervjue']),P('Sigurnost','H2X'),*bullets(['kopije putovnica ne salju se obicnim e-mailom','sigurni kanal dostavlja se nakon uvjetnog odobrenja','automatizacija razvrstava prijave, a konacnu odluku donosi ovlastena osoba','prijava ne znaci automatsku akreditaciju']),PageBreak()]
story += [P('Sekundarna poslovna napomena','H1X'),P('Istodobno s medjunarodnim akvizicijskim ciklusom, GNK ASG d.o.o. zapocinje kontrolirani i postupni prijenos operativnog tezista poslovanja iz Hrvatske u Sloveniju. Ta tema ostaje sekundarna u ovom memorandumu i hrvatskoj ce javnosti biti zasebno predstavljena kroz kratku poslovnu vijest i konferenciju za medije.'),bar('Globalna akvizicija i THE CODE ostaju glavna tema. Regionalni prijenos GNK ASG-a zasebna je poslovna objava.',burg=True),Spacer(1,8*mm),P('Poveznice','H2X'),*bullets(['THE CODE: https://gnk-asg.hr/the-code/','Financije: https://gnk-asg.hr/','Vijesti: https://gnk-asg.hr/vijesti/','Prijava: https://gnk-asg.hr/media-application/','Kontakt: https://gnk-asg.hr/contact/']),Spacer(1,8*mm),quote('Najveca akvizicija u povijesti. Vise svjetskih kompanija. Jedan trenutak objave.'),Spacer(1,7*mm),P('Nermin Sefic','H2X'),P('GNK DINAMO Ltd. Group / GNK ASG d.o.o.<br/>media@gnk-asg.hr<br/>www.gnk-asg.hr'),P('Program, lokacije i raspored intervjua mogu se prilagoditi operativnim, sigurnosnim i regulatornim zahtjevima.','SmallX')]
doc.build(story,onFirstPage=page,onLaterPages=page)
if OUT.read_bytes()[:5] != b'%PDF-': raise RuntimeError('Invalid PDF')
print('PDF_READY',OUT.stat().st_size)
