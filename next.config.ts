import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  poweredByHeader: false,
  transpilePackages: ['@danvic/ui', '@danvic/api-client'],
}

export default config
