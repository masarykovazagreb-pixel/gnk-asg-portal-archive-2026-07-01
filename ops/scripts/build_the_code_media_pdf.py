from pathlib import Path
import base64, os
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(os.environ.get('GITHUB_WORKSPACE') or Path(__file__).resolve().parents[2])
ASSETS=ROOT/'ops'/'assets'
OUT=Path('/tmp/the-code.pdf')
TMP=Path('/tmp/gnk-media-assets'); TMP.mkdir(exist_ok=True)
def decode(name):
    src=ASSETS/f'{name}.b64'; dst=TMP/name
    dst.write_bytes(base64.b64decode(src.read_text().strip()))
    return dst
asg=ROOT/'apps'/'portal'/'assets'/'gnk-asg-email-logo-final.png'
dinamo=decode('dinamo_logo.png')
font_dir=Path('/usr/share/fonts/truetype/dejavu')
for n,f in {'Sans':'DejaVuSans.ttf','SansB':'DejaVuSans-Bold.ttf','Serif':'DejaVuSerif.ttf','SerifB':'DejaVuSerif-Bold.ttf','Mono':'DejaVuSansMono.ttf'}.items(): pdfmetrics.registerFont(TTFont(n,str(font_dir/f)))
IVORY=HexColor('#F5F0E6'); PAPER=HexColor('#FFFDF8'); INK=HexColor('#17130E'); MUTED=HexColor('#6D675C'); GOLD=HexColor('#B58A32'); GOLD_PALE=HexColor('#F1E4C4'); BURG=HexColor('#8D263B'); BURG_PALE=HexColor('#F3E1E5'); BLACK=HexColor('#090909')
styles=getSampleStyleSheet()
for style in [
    ParagraphStyle(name='K',fontName='SansB',fontSize=7,textColor=GOLD,leading=9,spaceAfter=8),
    ParagraphStyle(name='T',fontName='Serif',fontSize=29,textColor=INK,leading=33,spaceAfter=12),
    ParagraphStyle(name='S',fontName='Sans',fontSize=10,textColor=MUTED,leading=15,spaceAfter=12),
    ParagraphStyle(name='H1x',fontName='Serif',fontSize=22,textColor=INK,leading=26,spaceAfter=11),
    ParagraphStyle(name='H2x',fontName='SerifB',fontSize=13,textColor=INK,leading=17,spaceBefore=8,spaceAfter=6),
    ParagraphStyle(name='B',fontName='Sans',fontSize=8.6,textColor=INK,leading=13,spaceAfter=7),
    ParagraphStyle(name='Lead',fontName='SansB',fontSize=10,textColor=INK,leading=15,spaceAfter=10),
    ParagraphStyle(name='Small',fontName='Sans',fontSize=6.7,textColor=MUTED,leading=9),
    ParagraphStyle(name='Q',fontName='Serif',fontSize=15,textColor=colors.white,leading=20,spaceAfter=4),
    ParagraphStyle(name='QG',fontName='SerifB',fontSize=14,textColor=GOLD_PALE,leading=19),
    ParagraphStyle(name='FactL',fontName='SansB',fontSize=6,textColor=GOLD,leading=8),
    ParagraphStyle(name='FactV',fontName='SerifB',fontSize=14,textColor=INK,leading=17),
    ParagraphStyle(name='FactN',fontName='Sans',fontSize=6.3,textColor=MUTED,leading=8),
    ParagraphStyle(name='BulletX',fontName='Sans',fontSize=8.1,textColor=INK,leading=12,leftIndent=12,firstLineIndent=-8,spaceAfter=3)
]: styles.add(style)
def P(t,s='B'): return Paragraph(t,styles[s])
def bullets(items): return [P('• '+x,'BulletX') for x in items]
def bar(text,dark=False,burg=False):
    bg=BLACK if dark else (BURG_PALE if burg else GOLD_PALE); bd=GOLD if not burg else BURG
    p=Paragraph(text,ParagraphStyle('tmp',parent=styles['Lead'],textColor=colors.white if dark else INK))
    tab=Table([[p]],colWidths=[170*mm]); tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),.8,bd),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)])); return tab
def quote(lines,footer=''):
    flow=[P(x,'QG' if i==len(lines)-1 else 'Q') for i,x in enumerate(lines)]
    if footer: flow += [Spacer(1,3*mm),P(footer,'Small')]
    tab=Table([[flow]],colWidths=[170*mm]); tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BLACK),('BOX',(0,0),(-1,-1),1,GOLD),('LEFTPADDING',(0,0),(-1,-1),15),('RIGHTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),13),('BOTTOMPADDING',(0,0),(-1,-1),13)])); return tab
def facts(items,cols=3):
    rows=[]; row=[]
    for label,val,note,accent in items:
        cell=Table([[P(label.upper(),'FactL')],[P(val,'FactV')],[P(note,'FactN')]],colWidths=[52*mm]); cell.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PAPER),('BOX',(0,0),(-1,-1),.7,accent),('LINEABOVE',(0,0),(-1,0),3,accent),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)])); row.append(cell)
        if len(row)==cols: rows.append(row); row=[]
    if row:
        while len(row)<cols: row.append('')
        rows.append(row)
    tab=Table(rows,colWidths=[56*mm]*cols); tab.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)])); return tab
def page(canvas,doc):
    canvas.saveState(); canvas.setFillColor(IVORY); canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0); canvas.setStrokeColor(GOLD); canvas.line(20*mm,A4[1]-14*mm,40*mm,A4[1]-14*mm); canvas.setFont('SansB',6.2); canvas.setFillColor(GOLD); canvas.drawString(20*mm,A4[1]-10.5*mm,'THE CODE · MEDIJSKI MEMORANDUM'); canvas.setFont('Sans',6); canvas.setFillColor(MUTED); canvas.drawRightString(A4[0]-20*mm,A4[1]-10.5*mm,'GNK DINAMO Ltd. Group · GNK ASG d.o.o.'); canvas.drawString(20*mm,8*mm,'Medijski materijal · 28. lipnja 2026.'); canvas.drawRightString(A4[0]-20*mm,8*mm,str(doc.page)); canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=22*mm,bottomMargin=18*mm,title='THE CODE - Medijski memorandum',author='GNK DINAMO Ltd. Group / GNK ASG d.o.o.')
story=[]
logos=Table([[Image(str(dinamo),width=38*mm,height=31.5*mm,mask='auto'),Image(str(asg),width=31*mm,height=32*mm,mask='auto')]],colWidths=[70*mm,70*mm],hAlign='CENTER'); logos.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story += [Spacer(1,8*mm),logos,Spacer(1,5*mm),P('POVJERLJIVI MEDIJSKI POZIV · NEW YORK','K'),P('THE CODE','T'),P('Objava najveće akvizicije u povijesti. Više svjetskih kompanija. Jedan kontrolirani trenutak objave.','S'),bar('ZA ODABRANE REDAKCIJE: sudjelovanje, hotel, odobreni povratni letovi, lokalni transferi i službeni program u cijelosti su bez naknade.',dark=True),Spacer(1,5*mm),facts([('Program','6.-8.10.2026.','New York',GOLD),('Glavni događaj','7.10. · 11:30 ET','THE CODE activation',BURG),('Po redakciji','do 3 osobe','novinar · urednik · produkcija',GOLD)]),PageBreak()]
story += [P('Najveća akvizicija u povijesti','H1x'),P('GNK DINAMO Ltd. Group provodi međunarodni akvizicijski program koji obuhvaća više svjetskih kompanija. Identiteti kompanija, transakcijska struktura, točne lokacije i redoslijed objava ostaju povjerljivi do službenog trenutka u New Yorku.','Lead'),quote(['„Mi ne letimo u svemir. Ne lovimo zvijezde.','Mi smo u vašem automobilu. U vašem domu. Na vašoj cesti. Na Zemlji - s vama.”'],'THE CODE · globalna prisutnost postaje osobna'),Spacer(1,6*mm),quote(['„Kod se aktivira.','Cijeli svijet postaje naš dom.”'],'New York · 7. listopada 2026. · 11:30 ET'),Spacer(1,6*mm),P('Nositelji programa','H2x'),facts([('Akvizicijski nositelj','GNK DINAMO Ltd.','međunarodna struktura i objava',GOLD),('Operativni partner','GNK ASG d.o.o.','organizacija, mediji i logistika',BURG),('Medijski opseg','100+ redakcija','oko 1.000 sudionika',GOLD)]),PageBreak()]
story += [P('Poslovna skala i globalna mreža','H1x'),facts([('Društva i subjekti','45','33 postojeća + 12 planiranih',GOLD),('Kontinenti','5','globalni operativni doseg',BURG),('Prihodi grupe','4,7046 mlrd. EUR','upravljački podaci · 2025.',GOLD),('Neto dobit','982,48 mil. EUR','konsolidirano',BURG),('Udio kapitala','98,02 %','kapital u ukupnoj strukturi',GOLD),('Dugoročni dug','0,00 EUR','bez dugoročne zaduženosti',BURG)]),Spacer(1,7*mm),P('Sekundarna poslovna napomena: GNK ASG i Slovenija','H2x'),P('Istodobno s međunarodnim akvizicijskim ciklusom, GNK ASG d.o.o. započinje kontrolirani i postupni prijenos operativnog težišta poslovanja iz Hrvatske u Sloveniju. Ta je tema sekundarna u ovom memorandumu i hrvatskoj će javnosti biti zasebno predstavljena kroz kratku poslovnu vijest i konferenciju za medije.'),bar('Globalna akvizicija i THE CODE ostaju glavna tema. Regionalni prijenos GNK ASG-a predstavlja zasebnu poslovnu objavu.',burg=True),PageBreak()]
story += [P('Program · 6.-8. listopada 2026.','H1x'),P('6. listopada · Arrival Day & Welcome Gala','H2x'),P('Dolazak u New York prema individualno odabranom i odobrenom itineraru, prijava u hotel te večernja gala večera dobrodošlice i povjerljivi uvod u program.'),P('7. listopada · THE CODE: Global Acquisition Reveal & Executive Media Forum','H2x'),P('U 11:30 ET održava se središnja prezentacija. Nakon prezentacije slijedi Executive Working Lunch na istoj lokaciji.'),P('7. listopada · Executive Access Sessions','H2x'),P('Poslijepodne je rezervirano za unaprijed dogovorene intervjue s managementom kompanija, uredničke razgovore, tematske brifinge, individualne medijske termine i provjeru činjenica.'),P('8. listopada · Departure Day & Courtesy Package','H2x'),P('Odjava iz hotela, organizirani transferi prema odobrenom itineraru, odlazak iz New Yorka te uručenje prigodnih darova i završnog press paketa.'),bar('Gala večera i glavna prezentacija nisu na istoj lokaciji. Radni ručak 7. listopada održava se na lokaciji glavne prezentacije.'),PageBreak()]
story += [P('Hotel, letovi i transferi','H1x'),bar('TROŠAK ZA ODOBRENU REDAKCIJU: 0,00 EUR za hotel, odobrene povratne letove, lokalne transfere i službeni program.',dark=True),Spacer(1,6*mm),P('Opcija A · redakcija dostavlja ponudu','H2x'),P('Redakcija bira željeni let i dostavlja službenu ponudu aviokompanije ili putničke agencije. Nakon pisanog odobrenja organizator plaća ponudu.'),P('Opcija B · organizator rezervira','H2x'),P('Redakcija dostavlja točne podatke željenih letova, putnika, prtljage i vremenskih preferencija. Organizator zatim rezervira i plaća odobrene karte.'),P('Uključena logistika','H2x'),*bullets(['hotelski smještaj u New Yorku','odobreni povratni letovi','transferi između zračne luke, hotela i programskih lokacija','gala večera, radni ručak i službeni program','press materijali, fact-checking i završni paket','prigodni darovi pri odlasku']),PageBreak()]
story += [P('Prijava i akreditacija','H1x'),facts([('Rok','20.07.2026.','23:59 CEST',GOLD),('Po redakciji','do 3 člana','konačan broj nakon provjere',BURG),('Kontakt','media@gnk-asg.hr','obvezna šifra poziva',GOLD)]),Spacer(1,7*mm),P('Redakcija dostavlja','H2x'),*bullets(['naziv redakcije, državu, web i službenu domenu','ime odgovornog urednika i kontakt osobe','podatke za najviše tri člana tima','željeni dolazak i odlazak','službenu ponudu leta ili podatke željenih letova','prehrambene, zdravstvene i druge posebne potrebe','interes za intervjue, teme i kompanije']),P('Sigurnost podataka','H2x'),*bullets(['kopije putovnica ne šalju se običnim e-mailom','sigurni kanal dostavlja se nakon uvjetnog odobrenja','automatizacija razvrstava prijave, a konačnu odluku donosi ovlaštena osoba','prijava ne znači automatsku akreditaciju']),PageBreak()]
story += [P('Predložak odgovora redakcije','H1x'),bar('Predmet: THE CODE · PRIJAVA REDAKCIJE · {{MAIL_CODE}}'),Spacer(1,5*mm),P('<b>Redakcija:</b> naziv, država, web, službena domena, odgovorni urednik i kontakt osoba.'),P('<b>Članovi tima:</b> najviše tri osobe - puno ime, funkcija, e-mail i telefon.'),P('<b>Putovanje:</b> opcija A - dostava ponude ili opcija B - organizator rezervira; polazni aerodrom, željeni letovi, prtljaga i posebne potrebe.'),P('<b>Intervjui:</b> teme, željeni sugovornici, format, trajanje i tehničke potrebe.'),Spacer(1,7*mm),bar('Šifra poziva mora biti navedena u predmetu, prijavi i svakoj daljnjoj poruci.',burg=True),PageBreak()]
story += [P('Poveznice i kontakt','H1x'),*bullets(['THE CODE: https://gnk-asg.hr/the-code/','Financije i korporativni podaci: https://gnk-asg.hr/','Globalna mreža: https://gnk-asg.hr/#network','Vijesti: https://gnk-asg.hr/vijesti/','Prijava redakcije: https://gnk-asg.hr/media-application/','Kontakt: https://gnk-asg.hr/contact/']),Spacer(1,8*mm),quote(['Najveća akvizicija u povijesti.','Više svjetskih kompanija. Jedan trenutak objave.'],'GNK DINAMO Ltd. Group · GNK ASG d.o.o.'),Spacer(1,8*mm),P('Nermin Sefic','H2x'),P('GNK DINAMO Ltd. Group / GNK ASG d.o.o.<br/>media@gnk-asg.hr<br/>www.gnk-asg.hr'),Spacer(1,5*mm),P('Napomena: program, lokacije i raspored intervjua mogu se prilagoditi operativnim, sigurnosnim i regulatornim zahtjevima. Projekcije budućeg rasta predstavljaju poslovni potencijal, a ne jamstvo rezultata.','Small')]
doc.build(story,onFirstPage=page,onLaterPages=page)
print(OUT,OUT.stat().st_size)
