/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false;
let repo = "";
if (isGithubActions) {
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (repoName && !repoName.endsWith(".github.io")) {
    repo = `/${repoName}`;
  }
}

const nextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH !== undefined ? process.env.NEXT_PUBLIC_BASE_PATH : repo,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
