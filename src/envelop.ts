import { type GetEnvelopedFn } from '@envelop/core'
import core, { type SharedOptions } from './core'

const helixFlareEnvelop = async <PluginsContext extends any>(
  request: Request,
  getEnvelopedFn: GetEnvelopedFn<PluginsContext>,
  { access }: SharedOptions | undefined = {},
) => {
  const { schema, parse, validate, execute, contextFactory } = getEnvelopedFn({
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
