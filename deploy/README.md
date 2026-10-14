# DPCO install runbook

Each DPCO gets its own copy of DPO Copilot on its own server and domain, run by us in a Nigerian data centre.
One install = one server running this folder's `docker-compose.yml`: the app, Postgres 16, Caddy (HTTPS),
ClamAV (upload scanning) and a daily reminder job. Firms never share a server or a database.

## What the install does differently from the shared site

Set by `SINGLE_FIRM=1` (already in `docker-compose.yml`):

- No marketing pages. `/` goes to sign-in, or to the user's dashboard if signed in.
- Sign-up works once, with the install's `SETUP_TOKEN`, to create the DPCO's firm. After that it is closed;
  everyone else joins by invitation from the Firm Admin.
- The DPCO's name (`BRAND_NAME`) and logo (`BRAND_LOGO`) replace DPO Copilot on sign-in, the workspace,
  the client portal, emails and the authenticator app entry.

## New install

Server: one Linux VM per DPCO in a Nigerian data centre (NDPA data residency, TRD Q-2); any provider that keeps the VM and its backups in Nigeria. Ubuntu 24.04, 2 vCPU, 4 GB RAM (ClamAV alone
needs ~1.5 GB), 40 GB disk, public IP with ports 80 and 443 open, Docker installed, backups/snapshots kept in Nigeria.

1. **DNS.** Ask the DPCO to add an `A` record for their subdomain (e.g. `compliance.theirfirm.ng`) pointing at
   the server's IP. Wait until it resolves: `dig +short compliance.theirfirm.ng`.
2. **Code.** Copy this repository to the server (e.g. `git clone`, then check out the release tag).
3. **Settings.** In `deploy/`: `cp .env.example .env`, fill in every value. Generate each secret with
   `openssl rand -hex 24`. Keep a copy of `.env` in the password manager under the DPCO's name.
4. **Logo.** Put the DPCO's logo in `deploy/brand/logo.png`. Use a light version: it sits on navy.
5. **Start.** From `deploy/`: `docker compose up -d --build`. Caddy gets the HTTPS certificate on first request.
6. **Check.** `https://<DOMAIN>/` shows the DPCO's logo on the sign-in page.
7. **Handover.** Send the DPCO's lead the link `https://<DOMAIN>/sign-up?token=<SETUP_TOKEN>`. They create the
   firm and become its Firm Admin (they must set up two-step sign-in). The link stops working once the firm exists.

## Updates

From `deploy/` on each server: `git pull` (or check out the new tag), then `docker compose up -d --build`.
The schema updates itself on start (`lib/schema.sql`). Do installs one at a time and check sign-in after each.

## Backups

- Database: `docker compose exec db pg_dump -U dpo dpo | gzip > dpo-$(date +%F).sql.gz`, daily, kept off-server
  in Nigeria (NFR5).
- Uploaded files: the `files` volume (`docker run --rm -v deploy_files:/f -v $PWD:/b alpine tar czf /b/files-$(date +%F).tgz -C /f .`).
- Test a restore on a spare server every quarter.

## Not done yet

- Email: messages are written to the app log only (`docker compose logs app | grep outbound`) until an email
  provider is connected (TRD FLAG-5). Invitations and reminders do not reach people until then.
- Regulatory content updates: the NDPA library, CAR template and policy templates are seeded on first start only.
  Shipping updates with each release is the next step.
