/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Images are still served from the Wix CDN for now.
    remotePatterns: [
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "static.parastorage.com" },
    ],
  },
  async redirects() {
    return [
      // Old captured *.html URLs -> clean routes
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/our-works.html", destination: "/our-works", permanent: true },
      { source: "/our-team.html", destination: "/our-team", permanent: true },
      { source: "/our-partners.html", destination: "/our-partners", permanent: true },
      { source: "/our-partners-list.html", destination: "/our-partners", permanent: true },
      { source: "/our-partners-list", destination: "/our-partners", permanent: true },
      { source: "/contact-us.html", destination: "/contact-us", permanent: true },
      { source: "/case-study.html", destination: "/case-study", permanent: true },
      { source: "/o.html", destination: "/o", permanent: true },
      { source: "/case-study/:slug.html", destination: "/case-study/:slug", permanent: true },
      // Spanish site was removed -> send to the English home
      { source: "/es", destination: "/", permanent: true },
      { source: "/es/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
