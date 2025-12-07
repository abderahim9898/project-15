import { existsSync } from "fs";
import { spawn } from "child_process";
import { resolve } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = resolve(__dirname, "dist");
const serverFile = resolve(distPath, "server", "node-build.mjs");

async function start() {
  try {
    // Check if dist directory exists and has server files
    const needsBuild = !existsSync(distPath) || !existsSync(serverFile);

    if (needsBuild) {
      console.log("📦 Build files not found, running build...");
      
      return new Promise((resolve, reject) => {
        const build = spawn("npm", ["run", "build"], {
          stdio: "inherit",
          shell: true,
        });

        build.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Build failed with code ${code}`));
          } else {
            console.log("✅ Build completed successfully");
            startServer();
            resolve(undefined);
          }
        });

        build.on("error", (err) => {
          reject(err);
        });
      });
    } else {
      console.log("✅ Build files found, starting server...");
      startServer();
    }
  } catch (error) {
    console.error("❌ Error during startup:", error);
    process.exit(1);
  }
}

function startServer() {
  const server = spawn("node", [serverFile], {
    stdio: "inherit",
  });

  server.on("error", (err) => {
    console.error("❌ Server error:", err);
    process.exit(1);
  });

  server.on("close", (code) => {
    process.exit(code || 0);
  });
}

start();
