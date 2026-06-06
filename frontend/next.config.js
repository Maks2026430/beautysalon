/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the slim standalone runtime image (see Dockerfile).
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
};

module.exports = nextConfig;
