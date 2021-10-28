import { getNullableType } from 'graphql'
import { getArgumentValues } from '@graphql-tools/utils'
import type { GraphQLObjectType, GraphQLResolveInfo } from 'graphql'

const getType = (type: any): GraphQLObjectType => {
  const actualType = getNullableType(type)
  return actualType.ofType ? getType(actualType.ofType) : type
}

const getArguments = <TArgs = Record<string, any>>(
  info: GraphQLResolveInfo,
) => {
  const name = info.fieldName
  const fieldDef = getType(info.parentType).getFields()[name]
  const node = info.fieldNodes[0]

  return getArgumentValues(fieldDef, node, info.variableValues) as TArgs
}

export default getArguments
