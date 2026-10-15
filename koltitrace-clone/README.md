# Koltitrace QR landing page — reconstruction

Static, dependency-free reconstruction of the public QR landing page served from
`qr.koltitrace.com` (observed URL pattern: `https://qr.koltitrace.com/<base64-id>`).

Built from passive, static analysis of the publicly shipped bundle
(`assets/index.*.js`, `assets/HomeView.*.js`, `assets/config.*.js`, `assets/Footer.*.js`,
`assets/PageNotFound.*.js`) — the same files any browser downloads when it opens the
link. No live API calls, credential use, or non-public endpoints were involved in
building this reconstruction. See `../docs/koltitrace-reverse-engineering.md` for the
full analysis, evidence and security findings.

## What this is

A behavioral clone of the app shell and the `HomeView` data-fetch logic, using plain
ES modules and Vue 3 / Vue Router from a CDN — no build step required. It reproduces:

- The two real routes (`/: id` and a catch-all 404 — there is no literal `/` route in
  the original app).
- The id-decoding and environment-detection logic.
- The CloudFront-first, API-fallback data-fetch strategy, including the base64
  padding retry quirk found in the original code.
- The "Unable to read QR code" message path, the Giavudan branding toggle, and the
  footer/404 views.
- The `config.js` shape (see **Placeholders** below).

## What this is not

- Not a copy of Koltiva's backend, S3/CloudFront data, or any proprietary dataset.
- Not wired to a live Google Maps account — the map is rendered with Leaflet/OSM
  instead, so this clone has no dependency on the real Maps API key found in the
  original bundle.
- Not an executable reproduction of the payment/donation (Xendit) flow; that flow is
  documented but stubbed out.

## Placeholders

`src/config.js` mirrors the real `config.js`'s **shape** (same keys), but every
secret-shaped value (Google Maps API key, the sample `Authorization` bearer token)
is replaced with an obvious placeholder. The real values observed in the shipped
bundle are recorded only in the analysis doc, as a finding, not reproduced here.

## Running it

Any static file server works, e.g.:

```bash
npx serve koltitrace-clone
# or
python3 -m http.server --directory koltitrace-clone 8080
```

Then open `http://localhost:PORT/#/<base64-id>` — try the base64 of
`app-19654-batch-koltitrace` to replay the original link's shape:
`http://localhost:PORT/#/YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U`.

Because this clone has no real backend to call, the data fetch will fail and the UI
will fall through to the same "Unable to read QR code" / missing-data states the
real app shows when its own fetch chain fails — which is by itself a useful behavior
check against the original.
