# AKTUAL MEDIA: 201 local editorial agents

This development-only pipeline allocates one editor-planning agent per country based on the canonical registry. Each desk targets 15 source-derived topics and 5 original drafts a day, while the Croatian desk targets 50 drafts (tenfold priority): a total goal of 1,050 drafts/day, not verified published stories.

Existing source registry: 201 countries, none currently meets 15 unique registered RSS feeds; Croatian feed registry has 11. Additional feeds must be manually checked for correctness, permitted use and uptime before adding. Never fabricate sources to hit 15.

RSS headlines and links are topic discovery inputs and not independent verification. A drafting evidence packet requires TWO independent original publisher URLs, explicit fact-to-source provenance, fresh checking dates and named human drafting approval. LLM text is only a private draft and may NOT auto-approve itself, insert source photos or copy full external articles. Final publication still needs a separate evidence-aware human review, licensing checks and publishing gate. No article pages, public sitemap or social media posts are created by this work.

Only actual independently published pages may appear in a sitemap. Localization must be verified per country; translations of our own verified stories may use reciprocal hreflang. GNK ASG, AKTUAL MEDIA, GNK DINAMO Ltd and Nermin Sefić must be represented truthfully, not spammed as irrelevant keywords.

This PR is not a production deployment. Only a verified full release CI and live VPS/Cloudflare URL plus SHA establishes deployment. Do not reuse exposed price.download API credentials.

Execution: node --test tests/test-aktual-original-201-desks-v1.mjs; node scripts/aktual-original-201-desk-plan-v1.mjs

## 21 broad thematic RSS discovery streams per country

The addition produces 21 query URLs per country (201 × 21 = 4,221 **possible topic discovery feeds**). Categories: politics, world, business, finance, markets, sports, football, technology, artificial intelligence, science, health, education, culture, fashion, lifestyle, travel, climate, energy, transport, local news and courts. Croatian discovery queries are in Croatian. Curated additional languages: English, German, Italian, French, Spanish, Portuguese, Slovenian, Serbian and Bosnian; remaining registry languages use English for RESEARCH SEARCH ONLY and require local-language verification before a local article is drafted.

**These 4,221 streams are NOT 4,221 independent publishers, verified online RSS sources, fetched feeds or publishable articles.** All use one Google News aggregator. Do not query all streams at once; rotate, prioritize HR, obey service limits and use independent original sources for fact checking. Each desk still reports exact independently registered provider counts and source shortfalls; 15 independent publishers are not yet achieved.
