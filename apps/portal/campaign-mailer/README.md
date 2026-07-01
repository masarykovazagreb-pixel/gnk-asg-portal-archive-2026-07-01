# GNK ASG Campaign Mailer

Protected campaign-mail application for the GNK ASG portal at `/campaign-mailer/`.

The existing Mail Center and Media Command Center remain unchanged. Campaign contacts and state use D1, PDF attachments use R2, delivery uses the Cloudflare Email binding, and incoming-message metadata is recorded from Email Routing. The module supports spreadsheet import, personalization, controlled queueing, pause/resume/stop, retries, suppression checks and rate limits. No secret is stored in the frontend or repository.
