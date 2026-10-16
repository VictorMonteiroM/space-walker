// Reconstructed from the shipped assets/config.*.js, same keys/shape as the
// original. Secret-shaped values are placeholders — see README.md and
// docs/koltitrace-reverse-engineering.md for what was actually observed.
export const config = {
  siteTitle: "Koltiva Agritech",

  // Per-origin environment map. The real app picks one of these by comparing
  // window.location.origin against envProduction / envBastionStaging and
  // falling back to "devel" otherwise (see determineEnvironmentKey()).
  envProduction: "https://qr.koltitrace.com",
  apiProduction: "https://apifg.koltitrace.com/api/qr-code",
  envBastionStaging: "https://qr-staging.koltitrace.com",
  apiBastionStaging: "https://fg-node-1-staging.koltitrace.com/api/qr-code",
  envBastionDevelopment: "https://qr-development.koltitrace.com",
  apiBastionDevelopment: "https://apifg.koltitrace.com/api/qr-code",

  // PLACEHOLDER — the shipped bundle contains a real browser-restricted(?) Google
  // Maps key here. Not reproduced; see the analysis doc, finding F-1.
  apiMapKey: "REPLACE_WITH_YOUR_OWN_MAPS_KEY",

  // PLACEHOLDER — the shipped bundle contains a static "Bearer:" token sent as
  // the Authorization header on the distribution/geolocation API fallback call.
  // It decodes as the public jwt.io sample token (jrocket@example.com), already
  // expired. Not reproduced; see the analysis doc, finding F-2.
  authorization: "Bearer:REPLACE_WITH_YOUR_OWN_TOKEN",

  apiBastionStagingCorporate: "https://apifg-staging.corporate.koltitrace.com/api/qr-code",
  apiLocalDevelopment: "https://apifg.koltitrace.com/api/qr-code",

  // Primary data source: a CloudFront distribution in front of a public S3
  // bucket. The app always tries this first, before the API fallback above.
  apiAWS: "https://koltiva-qrcode-data.s3.ap-southeast-1.amazonaws.com/koltitrace-lite",
  cloudfrontURL: "https://koltiva-qrcode-data.koltivaapi.com",
  bucketName: "koltiva-qrcode-data",
  markerIconS3: "https://d3hls3rl2gm0he.cloudfront.net",

  // Payment / donation flow (Xendit). Documented, not wired up in this clone.
  createInvoiceDevelopmentFG: "https://api-traceability-development.koltivaapi.com/xendit-create-invoice",
  createInvoiceProductionFG: "https://api-traceability.koltiva.com/xendit-create-invoice",
  callbackRedirectPaymentDevelopmentFG: "https://api-traceability-development.koltivaapi.com/xendit-callback",
  callbackRedirectPaymentProductionFG: "https://api-traceability.koltiva.com/xendit-callback",
  minTransacionFeesCreditCard: 2000,
  minTransacionFeesVirtualAccount: 4000,
  chargeXenditPercentageCreditCard: 2.9,
  chargePaymentForKoltiva: 1000,
  minAmount: 10000,

  // Client/brand toggles. The real app decodes the route id and checks whether
  // the decoded text contains one of these brand slugs to switch styling.
  nestleCocoaTrace: "nestlecocoatrace",
  corporateDiageo: "corporatediageo",
  givaudan: "givaudan",

  bannerDonationURLImage: "/app/images/traceability/qrcode_assets/banner-donation.webp",

  // User-facing copy, verbatim from the shipped bundle.
  generateMsg:
    "We are currently generating your QR Code in the system, it will take a little time, so please wait",
  pageNotFoundMsg:
    "We`re sorry, the page you requested could not be found. Please go back to the homepage or contact us at support@loremipsum",
  missingDataMsg:
    "There are some data missing, we are currently working on it, please go back later",
  qrCodeScanMessage:
    "Please ensure to scan the QR code in Koltitrace application on Reception menu.",
};
