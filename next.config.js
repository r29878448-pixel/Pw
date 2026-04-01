/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during build to avoid warnings
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['static.pw.live', 'd2bps9p1kiy4ka.cloudfront.net', 'i.postimg.cc'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://deltastudy.site https://apiserver-6hat.onrender.com https://apiserver-skpg.onrender.com https://pw-missiontopper.firebaseapp.com https://accounts.google.com https://vercel.live;",
          },
        ],
      },
    ];
  },
};
