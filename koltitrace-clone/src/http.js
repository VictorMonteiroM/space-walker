// Thin fetch wrapper standing in for the original app's axios instance ("Dt").
//
// IMPORTANT: unlike the original bundle, this clone never calls the real
// qr.koltitrace.com / koltivaapi.com / amazonaws.com hosts. Every request is
// rewritten to a same-origin "./mock-data/" path so the clone is self-contained
// and side-effect free. Point rewriteToMock at real infrastructure only if you
// are authorized to test it.
//
// For manual QA this module also keeps a small in-memory request log and a
// status-code override map, both consumed by the test console
// (views/TestConsole.js) so a person can drive every branch of the fetch logic
// from the browser UI instead of editing fixture files by hand.

const log = [];
const subscribers = new Set();

// overrides["Dist_<id>"] = 403  -> forces that one mock lookup to answer 403
// regardless of whether the fixture file actually exists. Cleared per id by
// the console's "limpar" action.
export const overrides = {};

export function clearOverrides() {
  for (const key of Object.keys(overrides)) delete overrides[key];
}

function notify() {
  for (const fn of subscribers) fn([...log]);
}

export function subscribeToLog(fn) {
  subscribers.add(fn);
  fn([...log]);
  return () => subscribers.delete(fn);
}

export function clearLog() {
  log.length = 0;
  notify();
}

function record(entry) {
  log.push({ at: Date.now(), ...entry });
  notify();
}

function mockKeyFor(url) {
  const u = new URL(url, window.location.origin);
  if (u.pathname.startsWith("/koltitrace-lite/")) {
    return u.pathname.split("/").pop(); // e.g. "Dist_<id>.json"
  }
  if (u.pathname.endsWith("/queue/distribution-geolocation")) {
    return `queue?uid=${u.searchParams.get("uid")}`;
  }
  return null;
}

function rewriteToMock(url) {
  const u = new URL(url, window.location.origin);
  if (u.pathname.startsWith("/koltitrace-lite/")) {
    return `./mock-data/${u.pathname.split("/").pop()}`;
  }
  if (u.pathname.endsWith("/queue/distribution-geolocation")) {
    return `./mock-data/queue-distribution-geolocation?uid=${u.searchParams.get("uid")}`;
  }
  return url;
}

async function request(method, url, headers) {
  const key = mockKeyFor(url);
  const target = rewriteToMock(url);
  const forced = key != null ? overrides[key] : undefined;

  if (forced != null) {
    record({ method, key, status: forced, forced: true });
    const error = new Error(`HTTP ${forced} (forçado) for ${key}`);
    error.status = forced;
    if (forced === 200) return { status: 200, data: {}, forcedEmpty: true };
    throw error;
  }

  const res = await fetch(target, { method, headers });
  record({ method, key, status: res.status, forced: false, hadAuthHeader: "Authorization" in headers });
  if (method === "GET" ? res.status === 200 : res.ok) {
    return { status: res.status, data: method === "GET" ? await res.json() : undefined };
  }
  const error = new Error(`HTTP ${res.status} for ${target}`);
  error.status = res.status;
  throw error;
}

export const getJson = (url, headers = {}) => request("GET", url, headers);

// Mirrors axios.post(url, null, { headers }) used by the original Pn().
export const postEmpty = (url, headers = {}) => request("POST", url, headers);
