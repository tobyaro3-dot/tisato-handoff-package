import { createRequestHandler } from "../src/app.js";

const handler = createRequestHandler();

export default function vercelHandler(request, response) {
  return handler(request, response);
}
