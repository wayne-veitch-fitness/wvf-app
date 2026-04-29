import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image domains — add Supabase storage when we wire up media uploads
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aokchdumugrjqwbpdqnj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
