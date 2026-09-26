/**
 * Static + review API for sample-1man.
 * Serves the portfolio root (parent of this folder) for shared assets / review APIs.
 * Maker CSS is local: sample-1man/maker-base.css（../style.css は使わない）.
 *
 *   node sample-1man/_static-server.js [port]
 *
 * Open:
 *   http://127.0.0.1:8765/sample-1man/index.html
 *   http://127.0.0.1:8765/sample-1man/index.html?review=1
 *   (旧) http://127.0.0.1:8765/sample-1man/review-dash/ → 上記へ誘導
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const sampleRoot = __dirname;
const portfolioRoot = path.resolve(sampleRoot, "..");
const sushiRoot = path.join(sampleRoot, "sushi-samples");
const port = Number(process.argv[2] || process.env.SAMPLE1MAN_PORT || 8765);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".md": "text/markdown; charset=utf-8"
};

function send(res, status, ctype, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
  res.writeHead(status, {
    "Content-Type": ctype,
    "Content-Length": buf.length,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(buf);
}

function safeJoin(root, urlPath) {
  const rel = decodeURIComponent(String(urlPath || "/"))
    .split("?")[0]
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  const fp = path.normalize(path.join(root, rel));
  const rootN = path.normalize(root + path.sep);
  if (fp !== path.normalize(root) && !fp.startsWith(rootN)) return null;
  return fp;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseQuery(q) {
  const out = {};
  String(q || "")
    .split("&")
    .forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf("=");
      const k = i < 0 ? pair : pair.slice(0, i);
      const v = i < 0 ? "" : pair.slice(i + 1);
      out[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
  return out;
}

async function handleCaptureSave(req, res, query) {
  const key = query.key || "";
  if (!key || /[\\/:*?"<>|]/.test(key) || key.includes("..")) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-key"}');
  }
  const dir = path.join(sushiRoot, key);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return send(res, 404, "application/json; charset=utf-8", '{"ok":false,"reason":"missing-dir"}');
  }
  const body = await readBody(req);
  const previewPath = path.join(dir, "preview.png");
  const tmpPath = path.join(
    require("os").tmpdir(),
    "sample1man-preview-" + Date.now() + "-" + Math.random().toString(16).slice(2) + ".png"
  );
  fs.writeFileSync(tmpPath, body);
  fs.copyFileSync(tmpPath, previewPath);
  try {
    fs.unlinkSync(tmpPath);
  } catch (_) {}
  const salesPack = path.join(sushiRoot, "_sales", "packs", key);
  fs.mkdirSync(salesPack, { recursive: true });
  fs.copyFileSync(previewPath, path.join(salesPack, "preview.png"));
  send(
    res,
    200,
    "application/json; charset=utf-8",
    JSON.stringify({ ok: true, key, bytes: body.length })
  );
}

/** 見本の正本 draft.json のみ上書き。studio-pack / order.json は拒否 */
async function handleDraftSave(req, res, query) {
  const key = query.key || "";
  if (!key || /[\\/:*?"<>|]/.test(key) || key.includes("..")) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-key"}');
  }
  const dir = path.join(sushiRoot, key);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return send(res, 404, "application/json; charset=utf-8", '{"ok":false,"reason":"missing-dir"}');
  }
  let raw = "";
  try {
    raw = (await readBody(req)).toString("utf8");
  } catch (e) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"body-read-failed"}');
  }
  let payload = null;
  try {
    payload = JSON.parse(raw || "");
  } catch (_) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-json"}');
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-payload"}');
  }
  if (payload.kind === "sample1man-studio-pack") {
    return send(
      res,
      400,
      "application/json; charset=utf-8",
      '{"ok":false,"reason":"refuse-studio-pack","detail":"draft body only"}'
    );
  }
  if (payload.kind === "sample1man-order") {
    return send(
      res,
      400,
      "application/json; charset=utf-8",
      '{"ok":false,"reason":"refuse-order","detail":"order.json must not overwrite sample draft"}'
    );
  }
  if (payload.freeRevisionNote != null || payload.colorFinalAck != null) {
    return send(
      res,
      400,
      "application/json; charset=utf-8",
      '{"ok":false,"reason":"refuse-order-shape","detail":"looks like customer order.json"}'
    );
  }
  if (!(payload.fields || payload.draftColors || payload.version || payload.layoutPattern)) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"not-draft-shape"}');
  }
  const draftPath = path.join(dir, "draft.json");
  const text = JSON.stringify(payload, null, 2) + "\n";
  fs.writeFileSync(draftPath, text, "utf8");
  send(
    res,
    200,
    "application/json; charset=utf-8",
    JSON.stringify({ ok: true, key, path: "sushi-samples/" + key + "/draft.json", bytes: Buffer.byteLength(text) })
  );
}

async function handleReviewDecision(req, res, query) {
  const key = query.key || "";
  const action = query.action || "";
  if (!key || /[\\/:*?"<>|]/.test(key) || key.includes("..")) {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-key"}');
  }
  if (action !== "approve" && action !== "reject") {
    return send(res, 400, "application/json; charset=utf-8", '{"ok":false,"reason":"bad-action"}');
  }
  let disposition = "drop";
  let reasons = [];
  let reasonLabels = [];
  let note = "";
  try {
    const raw = (await readBody(req)).toString("utf8");
    if (raw) {
      const payload = JSON.parse(raw);
      if (payload.disposition === "fix") disposition = "fix";
      if (payload.note) note = String(payload.note);
      if (Array.isArray(payload.reasons)) reasons = payload.reasons.map(String);
      if (Array.isArray(payload.reasonLabels)) reasonLabels = payload.reasonLabels.map(String);
    }
  } catch (_) {
    /* ignore bad json */
  }
  const state =
    action === "approve" ? "営業格納" : disposition === "fix" ? "要修正" : "NG";
  const memoParts = [];
  if (reasonLabels.length) memoParts.push(reasonLabels.join("/"));
  else if (reasons.length) memoParts.push(reasons.join("/"));
  if (note) memoParts.push(note);
  let memo = memoParts.join(" | ").replace(/\|/g, "/").replace(/[\r\n]/g, " ").trim();
  if (memo.length > 120) memo = memo.slice(0, 120);

  const statusPath = path.join(sushiRoot, "_materials", "STATUS.md");
  let statusNote = "ok";
  if (fs.existsSync(statusPath)) {
    try {
      let text = fs.readFileSync(statusPath, "utf8");
      const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        "(^\\|\\s*\\d+\\s*\\|\\s*" + esc + "\\s*\\|\\s*[^|]*\\|)\\s*[^|]*\\s*\\|\\s*[^|]*(\\s*\\|?\\s*$)",
        "m"
      );
      const replacement = "$1 " + state + " | " + memo + " |";
      let replaced = text.replace(pattern, replacement);
      if (replaced === text) {
        const pattern2 = new RegExp(
          "(^\\|\\s*\\d+\\s*\\|\\s*" + esc + "\\s*\\|\\s*[^|]*\\|)\\s*[^|]*(\\s*\\|.*$)",
          "m"
        );
        replaced = text.replace(pattern2, "$1 " + state + " $2");
        if (replaced === text) statusNote = "row-not-found";
      }
      if (statusNote !== "row-not-found") fs.writeFileSync(statusPath, replaced, "utf8");
    } catch (_) {
      statusNote = "status-write-failed";
    }
  } else {
    statusNote = "status-missing";
  }

  try {
    const notesDir = path.join(sushiRoot, "_materials", key);
    if (fs.existsSync(notesDir) && fs.statSync(notesDir).isDirectory()) {
      const notesPath = path.join(notesDir, "NOTES.md");
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const kind = action === "approve" ? "approve" : disposition === "fix" ? "fix" : "drop";
      let line = `- [${stamp}] ${kind}`;
      if (reasonLabels.length) line += " / " + reasonLabels.join(", ");
      if (note) line += " / note: " + note.replace(/[\r\n]/g, " ");
      line += "\n";
      if (!fs.existsSync(notesPath)) {
        fs.writeFileSync(notesPath, `# Review notes - ${key}\n\n` + line, "utf8");
      } else {
        fs.appendFileSync(notesPath, line, "utf8");
      }
    }
  } catch (_) {
    /* notes optional */
  }

  if (action === "reject" && disposition === "drop") {
    const salesPng = path.join(sushiRoot, "_sales", "packs", key, "preview.png");
    const samplePng = path.join(sushiRoot, key, "preview.png");
    try {
      if (fs.existsSync(salesPng)) fs.unlinkSync(salesPng);
    } catch (_) {}
    try {
      if (fs.existsSync(samplePng)) fs.unlinkSync(samplePng);
    } catch (_) {}
  }

  send(
    res,
    200,
    "application/json; charset=utf-8",
    JSON.stringify({ ok: true, key, action, disposition, status: statusNote })
  );
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const query = parseQuery(u.searchParams.toString());

    if (req.method === "OPTIONS") {
      return send(res, 204, "text/plain", "");
    }

    if (req.method === "POST" && pathname === "/sample-1man/sushi-samples/__capture-save") {
      return await handleCaptureSave(req, res, query);
    }
    if (req.method === "POST" && pathname === "/sample-1man/sushi-samples/__draft-save") {
      return await handleDraftSave(req, res, query);
    }
    if (req.method === "POST" && pathname === "/sample-1man/sushi-samples/__review-decision") {
      return await handleReviewDecision(req, res, query);
    }

    if (req.method === "POST" && pathname === "/sample-1man/free-photo-gallery/__catalog-save") {
      const galleryRoot = path.join(sampleRoot, "free-photo-gallery");
      const catalogPath = path.join(galleryRoot, "catalog.json");
      if (!fs.existsSync(catalogPath)) {
        return send(res, 404, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "missing-catalog" }));
      }
      const raw = (await readBody(req)).toString("utf8");
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        return send(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "bad-json" }));
      }
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
        return send(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "bad-payload" }));
      }
      const bak = path.join(
        galleryRoot,
        "catalog.bak-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json"
      );
      fs.copyFileSync(catalogPath, bak);
      const textOut = raw.trimEnd() + "\n";
      fs.writeFileSync(catalogPath, textOut, "utf8");
      return send(
        res,
        200,
        "application/json; charset=utf-8",
        JSON.stringify({ ok: true, bytes: Buffer.byteLength(textOut), backup: path.basename(bak) })
      );
    }

    if (req.method === "POST" && pathname === "/sample-1man/free-photo-gallery/__image-save") {
      const rel = String(query.path || "").replace(/\\/g, "/");
      if (!rel || rel.includes("..") || rel.startsWith("/")) {
        return send(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "bad-path" }));
      }
      if (
        !rel.startsWith("ai-or-original/") &&
        !rel.startsWith("trim-card/") &&
        !rel.startsWith("approved/")
      ) {
        return send(res, 403, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "path-not-allowed" }));
      }
      const galleryRoot = path.join(sampleRoot, "free-photo-gallery");
      const target = path.resolve(galleryRoot, rel);
      const rootN = path.resolve(galleryRoot) + path.sep;
      if (!target.startsWith(rootN)) {
        return send(res, 403, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "path-escape" }));
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        return send(res, 404, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "missing-file" }));
      }
      const body = await readBody(req);
      if (!body || body.length < 32) {
        return send(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, reason: "empty-body" }));
      }
      fs.writeFileSync(target, body);
      return send(
        res,
        200,
        "application/json; charset=utf-8",
        JSON.stringify({ ok: true, path: rel, bytes: body.length })
      );
    }

    if (pathname === "/") pathname = "/sample-1man/index.html";
    if (pathname.endsWith("/")) pathname = pathname + "index.html";

    /* Legacy mistaken root: /review-dash → /sample-1man/review-dash */
    if (
      pathname === "/review-dash" ||
      pathname === "/review-dash/index.html" ||
      pathname.startsWith("/review-dash/") ||
      pathname === "/index.html" ||
      pathname.startsWith("/sushi-samples/") ||
      pathname === "/sample-overrides.css" ||
      pathname.startsWith("/sample-overrides.css") ||
      pathname === "/script.js" ||
      pathname === "/sushi-belt.js"
    ) {
      pathname = "/sample-1man" + pathname;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(
        res,
        405,
        "application/json; charset=utf-8",
        JSON.stringify({ ok: false, reason: "method-not-allowed", path: pathname })
      );
    }

    const fp = safeJoin(portfolioRoot, pathname);
    if (!fp) {
      return send(res, 403, "application/json; charset=utf-8", '{"ok":false,"reason":"forbidden"}');
    }
    if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
      return send(res, 404, "text/plain; charset=utf-8", "not found " + pathname);
    }
    const ext = path.extname(fp).toLowerCase();
    const ctype = mime[ext] || "application/octet-stream";
    if (req.method === "HEAD") return send(res, 200, ctype, "");
    const bytes = fs.readFileSync(fp);
    send(res, 200, ctype, bytes);
  } catch (e) {
    send(res, 500, "text/plain; charset=utf-8", String(e && e.message ? e.message : e));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("READY http://127.0.0.1:" + port + "/sample-1man/index.html");
  console.log("REVIEW http://127.0.0.1:" + port + "/sample-1man/index.html?review=1");
  console.log("root=" + portfolioRoot);
});
