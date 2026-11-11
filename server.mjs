// Local dev server for Towers: static files only.
//
// There is no proxy any more. Every agent run goes from the browser to
// gen.pollinations.ai with the visitor's own key, so this server never sees,
// reads or forwards a key — not the owner's, not anyone's.
//
// Usage: node server.mjs   → http://127.0.0.1:4173

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const rawPort = Number(process.env.PORT);
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (p === "/" || p === "\\") p = "/index.html";
    // Never serve dotfiles/dot-dirs, so an old .env cannot leak through here.
    if (p.split(/[/\\]/).some((seg) => seg.startsWith("."))) return end(res, 404, "not found");
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) return end(res, 403, "forbidden");

    try {
      await stat(file);
    } catch {
      return end(res, 404, "not found");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch (err) {
    end(res, 500, String(err?.message || err));
  }
});

function end(res, status, msg) {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end(msg);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Towers dev server → http://127.0.0.1:${PORT}`);
  console.log("Static only: agent runs go straight from the page to gen.pollinations.ai.");
});
