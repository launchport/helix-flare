import type { Options } from 'tsup'
export const tsup: Options = {
  splitting: false,
  dts: true,
  clean: true,
  format: ['esm'],
  entryPoints: ['src/*.ts'],
  external: [/graphql/],
}
