import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "..");
const portalRoot = path.join(repoRoot, "apps", "portal");
const workerSource = await fs.readFile(path.join(repoRoot, "workers", "gnk-asg-auto-editor-worker", "src", "index.js"), "utf8");
const fixture = JSON.parse(await fs.readFile(path.join(repoRoot, "preview", "fixtures", "publications-auto.json"), "utf8"));
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`);
const worker = workerModule.default;

const store = new Map([
  ["auto-editor:articles:v1", JSON.stringify(fixture.items)],
  ["auto-editor:used-topics:v1", JSON.stringify([])]
]);

const env = {
  GNK_ASG_KV: {
    get: async key => store.get(key) ?? null,
    put: async (key, value) => store.set(key, String(value))
  }
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const dynamic = pathname =>
  pathname === "/data/publications-auto.json" ||
  pathname === "/api/auto-editor/status" ||
  /^\/(objave|publications)\/poslovni-pregled-preview-staging-test\/?$/.test(pathname);

const safeFile = pathname => {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || pathname.endsWith("/")) relative = path.join(relative, "index.html");
  const resolved = path.resolve(portalRoot, relative);
  return resolved.startsWith(portalRoot) ? resolved : null;
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:4173");

    if (dynamic(url.pathname)) {
      const response = await worker.fetch(new Request(`https://preview.local${url.pathname}${url.search}`), env, {});
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    const file = safeFile(url.pathname);

    if (!file) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const data = await fs.readFile(file);
    const type = contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store"
    });
    res.end(data);
  }
  catch (error) {
    res.writeHead(error?.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    res.end(error?.code === "ENOENT" ? "Not found" : String(error?.stack || error));
  }
});

server.listen(4173, "127.0.0.1", () => {
  console.log("GNK ASG lokalni preview:");
  console.log("http://127.0.0.1:4173/objave/");
  console.log("http://127.0.0.1:4173/publications/");
  console.log("http://127.0.0.1:4173/objave/poslovni-pregled-preview-staging-test/");
  console.log("http://127.0.0.1:4173/publications/poslovni-pregled-preview-staging-test/");
  console.log("Za prekid pritisnite Ctrl+C.");
});