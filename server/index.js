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
const CLI_LINK_VERSION = "0.18.0";
const UPDATE_CLI_MESSAGE = `This Curvenote CLI is older than v${CLI_LINK_VERSION}. Update it with \`npm install -g curvenote@latest\`.`;
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
const BRAND = `    <div class="brand" role="img" aria-label="Curvenote">
      ${'<svg style="width:184px;height:32px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2300 400" fill="currentColor"><g id="icon"><path d="M402.3,304.2c0,47.2-38.2,85.5-85.5,85.6c-47.2,0-85.5-38.2-85.6-85.5c0-47.2,38.2-85.5,85.5-85.6l0,0   C363.9,218.7,402.2,257,402.3,304.2z"></path><path d="M22.6,218.8h171v171C99.2,389.8,22.6,313.2,22.6,218.8z"></path><path d="M72.7,60.3c32-32.1,75.6-50.2,120.9-50.1v171.1h-171C22.6,135.8,40.6,92.3,72.7,60.3z"></path><path d="M352.2,131.1c-32,32.1-75.6,50.2-120.9,50.1v-171h171C402.3,55.5,384.3,99,352.2,131.1z"></path></g><g id="text_00000129178152556309603850000002854622193654753692_"><path d="M2068.8,249.8c3.2,16.3,10.6,28.9,22.4,37.9c11.8,9,26.3,13.5,43.5,13.5c24,0,41.5-8.9,52.4-26.6l26.9,15.3   c-17.7,27.4-44.4,41.1-80.1,41.1c-28.9,0-52.4-9-70.5-27.1c-18.1-18.1-27.1-41-27.1-68.6c0-27.4,8.9-50.2,26.6-68.4   s40.6-27.3,68.8-27.3c26.7,0,48.5,9.4,65.3,28.2s25.3,41.4,25.3,67.9c0,4.8-0.4,9.5-1.1,14.2L2068.8,249.8z M2131.6,169.3   c-17,0-31.1,4.8-42.2,14.4c-11.2,9.6-18.1,22.4-20.7,38.4h121.6c-2.7-17.2-9.5-30.4-20.4-39.4   C2159.2,173.8,2145.6,169.1,2131.6,169.3z"></path><path d="M2018.1,174.8h-48.4v98.6c0,9,1.8,15.4,5.3,19.1c3.5,3.8,8.9,5.7,16.2,5.8c7.3,0.1,16.3,0,26.9-0.5v28.4   c-27.6,3.6-47.9,1.4-60.8-6.7S1938,296,1938,273.4v-98.6h-36v-30.6h36v-41.5l31.7-9.5v51h48.4L2018.1,174.8L2018.1,174.8z"></path><path d="M1857.6,303.3c-37.8,36.8-98.1,36.8-136,0c-18.5-18.4-27.8-41.1-27.8-68.1s9.3-49.7,27.8-68.1   c37.8-36.8,98.1-36.8,136,0c18.7,18.4,28,41.1,28,68.1S1876.3,284.8,1857.6,303.3z M1789.5,300c17.2,0.4,33.8-6.4,45.9-18.7   c12.4-12.4,18.7-27.8,18.7-46.2s-6.2-33.8-18.7-46.2c-25.4-24.7-65.9-24.7-91.4,0c-12.4,12.4-18.7,27.9-18.7,46.2   s6.2,33.8,18.7,46.2C1756,293.5,1772.4,300.3,1789.5,300L1789.5,300z"></path><path d="M1589.3,139.5c21.4,0,38.5,6.7,51.3,20.2c12.9,13.5,19.3,31.7,19.3,54.8v111.7h-31.7V216.3   c0-14.8-4-26.3-12-34.4s-19.1-12.2-33.2-12.2c-15.8,0-28.5,4.9-38.2,14.7s-14.5,24.9-14.5,45.3v96.5h-31.7v-182h31.7v26.2   C1543.2,149.8,1562.9,139.5,1589.3,139.5z"></path><path d="M1308.8,249.8c3.1,16.3,10.6,28.9,22.4,37.9s26.3,13.5,43.5,13.5c24,0,41.5-8.9,52.4-26.6l26.9,15.3   c-17.7,27.4-44.4,41.1-80.1,41.1c-28.9,0-52.4-9-70.5-27.1s-27.1-41-27.1-68.6c0-27.4,8.9-50.2,26.6-68.4s40.6-27.3,68.8-27.3   c26.7,0,48.5,9.4,65.3,28.2s25.3,41.4,25.3,67.9c0,4.8-0.4,9.5-1.1,14.2L1308.8,249.8z M1371.6,169.3c-17,0-31,4.8-42.2,14.4   c-11.2,9.6-18.1,22.4-20.7,38.4h121.6c-2.7-17.2-9.5-30.4-20.4-39.4C1399.1,173.8,1385.6,169.1,1371.6,169.3z"></path><path d="M1232.6,144.2h34.2l-72.8,182h-37.1l-72.8-182h34.2l57.1,147.7L1232.6,144.2z"></path><path d="M1017.5,174.8c10.4-22.6,29.4-33.9,56.8-33.9v33.2c-14.4-1-28.7,3.4-40,12.4c-11.2,9-16.8,23.4-16.7,43.3v96.5   h-31.7V144.2h31.7L1017.5,174.8L1017.5,174.8z"></path><path d="M906.2,144.2h31.7v182h-31.7V300c-12.9,20.6-32.5,30.9-59,30.9c-21.4,0-38.5-6.7-51.3-20.2   c-12.9-13.5-19.3-31.7-19.3-54.8V144.2h31.7v109.9c0,14.8,4,26.3,12,34.4s19.1,12.2,33.2,12.2c15.8,0,28.5-4.9,38.2-14.7   c9.7-9.8,14.6-24.9,14.5-45.3L906.2,144.2L906.2,144.2z"></path><path d="M634.6,330.9c-38.6,0-70.5-12.7-95.6-38.2c-25.1-25.5-37.7-56.8-37.7-93.9s12.6-68.4,37.7-93.9   c25.1-25.5,57-38.2,95.6-38.2c22.5-0.2,44.7,5.6,64.3,16.7c19,10.7,34.7,26.2,45.6,45.1L715,145.6c-7.3-14.2-18.6-25.9-32.5-33.7   c-14.5-8.4-31.1-12.6-47.8-12.4c-29.4,0-53.3,9.5-71.9,28.4c-18.6,18.9-27.8,42.6-27.8,71c0,28.2,9.3,51.7,27.8,70.6   c18.6,18.9,42.5,28.4,71.9,28.4c16.8,0.2,33.3-4.2,47.9-12.6c13.8-7.7,25.1-19.3,32.6-33.3l29.4,16.7c-10.7,19-26.5,34.7-45.5,45.3   C679.4,325.3,657.2,331.1,634.6,330.9z"></path></g></svg>'}
    </div>`;
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
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    main { max-width: 34rem; padding: 2rem 1rem; }
    .brand { display: flex; margin: 0 0 2rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p { color: var(--muted); margin: 0 0 1rem; }
    code { display: block; padding: 0.625rem 0.875rem; border-radius: 0.375rem; background: var(--code); color: var(--fg); font: 0.9rem ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 0 1rem; }
    p code { display: inline; padding: 0.1rem 0.3rem; margin: 0; }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <main>
${BRAND}
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
    <p>Open this preview with the link <code>curvenote start</code> printed in your terminal when it started, which ends in <code>?params=…</code>. Each run prints a new link, so a link or tab from an earlier run won’t open it.</p>`
);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const refuseToServe = isProduction && !startedByCurvenoteCli();
const port = process.env.PORT || 3050;
const cliSession = cliSessionCookie(port, randomUUID());
let cliSentPacket = false;
let warnedOutdatedCli = false;
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
    let cliInfo;
    if (isProduction) {
      const url = new URL(req.originalUrl, "http://localhost");
      const packet = url.searchParams.get("params");
      if (packet !== null) {
        if (!decodeThemeParams(packet)) {
          res.status(403).type("html").send(OPEN_LINK_PAGE);
          return;
        }
        cliSentPacket = true;
        url.searchParams.delete("params");
        res.setHeader(
          "Set-Cookie",
          `${cliSession.name}=${cliSession.value(packet)}; Path=${basePath || "/"}; HttpOnly; SameSite=Lax`
        );
        res.redirect(302, `${url.pathname}${url.search}`);
        return;
      }
      cliInfo = cliSession.read(req.headers.cookie);
      if (!cliInfo && cliSentPacket) {
        res.status(403).type("html").send(OPEN_LINK_PAGE);
        return;
      }
      if (!cliInfo) {
        if (!warnedOutdatedCli) console.warn(`
⚠️  ${UPDATE_CLI_MESSAGE}
`);
        warnedOutdatedCli = true;
        cliInfo = { outdated: true, requires: CLI_LINK_VERSION };
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
      const cliInjection = cliInfo ? `<script>window.__CURVENOTE_CLI__ = ${JSON.stringify(cliInfo).replace(/</g, "\\u003c")};<\/script>` : "";
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
