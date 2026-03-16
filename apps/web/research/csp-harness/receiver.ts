/**
 * CSP Exfiltration Test Receiver
 *
 * A minimal HTTP server that logs every incoming request.
 * This acts as the "attacker" side — if a request arrives here
 * from the test harness, the exfiltration vector succeeded.
 *
 * Usage:
 *   bun run receiver.ts
 *   # or: npx tsx receiver.ts
 *
 * Listens on port 9999. All requests are logged to stdout as JSON.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = 9999;

function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", () => resolve(""));
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const body = await collectBody(req);

  const entry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    bodyLength: body.length,
    bodyPreview: body.slice(0, 500),
    remoteAddress: req.socket.remoteAddress,
  };

  console.log(JSON.stringify(entry));

  // CORS headers to allow requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("received");
});

server.listen(PORT, () => {
  console.log(`CSP Exfiltration Receiver listening on http://localhost:${PORT}`);
  console.log("All incoming requests will be logged to stdout as JSON.");
  console.log("Press Ctrl+C to stop.\n");
});
