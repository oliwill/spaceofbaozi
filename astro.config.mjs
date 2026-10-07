import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { sitePublishing } from "./scripts/publishing/site-publishing.ts";

import { siteConfig } from "./src/lib/site/config.ts";
import rehypeBaseUrls from "./src/lib/site/rehype-base-urls.ts";

const deployment = siteConfig(process.env);
export default defineConfig({
  ...deployment,
  markdown: { rehypePlugins: [[rehypeBaseUrls, { base: deployment.base }]] },
  trailingSlash: "never",
  prefetch: true,
  integrations: [react(), sitePublishing()],
});
