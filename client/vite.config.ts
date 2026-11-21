import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/remix/vite";

declare module "@remix-run/node" {
    interface Future {
        v3_singleFetch: true;
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    for (const key of ["API_URL", "VITE_API_URL", "SESSION_SECRET"]) {
        if (env[key]) process.env[key] = env[key];
    }
    return {
    plugins: [
        remix({
            presets: [vercelPreset()],
            future: {
                v3_fetcherPersist: true,
                v3_relativeSplatPath: true,
                v3_throwAbortReason: true,
                v3_singleFetch: true,
                v3_lazyRouteDiscovery: true,
            },
        }),
        tsconfigPaths(),
    ],
    server: {
        port: 3000,
    },
    };
});
