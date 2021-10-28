import path from 'node:path'
import url from 'node:url'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

import { Miniflare } from 'miniflare'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const buildWorkers = () => {
  const buildCommand = [
    'yarn',
    'esbuild',
    path.resolve(__dirname, '*.worker.ts'),
    `--outdir=${path.resolve(__dirname, 'dist')}`,
    '--bundle',
    '--log-level=error',
    '--platform=node',
    '--format=esm',
    '--target=node16',
    `--define:process.env.NODE_ENV='"production"'`,
  ].join(' ')

  execSync(buildCommand)
}

export const cleanWorkers = () => {
  fs.rmSync(path.resolve(__dirname, 'dist'), { recursive: true })
}

export const createMiniflare = (relativeWorkerPath: string) => {
  const scriptPath = path.resolve(
    __dirname,
    'dist',
    relativeWorkerPath.replace(/\.ts$/, '.js'),
  )

  return new Miniflare({
    scriptPath,
    modules: true,
    buildCommand: undefined,
  })
}
