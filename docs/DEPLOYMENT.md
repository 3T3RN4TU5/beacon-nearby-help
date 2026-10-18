# Deploying Beacon

Beacon is a static single-page app: `npm run build` produces a `dist/` folder that any static host can serve. There is **no backend, no database and no API keys**, so deployment is only about hosting files over HTTPS.

> **HTTPS is mandatory.** Browsers only allow geolocation on secure origins. Every host below gives you HTTPS for free.

## Accounts you need

| Account                                      | Needed for                                  | Cost         |
| -------------------------------------------- | ------------------------------------------- | ------------ |
| GitHub                                       | Code hosting, CI                            | Free         |
| Vercel _(recommended)_ — sign in with GitHub | Hosting, preview URL for every pull request | Free (Hobby) |
| _or_ nothing extra — GitHub Pages            | Hosting                                     | Free         |
| _or_ Cloudflare                              | Hosting (unlimited bandwidth)               | Free         |

None of the data APIs (Overpass, OSRM, Open-Meteo, OpenFreeMap, Nominatim, Photon) need an account.

---

## 1. Create the GitHub repository

Recommended name: **`beacon-nearby-help`** (the README badges assume `Jeevan2410/beacon-nearby-help`; edit them if you choose another name).

On github.com → **New repository** → name `beacon-nearby-help` → _Public_ → **do not** add a README, .gitignore or licence (the project has them) → **Create repository**.

Then, from the project folder:

```bash
git remote add origin https://github.com/Jeevan2410/beacon-nearby-help.git
git push -u origin main
```

GitHub Actions starts automatically: the **CI** workflow typechecks, lints, runs the unit tests, builds, then runs the Playwright end-to-end suite on desktop and mobile. Check the _Actions_ tab — both jobs should be green.

## 2a. Deploy on Vercel (recommended)

1. Go to <https://vercel.com/new> and **Continue with GitHub**.
2. **Import** `beacon-nearby-help`. Vercel reads `vercel.json`: framework _Vite_, build `npm run build`, output `dist`. Leave everything as is.
3. Click **Deploy**. In about a minute you get `https://beacon-nearby-help.vercel.app` (or similar).

From now on:

- every push to `main` → production deploy;
- every pull request → its own preview URL, posted on the PR;
- _Deployments → ⋯ → Promote / Instant Rollback_ to roll back in one click.

Security headers (CSP, Permissions-Policy, HSTS) and long-term caching for hashed assets come from `vercel.json`.

## 2b. Deploy on GitHub Pages (no extra account)

1. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**: `ENABLE_PAGES` = `true`.
3. Push to `main`, or run **Actions → Deploy to GitHub Pages → Run workflow**.

The site appears at `https://jeevan2410.github.io/beacon-nearby-help/`. The workflow builds with `BASE_PATH=/beacon-nearby-help/` so assets, the service worker and the PWA scope live under that path.

_Limitation:_ GitHub Pages can't send custom HTTP headers, so the CSP and HSTS from `vercel.json` aren't applied there. The app works the same; prefer Vercel or Cloudflare for the hardened setup.

## 2c. Deploy on Cloudflare Pages

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
2. Framework preset **None**, build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION` = `22`.
3. **Save and Deploy.**

`npm run build` writes `dist/_headers` from `vercel.json`, so Cloudflare (and Netlify) serve the same security headers.

## 3. Verify a deployment

Open the URL **on your phone** (GPS needs the real device):

- [ ] Landing shows the globe with night lights; **Locate me** asks for permission and flies to you.
- [ ] Cards fill in for hospital, police, pharmacy and fuel with minutes and distance.
- [ ] Tapping a card draws a route; **Navigate** opens your maps app.
- [ ] **Weather** shows conditions and any alerts; **SOS** shows your country's numbers.
- [ ] Browser menu → **Install app / Add to Home screen** works; reopen it in airplane mode and the last results are still there.
- [ ] Optional: Chrome DevTools → Lighthouse → _PWA_, _Accessibility_, _Best practices_.

## 4. Custom domain (optional)

Vercel: _Project → Settings → Domains → Add_ and follow the DNS instructions (a CNAME to `cname.vercel-dns.com`). HTTPS certificates are issued automatically. Cloudflare Pages and GitHub Pages have the same flow under _Custom domains_.

## 5. Day-to-day workflow

```bash
git switch -c feature/my-change
# …edit…
npm run check          # typecheck + lint + unit tests
npm run test:e2e       # optional locally; CI runs it on every PR
git commit -am "Describe the change"
git push -u origin feature/my-change
```

Open a pull request → CI runs → Vercel posts a preview URL → merge → production updates. Installed PWAs pick up the new version and offer a **Reload** prompt.

## 6. Running at scale

The free public services are donated capacity. If Beacon gets real traffic:

| Concern                              | Option                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overpass rate limits                 | Self-host Overpass (Docker image `wiktorn/overpass-api`) for your region, or a commercial Overpass provider; add it first in `OVERPASS_ENDPOINTS`. |
| OSRM demo server (1 req/s, car only) | Self-host OSRM (`osrm/osrm-backend`) per profile; update `OSRM_ENDPOINTS`.                                                                         |
| Open-Meteo commercial use            | Required paid plan for commercial apps; add the API key and host in `endpoints.ts`.                                                                |
| Nominatim usage policy               | Self-host or use a commercial geocoder for heavy use.                                                                                              |

---

## Release log

Kept up to date as the project develops, so you can see what each deployment contains.

**Production:** <https://beacon-nearby-help.vercel.app> — Vercel project `beacon-nearby-help`, linked to `Jeevan2410/beacon-nearby-help`; every push to `main` deploys automatically.

| Version | Date       | Highlights                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.2.0   | 2026-10-18 | QA release. Location now refines from the first rough fix to GPS accuracy and re-searches when corrected; "Approximate location" warning with a drag-the-map pin to set the exact spot; phone Back button steps back inside the app; re-locate spinner and error notices; iPhone alarm works without sound; units no longer flicker; WCAG 2.2 AA contrast fixes. 96 unit + 38 end-to-end runs incl. iPhone/WebKit and an accessibility gate. |
| 0.1.1   | 2026-10-18 | Live on Vercel. If the free map-data servers are slow (>10 s) or down, Beacon now offers "Call 112" and one-tap Google Maps searches for each category while it keeps retrying. 84 unit + 14 end-to-end tests.                                                                                                                                                                                                                               |
| 0.1.0   | 2026-10-18 | First release: one-tap nearest help (7 categories) ranked by road time, routes and turn-by-turn, 3D globe/map with NASA night lights, road-weather alerts and riding score, SOS (country numbers, location sharing, alarm, contacts, medical ID), offline PWA, strict CSP, 83 unit + 14 end-to-end tests, CI and three deployment targets.                                                                                                   |
