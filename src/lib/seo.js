// SEO Configuration and Structured Data for Snippets
// Optimized for search engines, rich social previews, and portfolio CV listing.

export const siteConfig = {
  name: "Snippets",
  shortName: "Snippets",
  title: "Snippets — Code & Note Workspace",
  description:
    "A distraction-free code snippet manager and rich markdown workspace. Capture, highlight, and organize reusable code fragments with zero latency.",
  url: "https://snippet-notes.vercel.app", // standard canonical domain
  ogImage: "/logo.png",
  author: {
    name: "Imran Pollob",
    url: "https://github.com/imranpollob",
    role: "Full-Stack Software Engineer",
  },
  keywords: [
    "code snippets",
    "snippet manager",
    "syntax highlighting",
    "developer notes",
    "code notes",
    "programming reference",
    "developer productivity",
    "React",
    "Next.js 14",
    "TypeScript",
  ],
};

export const generateJsonLd = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    headline: siteConfig.title,
    description: siteConfig.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    url: siteConfig.url,
    image: `${siteConfig.url}/logo.png`,
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      jobTitle: siteConfig.author.role,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Distraction-free rich text note composition",
      "Multi-language code block syntax highlighting with line numbers",
      "1-click instant code clipboard copy",
      "Fast offline-ready storage with optional cloud sync",
      "Fast real-time fuzzy search across titles, tags, and code",
      "Organized tagging and pinning for quick access",
      "Full JSON backup import/export and single-snippet Markdown export",
      "Power-user keyboard shortcuts (C, ⌥N, ⌘K, ⌘Enter, Esc)",
      "Dark and light theme with brand teal color palette",
    ],
  };
};

