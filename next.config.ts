import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own font and stream handling and must not be bundled
  // by the server compiler.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
