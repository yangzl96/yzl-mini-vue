import { generate } from '../src/codegen'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { transformExpression } from '../transforms/transformExpresion'

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('hi')
    transform(ast)
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })

  it('interpolation', () => {
    const ast = baseParse('{{message}}')
    console.log(ast)
    transform(ast, {
      nodeTransforms: [transformExpression],
    })
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
})
