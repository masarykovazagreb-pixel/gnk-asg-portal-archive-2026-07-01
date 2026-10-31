#!/usr/bin/env python3
"""Regresijski testovi HTML metapodataka skenera kvalitete."""
import unittest
from quality_scan_v1 import parse_metadata


class MetadataTest(unittest.TestCase):
    def test_attribute_order_quotes_and_entities(self):
        p = parse_metadata("""<HTML LANG='hr'><head><TITLE>A &amp; B</TITLE>
          <meta content='Opis &amp; vijest' name='description'>
          <link href='/x' rel='alternate canonical'>
          <meta content='NOINDEX,follow' name='robots'>
          </head><h1>Važan <em>naslov</em></h1>""")
        self.assertTrue(p.lang and p.canonical and p.noindex)
        self.assertEqual((p.title, p.desc, p.h1), ('A & B', 'Opis & vijest', 'Važan naslov'))

    def test_comments_and_javascript_do_not_create_metadata(self):
        p = parse_metadata('''<!-- <html lang="hr"><link rel="canonical"> -->
          <script>const x = '<meta name="robots" content="noindex">';</script>''')
        self.assertFalse(p.lang or p.canonical or p.noindex)

    def test_json_ld_valid_and_invalid(self):
        p = parse_metadata('''<script id='one' type='application/ld+json'>{"name":"ok"}</script>
          <script type="application/ld+json" id="two">{broken}</script>
          <script type='application/ld+json'>not json</script>''')
        self.assertEqual(p.bad_ld, 2)

    def test_empty_lang_and_googlebot(self):
        p = parse_metadata('<html lang=" "><meta content="noindex, nofollow" name="googlebot">')
        self.assertFalse(p.lang)
        self.assertTrue(p.noindex)

    def test_first_title_and_heading(self):
        p = parse_metadata('<title>Prvi</title><title>Drugi</title><h1>Jedan</h1><h1>Dva</h1>')
        self.assertEqual((p.title, p.h1), ('Prvi', 'Jedan'))


if __name__ == '__main__':
    unittest.main()
