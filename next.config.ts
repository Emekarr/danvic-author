import type { NextConfig } from 'next'
import path from 'node:path'

const agoraFoundationFallback = path.resolve(__dirname, 'src/lib/agora-foundation-empty.ts')

const config: NextConfig = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  transpilePackages: ['@danvic/ui', '@danvic/api-client'],
  turbopack: {
    resolveAlias: {
      'agora-foundation/lib/logger': './src/lib/agora-foundation-empty.ts',
      'agora-foundation/lib/logger/common': './src/lib/agora-foundation-empty.ts',
      'agora-foundation/package.json': './src/lib/agora-foundation-empty.ts',
    },
  },
  webpack(configuration) {
    configuration.resolve.alias = {
      ...configuration.resolve.alias,
      'agora-foundation/lib/logger/common$': agoraFoundationFallback,
      'agora-foundation/lib/logger$': agoraFoundationFallback,
      'agora-foundation/package.json$': agoraFoundationFallback,
    }
    return configuration
  },
}

export default config
