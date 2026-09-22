import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv, type Plugin } from "vite-plus";
import { intentMiddleware } from "./server/intent-handler";

/** Serves POST /api/intent during `vp dev` so the TypeSafe key stays server-side. */
function intentApi(): Plugin {
  return {
    name: "ai-router:intent-api",
    configureServer(server) {
      server.middlewares.use(intentMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(intentMiddleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  // TYPESAFE_API_KEY has no VITE_ prefix on purpose: it must never reach the browser.
  const env = loadEnv(mode, process.cwd(), "");
  if (env.TYPESAFE_API_KEY) process.env.TYPESAFE_API_KEY = env.TYPESAFE_API_KEY;

  if (!env.TYPESAFE_API_KEY) {
    console.warn("[ai-router] no TYPESAFE_API_KEY - /api/intent will answer from the keyword stub");
  }

  return {
    plugins: [vue(), intentApi()],
    // Fail loudly instead of drifting to another port: a stale dev server left on
    // the default port is otherwise served to the browser with its old env.
    server: { strictPort: true },
    staged: {
      "*": "vp check --fix",
    },
    fmt: {},
    lint: {
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      options: { typeAware: true, typeCheck: true },
    },
  };
});
