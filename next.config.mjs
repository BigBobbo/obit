/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memorial pages are unlisted: no sitemap is generated anywhere in the app,
  // and per-page noindex is set via metadata. These headers are defense in depth.
  async headers() {
    return [
      {
        source: "/m/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Supabase storage public bucket (web-size renditions only)
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
