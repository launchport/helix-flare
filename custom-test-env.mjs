import NodeEnvironment from 'jest-environment-node'

export default class CustomTestEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup()
    ;['atob', 'btoa', 'AbortSignal'].forEach((fn) => {
      if (typeof this.global[fn] === 'undefined') {
        this.global[fn] = global[fn]
      }
    })
  }
}
