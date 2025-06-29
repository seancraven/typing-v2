import { createRequestHandler } from "@react-router/express";
import express from "express";
import sourceMapSupport from "source-map-support";
import https from "node:https";
import fs from "node:fs";
import url from "node:url";
import process from "node:process";
import morgan from "morgan";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

sourceMapSupport.install({
  retrieveSourceMap: function (source) {
    const match = source.startsWith("file://");
    if (match) {
      const filePath = url.fileURLToPath(source);
      const sourceMapPath = `${filePath}.map`;
      if (fs.existsSync(sourceMapPath)) {
        return {
          url: source,
          map: fs.readFileSync(sourceMapPath, "utf8"),
        };
      }
    }
    return null;
  },
});
const app = express();
app.use(
  morgan("tiny", {
    skip: (req, res) => {
      return !req.url.startsWith("/app");
    },
  }),
);
app.get("/health/status", () => "Healthy");
app.get("/.well-known/appspecific/com.chrome.devtools.json", () => {});
app.use(
  viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
);

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
  : await import("./build/server/index.js");

app.all("*", createRequestHandler({ build }));

const secret_dir = process.env.SECRET_DIR;
let server;
if (!secret_dir) {
  console.info("No tls secret dir found. Hosting with http.");
  server = app;
} else {
  const domain = process.env.HOST ?? "localhost";
  app.use(function (req, res) {
    res.redirect("https://" + domain + req.originalUrl);
  });
  console.info("TLS secrets found.");
  server = https.createServer(
    {
      key: fs.readFileSync(`${secret_dir}/key.pem`),
      cert: fs.readFileSync(`${secret_dir}/key.crt`),
    },
    app,
  );
}
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.info("App listening on port 3000");
});
