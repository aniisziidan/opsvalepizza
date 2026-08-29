# OpsVale Pre-Launch Runbook — provably-safe VPS launch

> ## ⚠️ ACTUAL DEPLOYMENT STATUS & TOPOLOGY (updated 2026-08-30)
> This runbook was originally written assuming a **Caddy** TLS profile. On the real VPS that is **not**
> the case — the corrections here take precedence over the Caddy-specific sections further down.
>
> **Real topology:** `Cloudflare (edge TLS) → host nginx (:80/:443) → opsvale-app 127.0.0.1:3010`.
> It's a **shared VPS** (also hosts an education platform on `*.opsvale.com` + `penguin-portfolio`).
> The bundled **Caddy profile is unused and cannot start** (nginx owns the ports). **Editing nginx has
> high blast radius — confirm before touching it.** Ignore the `--profile proxy` / `Caddyfile` /
> Let's-Encrypt-via-Caddy steps in §3; TLS is handled by Cloudflare's edge.
>
> **Status of the three blockers:**
> - ✅ **CRON** (§2) — `CRON_SECRET` set (64-char) + 3 jobs scheduled in root crontab (another
>   project's jobs preserved; crontab backed up). Endpoints proven 401-without / 200-with token.
> - ✅ **TLS / real client IP** — `TRUST_PROXY=true` set; the nginx `opsvale` vhost forwards
>   `X-Forwarded-For`/`X-Real-IP`. Public **HTTPS is live** via Cloudflare edge (`https://opsvale.com`).
> - ✅ **Country capture** — `opsvale.com` is already behind Cloudflare, which injects `CF-IPCountry`;
>   nginx forwards it; `TRUST_PROXY=true` lets the app read it. Verified end-to-end (test event → `EG`).
> - 🟡 **Legal identity** (§1) — the pages were SSG-baked; fixed to `force-dynamic` (PR #14) so they
>   read **live env**. VPS currently shows honest **`N/A`** (no fabricated KvK/VAT). **Remaining true
>   gate:** set real `COMPANY_*` in `.env.production` + `--force-recreate` the app **after registering
>   the entity — no image rebuild needed.**
>
> **Open (non-code):** decide pre-launch public exposure (site is live with N/A legal data); rotate any
> Cloudflare token shared in plaintext. Full record in memory `opsvale-tls-caddy-decision`.

> **Scope:** the three launch-blocking operational items from `COMPLETE_PROJECT_AUDIT.md` §37:
> **(1)** verified legal identity, **(2)** `CRON_SECRET` + scheduled cron jobs, **(3)** TLS termination.
> **TLS decision (~~locked~~ superseded — see banner above):** ~~the bundled Caddy `proxy` profile
> terminates HTTPS.~~ Actual TLS = **Cloudflare edge → host nginx**. The app binds `127.0.0.1:3010`;
> nginx (not Caddy) proxies it and Cloudflare provisions the public cert.
>
> **How to use this doc:** run top to bottom on the VPS. Every step ends with a **Proof** command
> whose *shown output* is the pass condition — "provably safe" means you saw the proof, not that you
> assume it. The final [Go / No-Go gate](#4-go--no-go-gate) is the single checklist to sign off.

All commands assume you are in the project root on the VPS (where `docker-compose.prod.yml` and
`deploy.sh` live) and that `.env.production` is the live env file the app container loads.

---

## 0. Preconditions (confirm once, before touching env)

| Check | Command | Pass condition |
|---|---|---|
| Correct host / project dir | `pwd && ls docker-compose.prod.yml deploy.sh Caddyfile` | all three files listed |
| DNS points at this VPS | `dig +short A opsvale.eu` (use your real domain) | returns this server's public IP |
| Ports 80/443 free on host | `sudo ss -ltnp '( sport = :80 or sport = :443 )'` | **empty** (nothing else bound — Caddy needs them) |
| App image present / pullable | `docker compose -f docker-compose.prod.yml pull app` | pulls without auth error |

> If ports 80/443 are already bound, another proxy is running — you are **not** on the Caddy path.
> Stop and re-decide TLS before continuing.

---

## 1. Verified legal identity (audit item #1)

**Why blocking:** `lib/legal/config.ts` ships built-in *placeholder* corporate details (KvK, VAT,
address, phone). `instrumentation.ts` logs a warning at boot if the verified values are unset **but
does not stop the server** — so the imprint/privacy/terms pages will silently serve fake legal data
unless you override them. Publishing an unverified KvK/VAT is a legal-compliance risk.

### 1.1 Set the verified values

Append your **real, verified** corporate details to `.env.production` (replace every value):

```bash
# --- Statutory legal entity (all six are REQUIRED; boot validation checks these) ---
COMPANY_LEGAL_NAME="<verified legal name, e.g. OpsVale B.V.>"
COMPANY_TRADING_NAME="<verified trading name>"
COMPANY_REGISTERED_ADDRESS="<verified registered address>"
COMPANY_REGISTRATION_NUMBER="<verified KvK/HRB/SIRET number>"
COMPANY_VAT_ID="<verified VAT ID>"
COMPANY_MANAGING_DIRECTOR="<verified managing director / board>"
LEGAL_CONTACT_EMAIL="<verified legal contact email>"
LEGAL_PHONE="<verified phone, optional but recommended>"

# --- Certification claims: opt-in, default false. Set to "true" ONLY with evidence on file ---
# EVIDENCE_FSC_CERTIFIED="true"
# EVIDENCE_FOOD_GRADE_1935_2004="true"
# EVIDENCE_EU_STORAGE_ONLY="true"
# EVIDENCE_ISO9001_CERTIFIED="true"
```

> **Do not** enable an `EVIDENCE_*` flag unless you can produce the certificate. Left unset, the site
> makes no claim (the safe default). This is the "zero unbacked claims" principle.

The six `COMPANY_*` / `LEGAL_CONTACT_EMAIL` fields are exactly what
`validateProductionLegalCompliance()` requires; `LEGAL_PHONE` and the `EVIDENCE_*` flags are not
required by the validator but are read by the imprint page.

### 1.2 Apply and prove

Recreate the app so it reloads env, then verify **both** the absence of the boot warning **and** the
rendered page:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps app

# Proof A — the legal-compliance warning must NOT appear:
docker compose -f docker-compose.prod.yml logs app | grep -i "legal-compliance" || echo "PASS: no legal-compliance warning"

# Proof B — the live imprint page shows YOUR values, not the placeholders:
curl -fsS https://opsvale.eu/en/imprint | grep -Ei "KvK|VAT|<your registration number>"
```

**Pass:** Proof A prints `PASS: no legal-compliance warning`; Proof B shows your verified
registration/VAT — and crucially **does not** show the placeholder `KvK 88392019` /
`NL883920190B01`.

> Quick negative check that the guard works: temporarily unset `COMPANY_VAT_ID`, restart the app, and
> confirm the `[legal-compliance] ... missing ... COMPANY_VAT_ID` warning appears. Re-set it before launch.

---

## 2. `CRON_SECRET` + scheduled jobs (audit item #2)

**Why blocking:** the cron routes **fail closed** — in production an unset `CRON_SECRET` makes them
return `401` (good, never unauthenticated), but that also means **the jobs never run** until you set
the secret *and* schedule them. Without scheduling: analytics data is never pruned (GDPR retention
breach over time), expired uploads accumulate, and anomaly alerts are never emitted.

The three jobs (all **`POST`**, all bound to `127.0.0.1:3010` on the host):

| Endpoint | Purpose | Suggested cadence |
|---|---|---|
| `/api/cron/prune-analytics` | GDPR retention purge of old analytics events/sessions | daily |
| `/api/cron/cleanup-uploads` | Delete expired temp uploads (24h TTL) | hourly |
| `/api/cron/detect-anomalies` | Emit traffic/conversion anomaly notifications (deduped) | hourly |

### 2.1 Set a strong secret

```bash
# generate + record it
openssl rand -hex 32
```

Set it in `.env.production` (replace the placeholder — do **not** leave the `.env.example` default):

```bash
CRON_SECRET="<the 64-char hex value you just generated>"
```

Apply:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps app
```

### 2.2 Schedule the jobs (host crontab)

Store the secret in a root-only file so it isn't inline in crontab:

```bash
sudo sh -c 'umask 077; printf "%s\n" "<the same CRON_SECRET>" > /etc/opsvale-cron.secret'
```

`sudo crontab -e` and add (adjust paths/log location as needed):

```cron
# OpsVale scheduled maintenance — talks to the app on loopback, bearer-authenticated
CRON_SECRET_FILE=/etc/opsvale-cron.secret

# Hourly: expired-upload cleanup + anomaly detection
17 * * * *  curl -fsS -X POST -H "Authorization: Bearer $(cat $CRON_SECRET_FILE)" http://127.0.0.1:3010/api/cron/cleanup-uploads  >> /var/log/opsvale-cron.log 2>&1
23 * * * *  curl -fsS -X POST -H "Authorization: Bearer $(cat $CRON_SECRET_FILE)" http://127.0.0.1:3010/api/cron/detect-anomalies >> /var/log/opsvale-cron.log 2>&1

# Daily 03:40: GDPR analytics retention purge
40 3 * * *  curl -fsS -X POST -H "Authorization: Bearer $(cat $CRON_SECRET_FILE)" http://127.0.0.1:3010/api/cron/prune-analytics  >> /var/log/opsvale-cron.log 2>&1
```

> `curl -f` makes the job fail (and log) on any non-2xx, so a broken secret surfaces in
> `/var/log/opsvale-cron.log` instead of failing silently.

### 2.3 Prove auth works (both directions)

```bash
# Proof A — no token is REJECTED (fail-closed): expect HTTP 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3010/api/cron/prune-analytics

# Proof B — correct token is ACCEPTED: expect HTTP 200 + {"success":true,...}
curl -fsS -X POST -H "Authorization: Bearer $(sudo cat /etc/opsvale-cron.secret)" \
  http://127.0.0.1:3010/api/cron/cleanup-uploads
```

**Pass:** Proof A prints `401`; Proof B prints a JSON body with `"success":true`.

---

## 3. TLS termination via Caddy profile (audit item #3 + TRUST_PROXY)

**Why blocking:** the app listens only on `127.0.0.1:3010` — with no proxy there is **no public
HTTPS at all**. Caddy terminates TLS, redirects `:80→:443`, and (critically) sets the
`X-Forwarded-For` / `X-Forwarded-Proto` headers the app relies on for correct client-IP rate
limiting.

### 3.1 Set the domain and trust the proxy

In `.env.production`:

```bash
DOMAIN="opsvale.eu"          # the real public hostname Caddy will get a cert for
APP_URL="https://opsvale.eu" # canonical URL used in emails/PDFs/sitemap — MUST be https and match
TRUST_PROXY="true"           # REQUIRED behind Caddy: honor X-Forwarded-For for rate-limit/geo
APP_ENV="production"         # enables HSTS + production behavior
```

> **`TRUST_PROXY=true` is mandatory on this path.** Left `false`, `getClientIp()` ignores
> `X-Forwarded-For` and every visitor collapses to `127.0.0.1` — rate limiting becomes global
> (one shared bucket) instead of per-client.

### 3.2 Start Caddy (opt-in profile)

```bash
# brings up app + postgres + caddy; --profile proxy is what starts Caddy
docker compose -f docker-compose.prod.yml --profile proxy up -d
```

> Re-run `deploy.sh` afterwards for normal deploys — but note `deploy.sh` does **not** pass
> `--profile proxy`, so it will not start/stop Caddy. Caddy, once up, keeps running
> (`restart: unless-stopped`). Keep the `--profile proxy up -d` command in your deploy notes so a
> full `down`/host reboot brings Caddy back.

### 3.3 Prove HTTPS, cert, HSTS, and redirect

```bash
# Proof A — valid public TLS cert + HTTP 200 over HTTPS
curl -sSI https://opsvale.eu/en | head -n 1        # expect: HTTP/2 200

# Proof B — HSTS header present (production only)
curl -sSI https://opsvale.eu/en | grep -i "strict-transport-security"
# expect: strict-transport-security: max-age=31536000; includeSubDomains

# Proof C — :80 redirects to :443
curl -sSI http://opsvale.eu/en | grep -iE "HTTP/|location"
# expect: 308/301 to https://opsvale.eu/...

# Proof D — cert chain is real (Let's Encrypt), not self-signed
echo | openssl s_client -servername opsvale.eu -connect opsvale.eu:443 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

**Pass:** A = `200`; B = the HSTS line; C = a 30x redirect to `https://`; D = issuer is Let's
Encrypt / ZeroSSL with a valid not-after date.

### 3.4 Prove the client IP actually flows through (rate-limit correctness)

The rate limiter keys off `getClientIp()`. Confirm real IPs reach the app by exceeding a low tier and
watching for a `429` keyed to your IP (calculator tier = 30 req / 60s):

```bash
# Proof — hammer the calculator; a 429 proves per-IP limiting is live behind the proxy
for i in $(seq 1 35); do \
  curl -s -o /dev/null -w "%{http_code} " -X POST https://opsvale.eu/api/calculator \
    -H 'content-type: application/json' -d '{}'; done; echo
# expect: a run of non-500 codes then 429s appearing near the tail
```

**Pass:** you see `429` responses — meaning the limiter is counting your real IP, not lumping
everyone into `127.0.0.1`.

### 3.5 Visitor-country capture via Cloudflare (required)

Capturing visitor country is a launch requirement. `resolveCountryFromHeaders()` reads
`cf-ipcountry` / `x-vercel-ip-country` / `x-country-code` / `x-geo-country` — vanilla Caddy sets none
of them, so **Cloudflare fronts the origin** to supply `CF-IPCountry` (and `CF-Connecting-IP` for the
true client IP). The `Caddyfile` is already wired to forward both to the app.

**Steps:**

1. **Add the domain to Cloudflare** and move the nameservers to Cloudflare (or add the zone if
   already there).
2. **Proxy the record** — set the `A`/`AAAA` record for the host to **Proxied (orange cloud)**.
   Cloudflare now injects `CF-IPCountry` and `CF-Connecting-IP` on every request.
3. **SSL/TLS mode → Full (strict)** (SSL/TLS → Overview). This keeps Caddy's real Let's Encrypt cert
   on the origin end-to-end. Ensure Cloudflare does **not** block `/.well-known/acme-challenge/*` so
   Caddy can still renew via HTTP-01 (default CF config allows it).
4. **Lock the origin firewall to Cloudflare IP ranges** on `:80`/`:443` (ufw/security-group), so no
   one can bypass Cloudflare and spoof `CF-Connecting-IP` / `CF-IPCountry`. Cloudflare publishes the
   ranges at `https://www.cloudflare.com/ips/`.
5. `TRUST_PROXY=true` (already set in §3.1) is what makes the app actually read these headers.

**Proof — country resolves end-to-end** (run from a machine with a known public country IP, i.e. a
real browser hitting the site, then check a stored analytics row):

```bash
# The header Cloudflare adds should be visible to the origin. Confirm Caddy forwards it:
curl -sSI https://opsvale.eu/en -H "CF-IPCountry: NL" >/dev/null   # (illustrative; real value comes from CF)

# Authoritative check — a freshly recorded analytics event carries a countryCode:
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U <user> -d <db> -tAc \
  "SELECT \"countryCode\", count(*) FROM \"AnalyticsEvent\" WHERE \"createdAt\" > now() - interval '1 hour' GROUP BY 1;"
```

**Pass:** recent analytics rows show real ISO country codes (e.g. `NL`, `DE`), not all `NULL`.

> **Alternative (no Cloudflare):** build a custom Caddy image with a MaxMind GeoIP2 module and set
> `header_up X-Country-Code {…}` from the GeoIP lookup. More moving parts (MaxMind licence, DB
> refresh, custom image in CI). Cloudflare is the recommended path and is what the shipped `Caddyfile`
> assumes.

---

## 4. Go / No-Go gate

Sign off only when **every** proof below has been *observed* (not assumed). This is the definition of
"provably safe."

| # | Item | Proof command | Pass condition | ✅ |
|---|---|---|---|---|
| 1a | Legal env set | `docker compose -f docker-compose.prod.yml logs app \| grep -i legal-compliance \|\| echo PASS` | `PASS` (no warning) | ☐ |
| 1b | Imprint shows real entity | `curl -fsS https://opsvale.eu/en/imprint \| grep -i "<your VAT>"` | your VAT shown; placeholder `NL883920190B01` **absent** | ☐ |
| 2a | Cron fails closed | `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3010/api/cron/prune-analytics` | `401` | ☐ |
| 2b | Cron accepts token | `curl -fsS -X POST -H "Authorization: Bearer $(sudo cat /etc/opsvale-cron.secret)" http://127.0.0.1:3010/api/cron/cleanup-uploads` | `"success":true` | ☐ |
| 2c | Jobs scheduled | `sudo crontab -l \| grep cron/` | 3 entries present | ☐ |
| 3a | Public HTTPS 200 | `curl -sSI https://opsvale.eu/en \| head -1` | `HTTP/2 200` | ☐ |
| 3b | HSTS present | `curl -sSI https://opsvale.eu/en \| grep -i strict-transport` | header returned | ☐ |
| 3c | :80→:443 redirect | `curl -sSI http://opsvale.eu/en \| grep -i location` | `https://` location | ☐ |
| 3d | Real cert | `openssl s_client ... \| openssl x509 -noout -issuer` (§3.3 Proof D) | Let's Encrypt / ZeroSSL | ☐ |
| 3e | Per-IP rate limit live | §3.4 loop | `429`s appear | ☐ |
| 3f | Country capture live | §3.5 psql query on `AnalyticsEvent` | recent rows show real ISO codes (not all `NULL`); origin firewalled to Cloudflare IPs | ☐ |

**Also confirm the baseline deploy invariants (already shipped, verify they held):**

- `deploy.sh` ran `prisma migrate deploy` (not `db push`) and wrote a fresh `backups/db-*.sql.gz`.
- `AUTH_SECRET`, `POSTGRES_PASSWORD` are strong and **not** the `.env.example` defaults.
- `RESEND_API_KEY` (or SMTP creds) set, so customer/quote emails actually send.

---

## 5. Rollback / recovery quick reference

- **Bad deploy:** `IMAGE_TAG=<previous-good-sha> bash deploy.sh` pins/rolls back the image.
- **DB restore:** stop app, `gunzip -c backups/db-<stamp>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U <user> -d <db>` (full runbook in `DEPLOYMENT.md`).
- **TLS won't provision:** check `docker compose -f docker-compose.prod.yml logs caddy` — usual causes are DNS not yet propagated or ports 80/443 not reachable from the internet (firewall). Let's Encrypt needs inbound `:80`.
- **Everyone rate-limited / geo blank:** verify `TRUST_PROXY=true` is actually in the running container: `docker compose -f docker-compose.prod.yml exec app printenv TRUST_PROXY`.
