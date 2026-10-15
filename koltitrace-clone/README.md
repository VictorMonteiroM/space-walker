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
- The CloudFront-first data fetch, including the base64 padding retry (strip all
  trailing `=`, or append `==`) on HTTP 403, and the last-resort **POST** that
  enqueues generation of the batch file (`/queue/distribution-geolocation?uid=`)
  with a "Generating QR Code..." notice. The fallback does not return data.
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

Only the id from the original link has mock data. Any other id falls through the
fetch chain: the clone "POSTs" to a same-origin mock path and shows "Generating QR
Code...", while an id whose decoded text contains `transaction` shows "Unable to
read QR code" — the same states the original reaches. No request ever leaves your
machine except the Vue/Leaflet CDN scripts and OpenStreetMap tiles.
