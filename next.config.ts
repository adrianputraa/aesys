import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // React Compiler — auto-memoizes components (needs babel-plugin-react-compiler).
  reactCompiler: true,
  // Native/WASM packages — keep them external so the server bundler loads them
  // from node_modules instead of trying to bundle them. `sharp` does avatar
  // re-compression; `@electric-sql/pglite` is the embedded demo DB.
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  experimental: {
    // Avatar uploads go through a Server Action; allow a little headroom over
    // the 1MB default (client compresses to ~tens of KB, so this is slack).
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        // User-uploaded files are served statically — never let the browser
        // content-sniff them into something executable.
        source: "/user-data/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
      {
        // Inventory item media (images/videos) — same content-sniff protection.
        source: "/inventory/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ]
  },
}

export default nextConfig
