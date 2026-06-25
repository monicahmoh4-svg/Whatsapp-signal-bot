import { createServer as createViteServer } from "vite";
import app from "./api/index.js";

const PORT = 3000;

const setupServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const { default: path } = await import("path");
    const { default: express } = await import("express");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: any, res: any) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 WA Signal Bot running at http://localhost:${PORT}\n`);
  });
};

setupServer().catch(console.error);
