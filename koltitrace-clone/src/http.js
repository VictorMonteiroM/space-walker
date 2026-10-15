// Thin fetch wrapper standing in for the original app's axios instance ("Dt").
//
// IMPORTANT: unlike the original bundle, this clone never calls the real
// qr.koltitrace.com / koltivaapi.com / amazonaws.com hosts. Every request is
// rewritten to a same-origin "./mock-data/" path so the clone is self-contained
// and side-effect free. Point rewriteToMock at real infrastructure only if you
// are authorized to test it.

function rewriteToMock(url) {
  const u = new URL(url, window.location.origin);
  if (u.pathname.startsWith("/koltitrace-lite/")) {
    // e.g. /koltitrace-lite/prod/Dist_<id>.json -> ./mock-data/Dist_<id>.json
    return `./mock-data/${u.pathname.split("/").pop()}`;
  }
  if (u.pathname.endsWith("/queue/distribution-geolocation")) {
    return `./mock-data/queue-distribution-geolocation?uid=${u.searchParams.get("uid")}`;
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

// Mirrors axios.post(url, null, { headers }) used by the original Pn().
export async function postEmpty(url, headers = {}) {
  const target = rewriteToMock(url);
  const res = await fetch(target, { method: "POST", headers });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} for ${target}`);
    error.status = res.status;
    throw error;
  }
  return res;
}
