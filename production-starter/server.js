import { createServer } from "node:http";
import { config } from "./src/config.js";
import { createRequestHandler } from "./src/app.js";

const server = createServer(createRequestHandler());

server.listen(config.port, () => {
  console.log(`TISATO starter running at ${config.publicOrigin}`);
  console.log("Static site: /");
  console.log("Admin portal: /admin.html");
});
