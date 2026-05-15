import { createRouter } from "./http/router.js";
import { registerRoutes } from "./http/routes.js";
import { serveStatic } from "./http/static.js";
import { json } from "./http/responses.js";

export function createRequestHandler() {
  const router = createRouter();
  registerRoutes(router);

  return async function handleRequest(request, response) {
    try {
      const handled = await router.handle(request, response);
      if (handled) return;

      const staticHandled = await serveStatic(request, response);
      if (staticHandled) return;

      json(response, 404, {
        success: false,
        error: "Not found",
      });
    } catch (error) {
      console.error(error);
      json(response, 500, {
        success: false,
        error: "Internal server error",
      });
    }
  };
}
