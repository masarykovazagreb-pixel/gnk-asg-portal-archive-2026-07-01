# Operativni završetak mail popravka

1. Spojiti granu `github-ui-security-fixes-20260621` u `experience-ai-live-overview`.
2. Postaviti `RESEND_API_KEY` ili `BREVO_API_KEY` kao Cloudflare secret za oba Workera:
   - `gnk-asg-mail-agent-preview`
   - `gnk-asg-contact-api`
3. Deploy:
   - `workers/gnk-asg-mail-agent-worker/wrangler.release.toml`
   - `workers/gnk-asg-contact-api/wrangler.toml`
4. Testirati:
   - Mail Studio prema vanjskoj adresi.
   - Kontakt formu prema vanjskoj adresi.
   - Internu obavijest na `rht@gmx.com`.
   - Neispravan token mora vratiti 401 i otvoriti sigurnu prijavu.
