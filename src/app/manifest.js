import { siteConfig } from "../lib/seo";

export default function manifest() {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    start_url: siteConfig.basePath ? `${siteConfig.basePath}/` : "/",
    display: "standalone",
    background_color: "#071311",
    theme_color: "#0d9488",
    icons: [
      {
        src: "/logo.png",
        src: siteConfig.basePath ? `${siteConfig.basePath}/logo.png` : "/logo.png",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}

