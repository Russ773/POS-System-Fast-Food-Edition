import { createServer } from "http";
import { createApp } from "./app.js";
import { initSocket } from "./socket.js";
import { env } from "./env.js";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
