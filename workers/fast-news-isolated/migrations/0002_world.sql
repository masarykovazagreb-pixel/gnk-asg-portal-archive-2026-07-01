CREATE TABLE IF NOT EXISTS fast_news_world_cache (country TEXT PRIMARY KEY, updated_at TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS fast_news_edition ON fast_news_articles (json_extract(payload,'$.country'),json_extract(payload,'$.language'),published_at DESC);
