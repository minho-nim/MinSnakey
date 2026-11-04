import { createServer } from "node:http";
import worker from "../share-server/dist/server/index.js";
createServer(async (req, res) => {
  try {
    const response = await worker.fetch(
      new Request("http://" + req.headers.host + req.url, {
        method: req.method,
        headers: req.headers,
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    res.writeHead(500);
    res.end("Server error");
  }
}).listen(8787, "0.0.0.0", () =>
  console.log("Sharing preview: http://127.0.0.1:8787"),
);
