/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/visit",
        destination: "/log",
        permanent: true,
      },
      {
        source: "/home",
        destination: "/log",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
