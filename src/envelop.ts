import type { CreateAccessHeadersOptions } from './utils/createAccessHeaders'
import type { GetEnvelopedFn } from '@envelop/core'

import core from './core'

type Options = {
  access?: CreateAccessHeadersOptions
}

const helixFlareEnvelop = async <PluginsContext extends any>(
  request: Request,
  getEnveloped: GetEnvelopedFn<PluginsContext>,
  { access }: Options | undefined = {},
) => {
  const { schema, parse, validate, execute, contextFactory } = getEnveloped({
    req: request,
  })

  return core({
    request,
    schema,
    parse,
    validate,
    execute,
    contextFactory,
    access,
  })
}

export default helixFlareEnvelop
