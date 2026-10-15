// Mirrors the original router: routes = [catchAll -> PageNotFound, "/:id" -> HomeView].
// There is no literal "/" route in the original app either.
import { HomeView } from "./views/HomeView.js";
import { PageNotFound } from "./views/PageNotFound.js";

const { createRouter, createWebHashHistory } = window.VueRouter;

export const router = createRouter({
  // Hash history so this clone runs from a plain static file server with no
  // server-side rewrite rules; the original uses path-based history behind a
  // CloudFront/S3 SPA rewrite.
  history: createWebHashHistory(),
  routes: [
    {
      path: "/:catchAll(.*)",
      name: "not-found",
      component: PageNotFound,
    },
    {
      path: "/:id",
      name: "home",
      component: HomeView,
      props: true,
    },
  ],
});
