// Local dev server for Towers: static files + /api/agent proxy.
// Usage:  POLLINATIONS_API_KEY=pk_... node server.mjs
//    or:  put POLLINATIONS_API_KEY=... in towers/.env and run `node server.mjs`
// The key is read from the environment only — never printed, never sent to the browser.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const rawPort = Number(process.env.PORT);
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 4173;

if (!process.env.POLLINATIONS_API_KEY && existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

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

    if (url.pathname === "/api/agent" && req.method === "POST") {
      return await handleAgent(req, res);
    }

    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (p === "/" || p === "\\") p = "/index.html";
    // Never serve dotfiles/dot-dirs: .env holds the Pollinations key.
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

async function handleAgent(req, res) {
  const header = req.headers.authorization || "";
  const key = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : process.env.POLLINATIONS_API_KEY;
  if (!key) {
    return json(res, 401, { error: "Connect your Pollen wallet to run agents." });
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json(res, 400, { error: "Invalid JSON body." });
  }

  const { company, role, task } = body || {};
  if (!company || !role || !task) {
    return json(res, 400, { error: "company, role and task are required." });
  }

  try {
    const up = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.TOWERS_MODEL || "openai",
        messages: [
          { role: "system", content: `You are "${role}" at "${company}". Be concrete and terse.` },
          { role: "user", content: task },
        ],
        max_tokens: 220,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const text = await up.text();
    if (!up.ok) return json(res, 502, { error: `Upstream ${up.status}`, detail: text.slice(0, 300) });

    let data;
    try { data = JSON.parse(text); } catch { return json(res, 502, { error: "Non-JSON upstream reply." }); }
    const output = data?.choices?.[0]?.message?.content?.trim();
    if (!output) return json(res, 502, { error: "Empty completion.", detail: text.slice(0, 300) });
    return json(res, 200, { output });
  } catch (err) {
    return json(res, 502, { error: String(err?.message || err) });
  }
}

function json(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function end(res, status, msg) {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end(msg);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Towers dev server → http://127.0.0.1:${PORT}`);
  console.log(
    process.env.POLLINATIONS_API_KEY
      ? "Key loaded: agent runs will be LIVE."
      : "No key found: agent runs fall back to DEMO output."
  );
});
