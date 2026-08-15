import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS = process.env.WRANGLER_WRITE_LOGS || "false";
  process.env.WRANGLER_LOG_PATH = process.env.WRANGLER_LOG_PATH || ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH = process.env.MINIFLARE_REGISTRY_PATH || ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported (optional).
  let cloudflare: any = () => ({ name: 'noop-cloudflare-plugin' });
  try {
    const cf = await import("@cloudflare/vite-plugin");
    cloudflare = cf.cloudflare;
  } catch (err) {
    console.warn("@cloudflare/vite-plugin not installed; skipping cloudflare plugin");
  }

  // Load vinext plugin unless explicitly disabled to avoid unexpected runtime errors.
  let vinextPlugin = null;
  if (process.env.ENABLE_VINEXT !== "false") {
    try {
      const vinextMod = await import("vinext");
      vinextPlugin = vinextMod?.default ? vinextMod.default() : null;
    } catch (err) {
      console.warn("vinext failed to load; running without it. Error:", err);
    }
  } else {
    console.info("VINEXT disabled");
  }

  const plugins = [
    ...(vinextPlugin ? [vinextPlugin] : []),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
      config: localBindingConfig,
    }),
  ];

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins,
  };
});
