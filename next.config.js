/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    RESEND_FROM: 'WVF App <noreply@mail.wvfitness.com.au>',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cutvfpqmngujesoozkjo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
