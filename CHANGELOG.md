# Changelog

All notable changes to Beacon are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
