import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  testEnvironment: '<rootDir>/custom-test-env.mjs',
  preset: 'ts-jest/presets/default-esm',
  globals: { 'ts-jest': { useESM: true } },
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
