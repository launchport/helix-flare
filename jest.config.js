/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  testEnvironment: 'miniflare',
  preset: 'ts-jest/presets/default-esm',
  globals: { 'ts-jest': { useESM: true } },
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
