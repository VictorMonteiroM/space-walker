// Reconstructed from the shipped assets/HomeView.*.js (minified names Sn, bo,
// ut, dt, Pn, un, Tl, vo in the original — renamed here for readability).
// Control flow verified against the original and exercised in a browser
// (see docs/koltitrace-reverse-engineering.md, "Execução e observações").
//
//   fetchObject(env, id, prefix)                         (Sn / bo)
//     1. GET {cloudfrontURL}/koltitrace-lite/{env}/{prefix}{id}.json?timestamp=...
//     2. On HTTP 403 (S3 answers 403 for a key that does not exist), retry once
//        with the padding flipped: strip ALL trailing "=" if present, otherwise
//        append "==".
//     3. Any remaining failure goes to onMissing(id)    (un):
//          - decoded id contains "transaction" -> "Unable to read QR code" modal
//          - otherwise -> requestGeneration(id)          (Pn)
//
//   requestGeneration(id)                                (Pn)
//     NOT a data fetch. It POSTs an empty body to
//       {api}/queue/distribution-geolocation?uid={id}
//     with the static Authorization header, shows a full-screen
//     "Generating QR Code..." notice, and ignores the response (errors are only
//     logged). The page never reads the generated data back; the user is
//     expected to come back later, when the JSON object exists in S3.
//
// After onMissing() the original returns undefined, so the caller crashes with
// a TypeError that Sn rethrows as "Failed to get language code." — mirrored here
// by throwing a typed error so the view can render the matching state.

import { config } from "./config.js";
import { getJson, postEmpty } from "./http.js";

export function determineEnvironmentKey() {
  const origin = window.location.origin;
  if (origin === config.envProduction) return "prod";
  if (origin === config.envBastionStaging) return "staging";
  return "devel"; // includes envBastionDevelopment and any unrecognized origin
}

// The original selects the API host by origin, with the development host as
// the fallback for anything else.
export function apiBaseForOrigin() {
  const origin = window.location.origin;
  const byOrigin = {
    [config.envProduction]: config.apiProduction,
    [config.envBastionStaging]: config.apiBastionStaging,
  };
  return byOrigin[origin] || config.apiBastionDevelopment;
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

const objectPath = (envKey, prefix, id) => `/koltitrace-lite/${envKey}/${prefix}${id}.json`;

function withQuery(base, path, params = {}) {
  const qs = Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

// Original: strip every trailing "=" when the id has padding, else append "==".
export function flipPadding(id) {
  return id.endsWith("=") ? id.replace(/=+$/, "") : `${id}==`;
}

export class FlowError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "unreadable" | "generating"
  }
}

async function requestGeneration(id) {
  const url = `${apiBaseForOrigin()}/queue/distribution-geolocation?uid=${id}`;
  try {
    await postEmpty(url, { Authorization: config.authorization });
  } catch (err) {
    console.log("error post data: " + err); // original only logs and moves on
  }
  throw new FlowError("generating", config.generateMsg);
}

async function onMissing(id) {
  if (decodedIdIncludes(id, "transaction")) {
    throw new FlowError("unreadable", config.qrCodeScanMessage);
  }
  return requestGeneration(id);
}

async function fetchObject(envKey, id, prefix) {
  const timestamp = Date.now();
  const get = (key) => getJson(withQuery(config.cloudfrontURL, objectPath(envKey, prefix, key), { timestamp }));
  try {
    return await get(id);
  } catch (err) {
    if (err.status === 403) {
      try {
        return await get(flipPadding(id));
      } catch {
        return onMissing(id);
      }
    }
    return onMissing(id);
  }
}

export async function fetchDistributionOrGeo(id, prefix) {
  return fetchObject(determineEnvironmentKey(), id, prefix);
}

export const fetchDistribution = (id) => fetchDistributionOrGeo(id, "Dist_");
export const fetchGeo = (id) => fetchDistributionOrGeo(id, "Geo_");
