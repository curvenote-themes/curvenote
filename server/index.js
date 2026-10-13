import express from "express";
import http from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
function startedByCurvenoteCli(env = process.env) {
  return env.MYSTMD_BINARY_NAME === "curvenote";
}
function decodeThemeParams(value) {
  if (!value || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return void 0;
  try {
    const params = JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
    return params && typeof params === "object" && typeof params.version === "string" ? params : void 0;
  } catch {
    return void 0;
  }
}
function cliSessionCookie(port2, runId) {
  const name = `curvenote-cli-${port2}`;
  return {
    name,
    value: (packet) => `${runId}.${packet}`,
    /** The packet in the request's cookie, if the cookie is from this run */
    read(cookieHeader) {
      const cookie = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
      if (!cookie) return void 0;
      const [run, packet] = cookie.slice(name.length + 1).split(".");
      return run === runId ? decodeThemeParams(packet) : void 0;
    }
  };
}
const CLI_DOCS_URL = "https://curvenote.com/docs/cli";
const REFUSAL_MESSAGE = "The Curvenote theme runs with the Curvenote CLI. Start your project with `curvenote start`.";
function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; --fg: #111827; --muted: #4b5563; --bg: #ffffff; --code: #f3f4f6; --accent: #6d32ff; }
    @media (prefers-color-scheme: dark) {
      :root { --fg: #f9fafb; --muted: #9ca3af; --bg: #030712; --code: #1f2937; --accent: #9b7bff; }
    }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
    main { max-width: 34rem; padding: 2rem 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p { color: var(--muted); margin: 0 0 1rem; }
    code { display: block; padding: 0.625rem 0.875rem; border-radius: 0.375rem; background: var(--code); color: var(--fg); font: 0.9rem ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 0 1rem; }
    p code { display: inline; padding: 0.1rem 0.3rem; margin: 0; }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>`;
}
const REFUSAL_PAGE = page(
  "Start with the Curvenote CLI",
  `    <h1>Start this project with the Curvenote CLI</h1>
    <p>The Curvenote theme runs with the Curvenote CLI, which wasn’t used to start this preview. Stop the current command, then run this in your project folder:</p>
    <code>curvenote start</code>
    <p>Don’t have it yet? <a href="${CLI_DOCS_URL}" target="_blank" rel="noreferrer">Install the Curvenote CLI</a>.</p>`
);
const OPEN_LINK_PAGE = page(
  "Open the link from curvenote start",
  `    <h1>Open the link from <code style="display:inline">curvenote start</code></h1>
    <p>Open this preview with the link <code>curvenote start</code> printed in your terminal when it started, which ends in <code>?params=…</code>. Each run prints a new link, so a link or tab from an earlier run won’t open it.</p>
    <p>If the link has no <code>?params=</code>, <a href="${CLI_DOCS_URL}" target="_blank" rel="noreferrer">update the Curvenote CLI</a>.</p>`
);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const refuseToServe = isProduction && !startedByCurvenoteCli();
const port = process.env.PORT || 3050;
const cliSession = cliSessionCookie(port, randomUUID());
const contentCdnPort = process.env.CONTENT_CDN_PORT || 3100;
const contentCdnHost = process.env.CONTENT_CDN_HOST || "localhost";
const contentCdnUrl = `${contentCdnHost}:${contentCdnPort}`;
const rawBasePath = process.env.BASE_PATH || "";
const basePath = rawBasePath.replace(/[^a-zA-Z0-9\-_/]/g, "").replace(/\/+/g, "/").replace(/\/$/, "");
let serverInstance = null;
function stripHttpProtocols(...args) {
  return args.map((arg) => {
    if (typeof arg === "string") {
      return arg.replace(/https?:\/\//gi, "");
    }
    return arg;
  });
}
const proxyLogger = {
  log: (...args) => {
    const cleanedArgs = stripHttpProtocols(...args);
    console.log(...cleanedArgs);
  },
  info: (...args) => {
    const cleanedArgs = stripHttpProtocols(...args);
    console.info(...cleanedArgs);
  },
  warn: (...args) => {
    const cleanedArgs = stripHttpProtocols(...args);
    console.warn(...cleanedArgs);
  },
  error: (...args) => {
    const cleanedArgs = stripHttpProtocols(...args);
    console.error(...cleanedArgs);
  },
  debug: (...args) => {
    if (!isProduction) {
      const cleanedArgs = stripHttpProtocols(...args);
      console.debug(...cleanedArgs);
    }
  }
};
function createServer() {
  if (serverInstance) {
    console.log("Server already running, skipping duplicate start");
    return;
  }
  console.log(`Starting server with BASE_PATH: ${basePath || "(none)"}`);
  const app = express();
  if (refuseToServe) {
    console.warn(`⚠️  ${REFUSAL_MESSAGE}`);
    app.use((req, res) => {
      res.status(403).type("html").send(REFUSAL_PAGE);
    });
  }
  if (isProduction) {
    const clientPath = path.resolve(__dirname$1, "../client");
    console.log("Serving static files from:", clientPath);
    app.use(
      `${basePath}/assets`,
      express.static(path.join(clientPath, "assets"), { fallthrough: false })
    );
  }
  app.get(`${basePath}/_hello`, (req, res) => {
    res.json({
      name: "Curvenote Theme Server",
      version: "0.2.5"
    });
  });
  const scmsTarget = (process.env.CURVENOTE_SCMS_BASE_URL || "https://scms.curvenote.com").replace(/\/$/, "") + "/v1";
  app.use(
    `${basePath}/_scms`,
    createProxyMiddleware({
      target: scmsTarget.startsWith("http") ? scmsTarget : `https://${scmsTarget}`,
      changeOrigin: true,
      pathRewrite: {
        // Strip basePath and /_scms so e.g. /proxy/3000/_scms/sites/xxx -> /sites/xxx (target is .../v1)
        [`^${basePath}/_scms`]: ""
      },
      logger: proxyLogger
    })
  );
  app.use(
    `${basePath}/_build`,
    createProxyMiddleware({
      target: `http://${contentCdnUrl}`,
      changeOrigin: true,
      pathRewrite: {
        // Remove the /_build prefix before forwarding to CDN
        // e.g., /_build/article -> /article
        [`^${basePath}/_build`]: ""
      },
      logger: proxyLogger
    })
  );
  const pageJson = new RegExp(`^${basePath}/([a-z0-9][a-z0-9_-]*)\\.json(\\?.*)?$`);
  app.use(
    createProxyMiddleware({
      target: `http://${contentCdnUrl}`,
      changeOrigin: true,
      pathFilter: (pathname) => pageJson.test(pathname),
      pathRewrite: (pathname) => pathname.replace(pageJson, "/content/$1.json$2"),
      logger: proxyLogger
    })
  );
  const wsProxy = createProxyMiddleware({
    target: `http://${contentCdnUrl}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      [`^${basePath}/_socket`]: "/socket"
    },
    logger: proxyLogger
  });
  app.use(`${basePath}/_socket`, wsProxy);
  const spaRouteHandler = async (req, res, next) => {
    if (res.headersSent) {
      return;
    }
    if (req.path.startsWith("/assets/")) {
      return next();
    }
    let cliParams;
    if (isProduction) {
      const url = new URL(req.originalUrl, "http://localhost");
      const packet = url.searchParams.get("params");
      if (packet !== null) {
        if (!decodeThemeParams(packet)) {
          res.status(403).type("html").send(OPEN_LINK_PAGE);
          return;
        }
        url.searchParams.delete("params");
        res.setHeader(
          "Set-Cookie",
          `${cliSession.name}=${cliSession.value(packet)}; Path=${basePath || "/"}; HttpOnly; SameSite=Lax`
        );
        res.redirect(302, `${url.pathname}${url.search}`);
        return;
      }
      cliParams = cliSession.read(req.headers.cookie);
      if (!cliParams) {
        res.status(403).type("html").send(OPEN_LINK_PAGE);
        return;
      }
    }
    console.log("Serving index.html for route:", req.url.replace(/^https?:\/\/[^/]+/, ""));
    try {
      let html = "";
      if (isProduction) {
        const clientPath = path.resolve(__dirname$1, "../client");
        html = fs.readFileSync(path.join(clientPath, "index.html"), "utf-8");
      } else {
        const indexPath = path.resolve(__dirname$1, "../../index.html");
        html = fs.readFileSync(indexPath, "utf-8");
      }
      const hasExistingInjection = html.includes("window.__BASE_PATH__");
      if (hasExistingInjection) {
        html = html.replace(
          /<script>window\.__BASE_PATH__[^<]*<\/script>\s*<script[^>]*thebe-core\.min\.js[^<]*<\/script>\s*<link[^>]*thebe-core\.css[^>]*>\s*/g,
          ""
        );
      }
      const cliInjection = cliParams ? `<script>window.__CURVENOTE_CLI__ = ${JSON.stringify(cliParams).replace(/</g, "\\u003c")};<\/script>` : "";
      const headInjection = `
    <script>window.__BASE_PATH__ = "${basePath}";<\/script>${cliInjection}
    <script src="${basePath}/thebe-core.min.js" onload="window.setupThebeCore?.()"><\/script>
    <link rel="stylesheet" href="${basePath}/thebe-core.css">
  </head>`;
      html = html.replace("</head>", headInjection);
      if (basePath) {
        html = html.replace(/src="\/assets\//g, `src="${basePath}/assets/`);
        html = html.replace(/href="\/assets\//g, `href="${basePath}/assets/`);
        html = html.replace(/href="\/app\//g, `href="${basePath}/app/`);
      }
      res.send(html).end();
    } catch (error) {
      next(error);
    }
  };
  function thebeAssetsHandler(req, res, next) {
    if (res.headersSent) {
      return;
    }
    const thebeAssetsPath = path.resolve(__dirname$1, "./public");
    let assetPath = req.path;
    if (basePath && assetPath.startsWith(basePath)) {
      assetPath = assetPath.slice(basePath.length);
    }
    const thebeAssets = fs.readFileSync(path.join(thebeAssetsPath, assetPath), "utf-8");
    res.send(thebeAssets).end();
  }
  const thebeAssetPaths = ["/thebe-core.min.js", "/thebe-core.css"];
  thebeAssetPaths.forEach((assetPath) => {
    if (basePath) {
      app.get(`${basePath}${assetPath}`, thebeAssetsHandler);
    }
    app.get(assetPath, thebeAssetsHandler);
  });
  if (basePath) {
    app.get(`${basePath}`, spaRouteHandler);
    app.get(`${basePath}/*`, spaRouteHandler);
  } else {
    app.get("*", (req, res, next) => {
      if (res.headersSent) {
        return;
      }
      if (req.path.endsWith("thebe-core.min.js") || req.path.endsWith("/thebe-core.css")) {
        return next();
      }
      return spaRouteHandler(req, res, next);
    });
  }
  const server = http.createServer(app);
  serverInstance = server;
  server.on("upgrade", (req, socket, head) => {
    if (refuseToServe) {
      socket.destroy();
      return;
    }
    if (req.url?.startsWith(`${basePath}/_socket`)) {
      console.log("✅ Proxying WebSocket to content CDN...");
      wsProxy.upgrade?.(req, socket, head);
    } else {
      console.log(
        "❌ WebSocket URL did not match, destroying socket (if this message persists, you may have an old tab open)"
      );
      socket.destroy();
    }
  });
  server.listen(port, () => {
    const baseUrl = `localhost:${port}${basePath}`;
    console.log("Curvenote Theme Server is running...");
    console.log(`  API/proxy server: http://${baseUrl}`);
    if (!isProduction) {
      console.log(`  → Use http://localhost:3000 for the app (Vite dev server proxies here)`);
    }
    console.log(`  - Build API: http://${baseUrl}/_build/:slug`);
    console.log(`  - WebSocket: ws://localhost:${port}${basePath}/_socket`);
  });
}
createServer();
