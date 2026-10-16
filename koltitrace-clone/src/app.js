import { router } from "./router.js";

const { createApp } = window.Vue;

createApp({ template: "<router-view />" }).use(router).mount("#app");
