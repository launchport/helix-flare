import path from 'node:path'
import url from 'node:url'

import { Miniflare } from 'miniflare'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const createMiniflare = (relativeWorkerPath: string) => {
  const inputFile = path.resolve(__dirname, relativeWorkerPath)
  const scriptPath = path.resolve(
    __dirname,
    'dist',
    relativeWorkerPath.replace(/\.ts$/, '.js'),
  )

  const buildCommand = [
    'yarn',
    'esbuild',
    inputFile,
    `--outdir=${path.resolve(__dirname, 'dist')}`,
    '--bundle',
    '--log-level=error',
    '--platform=node',
    '--format=esm',
    '--target=node16',
    `--define:process.env.NODE_ENV='"production"'`,
  ].join(' ')

  return new Miniflare({
    scriptPath,
    modules: true,
    buildCommand,
  })
}
