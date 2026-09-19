/**
 * Batch capture 30 samples at 1200x1694 via Edge CDP (no npm deps).
 * Usage: node _audit-capture-cdp.mjs
 * Requires: local server on 8765, Edge installed.
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const net = require("net");

const PORT = process.env.SAMPLE1MAN_PORT || 8765;
const BASE = `http://127.0.0.1:${PORT}/sample-1man`;
const ROOT = __dirname;
const SUSHI = path.join(ROOT, "sushi-samples");
const OUT = path.join(ROOT, "..", "docs", "share", "2026-09-19-sample30-audit");
const SHOTS = path.join(OUT, "shots");
const W = 1200;
const H = 1694;
const CDP_PORT = 9229;

const EDGE =
  process.env.EDGE_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

/** Minimal WebSocket client (text frames only) for CDP */
class TinyWS {
  constructor(url) {
    this.url = new URL(url);
    this.buf = Buffer.alloc(0);
    this.handlers = new Map();
    this.q = [];
    this.sock = null;
    this.open = false;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const sock = net.connect(Number(this.url.port), this.url.hostname, () => {
        sock.write(
          `GET ${this.url.pathname}${this.url.search} HTTP/1.1\r\n` +
            `Host: ${this.url.host}\r\n` +
            `Upgrade: websocket\r\n` +
            `Connection: Upgrade\r\n` +
            `Sec-WebSocket-Key: ${key}\r\n` +
            `Sec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      this.sock = sock;
      let upgraded = false;
      sock.on("data", (chunk) => {
        this.buf = Buffer.concat([this.buf, chunk]);
        if (!upgraded) {
          const idx = this.buf.indexOf("\r\n\r\n");
          if (idx < 0) return;
          const head = this.buf.slice(0, idx).toString("utf8");
          this.buf = this.buf.slice(idx + 4);
          if (!/101/.test(head)) {
            reject(new Error("ws upgrade failed: " + head.split("\r\n")[0]));
            return;
          }
          upgraded = true;
          this.open = true;
          resolve();
          this._drain();
          return;
        }
        this._drain();
      });
      sock.on("error", reject);
    });
  }
  _drain() {
    while (true) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0];
      const b1 = this.buf[1];
      const opcode = b0 & 0xf;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2));
        off = 10;
      }
      if (this.buf.length < off + len) return;
      const payload = this.buf.slice(off, off + len);
      this.buf = this.buf.slice(off + len);
      if (opcode === 1) {
        const msg = JSON.parse(payload.toString("utf8"));
        if (msg.id != null && this.handlers.has(msg.id)) {
          const { resolve, reject } = this.handlers.get(msg.id);
          this.handlers.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } else if (opcode === 8) {
        this.open = false;
        this.sock.end();
      }
    }
  }
  send(obj) {
    const data = Buffer.from(JSON.stringify(obj), "utf8");
    const mask = crypto.randomBytes(4);
    const len = data.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81;
      header[1] = 0x80 | len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([header, mask, masked]));
  }
  call(method, params = {}) {
    const id = TinyWS._id++;
    return new Promise((resolve, reject) => {
      this.handlers.set(id, { resolve, reject });
      this.send({ id, method, params });
    });
  }
}
TinyWS._id = 1;

async function launchEdge() {
  const userData = path.join(process.env.TEMP || ".", "edge-audit-cdp-" + Date.now());
  fs.mkdirSync(userData, { recursive: true });
  const child = spawn(
    EDGE,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userData}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore", detached: true }
  );
  child.unref();
  for (let i = 0; i < 40; i++) {
    try {
      await httpGetJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
      return;
    } catch (_) {
      await sleep(250);
    }
  }
  throw new Error("Edge CDP not ready");
}

function httpPutJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "PUT" },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error("put-json-fail: " + d.slice(0, 120)));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function openPage() {
  let target = null;
  try {
    target = await httpPutJson(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent("about:blank")}`);
  } catch (_) {
    /* fall through */
  }
  if (!target || !target.webSocketDebuggerUrl) {
    const tabs = await httpGetJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    target = (tabs || []).find((t) => t.type === "page") || (tabs || [])[0];
  }
  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error("no CDP page target");
  }
  const ws = new TinyWS(target.webSocketDebuggerUrl);
  await ws.connect();
  await ws.call("Page.enable");
  await ws.call("Runtime.enable");
  return ws;
}

async function navigate(ws, url) {
  const ready = new Promise(async (resolve) => {
    // poll document ready
    for (let i = 0; i < 80; i++) {
      try {
        const r = await ws.call("Runtime.evaluate", {
          expression: "document.readyState",
          returnByValue: true,
        });
        if (r.result && r.result.value === "complete") {
          resolve();
          return;
        }
      } catch (_) {}
      await sleep(200);
    }
    resolve();
  });
  await ws.call("Page.navigate", { url });
  await ready;
  await sleep(800);
}

async function evaluate(ws, expression) {
  const r = await ws.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(JSON.stringify(r.exceptionDetails));
  }
  return r.result && r.result.value;
}

function listSampleDirs() {
  return fs
    .readdirSync(SUSHI, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.slice(0, 2).localeCompare(b.slice(0, 2)));
}

async function captureOne(ws, folderKey) {
  const draftPath = `sushi-samples/${folderKey}/draft.json`;
  const expr = `
(async () => {
  const folder = ${JSON.stringify(folderKey)};
  const draft = await fetch(${JSON.stringify(draftPath + "?v=")} + Date.now()).then(r => r.json());
  if (typeof window.__sample1manCaptureApply !== 'function') {
    return { ok: false, reason: 'no-capture-api' };
  }
  const applied = window.__sample1manCaptureApply(draft);
  if (!applied || !applied.ok) return { ok: false, reason: (applied && applied.reason) || 'apply-fail' };
  // wait images
  const imgs = Array.from(document.querySelectorAll('#preview-root img'));
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(res => { img.onload = img.onerror = () => res(); setTimeout(res, 4000); });
  }));
  await new Promise(r => setTimeout(r, 400));
  if (typeof window.__sample1manCaptureMeasureHeight === 'function') {
    const h = window.__sample1manCaptureMeasureHeight();
    if (h > 0) {
      document.documentElement.style.height = h + 'px';
      document.body.style.height = h + 'px';
    }
  }
  const root = document.getElementById('preview-root');
  const rect = root.getBoundingClientRect();
  return { ok: true, width: rect.width, height: rect.height, top: rect.top, left: rect.left, dpr: window.devicePixelRatio || 1 };
})()
`;
  const meta = await evaluate(ws, expr);
  if (!meta || !meta.ok) throw new Error((meta && meta.reason) || "capture-meta-fail");

  // Screenshot clip: top of preview-root, 1200x1694 CSS pixels
  const dpr = meta.dpr || 1;
  const clip = {
    x: Math.max(0, meta.left),
    y: Math.max(0, meta.top),
    width: W,
    height: H,
    scale: 1,
  };
  // Ensure viewport is large enough
  await ws.call("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: Math.max(H, Math.ceil(meta.height) + 40),
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(200);
  // re-apply after metrics change
  await evaluate(ws, expr);
  await sleep(300);

  const shot = await ws.call("Page.captureScreenshot", {
    format: "png",
    clip,
    captureBeyondViewport: true,
    fromSurface: true,
  });
  const buf = Buffer.from(shot.data, "base64");
  const outFile = path.join(SHOTS, `${folderKey}.png`);
  fs.writeFileSync(outFile, buf);
  // sushi lane thumb + sales pack
  const previewPath = path.join(SUSHI, folderKey, "preview.png");
  fs.writeFileSync(previewPath, buf);
  const salesDir = path.join(SUSHI, "_sales", "packs", folderKey);
  fs.mkdirSync(salesDir, { recursive: true });
  fs.writeFileSync(path.join(salesDir, "preview.png"), buf);
  return { outFile, bytes: buf.length, meta };
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  console.log("Launching Edge CDP…");
  await launchEdge();
  const ws = await openPage();
  console.log("Opening capture page…");
  await navigate(ws, `${BASE}/index.html?capture=1`);
  // wait for APIs
  for (let i = 0; i < 50; i++) {
    const ready = await evaluate(
      ws,
      "typeof window.__sample1manCaptureApply === 'function'"
    );
    if (ready) break;
    await sleep(200);
  }
  const folders = listSampleDirs();
  console.log(`Samples: ${folders.length}`);
  const log = [];
  for (const folder of folders) {
    process.stdout.write(`→ ${folder} … `);
    try {
      const r = await captureOne(ws, folder);
      console.log(`OK ${r.bytes} bytes`);
      log.push({ folder, ok: true, bytes: r.bytes, file: path.basename(r.outFile) });
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      log.push({ folder, ok: false, error: String(e.message || e) });
    }
  }
  fs.writeFileSync(path.join(OUT, "capture-log.json"), JSON.stringify(log, null, 2), "utf8");
  console.log("DONE shots →", SHOTS);
  try {
    await ws.call("Browser.close");
  } catch (_) {}
  process.exit(log.some((x) => !x.ok) ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
