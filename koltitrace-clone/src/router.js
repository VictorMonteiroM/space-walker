// Mirrors the original router: routes = [catchAll -> PageNotFound, "/:id" -> HomeView].
// There is no literal "/" route in the original app either.
//
// "/_console" is an addition of this clone only (see views/TestConsole.js) — a
// static path, so vue-router always prefers it over the dynamic "/:id", no
// matter where it sits in this array.
import { HomeView } from "./views/HomeView.js";
import { PageNotFound } from "./views/PageNotFound.js";
import { TestConsole } from "./views/TestConsole.js";

const { createRouter, createWebHashHistory } = window.VueRouter;

export const router = createRouter({
  // Hash history so this clone runs from a plain static file server with no
  // server-side rewrite rules; the original uses path-based history behind a
  // CloudFront/S3 SPA rewrite.
  history: createWebHashHistory(),
  routes: [
    {
      path: "/_console",
      name: "test-console",
      component: TestConsole,
    },
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
