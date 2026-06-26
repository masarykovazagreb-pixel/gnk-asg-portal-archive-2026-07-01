# GNK ASG Verified News V16

## Public contract

- Refresh schedule: 09:00, 16:00 and 21:00 Europe/Zagreb.
- Configured sources: 26.
- Minimum verified fresh links per successful cycle: 15.
- Public active set: up to 100 items.
- Required fields: title, text summary of at least 60 characters, named source, original article URL and real source image.
- Article URL and image URL must both pass server-side verification.
- Placeholder and fallback images are forbidden in the public set.

## Archive contract

- Hard capacity: 1000 records.
- Cleanup threshold: 900 records.
- Cleanup action: retain the newest 450 and delete the oldest 450 or more, depending on the exact pre-cleanup count.

## Storage

- Active set: KV key `data:news:external`.
- Archive container: KV key `data:news:archive`.
- Last refresh status: KV key `automation:news-refresh:last`.

## Rendering

- Croatian: `/vijesti/`.
- English: `/news/`.
- Renderer: `/assets/business-news-v16.js`.
- The renderer removes a card if its image cannot load or is below the minimum usable dimensions.
