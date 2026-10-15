// Reconstructed from assets/HomeView.*.js (minified component "Wl"/"Home" in
// the original). Reproduces the observed control flow:
//
//   onMounted -> fetch language code (Geo_) -> render map -> fetch
//   distribution (Dist_) -> plot origin/destination markers, geocoding
//   addresses that arrive without coordinates.
//
// The real app uses Google Maps + its Geocoder; this clone uses Leaflet +
// OpenStreetMap tiles so it needs no API key. Geocoding is stubbed (the mock
// data already carries lat/lng).

import { config } from "../config.js";
import { Footer } from "../components/Footer.js";
import { fetchGeo, fetchDistribution, decodedIdIncludes } from "../aws-store.js";

export const HomeView = {
  name: "Home",
  components: { Footer },
  props: ["id"],
  data() {
    return {
      config,
      loading: true,
      errorMessage: null,
      showUnreadableQrNotice: false,
      distribution: null,
      map: null,
    };
  },
  computed: {
    isGivaudan() {
      return decodedIdIncludes(this.id, config.givaudan);
    },
    isNestleCocoaTrace() {
      return decodedIdIncludes(this.id, config.nestleCocoaTrace);
    },
    isCorporateDiageo() {
      return decodedIdIncludes(this.id, config.corporateDiageo);
    },
  },
  async mounted() {
    this.showUnreadableQrNotice = decodedIdIncludes(this.id, "transaction");
    try {
      await fetchGeo(this.id); // language/map-options lookup, mirrors original g()
    } catch {
      // Non-fatal in the original app too: it only drives language selection.
    }
    try {
      const { data } = await fetchDistribution(this.id);
      this.distribution = data?.data ?? null;
    } catch (err) {
      this.errorMessage = config.missingDataMsg;
    } finally {
      this.loading = false;
    }
    // The map container only exists in the DOM once loading flips to false
    // (see the template's v-else branch), so initialize it after that render.
    if (!this.errorMessage) {
      await this.$nextTick();
      this.initMap();
      this.plotMarkers(this.distribution);
    }
  },
  methods: {
    initMap() {
      this.map = window.L.map(this.$refs.mapEl).setView([0, 0], 2);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(this.map);
    },
    plotMarkers(distribution) {
      if (!distribution || !this.map) return;
      const points = [];
      if (distribution.parent) points.push(distribution.parent);
      if (distribution.child) points.push(distribution.child);
      for (const p of points) {
        if (typeof p.lat === "number" && typeof p.lng === "number") {
          window.L.marker([p.lat, p.lng]).addTo(this.map).bindPopup(p.label ?? "");
        }
      }
      if (points.length) {
        this.map.fitBounds(points.map((p) => [p.lat, p.lng]));
      }
    },
  },
  template: `
    <div class="home-view" :class="{ givaudan: isGivaudan, nestle: isNestleCocoaTrace, diageo: isCorporateDiageo }">
      <div v-if="showUnreadableQrNotice" class="alert">
        <h4>Unable to read QR code</h4>
        <p>{{ config.qrCodeScanMessage }}</p>
      </div>

      <div v-if="loading" id="spinner">{{ config.generateMsg }}</div>

      <div v-else-if="errorMessage" class="alert">{{ errorMessage }}</div>

      <div v-else class="distribution">
        <div ref="mapEl" class="map"></div>
        <pre class="distribution-json">{{ JSON.stringify(distribution, null, 2) }}</pre>
      </div>

      <Footer />
    </div>
  `,
};
