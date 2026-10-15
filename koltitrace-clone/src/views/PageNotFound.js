import { config } from "../config.js";
import { Footer } from "../components/Footer.js";

export const PageNotFound = {
  name: "PageNotFound",
  components: { Footer },
  setup() {
    return { config };
  },
  template: `
    <div class="errorWrap">
      <h4>Page not Found</h4>
      <p>{{ config.pageNotFoundMsg }}</p>
      <p><router-link to="/_console">Abrir o console de teste manual (QA)</router-link></p>
    </div>
    <Footer />
  `,
};
