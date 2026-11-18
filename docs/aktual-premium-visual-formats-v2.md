# AKTUAL MEDIA DESIGN — premium formats preserved, release track

Status: implementation in PR #468, **not** independently proven on the public VPS/Cloudflare site.

## Visual components (five forms)
1. **Cinematic cover / hero:** strong editorial hierarchy, contrast and deep blue/gold brand, responsive heading and legible data.
2. **Magazine-style source tiles:** varied desktop width, feature source and supporting publisher links. Source-directory tiles are not invented stories.
3. **Brief/reference modules:** compact credible source listings and simple country index, with keyboard-visible focus.
4. **Radio listening panel:** clearly linked AKTUAL Radio; never automatically plays external content or pretends a stream is live when untested.
5. **Global navigator:** search-friendly 201-country index with Croatian priority, one English counterpart per country, accessible mobile flow.

The additive CSS lives in \`aktual-world-premium-en-v1.css\` and \`aktual-world-page-a11y-v1.css\`. No changes to country article text, RSS provenance, sitemap entries or author attribution. CSS grid variants target existing page markup, so generator regeneration does not delete them.

**Don't lose PR #432 cinematic channel and business weekly work.** Its source files \`apps/region/engine/kanal-cinematic-v3.mjs\`, \`signal-desk-v1.css\`, \`signal-hub-v1.css\`, and channel-owned tests are separately protected from future whole-file generator replacement. Integrate with fresh main using narrowly scoped changes. All source images must have documented rights.

### Release gates

201 English country pages and 201 existing Croatian country pages are a structural milestone, not 402 independently newsworthy or indexed articles. No false breaking-news badge, no mass duplication, no invented updates. Only claim Google inclusion after Search Console evidence and successful crawl. Keep required sitemap, canonical, hreflang, OG/Twitter, footer, alt, responsive and accessibility tests. The exact SHA must pass all release gates before merge and production deployment; rollback is mandatory.
