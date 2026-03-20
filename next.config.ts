import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Force a single copy of React throughout the entire bundle.
      // This fixes the "Cannot read properties of undefined (reading
      // 'ReactCurrentBatchConfig')" error caused by react-konva /
      // react-reconciler bundling their own React copy.
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    }
    return config
  },
}

export default nextConfig