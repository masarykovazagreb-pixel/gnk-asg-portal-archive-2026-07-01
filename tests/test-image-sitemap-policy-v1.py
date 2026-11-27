import importlib.util
import pathlib
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("image_sitemap", pathlib.Path(__file__).resolve().parents[1] / "scripts/generate-image-sitemap.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class ImageSitemapPolicy(unittest.TestCase):
    def test_canonical_and_private(self):
        u = m.BAZA + "/vijest/"
        self.assertTrue(m.eligible_page(u, '<head><link href="/vijest/" rel="canonical"></head>'))
        self.assertFalse(m.eligible_page(u, '<head><link rel="canonical" href="/other/"></head>'))
        self.assertFalse(m.eligible_page(u, '<head>' + ' '*5000 + '<meta content="noindex" name="robots"></head>'))
        self.assertFalse(m.eligible_page(u, '<head><meta name="googlebot-image" content="noimageindex"></head>'))
        self.assertFalse(m.eligible_page(m.BAZA + "/en/admin/", '<head></head>'))
    def test_images(self):
        u = m.BAZA + "/vijest/"
        self.assertEqual(m.apsolutna("/assets/a.avif",u),m.BAZA+"/assets/a.avif")
        self.assertIsNone(m.apsolutna("https://gnk-asg.hr.example.com/a.jpg",u))
        self.assertIsNone(m.apsolutna("/%2e%2e/secret.jpg",u))
        self.assertIsNone(m.apsolutna("/admin/a.jpg",u))
        xml = m.ispisi({u:[(m.BAZA+"/assets/a.jpg?x=1&y=2","<& description")]})
        ET.fromstring(xml)
        self.assertNotIn("image:title",xml)
        self.assertIn("&amp;",xml)

if __name__ == "__main__":
    unittest.main()
