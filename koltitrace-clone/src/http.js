// Thin fetch wrapper standing in for the original app's axios instance ("Dt").
//
// IMPORTANT: unlike the original bundle, this clone never calls the real
// qr.koltitrace.com / koltivaapi.com / amazonaws.com hosts. Every request
// goes to a same-origin "./mock-data/" path so the clone is self-contained
// and side-effect free. Swap `rewriteToMock` for a real HTTP call only if
// you intend to point this at infrastructure you are authorized to test.

function rewriteToMock(url) {
  // Map "{cloudfront}/koltitrace-lite/{env}/{prefix}{id}.json?..." and the
  // API fallback URL onto local fixtures so the demo has something to show.
  const u = new URL(url, window.location.origin);
  if (u.pathname.startsWith("/koltitrace-lite/")) {
    const file = u.pathname.split("/").pop(); // e.g. Dist_<id>.json
    return `./mock-data/${file}`;
  }
  if (u.pathname.endsWith("/distribution-geolocation")) {
    return "./mock-data/fallback-distribution-geolocation.json";
  }
  return url;
}

export async function getJson(url, headers = {}) {
  const target = rewriteToMock(url);
  const res = await fetch(target, { headers });
  if (res.status === 200) {
    return { status: 200, data: await res.json() };
  }
  const error = new Error(`HTTP ${res.status} for ${target}`);
  error.status = res.status;
  throw error;
}

export function handleThirdPartyRejection(id) {
  // Mirrors the original un()/Pn() 403-recovery path: give up and surface a
  // "missing data" style error for the caller to render.
  const error = new Error(`No data available for id ${id}`);
  error.status = 404;
  throw error;
}
