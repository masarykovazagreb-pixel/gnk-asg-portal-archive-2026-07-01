#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

PAGE_W, PAGE_H = A4
NAVY = colors.HexColor('#020812')
NAVY_2 = colors.HexColor('#09284A')
BLUE = colors.HexColor('#2E9CFF')
GOLD = colors.HexColor('#D7AA3C')
LIGHT_GOLD = colors.HexColor('#FFE092')
TEXT = colors.HexColor('#1C2836')
MUTED = colors.HexColor('#5D6B7A')
LIGHT = colors.HexColor('#F3F6FA')
BORDER = colors.HexColor('#D7DEE8')
WHITE = colors.HexColor('#F8FAFC')
GREEN = colors.HexColor('#31D47C')
RED = colors.HexColor('#C44141')
FONT_REGULAR = 'GNKDejaVu'
FONT_BOLD = 'GNKDejaVu-Bold'


def register_fonts() -> None:
    regular_candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    bold_candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
    ]
    regular = next((Path(p) for p in regular_candidates if Path(p).exists()), None)
    bold = next((Path(p) for p in bold_candidates if Path(p).exists()), None)
    if not regular or not bold:
        raise SystemExit('Required system fonts are unavailable')
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(regular)))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(bold)))


class InvariantCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('invariant', 1)
        kwargs.setdefault('pageCompression', 1)
        super().__init__(*args, **kwargs)
        self.setTitle('GNK ASG Media Invitation and Application Information - New York 2026')
        self.setAuthor('GNK ASG Media Relations')
        self.setSubject('Bilingual media invitation and application information')
        self.setKeywords('GNK ASG, media invitation, New York, press, application')


def draw_footer(c: canvas.Canvas, page_no: int) -> None:
    c.saveState()
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.35)
    c.line(18 * mm, 13 * mm, PAGE_W - 18 * mm, 13 * mm)
    c.setFont(FONT_REGULAR, 7.4)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, 8.2 * mm, 'GNK ASG Media Relations  |  media@gnk-asg.hr  |  New York 2026')
    c.drawRightString(PAGE_W - 18 * mm, 8.2 * mm, str(page_no))
    c.restoreState()


def draw_cover(c: canvas.Canvas, doc: BaseDocTemplate) -> None:
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2.2)
    c.circle(PAGE_W - 36 * mm, PAGE_H - 34 * mm, 44 * mm, fill=0, stroke=1)
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.0)
    c.circle(PAGE_W - 30 * mm, PAGE_H - 28 * mm, 29 * mm, fill=0, stroke=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.line(20 * mm, PAGE_H - 63 * mm, PAGE_W - 20 * mm, PAGE_H - 63 * mm)
    c.setFont(FONT_BOLD, 34)
    c.setFillColor(WHITE)
    c.drawString(20 * mm, PAGE_H - 35 * mm, 'GNK ASG')
    c.setFont(FONT_BOLD, 16)
    c.setFillColor(LIGHT_GOLD)
    c.drawString(20 * mm, PAGE_H - 46 * mm, 'MEDIA RELATIONS')
    c.setFont(FONT_REGULAR, 12)
    c.setFillColor(colors.HexColor('#9FC7EE'))
    c.drawString(20 * mm, PAGE_H - 56 * mm, 'NEW YORK 2026')
    c.restoreState()
    draw_footer(c, doc.page)


def draw_inner(c: canvas.Canvas, doc: BaseDocTemplate) -> None:
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 18 * mm, PAGE_W, 18 * mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(18 * mm, PAGE_H - 11.2 * mm, 'GNK ASG MEDIA RELATIONS')
    c.setFillColor(LIGHT_GOLD)
    c.setFont(FONT_REGULAR, 8.5)
    c.drawRightString(PAGE_W - 18 * mm, PAGE_H - 11.2 * mm, 'NEW YORK 2026')
    c.restoreState()
    draw_footer(c, doc.page)


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CoverTitle', fontName=FONT_BOLD, fontSize=22, leading=26, textColor=WHITE, alignment=TA_CENTER, spaceAfter=3 * mm))
    styles.add(ParagraphStyle(name='CoverSub', fontName=FONT_BOLD, fontSize=14, leading=18, textColor=GOLD, alignment=TA_CENTER, spaceAfter=8 * mm))
    styles.add(ParagraphStyle(name='Section', fontName=FONT_BOLD, fontSize=16, leading=20, textColor=NAVY_2, spaceBefore=2 * mm, spaceAfter=2.5 * mm))
    styles.add(ParagraphStyle(name='Subsection', fontName=FONT_BOLD, fontSize=11.5, leading=15, textColor=NAVY_2, spaceBefore=2.5 * mm, spaceAfter=2 * mm))
    styles.add(ParagraphStyle(name='BodyGNK', fontName=FONT_REGULAR, fontSize=9.4, leading=14, textColor=TEXT, spaceAfter=2.5 * mm))
    styles.add(ParagraphStyle(name='BulletGNK', fontName=FONT_REGULAR, fontSize=9.1, leading=13.2, textColor=TEXT, leftIndent=5 * mm, firstLineIndent=-3.5 * mm, spaceAfter=1.4 * mm, bulletIndent=0))
    styles.add(ParagraphStyle(name='Small', fontName=FONT_REGULAR, fontSize=7.8, leading=10.5, textColor=MUTED))
    styles.add(ParagraphStyle(name='CoverMetaLabel', fontName=FONT_BOLD, fontSize=7.6, leading=10.2, textColor=LIGHT_GOLD))
    styles.add(ParagraphStyle(name='CoverMetaValue', fontName=FONT_BOLD, fontSize=8.4, leading=11.2, textColor=WHITE))
    styles.add(ParagraphStyle(name='BoxHead', fontName=FONT_BOLD, fontSize=9.4, leading=12, textColor=NAVY_2, spaceAfter=1.5 * mm))
    styles.add(ParagraphStyle(name='BoxBody', fontName=FONT_REGULAR, fontSize=8.8, leading=12.5, textColor=TEXT))
    return styles


def info_box(styles, heading: str, body: str, fill, accent):
    data = [[Paragraph(heading, styles['BoxHead'])], [Paragraph(body, styles['BoxBody'])]]
    table = Table(data, colWidths=[165 * mm], hAlign='CENTER')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), fill),
        ('LEFTPADDING', (0, 0), (-1, -1), 5 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5 * mm),
        ('TOPPADDING', (0, 0), (-1, 0), 3 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 0.5 * mm),
        ('TOPPADDING', (0, 1), (-1, 1), 0.5 * mm),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 3 * mm),
        ('LINEBEFORE', (0, 0), (0, -1), 4, accent),
        ('BOX', (0, 0), (-1, -1), 0.3, colors.Color(accent.red, accent.green, accent.blue, alpha=0.35)),
    ]))
    return KeepTogether([table, Spacer(1, 3 * mm)])


def numbered_items(styles, items):
    return [Paragraph(f'<b>{i}.</b> {item}', styles['BulletGNK']) for i, item in enumerate(items, 1)]


def bullet_items(styles, items):
    return [Paragraph(f'• {item}', styles['BulletGNK']) for item in items]


def build_pdf(output: Path) -> None:
    register_fonts()
    styles = build_styles()
    doc = BaseDocTemplate(str(output), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=24 * mm, bottomMargin=18 * mm, title='GNK ASG Media Invitation and Application Information - New York 2026', author='GNK ASG Media Relations', subject='Bilingual media invitation and application information')
    cover_frame = Frame(18 * mm, 18 * mm, PAGE_W - 36 * mm, PAGE_H - 88 * mm, id='cover')
    inner_frame = Frame(18 * mm, 18 * mm, PAGE_W - 36 * mm, PAGE_H - 44 * mm, id='inner')
    doc.addPageTemplates([PageTemplate(id='cover', frames=[cover_frame], onPage=draw_cover), PageTemplate(id='inner', frames=[inner_frame], onPage=draw_inner)])

    story = [Spacer(1, 72 * mm), Paragraph('MEDIA INVITATION &amp; APPLICATION INFORMATION', styles['CoverTitle']), Paragraph('POZIV MEDIJIMA I INFORMACIJE O PRIJAVI', styles['CoverSub'])]
    summary = [
        [Paragraph('Application deadline / Rok prijave', styles['CoverMetaLabel']), Paragraph('20 July 2026, 23:59 CEST / 20. srpnja 2026. u 23:59 CEST', styles['CoverMetaValue'])],
        [Paragraph('Application mailbox / Adresa za prijavu', styles['CoverMetaLabel']), Paragraph('media@gnk-asg.hr', styles['CoverMetaValue'])],
        [Paragraph('Programme location / Lokacija programa', styles['CoverMetaLabel']), Paragraph('New York, United States / New York, Sjedinjene Američke Države', styles['CoverMetaValue'])],
    ]
    summary_table = Table(summary, colWidths=[56 * mm, 109 * mm], hAlign='CENTER')
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 3 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2 * mm),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#06182A')), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#33506B')),
    ]))
    story += [summary_table, Spacer(1, 7 * mm), info_box(styles, 'Important / Važno', 'Receipt of a complete application does not constitute automatic approval. Zaprimanje potpune prijave ne znači automatsko odobrenje. Final decisions are made by an authorized person after human verification.', colors.HexColor('#EEF5FB'), BLUE), Spacer(1, 8 * mm), Paragraph('<b>GNK ASG Media Relations</b>', ParagraphStyle('CoverBrand', parent=styles['BodyGNK'], alignment=TA_CENTER, fontSize=10.5, textColor=NAVY_2)), PageBreak()]
    doc.handle_nextPageTemplate('inner')

    story += [Paragraph('1. POZIV REDAKCIJAMA', styles['Section']), Paragraph('Sažetak uvjeta za hrvatski / regionalni jezik', styles['Small']), Spacer(1, 2 * mm), Paragraph('GNK ASG poziva odabrane redakcije da prijave svojeg predstavnika za sudjelovanje i medijsko praćenje programa u New Yorku. Prijava mora biti poslana s profesionalnog redakcijskog kanala i sadržavati referentnu šifru iz poziva.', styles['BodyGNK']), info_box(styles, 'Troškovi i smještaj', 'Putovanje, smještaj i drugi razumni, dokumentirani i unaprijed pisano odobreni troškovi neposredno povezani sa sudjelovanjem i izvještavanjem pokriva organizator. Smještaj u New Yorku već je rezerviran i plaćen.', colors.HexColor('#FFF8E7'), GOLD), Paragraph('Obvezni podaci u prijavi', styles['Subsection'])]
    story += numbered_items(styles, ['Puni naziv redakcije/medija, država i službena web-stranica.', 'Ime i prezime prijavljenog predstavnika, funkcija i odjel.', 'Službeni e-mail i mobitel/WhatsApp s međunarodnim pozivnim brojem.', 'Podaci odgovornog urednika ili druge osobe koja potvrđuje angažman.', 'Izjava da se osoba prijavljuje u ime navedene redakcije.', 'Grad polaska, željena zračna luka i očekivani datumi putovanja.', 'Opis drugih očekivanih troškova, ako postoje, radi prethodnog pisanog odobrenja.'])
    story.append(Paragraph('Obvezni prilozi', styles['Subsection']))
    story += bullet_items(styles, ['Potpisano pismo redakcijskog angažmana na službenom memorandumu.', 'Važeća novinarska iskaznica ili poveznice na recentne objavljene radove.', 'Izdana avionska karta, potvrđena rezervacija/itinerar ili predračun/ponuda za let.', 'Procjena drugih troškova, ako se traže.'])
    story += [Spacer(1, 2 * mm), info_box(styles, 'Zaštita osobnih podataka', 'U početnoj fazi nemojte običnim e-mailom slati presliku putovnice. Ako podaci budu potrebni radi rezervacije ili putnog/viznog postupka, zatražit će se naknadno sigurnim kanalom samo od odabranih predstavnika.', colors.HexColor('#FDEEEE'), RED), PageBreak()]

    story += [Paragraph('2. NEWSROOM INVITATION', styles['Section']), Paragraph('Summary of requirements for international media', styles['Small']), Spacer(1, 2 * mm), Paragraph('GNK ASG invites selected newsrooms to nominate a representative for participation in and media coverage of the programme in New York. The application must be sent through a professional newsroom channel and must include the invitation reference code.', styles['BodyGNK']), info_box(styles, 'Travel, accommodation and approved costs', 'Travel, accommodation and other reasonable, documented and pre-approved costs directly related to attendance and reporting are covered by the organizer. Accommodation in New York has already been reserved and paid.', colors.HexColor('#FFF8E7'), GOLD), Paragraph('Required application information', styles['Subsection'])]
    story += numbered_items(styles, ['Full newsroom/media name, country and official website.', "Applicant's full name, role/title and department.", 'Official email address and mobile/WhatsApp number with international country code.', "Responsible editor's or assignment authority's contact details.", 'Declaration that the applicant is nominated on behalf of the stated newsroom.', 'City of departure, preferred airport and expected travel dates.', 'Description and estimate of any additional expected costs requiring prior approval.'])
    story.append(Paragraph('Mandatory attachments', styles['Subsection']))
    story += bullet_items(styles, ['Signed newsroom assignment letter on official letterhead.', 'Valid press credential or links to recent published work.', 'Issued airline ticket, confirmed booking/itinerary, or flight pro forma invoice/quotation.', 'Estimate of any other expected costs, where applicable.'])
    story += [Spacer(1, 2 * mm), info_box(styles, 'Privacy and document security', 'Do not send a passport copy by ordinary email at the initial stage. If passport data are required for booking or travel/visa processing, they will be requested later through a secure channel and only from selected representatives.', colors.HexColor('#FDEEEE'), RED), PageBreak()]

    story += [Paragraph('3. APPLICATION EMAIL TEMPLATE / PREDLOŽAK PRIJAVE', styles['Section']), info_box(styles, 'Subject / Predmet', '[INVITATION REFERENCE CODE / ŠIFRA POZIVA] MEDIA APPLICATION - [MEDIA OUTLET]', colors.HexColor('#EEF5FB'), BLUE)]
    fields = ['Reference code / Šifra poruke', 'Media outlet / Redakcija-medij', 'Country / Država', 'Official website / Službena web-stranica', 'Applicant full name / Ime i prezime', 'Applicant role and department / Funkcija i odjel', 'Applicant official email / Službeni e-mail', 'Applicant mobile/WhatsApp / Mobitel', 'Responsible editor full name / Ime urednika', 'Editor role / Funkcija urednika', 'Editor official email / E-mail urednika', 'Editor mobile / Mobitel urednika', 'Departure city / Grad polaska', 'Preferred airport / Željena zračna luka', 'Expected travel dates / Datumi putovanja', 'Other expected costs / Ostali troškovi']
    rows = [[Paragraph('<b>Field / Polje</b>', styles['Small']), Paragraph('<b>Information / Podatak</b>', styles['Small'])]] + [[Paragraph(f'<b>{field}</b>', styles['Small']), Paragraph(' ', styles['Small'])] for field in fields]
    form = Table(rows, colWidths=[78 * mm, 87 * mm], repeatRows=1, hAlign='CENTER')
    style_cmds = [('BACKGROUND', (0, 0), (-1, 0), NAVY_2), ('TEXTCOLOR', (0, 0), (-1, 0), WHITE), ('GRID', (0, 0), (-1, -1), 0.35, BORDER), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 2.2 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 2.2 * mm), ('TOPPADDING', (0, 0), (-1, -1), 1.25 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 1.25 * mm)]
    for row_no in range(2, len(rows), 2): style_cmds.append(('BACKGROUND', (0, row_no), (-1, row_no), LIGHT))
    form.setStyle(TableStyle(style_cmds))
    story += [form, Spacer(1, 3 * mm), info_box(styles, 'Newsroom declaration / Izjava redakcije', 'We confirm that the named applicant is nominated and applies on behalf of the stated newsroom. Potvrđujemo da se navedena osoba prijavljuje i nastupa u ime navedene redakcije.', colors.HexColor('#EEF8F1'), GREEN), info_box(styles, 'Send to / Poslati na', 'media@gnk-asg.hr  |  Deadline / Rok: 20 July 2026, 23:59 CEST', colors.HexColor('#FFF8E7'), GOLD)]
    doc.build(story, canvasmaker=InvariantCanvas)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?', default='GNK_ASG_Media_Invitation_New_York_2026_HR_EN.pdf')
    args = parser.parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(output)


if __name__ == '__main__':
    main()
