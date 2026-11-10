import { defineConfig } from 'tsdown'

// Host-only build. Browser client is hand-authored client.js
// (window.__ModuleLoader__ CJS closure-factory), matching DSH Desktop loader.
export default defineConfig({
  entry: {
    index: 'src/index.ts'
  },
  outDir: 'lib',
  format: ['esm'],
  fixedExtension: false,
  dts: true,
  clean: true,
  platform: 'node',
  deps: {
    neverBundle: [/^@deepseek-ai\//, 'cordis', 'schemastery']
  }
})
