import type { Options } from 'tsup'
export const tsup: Options = {
  splitting: false,
  dts: true,
  clean: true,
  target: 'node16',
  format: ['esm'],
  sourcemap: true,
  entryPoints: ['src/index.ts'],
}
