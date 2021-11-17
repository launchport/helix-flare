import path from 'node:path'
import url from 'node:url'

import { Miniflare } from 'miniflare'
import type { MiniflareOptions } from 'miniflare'
import { buildSync } from 'esbuild'
import globSync from 'tiny-glob/sync'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const buildWorkers = () => {
  const entryPoints = globSync(path.resolve(__dirname, '*.worker.ts'))

  buildSync({
    entryPoints,
    bundle: true,
    logLevel: 'error',
    target: 'node16',
    platform: 'node',
    outdir: path.resolve(__dirname, 'dist'),
    sourcemap: true,
    format: 'esm',
    define: {
      setImmediate: 'setTimeout',
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  })
}

export const createWorker = (
  relativeWorkerPath: string,
  options?: MiniflareOptions,
) => {
  const scriptPath = path.resolve(
    __dirname,
    'dist',
    relativeWorkerPath.replace(/\.ts$/, '.js'),
  )

  return new Miniflare({
    scriptPath,
    modules: true,
    buildCommand: undefined,
    sourceMap: true,
    ...options,
  })
}
