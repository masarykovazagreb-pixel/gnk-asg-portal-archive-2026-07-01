import importlib.util
import pathlib
import unittest
import xml.etree.ElementTree as ET
spec = importlib.util.spec_from_file_location("sitemaps", pathlib.Path(__file__).resolve().parents[1] / "scripts/generate-sitemaps.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SitemapSearchPolicy(unittest.TestCase):
    def test_private(self):
        self.assertTrue(m.is_excluded("en/admin/"))
        self.assertTrue(m.is_excluded("en/api/"))
        self.assertFalse(m.is_excluded("en/gnk-aktual/"))
    def test_canonical(self):
        url = m.BASE_URL+"/gnk-aktual/"
        self.assertTrue(m.indexable_page(url, '<head><link href="/gnk-aktual/" rel="canonical"></head>'))
        self.assertFalse(m.indexable_page(url, '<head><link rel="canonical" href="https://operator.gnk-asg.hr/gnk-aktual/"></head>'))
        self.assertFalse(m.indexable_page(url, '<head>'+' '*5000+'<meta content="noindex" name="robots"></head>'))
        self.assertFalse(m.indexable_page(url, '<head><meta name="googlebot" content="none"></head>'))
        self.assertFalse(m.indexable_page(url, '<head><link rel="canonical" href=""></head>'))
    def test_unknown_modified(self):
        xml = m.render_urlset([(m.BASE_URL+"/gnk-aktual/",None,"main")])
        ET.fromstring(xml)
        self.assertNotIn("<lastmod>",xml)
if __name__ == "__main__":
    unittest.main()
