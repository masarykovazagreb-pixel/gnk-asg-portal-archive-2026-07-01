# GNK ASG Campaign Mailer

Isolated addition for the GNK ASG portal at `/campaign-mailer/`.

- Existing `/mail-studio/` and `/media-command-center/` modules are preserved.
- Access is protected through the existing administrator session.
- No SMTP password, API key, `.env` file or other secret is stored in this directory.
- The route uses the existing Cloudflare Worker and asset binding.
- Production deployment is not performed by this branch alone.
