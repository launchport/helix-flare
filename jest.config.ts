import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  globals: { 'ts-jest': { useESM: true } },
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
