import { config } from "../config.js";

export const Footer = {
  name: "Footer",
  setup() {
    return { config };
  },
  computed: {
    year() {
      return new Date().getFullYear();
    },
  },
  template: `
    <div class="footer-koltiva">
      <div class="footer-two">
        <p>&copy; 2017 - {{ year }} | {{ config.siteTitle }} and its affiliates, all rights reserved.</p>
      </div>
    </div>
  `,
};
