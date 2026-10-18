# Changelog

All notable changes to Beacon are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-10-18

QA pass across desktop Chrome, Android and iPhone (WebKit), plus an automated WCAG 2.2 AA audit.

### Fixed

- **Location accuracy:** the app used the first position the device returned (often a cached Wi-Fi/cell estimate, up to kilometres off) and never refined it. It now keeps listening while GPS converges, updates the dot and accuracy ring live, and re-runs the search when the correction exceeds 120 m. Fixes older than 5 s are no longer accepted.
- The phone/browser **Back button** left the app; it now steps back from a place to the list to the overview, and closes pin mode.
- Re-locating from the panel gave no feedback for up to 12 s and swallowed errors; it now shows a spinner, "improving accuracy…", and a notice if it fails.
- On iPhone the **alarm closed instantly** when sound couldn't start; the flashing screen and vibration now run independently of audio, with a note when sound is unavailable.
- Distances flashed in miles before switching to kilometres on load (en-US locale on Indian phones); units now start from the time-zone country guess.
- Low-contrast secondary text, light-theme badges and category labels, and white text on bright red buttons now meet WCAG AA (≥ 4.5:1); the location dot and hourly forecast strip are properly labelled and keyboard-reachable.
- Console noise: routine tile failures are no longer logged as errors, and upstream highway-shield filters no longer emit warnings.

### Added

- "Approximate location" warning when accuracy stays worse than ±500 m, and **Set exact spot**: drag the map under a fixed pin to set your location by hand (also available any time from the panel header).
- Regression tests: scripted-GPS location tests, manual pin, system Back, alarm without audio, accessibility gate (axe-core), and an iPhone/WebKit Playwright project.

## [0.1.1] — 2026-10-18

### Added

- Graceful degradation when the free Overpass servers are saturated: after 10 seconds (or on failure) the Nearby tab offers the local emergency number and one-tap Google Maps searches for hospitals, police, pharmacies and fuel around the user, while Beacon keeps retrying.
- Production deployment on Vercel: <https://beacon-nearby-help.vercel.app>.

## [0.1.0] — 2026-10-18

### Added

- One-tap location with GPS → coarse Wi-Fi/cell fallback, or place search (Photon) when GPS is unavailable.
- Nearest hospital, police, pharmacy, fuel, fire station, EV charging and mechanic/tyres from OpenStreetMap via Overpass, with tiered radius search (3 → 50 km) and node/way de-duplication.
- Ranking by real travel time (OSRM table) for drive, cycle and walk; routes with turn-by-turn instructions and hand-off to Google Maps, Apple Maps and OpenStreetMap.
- Opening-hours evaluation in the place's own time zone; emergency-department, 24/7, fuel-grade and EV-socket badges.
- Road-weather alerts (storm, ice, snow, rain, fog, wind, heat, cold, UV, darkness, air quality) with severity grades and a riding-conditions score.
- SOS: country-specific emergency numbers, location sharing (native share, WhatsApp, SMS), hold-to-trigger alarm siren, emergency contacts and on-device medical ID.
- 3D experience: MapLibre globe with NASA Black Marble night lights, fly-in, extruded buildings, animated route drawing and road-sign markers; dark and light themes.
- Offline-ready PWA with persisted query cache and cached map tiles; home-screen shortcuts for SOS and weather.
- Resilient networking: timeouts, per-host pacing, mirror failover and hedged requests.
- Strict Content-Security-Policy and security headers shared across Vercel, Cloudflare Pages and Netlify.
- 83 unit tests (Vitest) and 14 end-to-end runs (Playwright, desktop + mobile, mocked APIs); GitHub Actions CI, GitHub Pages workflow and Dependabot.
