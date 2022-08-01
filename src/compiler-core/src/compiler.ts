import { baseParse } from './parse'
import { transformExpression } from '../transforms/transformExpresion'
import { transformElement } from '../transforms/transformElement'
import { transformText } from '../transforms/transformText'
import { generate } from './codegen'
import { transform } from './transform'

export function baseCompiler(template) {
  const ast = baseParse(template)

  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })

  return generate(ast)
}
