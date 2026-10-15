// Reconstructed from the shipped assets/HomeView.*.js (minified names Sn, bo,
// ut, dt, Pn, un, Tl, vo in the original — renamed here for readability).
// This is the exact fetch strategy observed in the bundle:
//
//   1. Decode the route id from base64 ("transaction" in the decoded text
//      flags a QR meant for a different app and shows a dedicated message,
//      but does not stop the fetch attempt).
//   2. Try the CloudFront JSON object first:
//        {cloudfrontURL}/koltitrace-lite/{env}/{prefix}{id}.json?timestamp=...
//      prefix is "Dist_" for distribution data or "Geo_" for the map's
//      language code.
//   3. On HTTP 403, retry once with the id's base64 padding flipped (strip a
//      trailing "=" or add "==") — the original app tries both paddings
//      before giving up, which suggests the id is stored in S3 under a key
//      that does not always match the padding the frontend computes.
//   4. If that also fails, fall back to the REST API:
//        GET {apiProduction}/queue/distribution-geolocation?uid={id}
//      sent with the static Authorization header from config.js.
//
// None of this clone's fetches are wired to the real hosts — see fetchJson()
// in http.js, which points at same-origin stub endpoints instead.

import { config } from "./config.js";
import { getJson, handleThirdPartyRejection } from "./http.js";

export function determineEnvironmentKey() {
  const origin = window.location.origin;
  if (origin === config.envProduction) return "prod";
  if (origin === config.envBastionStaging) return "staging";
  return "devel"; // includes envBastionDevelopment and any unrecognized origin
}

function b64DecodeSafe(value) {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

export function decodedIdIncludes(id, needle) {
  return b64DecodeSafe(id).includes(needle);
}

function objectPath(envKey, prefix, id) {
  return `/koltitrace-lite/${envKey}/${prefix}${id}.json`;
}

function withQuery(base, path, params = {}) {
  const qs = Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

async function fetchFromApiFallback(id) {
  const url = `${config.apiProduction}/queue/distribution-geolocation?uid=${id}`;
  return getJson(url, { Authorization: config.authorization });
}

async function fetchFromCloudFront(envKey, id, prefix) {
  const timestamp = Date.now();
  try {
    const path = objectPath(envKey, prefix, id);
    const url = withQuery(config.cloudfrontURL, path, { timestamp });
    const res = await getJson(url);
    if (res.status === 200) return res;
    throw new Error("non-200 from CloudFront");
  } catch (err) {
    if (err.status === 403) {
      const flippedId = id.endsWith("=") ? id.slice(0, -1) : `${id}==`;
      try {
        const path = objectPath(envKey, prefix, flippedId);
        const url = withQuery(config.cloudfrontURL, path, { timestamp });
        const res = await getJson(url);
        if (res.status === 200) return res;
      } catch {
        return handleThirdPartyRejection(id);
      }
    }
    return handleThirdPartyRejection(id);
  }
}

/**
 * Mirrors the original Sn(env, id, prefix) / awsDataFetcher. Always attempts
 * the CloudFront object first, regardless of the "transaction" hint, and only
 * falls back to the REST API on repeated failure.
 */
export async function fetchDistributionOrGeo(id, prefix) {
  const envKey = determineEnvironmentKey();
  const looksLikeTransactionQr = decodedIdIncludes(id, "transaction");
  if (looksLikeTransactionQr) {
    // The original app fires a SweetAlert "Unable to read QR code" modal here
    // and keeps going — callers of this function should show the same notice.
  }
  try {
    const res = await fetchFromCloudFront(envKey, id, prefix);
    return { data: res.data, looksLikeTransactionQr, viaFallbackApi: false };
  } catch (err) {
    if (err && err.status === 403) {
      const res = await fetchFromApiFallback(id);
      return { data: res.data, looksLikeTransactionQr, viaFallbackApi: true };
    }
    throw err;
  }
}

export const fetchDistribution = (id) => fetchDistributionOrGeo(id, "Dist_");
export const fetchGeo = (id) => fetchDistributionOrGeo(id, "Geo_");
