CREATE TABLE IF NOT EXISTS fast_news_articles (slug TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, published_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS fast_news_published ON fast_news_articles (published_at DESC, slug ASC);
