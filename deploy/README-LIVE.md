# Live demo (Docker + Cloudflare quick tunnel)

Local dev (npm run dev / uvicorn) ekata **kisima wenasak na**. Meka eka paththak.

## Start
```powershell
.\deploy\start-live.ps1          # first time build ~30-40 min (internet speed), next times 1-2 min
.\deploy\start-live.ps1 -NoBuild # code wenas nathnam, build skip
```
Iwara unama link eka print wenawa, `deploy\LIVE_URL.txt` ekatath save wenawa (https://xxxx.trycloudflare.com).

## Stop
```powershell
.\deploy\stop-live.ps1
```

## Danaganna ona deval
- Link eka **start karana hama parak wenas wenawa** (quick tunnel). Viva ekata kalin start karala link eka ganna.
- Laptop eka on + awake wenna ona (Sleep off karanna). Internet nathnam site eka wada na.
- Docker Desktop run wenna ona.
- Data: containers use karanne Docker Postgres (`jobportal_postgres`, volume `linkedge_postgres_data`). Windows Postgres service ekath 5432 use karanawa nam, eka wena DB ekak.
- Uploads (CV / images): `backend/auth-service/uploads` saha `backend/application-service/uploads` folders walata save wenawa.
- Google sign-in: random domain eka Firebase "Authorized domains" walata danna bari nisa fail wenna puluwan. Email login wada karanawa.
- ATS service public naha (internal only).
- Backup: viva ekata kalin demo video ekak record karaganna.

## Logs
```powershell
docker compose -f deploy\docker-compose.live.yml ps
docker compose -f deploy\docker-compose.live.yml logs --tail 50 auth-service
```

## Cloudflare R2 (images)
- Live stack eke profile photos, company logos, cover images, site banners **Cloudflare R2** (skillsync-files bucket) ekata yanawa. Settings deploy/secrets.env eke (git ignore, GitHub ekata yanne na). Local dev (npm run dev) ekata STORAGE_DRIVER danne na, eka local disk use karanawa.
- CV files private, R2 ekata yanne na (server eke uploads folder ekata).
- Bucket eka public (r2.dev URL) images witharai. Production ekata custom domain ekak connect karanna.
- deploy/secrets.env nathnam (aluth PC) R2 dashboard eken aluth API token ekak hadala meka ayeth hadanna: STORAGE_DRIVER=s3, S3_BUCKET, S3_REGION=auto, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL.

## Email
- Dan Gmail SMTP use karanawa (notification-service .env). Brevo sender info.linkedge@gmail.com verified. Brevo ekata marenna: Brevo > SMTP & API > Generate SMTP key, passe notification-service .env eke SMTP_HOST=smtp-relay.brevo.com, SMTP_PORT=587, SMTP_USER=<Brevo SMTP login>, SMTP_PASS=<SMTP key> danna.
