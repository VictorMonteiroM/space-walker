// QA helper, NOT part of the original app's reconstruction. The real app has
// no such screen or route. This exists so a person can drive every branch of
// aws-store.js's fetch logic from a form, against this clone's own mock data
// only (./mock-data/*.json, served from the same origin as this page).
//
// Nothing here ever reaches qr.koltitrace.com / koltivaapi.com / amazonaws.com
// or any other third-party host. To point this at real, authorized
// infrastructure, you would have to deliberately change src/http.js's
// rewriteToMock() — this console does not do that for you.

import { config } from "../config.js";
import {
  determineEnvironmentKey,
  apiBaseForOrigin,
  decodedIdIncludes,
  flipPadding,
  fetchDistribution,
  fetchGeo,
} from "../aws-store.js";
import { subscribeToLog, clearLog, overrides, clearOverrides } from "../http.js";

const PRESETS = [
  { label: "Lote de exemplo (o id do link original)", raw: null, encoded: "YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U" },
  { label: "Texto de exemplo: 'app-1-x' (gera padding com '=')", raw: "app-1-x" },
  { label: "Contém 'transaction' → aviso de QR ilegível", raw: "app-1-transaction-koltitrace" },
  { label: "Contém 'givaudan' → branding corporativo", raw: "app-1-givaudan-koltitrace" },
  { label: "Id qualquer, sem arquivo correspondente", raw: "id-qualquer-sem-dados" },
];

function base64Encode(text) {
  return btoa(text);
}

export const TestConsole = {
  name: "TestConsole",
  setup() {
    return { config };
  },
  data() {
    return {
      rawText: "app-1-x",
      idOverride: "",
      entries: [],
      unsubscribe: null,
      forceDistStatus: "",
      forceGeoStatus: "",
      running: false,
      result: null,
      presets: PRESETS,
    };
  },
  computed: {
    effectiveId() {
      return this.idOverride.trim() || base64Encode(this.rawText);
    },
    decodedPreview() {
      try {
        return atob(this.effectiveId);
      } catch {
        return "(base64 inválido)";
      }
    },
    envKey() {
      return determineEnvironmentKey();
    },
    apiBase() {
      return apiBaseForOrigin();
    },
    flippedPadding() {
      return flipPadding(this.effectiveId);
    },
    flags() {
      const id = this.effectiveId;
      return {
        transaction: decodedIdIncludes(id, "transaction"),
        givaudan: decodedIdIncludes(id, config.givaudan),
        nestleCocoaTrace: decodedIdIncludes(id, config.nestleCocoaTrace),
        corporateDiageo: decodedIdIncludes(id, config.corporateDiageo),
      };
    },
  },
  mounted() {
    this.unsubscribe = subscribeToLog((entries) => {
      this.entries = entries;
    });
  },
  unmounted() {
    this.unsubscribe?.();
  },
  methods: {
    applyPreset(preset) {
      if (preset.encoded) {
        this.idOverride = preset.encoded;
        this.rawText = "";
      } else {
        this.rawText = preset.raw;
        this.idOverride = "";
      }
    },
    setOverride(prefix, value) {
      const key = `${prefix}${this.effectiveId}.json`;
      if (value === "") delete overrides[key];
      else overrides[key] = Number(value);
    },
    async runFetch() {
      this.running = true;
      this.result = null;
      clearLog();
      this.setOverride("Dist_", this.forceDistStatus);
      this.setOverride("Geo_", this.forceGeoStatus);
      const id = this.effectiveId;
      let geoOutcome = "ok";
      try {
        await fetchGeo(id);
      } catch (err) {
        geoOutcome = err.kind ?? "error";
      }
      let distOutcome = "ok";
      let data = null;
      try {
        const res = await fetchDistribution(id);
        data = res.data;
      } catch (err) {
        distOutcome = err.kind ?? "error";
      }
      this.result = { geoOutcome, distOutcome, data };
      this.running = false;
    },
    openInApp() {
      window.location.hash = `#/${this.effectiveId}`;
    },
    resetOverrides() {
      this.forceDistStatus = "";
      this.forceGeoStatus = "";
      clearOverrides();
    },
  },
  template: `
    <div class="console">
      <h3>Console de teste manual (reconstrução, dados mock)</h3>
      <p class="console-note">
        Roda só contra <code>./mock-data/</code>, no mesmo navegador. Nenhuma
        requisição sai desta página para qr.koltitrace.com ou qualquer host real.
      </p>

      <section class="console-card">
        <h4>1. Escolha ou digite um id</h4>
        <div class="preset-list">
          <button v-for="p in presets" :key="p.label" @click="applyPreset(p)">{{ p.label }}</button>
        </div>
        <label>Texto (será convertido para base64 automaticamente)
          <input v-model="rawText" placeholder="ex: app-1-x" />
        </label>
        <label>…ou cole um id já em base64 (tem prioridade sobre o texto acima)
          <input v-model="idOverride" placeholder="ex: YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U" />
        </label>
        <dl class="console-facts">
          <dt>Id efetivo (base64)</dt><dd>{{ effectiveId }}</dd>
          <dt>Decodificado</dt><dd>{{ decodedPreview }}</dd>
          <dt>Ambiente detectado</dt><dd>{{ envKey }}</dd>
          <dt>Host da API de fallback</dt><dd>{{ apiBase }}</dd>
          <dt>Padding invertido seria</dt><dd>{{ flippedPadding }}</dd>
          <dt>Flags de branding/aviso</dt>
          <dd>
            transaction: {{ flags.transaction }} ·
            givaudan: {{ flags.givaudan }} ·
            nestlecocoatrace: {{ flags.nestleCocoaTrace }} ·
            corporatediageo: {{ flags.corporateDiageo }}
          </dd>
        </dl>
      </section>

      <section class="console-card">
        <h4>2. Force um status na primeira tentativa (opcional)</h4>
        <p class="console-note">
          Para exercitar o retry de padding ou o fallback sem precisar editar
          arquivos de fixture: force 403 e observe a 2ª tentativa com padding
          invertido; force 404 em ambos para cair direto no POST de
          enfileiramento. <strong>O valor forçado também vale se você abrir
          "#/{{ effectiveId }}" na tela normal</strong> — use "Limpar" para
          voltar ao comportamento real do arquivo mock.
        </p>
        <label>Dist_&lt;id&gt;.json responde
          <select v-model="forceDistStatus">
            <option value="">(comportamento real do arquivo mock)</option>
            <option value="403">403 — forçar</option>
            <option value="404">404 — forçar</option>
          </select>
        </label>
        <label>Geo_&lt;id&gt;.json responde
          <select v-model="forceGeoStatus">
            <option value="">(comportamento real do arquivo mock)</option>
            <option value="403">403 — forçar</option>
            <option value="404">404 — forçar</option>
          </select>
        </label>
        <button class="secondary" @click="resetOverrides">Limpar status forçados</button>
      </section>

      <section class="console-card">
        <h4>3. Execute</h4>
        <button :disabled="running" @click="runFetch">Rodar fetchGeo + fetchDistribution</button>
        <button class="secondary" @click="openInApp">Abrir este id na tela normal (#/{{ effectiveId }})</button>

        <div v-if="result" class="console-result">
          <p>fetchGeo → <strong>{{ result.geoOutcome }}</strong></p>
          <p>fetchDistribution → <strong>{{ result.distOutcome }}</strong></p>
          <pre v-if="result.data">{{ JSON.stringify(result.data, null, 2) }}</pre>
        </div>

        <h5>Log de requisições (nesta execução)</h5>
        <table class="console-log">
          <thead><tr><th>Método</th><th>Chave mock</th><th>Status</th><th>Forçado?</th><th>Header Authorization</th></tr></thead>
          <tbody>
            <tr v-for="(e, i) in entries" :key="i">
              <td>{{ e.method }}</td>
              <td>{{ e.key }}</td>
              <td>{{ e.status }}</td>
              <td>{{ e.forced ? "sim" : "não" }}</td>
              <td>{{ e.hadAuthHeader === undefined ? "–" : (e.hadAuthHeader ? "enviado" : "ausente") }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
};
