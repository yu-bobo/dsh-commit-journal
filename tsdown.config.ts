import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'client/index': 'src/client/index.tsx'
  },
  outDir: 'lib',
  format: ['esm'],
  fixedExtension: false,
  dts: true,
  clean: true,
  platform: 'node',
  deps: {
    neverBundle: [
      /^@deepseek-ai\//,
      /^react($|\/)/,
      /^react-dom($|\/)/,
      'cordis',
      'schemastery'
    ]
  }
})
