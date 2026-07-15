import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const localCacheRoot = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");

export default defineConfig({
  cacheDir: path.join(localCacheRoot, "nexus-core", "vite-mission-control"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "node"
  }
});
