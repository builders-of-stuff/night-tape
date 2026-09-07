import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const yahooHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    proxy: {
      "/api/coingecko": {
        target: "https://api.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, "/api/v3"),
      },
      "/api/dex": {
        target: "https://api.dexscreener.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dex/, ""),
      },
      "/api/gt": {
        target: "https://api.geckoterminal.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gt/, ""),
      },
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        headers: yahooHeaders,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
      },
      "/api/cnbc": {
        target: "https://quote.cnbc.com",
        changeOrigin: true,
        headers: yahooHeaders,
        rewrite: (path) => path.replace(/^\/api\/cnbc/, ""),
      },
    },
  },
});
