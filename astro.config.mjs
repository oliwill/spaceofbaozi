import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://baozi.space",
  trailingSlash: "never",
  prefetch: true,
  integrations: [react()],
});
