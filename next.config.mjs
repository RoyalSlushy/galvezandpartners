/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The captured Wix pages reference images/fonts on Wix CDNs by absolute URL,
  // so we don't proxy them through next/image. Nothing else to configure — the
  // markup + inlined CSS are rendered as-is per route.
};

export default nextConfig;
