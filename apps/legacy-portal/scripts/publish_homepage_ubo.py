#!/usr/bin/env python3
"""Publish visible UBO identification on the HR and EN portal homepages.

The homepage must transparently disclose Nermin Sefić as the ultimate beneficial
owner of GNK ASG d.o.o. and of the GNK DINAMO Ltd. group presentation. The step
is idempotent and can run after SEO regeneration without duplicating fields.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HR_ASG_ANCHOR = '<div class="fact"><dt>Direktor</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'
HR_ASG_UBO = '<div class="fact"><dt>Stvarni vlasnik / UBO</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'
HR_GROUP_ANCHOR = '<div class="fact"><dt>Ovlašteni predstavnik</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'
HR_GROUP_UBO = '<div class="fact"><dt>Stvarni vlasnik / UBO grupe</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'

EN_ASG_ANCHOR = '<div class="fact"><dt>Director</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'
EN_ASG_UBO = '<div class="fact"><dt>Ultimate beneficial owner / UBO</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'
EN_GROUP_ANCHORS = [
    '<div class="fact"><dt>Authorized representative</dt><dd>Nermin Sefić</dd></div>',
    '<div class="fact"><dt>Authorized representative</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>',
    '<div class="fact"><dt>Authorised representative</dt><dd>Nermin Sefić</dd></div>',
    '<div class="fact"><dt>Authorised representative</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>',
]
EN_GROUP_UBO = '<div class="fact"><dt>Ultimate beneficial owner / UBO of the group</dt><dd><a href="nermin-sefic/">Nermin Sefić</a></dd></div>'

HR_PERSON_MARKER = '"jobTitle":"Direktor GNK ASG d.o.o. i ovlašteni predstavnik GNK DINAMO Ltd.","worksFor"'
HR_PERSON_REPLACEMENT = '"jobTitle":"Direktor GNK ASG d.o.o. i ovlašteni predstavnik GNK DINAMO Ltd.","description":"Nermin Sefić je na portalu prikazan kao direktor i stvarni vlasnik / UBO društva GNK ASG d.o.o. te stvarni vlasnik / UBO GNK DINAMO Ltd. grupnog okvira.","worksFor"'

EN_PERSON_MARKER = '"jobTitle":"Director of GNK ASG d.o.o. and authorised representative of GNK DINAMO Ltd.","worksFor"'
EN_PERSON_REPLACEMENT = '"jobTitle":"Director of GNK ASG d.o.o. and authorised representative of GNK DINAMO Ltd.","description":"Nermin Sefić is presented on the portal as director and ultimate beneficial owner / UBO of GNK ASG d.o.o. and as ultimate beneficial owner / UBO of the GNK DINAMO Ltd. group framework.","worksFor"'


def insert_after(text: str, anchor: str, insertion: str) -> str:
    if insertion in text:
        return text
    if anchor not in text:
        raise RuntimeError(f'Required homepage anchor was not found: {anchor}')
    return text.replace(anchor, anchor + insertion, 1)


def update_hr() -> None:
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8')
    text = insert_after(text, HR_ASG_ANCHOR, HR_ASG_UBO)
    text = insert_after(text, HR_GROUP_ANCHOR, HR_GROUP_UBO)
    if HR_PERSON_MARKER in text and HR_PERSON_REPLACEMENT not in text:
        text = text.replace(HR_PERSON_MARKER, HR_PERSON_REPLACEMENT)
    path.write_text(text, encoding='utf-8')


def update_en() -> None:
    path = ROOT / 'en/index.html'
    text = path.read_text(encoding='utf-8')
    text = insert_after(text, EN_ASG_ANCHOR, EN_ASG_UBO)
    if EN_GROUP_UBO not in text:
        for anchor in EN_GROUP_ANCHORS:
            if anchor in text:
                text = text.replace(anchor, anchor + EN_GROUP_UBO, 1)
                break
        else:
            raise RuntimeError('Required English GNK DINAMO Ltd. representative anchor was not found.')
    if EN_PERSON_MARKER in text and EN_PERSON_REPLACEMENT not in text:
        text = text.replace(EN_PERSON_MARKER, EN_PERSON_REPLACEMENT)
    path.write_text(text, encoding='utf-8')


def main() -> None:
    update_hr()
    update_en()


if __name__ == '__main__':
    main()
